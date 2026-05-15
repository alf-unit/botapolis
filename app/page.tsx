import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  Headphones,
  Mail,
  Megaphone,
  PenLine,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ComparisonCard } from "@/components/tools/ComparisonCard"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getAllMdxFrontmatter } from "@/lib/content/mdx"
import { createServiceClient } from "@/lib/supabase/service"
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from "@/lib/seo/schema"
import type { ComparisonRow, ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   Homepage Wave 1 data fetches
   ----------------------------------------------------------------------------
   `fetchHomeComparisons` — 4 latest published comparisons in the active
   locale, joined with their two referenced tools. Mirrors the two-step
   pattern from /compare/page.tsx (Postgres "Relationships: NoRels" in our
   handwritten types makes embed-syntax collapse to never, so we fan-out
   the tool IDs and resolve in-memory).

   `fetchLatestReviews` — 3 newest published MDX reviews via the shared
   loader. `getAllMdxFrontmatter` already sorts by publishedAt DESC and
   skips drafts, so we just slice the head.

   Both helpers swallow errors → empty array. Homepage never 500s because
   the operational store table isn't ready yet — the section simply hides
   when there's nothing to show.
---------------------------------------------------------------------------- */

type HomeComparisonRow = {
  comparison: Pick<ComparisonRow, "slug" | "tool_a_id" | "tool_b_id" | "verdict">
  toolA: Pick<ToolRow, "slug" | "name" | "logo_url">
  toolB: Pick<ToolRow, "slug" | "name" | "logo_url">
}

async function fetchHomeComparisons(
  language: "en" | "ru",
): Promise<HomeComparisonRow[]> {
  try {
    const supabase = createServiceClient()
    const { data: cmps, error: cmpErr } = await supabase
      .from("comparisons")
      .select("slug, tool_a_id, tool_b_id, verdict, updated_at")
      .eq("status", "published")
      .eq("language", language)
      .order("updated_at", { ascending: false })
      .limit(4)
    if (cmpErr || !cmps || cmps.length === 0) return []

    const ids = Array.from(
      new Set(cmps.flatMap((c) => [c.tool_a_id, c.tool_b_id])),
    )
    const { data: tools, error: toolsErr } = await supabase
      .from("tools")
      .select("id, slug, name, logo_url")
      .in("id", ids)
    if (toolsErr || !tools) return []

    const byId = new Map(tools.map((t) => [t.id, t]))
    return cmps.reduce<HomeComparisonRow[]>((acc, c) => {
      const a = byId.get(c.tool_a_id)
      const b = byId.get(c.tool_b_id)
      if (!a || !b) return acc
      acc.push({
        comparison: {
          slug:       c.slug,
          tool_a_id:  c.tool_a_id,
          tool_b_id:  c.tool_b_id,
          verdict:    c.verdict,
        },
        toolA: { slug: a.slug, name: a.name, logo_url: a.logo_url },
        toolB: { slug: b.slug, name: b.name, logo_url: b.logo_url },
      })
      return acc
    }, [])
  } catch (err) {
    console.error("[homepage] comparisons fetch threw:", err)
    return []
  }
}

async function fetchLatestReviews(locale: "en" | "ru") {
  try {
    const all = await getAllMdxFrontmatter("reviews", locale)
    return all.slice(0, 3)
  } catch (err) {
    console.error("[homepage] reviews fetch threw:", err)
    return []
  }
}

// ISR — same window as the rest of the site. /compare and /reviews/page.tsx
// both refresh on Supabase / MDX mutations via /api/revalidate, so the
// homepage picks up changes within a deploy or webhook cycle.
export const revalidate = 3600

export default async function HomePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix = locale === "ru" ? "/ru" : ""

  // Parallel fetch — homepage's heaviest data calls. `Promise.all` keeps
  // total wait at max(supabase, fs) rather than supabase + fs serially.
  const [homeComparisons, latestReviews] = await Promise.all([
    fetchHomeComparisons(locale),
    fetchLatestReviews(locale),
  ])

  // Featured-tool icon map. Keys MUST mirror `dict.tools.items` and the
  // slug map below — three calculators we actually ship today (Email ROI,
  // AI Cost Comparator, AI Product Description Generator).
  const toolIcons = {
    emailRoi:           Mail,
    aiCostComparator:   BarChart3,
    productDescription: Sparkles,
  } as const

  // Browse-by-category tile config. Slugs match the `category` column in
  // the `tools` table so /tools?category=<slug> hydrates the catalog with
  // the right filter pre-applied.
  const categoryTiles = [
    { key: "email",     slug: "email",     Icon: Mail },
    { key: "ads",       slug: "ads",       Icon: Megaphone },
    { key: "content",   slug: "content",   Icon: PenLine },
    { key: "support",   slug: "support",   Icon: Headphones },
    { key: "analytics", slug: "analytics", Icon: BarChart3 },
    { key: "inventory", slug: "inventory", Icon: Box },
  ] as const

  return (
    <>
      <Navbar
        strings={dict.nav}
        localePrefix={localePrefix as "" | "/ru"}
      />

      <main className="flex flex-col">
        {/* =========================================================
            HERO
            Two-column layout on desktop. Left: copy + CTAs +
            social proof. Right: live Email-ROI demo widget.
            Background: mint + violet radial glows for depth.
           ========================================================= */}
        <section className="relative overflow-hidden pt-12 lg:pt-20 pb-16 lg:pb-24">
          {/*
            Atmospheric glows — desktop only, hidden from a11y tree.

            Round 2 of the mobile audit (May 2026): even with shrunk
            size + GPU-promoted layers, the radial blobs were still
            costing iOS Safari noticeable scroll-frame budget. At
            375 px viewport their visual contribution was already
            faint — the wider section padding + `overflow: hidden`
            clipped out the bulk of the glow halo anyway.

            `hidden lg:block` cuts them out of the mobile render tree
            entirely (no paint cost, no layer compositing) while
            preserving the rich-mode effect on desktop hero, which
            has the GPU headroom and the wider canvas to actually
            display them.

            `transform: translateZ(0)` + `will-change: transform`
            remain on the desktop instances so the blur is rasterised
            once per resize, not per frame.
          */}
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute -top-40 -right-40 size-[700px] rounded-full opacity-50 blur-[100px] [transform:translateZ(0)] [will-change:transform]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.22), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute -bottom-60 left-1/3 size-[600px] rounded-full opacity-40 blur-[120px] [transform:translateZ(0)] [will-change:transform]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.18), transparent 60%)",
            }}
          />

          <div className="container-default relative">
            <div className="grid gap-12 lg:gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              {/* Left column */}
              <div className="flex flex-col gap-6 max-w-xl">
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {dict.hero.eyebrow}
                </span>

                <h1 className="text-display font-semibold tracking-[-0.04em] text-[var(--text-primary)] [text-wrap:balance]">
                  {dict.hero.headline}
                </h1>

                <p className="text-lg leading-[1.6] text-[var(--text-secondary)]">
                  {dict.hero.lede}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Link
                    href={`${localePrefix}/tools`}
                    className={cn(
                      // Switched May 2026 from inline gradient style →
                      // `cta` variant. Same mint gradient + adds glow,
                      // hover-shimmer and press ripple. See globals.css §7.
                      buttonVariants({ variant: "cta", size: "lg" }),
                      "h-12 px-5 text-base",
                    )}
                  >
                    {dict.hero.ctaPrimary}
                    <ArrowRight className="size-4" data-icon="inline-end" />
                  </Link>
                  <Link
                    // Sprint 2 (May 2026) shipped the MDX pipeline, so /reviews
                    // now resolves to a real index. Restored the design-intent
                    // CTA target — Wave 1 audit alignment (Botapolis design v.026).
                    href={`${localePrefix}/reviews`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-12 px-5 text-base border-[var(--border-base)]",
                    )}
                  >
                    {dict.hero.ctaSecondary}
                  </Link>
                </div>

                {/* Social proof row */}
                <div className="flex flex-wrap items-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      <span className="size-6 rounded-full border-2 border-[var(--bg-base)] bg-[#A7F3D0]" />
                      <span className="size-6 rounded-full border-2 border-[var(--bg-base)] bg-[#C4B5FD] -ml-1.5" />
                      <span className="size-6 rounded-full border-2 border-[var(--bg-base)] bg-[#FCD34D] -ml-1.5" />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {dict.hero.social}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-[var(--text-secondary)]">
                    <span className="text-[var(--brand)]">★★★★★</span>
                    <span className="font-mono">4.9</span>
                    <span>·</span>
                    <span>{dict.hero.rating}</span>
                  </div>
                </div>
              </div>

              {/* Right column: demo widget */}
              <DemoWidget strings={dict.hero.widget} />
            </div>
          </div>
        </section>

        {/* =========================================================
            FEATURED TOOLS
           ========================================================= */}
        <section className="pb-16 lg:pb-20">
          <div className="container-default">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                  {dict.tools.title}
                </h2>
                <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                  {dict.tools.subtitle}
                </p>
              </div>
              <Link
                href={`${localePrefix}/tools`}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
              >
                {dict.tools.viewAll}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(["emailRoi", "aiCostComparator", "productDescription"] as const).map((key) => {
                const item = dict.tools.items[key]
                const Icon = toolIcons[key]
                // Each featured-tool key maps to its actual /tools/{slug}
                // route. Audit (May 2026) confirmed all three resolve to 200.
                const slug =
                  key === "emailRoi"
                    ? "email-roi-calculator"
                    : key === "aiCostComparator"
                    ? "ai-cost-comparator"
                    : "product-description"
                return (
                  <Link
                    key={key}
                    href={`${localePrefix}/tools/${slug}`}
                    className={cn(
                      "group flex flex-col gap-4 rounded-xl p-6",
                      "bg-[var(--bg-surface)] border border-[var(--border-base)]",
                      "shadow-[var(--shadow-sm)]",
                      "transition-all duration-200 ease-[var(--ease-out-expo)]",
                      "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <span
                      className="inline-flex size-10 items-center justify-center rounded-md"
                      style={{
                        background:
                          "color-mix(in oklch, var(--brand) 12%, transparent)",
                        color: "var(--brand)",
                      }}
                    >
                      <Icon className="size-5" strokeWidth={1.5} />
                    </span>

                    <h3 className="text-[18px] font-semibold leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-[1.6]">
                      {item.desc}
                    </p>

                    <div className="mt-1 flex items-baseline justify-between rounded-md border border-[var(--border-base)] bg-[var(--bg-muted)] px-3 py-2.5">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                        {item.metric}
                      </span>
                      <span className="font-mono text-[18px] font-medium text-[var(--brand)]">
                        {item.value}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                        {item.category}
                      </span>
                      <ArrowRight
                        className="size-4 text-[var(--text-tertiary)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            HEAD-TO-HEAD COMPARISONS
            ----------------------------------------------------------
            Wave 1 audit alignment (Botapolis design v.026). Mirrors the
            "Head-to-head comparisons" 4-card row from the homepage
            mockup. Data comes from Supabase `comparisons` filtered by
            the active locale; missing → section hides entirely
            (operational graceful degradation, see fetcher above).
           ========================================================= */}
        {homeComparisons.length > 0 && (
          <section className="pb-16 lg:pb-20">
            <div className="container-default">
              <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                    {dict.comparisons.title}
                  </h2>
                  <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                    {dict.comparisons.subtitle}
                  </p>
                </div>
                <Link
                  href={`${localePrefix}/compare`}
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
                >
                  {dict.comparisons.viewAll}
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {homeComparisons.map(({ comparison, toolA, toolB }) => (
                  <ComparisonCard
                    key={comparison.slug}
                    slug={comparison.slug}
                    toolA={{
                      slug:    toolA.slug,
                      name:    toolA.name,
                      logoUrl: toolA.logo_url,
                    }}
                    toolB={{
                      slug:    toolB.slug,
                      name:    toolB.name,
                      logoUrl: toolB.logo_url,
                    }}
                    verdict={comparison.verdict}
                    localePrefix={localePrefix as "" | "/ru"}
                    cta={dict.comparisons.cta}
                    verdictLabel={dict.comparisons.verdictLabel}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* =========================================================
            LATEST DEEP REVIEWS
            ----------------------------------------------------------
            Wave 1 audit alignment. Three newest published MDX reviews.
            Card style mirrors /reviews index so the homepage row and
            the listing read as a coherent set.
           ========================================================= */}
        {latestReviews.length > 0 && (
          <section className="pb-16 lg:pb-20">
            <div className="container-default">
              <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                    {dict.reviewsSection.title}
                  </h2>
                  <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                    {dict.reviewsSection.subtitle}
                  </p>
                </div>
                <Link
                  href={`${localePrefix}/reviews`}
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
                >
                  {dict.reviewsSection.viewAll}
                </Link>
              </div>

              <ul role="list" className="grid gap-4 md:grid-cols-3">
                {latestReviews.map(({ slug, frontmatter }) => (
                  <li key={slug}>
                    <Link
                      href={`${localePrefix}/reviews/${slug}`}
                      className={cn(
                        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl",
                        "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                        "shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-expo)]",
                        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                      )}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                        <span>{frontmatter.publishedAt}</span>
                        {frontmatter.rating != null && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="text-[var(--brand)]">
                              {frontmatter.rating.toFixed(1)}/10
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                        {frontmatter.title}
                      </h3>
                      <p className="text-sm leading-[1.55] text-[var(--text-secondary)] line-clamp-3">
                        {frontmatter.description}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand)]">
                        {dict.reviewsSection.readMore}
                        <ArrowUpRight
                          className="size-[14px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* =========================================================
            BROWSE BY CATEGORY
            ----------------------------------------------------------
            Wave 1 audit alignment. Six category tiles → /tools with the
            `category` query param pre-filled so the catalog opens with
            the chip already selected (ToolsCatalog reads category via
            URLSearchParams).
           ========================================================= */}
        <section className="pb-16 lg:pb-20">
          <div className="container-default">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                  {dict.categories.title}
                </h2>
                <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                  {dict.categories.subtitle}
                </p>
              </div>
            </div>

            <ul role="list" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {categoryTiles.map(({ key, slug, Icon }) => (
                <li key={key}>
                  <Link
                    href={`${localePrefix}/tools?category=${slug}`}
                    className={cn(
                      "group flex h-full flex-col gap-2 rounded-xl p-4",
                      "bg-[var(--bg-surface)] border border-[var(--border-base)]",
                      "shadow-[var(--shadow-sm)]",
                      "transition-all duration-200 ease-[var(--ease-out-expo)]",
                      "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <span
                      className="inline-flex size-8 items-center justify-center rounded-md"
                      style={{
                        background:
                          "color-mix(in oklch, var(--brand) 12%, transparent)",
                        color: "var(--brand)",
                      }}
                    >
                      <Icon className="size-4" strokeWidth={1.5} />
                    </span>
                    <h3 className="text-[15px] font-semibold leading-snug">
                      {dict.categories.items[key]}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* BUG-FIX (May 2026 polish): removed the standalone homepage
            newsletter feature card. The Footer (rendered immediately
            below) already ships an identical card with the SAME eyebrow,
            title, subtitle, form, and footnote — on desktop the two were
            visually separated, on mobile they stacked back-to-back and
            read as a duplicate "Get the operator's brief" block. Source
            attribution stays clean: the Footer's form posts with
            `source: "footer"`, so analytics still distinguish subscribers
            who came from page-level CTAs (in-article cards, hero buttons)
            from the always-present footer strip. */}
      </main>

      <Footer
        strings={{
          tagline: dict.footer.tagline,
          copyright: dict.footer.copyright,
          columns: dict.footer.columns,
          links: dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix as "" | "/ru"}
      />

      {/* Block C — Organization + WebSite JSON-LD. Emit on both EN and RU
          homepages (RU re-exports this same module). The WebSite node ships
          a SearchAction so Google's sitelinks search box can surface our
          search modal once block D wires Pagefind. Until then the URL
          template still resolves — Google just won't render the box. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateOrganizationSchema()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateWebSiteSchema()),
        }}
      />
    </>
  )
}

/* ----------------------------------------------------------------------------
   Hero · DemoWidget — Email ROI calculator preview (visual only on homepage;
   the live calculator lives at /tools/email-roi-calculator).
   ----------------------------------------------------------------------------
   BUG-FIX (May 2026 audit · TZ fixes #5): until the audit, this preview
   advertised "Estimated monthly revenue: $18,420" against inputs that
   couldn't reproduce that figure under any plausible formula. The
   "AI · live" badge implied the number was real-time, which made the
   broken math worse — visitors could compute the inconsistency.

   The fix is "Variant A" from the TZ: a static mockup whose numbers
   *do* reconcile under the same formula the live calculator uses, with
   an explicit "Sample · Email ROI" badge so no one confuses it for a
   personalised live estimate.

   Math (matches /tools/email-roi-calculator):
     subs    = 12,500
     sends   = subs × 4/mo = 50,000
     opens   = sends × 28%  = 14,000
     clicks  = opens × 15%  = 2,100      (CTO, not CTR)
     orders  = clicks × 2.5% = 52.5
     revenue = orders × $84  = $4,410/mo
---------------------------------------------------------------------------- */
function DemoWidget({
  strings,
}: {
  strings: {
    badge: string
    title: string
    try: string
    subscribers: string
    openRate: string
    cto: string
    aov: string
    resultLabel: string
    resultMeta: string
  }
}) {
  // Slider-fill % are visual hints only — picked to look balanced, not
  // computed from the input values (these inputs aren't user-editable).
  //
  // Wave 1 audit alignment (Botapolis design v.026): widget shows three
  // sliders only — Subs / Open / AOV — matching mockups/homepage.html. The
  // 2.5% click-to-order assumption stays implicit in the result-meta line
  // since the math doesn't change. `strings.cto` is intentionally left in
  // the dictionary so the live calculator at /tools/email-roi-calculator
  // (which DOES expose CTO as a knob) keeps its locale key.
  const rows = [
    { label: strings.subscribers, value: "12,500", fill: 42 },
    { label: strings.openRate,    value: "28%",    fill: 47 },
    { label: strings.aov,         value: "$84",    fill: 34 },
  ]

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-x-6 -bottom-2 h-12 rounded-full blur-2xl opacity-40"
        style={{ background: "var(--brand)" }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]">
        {/* Head */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[var(--bg-muted)] border-b border-[var(--border-base)]">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ background: "var(--gradient-hero)" }}
            >
              {strings.badge}
            </span>
            <span className="text-sm font-semibold">{strings.title}</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {strings.try}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3.5 p-5">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-2">
              <label className="flex items-center justify-between text-[13px] font-medium">
                <span>{row.label}</span>
                <span className="font-mono text-[var(--text-secondary)] tabular-nums">
                  {row.value}
                </span>
              </label>
              <div className="relative h-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-base)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)]"
                  style={{ width: `${row.fill}%`, top: -1, bottom: -1 }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--brand)] shadow-[0_0_0_6px_var(--focus-ring)]"
                  style={{ left: `${row.fill}%` }}
                />
              </div>
            </div>
          ))}

          <div
            className="mt-2 flex flex-col gap-1 rounded-md border p-4"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklch, var(--brand) 8%, transparent), transparent)",
              borderColor:
                "color-mix(in oklch, var(--brand) 22%, transparent)",
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--brand)]">
              {strings.resultLabel}
            </span>
            <span className="font-mono text-[36px] font-medium leading-none tracking-[-0.02em] tabular-nums">
              $4,410
            </span>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {strings.resultMeta}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
