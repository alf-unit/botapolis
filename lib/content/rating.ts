import "server-only"

import { getAllMdxFrontmatter } from "@/lib/content/mdx"
import type { ContentLocale } from "@/lib/content/mdx"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   Tool rating resolver — single source of truth
   ----------------------------------------------------------------------------
   The May 2026 audit caught /tools/<slug> and /reviews/<slug> showing
   different scores for the same product. Root cause: the DB row's
   `rating` column drifted from the MDX review's `rating:` frontmatter
   because seed data was frozen at ingest while editorial kept refining
   the score in the long-form review.

   Decision (TZ fixes #3): MDX is canonical for any tool that has a
   shipped review. The DB rating is a fallback for tools without one
   (e.g. ManyChat as of this commit). Two enforcement layers keep them
   from drifting again:

     1. Migration 003 hard-syncs the prod DB to MDX values.
     2. scripts/sync-ratings.ts re-runs the same check (CI-friendly).
     3. scripts/content-validator.ts fails the pre-commit hook if MDX
        edits land without a corresponding DB update.
     4. This helper makes the UI read from MDX live, so even if (1)–(3)
        somehow skip a row, /tools and /reviews show the same number.

   We cache the MDX scan because `getAllMdxFrontmatter` walks the
   filesystem and validates frontmatter with Zod — not free at request
   time. The cache is per-locale and lives in module scope; it stays
   warm for the lifetime of the Node process / Vercel function instance,
   which matches our ISR cadence (24 h). For dev-mode HMR, every file
   save spawns a fresh import so the cache rebuilds.
---------------------------------------------------------------------------- */

// Tool slug → frontmatter.rating. Optional: `null` means the review
// exists but has no `rating:` field (which Zod allows — the field is
// optional). `undefined` means we haven't loaded the locale yet.
type RatingMap = Map<string, number | null>

const RATING_CACHE = new Map<ContentLocale, Promise<RatingMap>>()

async function buildRatingMap(locale: ContentLocale): Promise<RatingMap> {
  const reviews = await getAllMdxFrontmatter("reviews", locale)
  const map: RatingMap = new Map()
  for (const r of reviews) {
    // toolSlug is required by reviewFrontmatterSchema; rating is optional.
    map.set(r.frontmatter.toolSlug, r.frontmatter.rating ?? null)
  }
  return map
}

function getRatingMap(locale: ContentLocale): Promise<RatingMap> {
  let pending = RATING_CACHE.get(locale)
  if (!pending) {
    pending = buildRatingMap(locale)
    RATING_CACHE.set(locale, pending)
  }
  return pending
}

/**
 * Resolve the canonical rating for a tool.
 *
 * Order of preference:
 *   1. Frontmatter rating in the requested locale (if a review exists).
 *   2. Frontmatter rating in `en` (when the RU review isn't translated yet).
 *   3. `tool.rating` from the DB (fallback for tools without a review).
 *
 * Returns `null` only when *neither* an MDX review nor a DB rating is set.
 * Use `rating != null` at call sites to gate display.
 */
export async function getToolRating(
  tool: Pick<ToolRow, "slug" | "rating">,
  locale: ContentLocale = "en",
): Promise<number | null> {
  // Locale-preferred lookup with EN fallback.
  const localized = await getRatingMap(locale)
  const localized_value = localized.get(tool.slug)
  if (typeof localized_value === "number") return localized_value

  if (locale !== "en") {
    const en = await getRatingMap("en")
    const enValue = en.get(tool.slug)
    if (typeof enValue === "number") return enValue
  }

  return tool.rating ?? null
}

/**
 * Batch variant — pre-fills ratings for a list of tools in one MDX walk.
 * Used by the /tools catalog and the /alternatives/[slug] listicle so we
 * don't trigger N filesystem scans for a 12-item grid.
 */
export async function getToolRatings(
  tools: ReadonlyArray<Pick<ToolRow, "slug" | "rating">>,
  locale: ContentLocale = "en",
): Promise<Map<string, number | null>> {
  // Preload both maps once; subsequent .get() calls are O(1).
  const [localized, en] = await Promise.all([
    getRatingMap(locale),
    locale === "en" ? Promise.resolve(null) : getRatingMap("en"),
  ])

  const out = new Map<string, number | null>()
  for (const t of tools) {
    const lv = localized.get(t.slug)
    if (typeof lv === "number") {
      out.set(t.slug, lv)
      continue
    }
    if (en) {
      const ev = en.get(t.slug)
      if (typeof ev === "number") {
        out.set(t.slug, ev)
        continue
      }
    }
    out.set(t.slug, t.rating ?? null)
  }
  return out
}
