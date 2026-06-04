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
import { getVisibleSet } from "@/lib/content/visibility"
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
 * Editorial hubs (/tools, /compare, /guides, /best, /alternatives) plus the
 * trust + legal pages. Individual /tools/{slug}, /compare/{slug},
 * /alternatives/{slug}, /best/{slug}, and /guides/{slug} detail pages are
 * appended dynamically further down.
 *
 * Phase A+B of nav rebuild (2026-06-03): /best and /alternatives hubs
 * shipped — both now reachable from the Navbar Resources dropdown and the
 * Footer Resources column, no longer orphaned.
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
  // Phase A+B hubs (2026-06-03) — close the orphans flagged in the nav audit.
  { path: "/best",         changeFrequency: "weekly",  priority: 0.85 },
  { path: "/alternatives", changeFrequency: "weekly",  priority: 0.85 },
  // /pricing hub added 2026-06-03 (session 3) — closes the orphan for the
  // 16 /pricing/{slug} deep-dives shipped earlier today. Same priority as
  // /best and /alternatives since pricing is a high-commercial-intent hub.
  { path: "/pricing",      changeFrequency: "weekly",  priority: 0.85 },
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

  // Drip gate — visible-slug sets per DB-backed type. `null` means the gate is
  // off (or errored → fail open) → emit everything as before. MDX loops below
  // (guides/pricing/best) inherit the gate via getAllMdx* and need no extra
  // filtering here. /tools and /alternatives are emitted from the same `tools`
  // rows but gate independently — a tool can be live while its alternatives
  // page is still queued, or vice versa.
  const [visTools, visAlts, visCmp] = await Promise.all([
    getVisibleSet("tools"),
    getVisibleSet("alternatives"),
    getVisibleSet("comparisons"),
  ])

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
    // Drip gate — emit /tools/{slug} only when visible (or gate off).
    if (!visTools || visTools.has(t.slug)) {
      const path = `/tools/${t.slug}`
      routes.push({
        url:             absoluteUrl(path),
        lastModified:    new Date(t.updated_at),
        changeFrequency: "weekly",
        priority:        0.7,
        alternates:      alternates(path),
      })
    }

    // Block F (May 2026): /alternatives/[slug] pSEO sibling. Same lastmod
    // as the tool row — the alternatives grid is computed from the same
    // data, so whenever the tool record updates the listicle re-ranks.
    // Gates independently from /tools above (its own drip unit).
    if (!visAlts || visAlts.has(t.slug)) {
      const altPath = `/alternatives/${t.slug}`
      routes.push({
        url:             absoluteUrl(altPath),
        lastModified:    new Date(t.updated_at),
        changeFrequency: "weekly",
        priority:        0.65,
        alternates:      alternates(altPath),
      })
    }
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
    // Drip gate — skip comparisons not yet publicly visible.
    if (visCmp && !visCmp.has(c.slug)) continue
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

  // ----- Pricing deep-dives (Etap J-generate, MDX) --------------------------
  // Etap J-generate (2026-06-03): /pricing/{slug} is the intent-split
  // companion to /tools/{slug}. SERP audit showed pricing-intent keys
  // ("X pricing", 10/10 top-10 are dedicated pages) need a dedicated
  // canonical surface — emitted here at priority 0.78, slightly above
  // guides (0.75) because the bucket is high-commercial-intent.
  const pricingEntries = await getAllMdxFrontmatter("pricing", "en")
  for (const { slug, frontmatter } of pricingEntries) {
    const path = `/pricing/${slug}`
    routes.push({
      url:             absoluteUrl(path),
      lastModified:    new Date(frontmatter.updatedAt ?? frontmatter.publishedAt),
      changeFrequency: "monthly",
      priority:        0.78,
      alternates:      alternates(path),
    })
  }
  const ruPricingSlugs = await getAllMdxSlugs("pricing", "ru")
  for (const slug of ruPricingSlugs) {
    routes.push({
      url:             absoluteUrl(`/ru/pricing/${slug}`),
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.7,
    })
  }

  // ----- Best-of listicles (MDX, same pattern as guides) -------------------
  // Phase A+B (2026-06-03): the 8 /best/[slug] surfaces (Etap G) were
  // missing from the sitemap entirely. Emit them here under the same
  // build-time slug walk as guides, with their MDX `updatedAt` as
  // lastModified.
  const bestEntries = await getAllMdxFrontmatter("best", "en")
  for (const { slug, frontmatter } of bestEntries) {
    const path = `/best/${slug}`
    routes.push({
      url:             absoluteUrl(path),
      lastModified:    new Date(frontmatter.updatedAt ?? frontmatter.publishedAt),
      changeFrequency: "monthly",
      priority:        0.75,
      alternates:      alternates(path),
    })
  }
  // RU best-of translations land later — emit RU URLs only when a
  // `content/best/ru/{slug}.mdx` file actually exists. Today every EN
  // best-of has an RU mirror (Etap G), so this loop reflects the live set.
  const ruBestSlugs = await getAllMdxSlugs("best", "ru")
  for (const slug of ruBestSlugs) {
    routes.push({
      url:             absoluteUrl(`/ru/best/${slug}`),
      lastModified:    now,
      changeFrequency: "monthly",
      priority:        0.7,
    })
  }

  return routes
}
