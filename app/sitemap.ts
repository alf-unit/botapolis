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
import { absoluteUrl } from "@/lib/utils"

// Sitemap revalidation budget: hourly is plenty for a docs-style site.
export const revalidate = 3600

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
  { path: "/reviews",      changeFrequency: "daily",   priority: 0.9 },
  { path: "/guides",       changeFrequency: "weekly",  priority: 0.8 },
  { path: "/directory",    changeFrequency: "daily",   priority: 0.9 },
  { path: "/best",         changeFrequency: "weekly",  priority: 0.7 },
  { path: "/news",         changeFrequency: "daily",   priority: 0.7 },
  { path: "/blog",         changeFrequency: "weekly",  priority: 0.7 },
  { path: "/about",        changeFrequency: "monthly", priority: 0.5 },
  { path: "/methodology",  changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact",      changeFrequency: "yearly",  priority: 0.3 },
  { path: "/legal/privacy",              changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/terms",                changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/affiliate-disclosure", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookie-policy",        changeFrequency: "yearly", priority: 0.2 },
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
    const path = `/directory/${t.slug}`
    routes.push({
      url:             absoluteUrl(path),
      lastModified:    new Date(t.updated_at),
      changeFrequency: "weekly",
      priority:        0.7,
      alternates:      alternates(path),
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

  return routes
}
