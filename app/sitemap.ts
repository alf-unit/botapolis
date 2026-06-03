/**
 * /sitemap.xml — dynamically generated, ISR-cached.
 * ----------------------------------------------------------------------------
 * Pulls published tools + comparisons from Supabase, mixes in the static
 * marketing pages, and emits a flat sitemap. Once we cross ~50k URLs we'll
 * shard into multiple files via `generateSitemaps` (see Next 16 docs); for
 * now a single sitemap is correct.
 *
 * Revalidates every hour. The Supabase webhook also calls
 * /api/revalidate?path=/sitemap.xml on any tool/comparison change.
 */
import type { MetadataRoute } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { getAllMdxSlugs, getAllMdxFrontmatter } from "@/lib/content/mdx"
import { absoluteUrl } from "@/lib/utils"

// Sitemap revalidation budget: daily is plenty for a docs-style site.
// Was hourly until 2026-05-30 — Vercel Active CPU audit showed sitemap
// regen + per-request Supabase fetch was a meaningful contributor to bot-
// driven CPU spend. Daily cadence + on-demand revalidate (Supabase webhook
// + cron job) keeps lastmod fresh for Google without per-hour regen.
export const revalidate = 86400

/**
 * Static routes — only paths that resolve to a real page right now.
 *
 * Editorial hubs (/tools, /compare, /guides) plus the trust + legal pages.
 * Individual /tools/{slug}, /compare/{slug}, /alternatives/{slug}, and
 * /guides/{slug} detail pages are appended dynamically further down.
 *
 * Phase 3 of /reviews/ → /tools/ merge (2026-06-03):
 *   - /reviews hub removed (308 → /tools)
 *   - /reviews/{slug} detail loop removed (308 → /tools/{slug})
 *   - /best/{slug} listings are MDX-driven and could be added when the
 *     hub page lands; currently emitted by the MDX-derived loop below
 *     once /best gets the dynamic slug walk.
 */
const STATIC_ROUTES: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}> = [
  { path: "/",             changeFrequency: "daily",   priority: 1.0 },
  { path: "/tools",        changeFrequency: "weekly",  priority: 0.9 },
  // Sprint 4 — interactive calculators (TZ § 11). Priority sits just below
  // the catalog hub but above editorial pages: they're our highest-intent
  // conversion surfaces and the only first-party SoftwareApplication URLs.
  { path: "/tools/email-roi-calculator", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/ai-cost-comparator",   changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/product-description",  changeFrequency: "monthly", priority: 0.85 },
  { path: "/compare",      changeFrequency: "weekly",  priority: 0.9 },
  { path: "/guides",       changeFrequency: "weekly",  priority: 0.85 },
  { path: "/about",        changeFrequency: "monthly", priority: 0.5 },
  // Block B (May 2026) — trust signals + contact surface.
  { path: "/methodology",  changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact",      changeFrequency: "monthly", priority: 0.45 },
  { path: "/legal/privacy",              changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/terms",                changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/cookie-policy",        changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/disclaimer",           changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/affiliate-disclosure", changeFrequency: "yearly", priority: 0.3 },
]

function alternates(path: string) {
  return {
    languages: {
      en: absoluteUrl(path),
      ru: absoluteUrl(path === "/" ? "/ru" : `/ru${path}`),
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient()
  const now = new Date()
  const routes: MetadataRoute.Sitemap = []

  // ----- Static routes (both languages) -------------------------------------
  for (const r of STATIC_ROUTES) {
    routes.push({
      url:             absoluteUrl(r.path),
      lastModified:    now,
      changeFrequency: r.changeFrequency,
      priority:        r.priority,
      alternates:      alternates(r.path),
    })
  }

  // ----- Tools (catalog detail pages) ---------------------------------------
  const { data: tools, error: toolsErr } = await supabase
    .from("tools")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(5000)

  if (toolsErr) {
    console.error("[sitemap] tools fetch failed:", toolsErr.message)
  }

  for (const t of tools ?? []) {
    // BUG-FIX (May 2026 audit): individual tool detail pages live at
    // `/tools/{slug}`, NOT `/directory/{slug}`. The original spec carved
    // /directory as a separate catalog tree but sprint 1 merged it into
    // /tools and made /directory a redirect. The sitemap still emitted
    // the old path until this fix — Google was indexing 7 dead URLs.
    const path = `/tools/${t.slug}`
    routes.push({
      url:             absoluteUrl(path),
      lastModified:    new Date(t.updated_at),
      changeFrequency: "weekly",
      priority:        0.7,
      alternates:      alternates(path),
    })

    // Block F (May 2026): /alternatives/[slug] pSEO sibling. Same lastmod
    // as the tool row — the alternatives grid is computed from the same
    // data, so whenever the tool record updates the listicle re-ranks.
    const altPath = `/alternatives/${t.slug}`
    routes.push({
      url:             absoluteUrl(altPath),
      lastModified:    new Date(t.updated_at),
      changeFrequency: "weekly",
      priority:        0.65,
      alternates:      alternates(altPath),
    })
  }

  // ----- Comparisons (pSEO X-vs-Y) ------------------------------------------
  const { data: comparisons, error: cmpErr } = await supabase
    .from("comparisons")
    .select("slug, updated_at, language")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(20000)

  if (cmpErr) {
    console.error("[sitemap] comparisons fetch failed:", cmpErr.message)
  }

  for (const c of comparisons ?? []) {
    const path = c.language === "ru" ? `/ru/compare/${c.slug}` : `/compare/${c.slug}`
    routes.push({
      url:             absoluteUrl(path),
      lastModified:    new Date(c.updated_at),
      changeFrequency: "weekly",
      priority:        0.7,
      // Comparisons are language-pegged in the DB, so we don't generate
      // alternates for the other language unless a translation row exists.
    })
  }

  // Reviews loop removed Phase 3 of /reviews/ → /tools/ merge (2026-06-03):
  // /tools/{t.slug} already emitted above (line 107). /reviews/{slug} now
  // 308-redirects there at the edge; emitting both URLs would dupe Google's
  // index and force it through the redirect for every entry.

  // ----- Guides (still MDX, build-time slug list) --------------------------
  // Reads frontmatter so we can use the article's own `updatedAt` for
  // lastModified — Google weights that signal for re-crawl priority. Falls
  // back to publishedAt if the article hasn't been edited since launch.
  // Drafts are filtered out by `getAllMdxFrontmatter`.
  const guideEntries = await getAllMdxFrontmatter("guides", "en")
  for (const { slug, frontmatter } of guideEntries) {
    const path = `/guides/${slug}`
    routes.push({
      url:             absoluteUrl(path),
      lastModified:    new Date(frontmatter.updatedAt ?? frontmatter.publishedAt),
      changeFrequency: "monthly",
      priority:        0.75,
      alternates:      alternates(path),
    })
  }
  // RU guide translations land later — emit RU URLs only when a
  // `content/guides/ru/{slug}.mdx` file actually exists.
  const ruGuideSlugs = await getAllMdxSlugs("guides", "ru")
  for (const slug of ruGuideSlugs) {
    routes.push({
      url:             absoluteUrl(`/ru/guides/${slug}`),
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.7,
    })
  }

  return routes
}
