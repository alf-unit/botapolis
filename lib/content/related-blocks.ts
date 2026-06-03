import "server-only"

import { createServiceClient } from "@/lib/supabase/service"
import { getAllMdxFrontmatter } from "@/lib/content/mdx"

/* ----------------------------------------------------------------------------
   Related-blocks data helpers (server-only)
   ----------------------------------------------------------------------------
   Centre↔satellite cross-link sources for `/tools/[slug]` and `/pricing/[slug]`.
   Both pages render the same Related block (alternatives link + head-to-head
   comparisons + best-of mentions) right before the PartnerAlternatives strip;
   keep the fetch logic here so both routes share the same data shape and
   curation rules.

   Single source of truth for:
     - which comparison rows count as "head-to-head" for this tool
     - how same-category vs cross-category gets ranked
     - which best-of listings mention this tool
---------------------------------------------------------------------------- */

export interface RelatedComparison {
  slug: string
  verdict: string | null
  other: { slug: string; name: string; logo_url: string | null }
}

export interface RelatedBestMention {
  slug: string
  title: string
  publishedAt: string
}

/**
 * Comparisons featuring this tool — for the curated Related block.
 *
 * Curation logic:
 *   1. Over-fetch 8 published same-language comparisons where this tool is
 *      on either side, ordered by updated_at DESC.
 *   2. Hydrate the OTHER tool of each pair (id, slug, name, name_ru,
 *      logo_url, category).
 *   3. Split into same-category pairs and cross-category pairs (preserving
 *      the DESC order within each bucket).
 *   4. Concatenate [same..., cross...] and slice `limit` — same-category
 *      leads because it's the most relevant intra-niche signal.
 *
 * Falls back gracefully when the row count is thin or the cross-link tool
 * can't be resolved (filter out).
 */
export async function fetchRelatedComparisons(
  currentToolId: string,
  currentCategory: string,
  language: "en" | "ru",
  locale: "en" | "ru",
  limit = 3,
): Promise<RelatedComparison[]> {
  try {
    const sb = createServiceClient()
    const { data: rows, error: rowsErr } = await sb
      .from("comparisons")
      .select("slug, tool_a_id, tool_b_id, verdict, updated_at")
      .eq("status", "published")
      .eq("language", language)
      .or(`tool_a_id.eq.${currentToolId},tool_b_id.eq.${currentToolId}`)
      .order("updated_at", { ascending: false })
      .limit(8)
    if (rowsErr || !rows || rows.length === 0) return []

    const otherIds = Array.from(
      new Set(
        rows.map((r) =>
          r.tool_a_id === currentToolId ? r.tool_b_id : r.tool_a_id,
        ),
      ),
    )
    const { data: others } = await sb
      .from("tools")
      .select("id, slug, name, name_ru, logo_url, category")
      .in("id", otherIds)
    const byId = new Map((others ?? []).map((t) => [t.id, t]))

    const annotated = rows.flatMap((r) => {
      const otherId =
        r.tool_a_id === currentToolId ? r.tool_b_id : r.tool_a_id
      const other = byId.get(otherId)
      if (!other) return []
      const otherName = locale === "ru" ? other.name_ru ?? other.name : other.name
      return [
        {
          slug: r.slug,
          verdict: r.verdict,
          other: {
            slug: other.slug,
            name: otherName,
            logo_url: other.logo_url,
          },
          sameCategory: other.category === currentCategory,
        },
      ]
    })

    const same = annotated.filter((a) => a.sameCategory)
    const cross = annotated.filter((a) => !a.sameCategory)
    return [...same, ...cross].slice(0, limit).map(
      ({ slug, verdict, other }): RelatedComparison => ({ slug, verdict, other }),
    )
  } catch (err) {
    console.error(`[related-blocks] fetchRelatedComparisons threw:`, err)
    return []
  }
}

/**
 * Best-of listings that feature this tool in their ranked roster.
 *
 * Walks `/best/{slug}.mdx` frontmatter for the active locale via
 * `getAllMdxFrontmatter`, filters to entries whose `tools[]` slug array
 * contains this tool, and returns the top `limit` by publishedAt DESC
 * (the loader already sorts that way). Returns [] when this tool isn't
 * ranked in any best-of — caller hides the section.
 */
export async function fetchBestMentions(
  currentSlug: string,
  locale: "en" | "ru",
  limit = 3,
): Promise<RelatedBestMention[]> {
  try {
    const entries = await getAllMdxFrontmatter("best", locale)
    const matches: RelatedBestMention[] = []
    for (const e of entries) {
      const tools = (e.frontmatter as { tools?: string[] }).tools ?? []
      if (!tools.includes(currentSlug)) continue
      matches.push({
        slug: e.slug,
        title: e.frontmatter.title,
        publishedAt: e.frontmatter.publishedAt,
      })
      if (matches.length >= limit) break
    }
    return matches
  } catch (err) {
    console.error(`[related-blocks] fetchBestMentions threw:`, err)
    return []
  }
}
