import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowUpRight, Check, ExternalLink, Minus } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { PageViewEvent } from "@/components/analytics/PageViewEvent"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { ProsConsList } from "@/components/tools/ProsConsList"
import {
  ComparisonTable,
  type ComparisonFeatureRow,
} from "@/components/tools/ComparisonTable"
import { buttonVariants } from "@/components/ui/button"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateSoftwareApplicationSchema,
} from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn, formatPrice } from "@/lib/utils"
import { canonicalCompareSlug, isCanonicalCompareSlug } from "@/lib/content/slug"
import { getToolRatings } from "@/lib/content/rating"
import {
  diffIntegrations,
  generateAtAGlance,
  generatePricingNarrative,
  generateVerdictFallback,
} from "@/lib/content/pseo"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /compare/[slug] — head-to-head comparison page
   ----------------------------------------------------------------------------
   SSG via generateStaticParams (try/catch — `dynamicParams = true` lets
   unbuilt slugs render on-demand and 404 cleanly). ISR 24 h: comparison
   content shifts slowly, and a Supabase webhook calls /api/revalidate?path=
   /compare/<slug> on edits so urgent fixes still land within seconds.

   TZ-2 originally specified a catch-all `[...slug]`, but Next 16's file
   conventions (the colocated `opengraph-image.tsx`) forbid file routes
   inside a catch-all — catch-all must always be the last URL part. Since
   every seeded comparison slug is single-segment ("klaviyo-vs-mailchimp"),
   a plain `[slug]` is functionally identical and unblocks the OG file. If
   we ever want nested URLs (e.g. /compare/category/x-vs-y) we can layer in
   a parent segment without breaking existing routes.

   `comparison_data` is JSONB with no enforced schema; we parse it
   defensively. Missing structure is fine — the page degrades gracefully to
   verdict + CTAs only.
---------------------------------------------------------------------------- */

export const revalidate = 86400
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

// ============================================================================
// Comparison data — runtime-validated shape
// ----------------------------------------------------------------------------
// We don't enforce these keys at the DB layer (jsonb is intentionally open),
// so every accessor below treats undefined / wrong-type as "skip this
// section". The parser is the only place that touches `unknown` directly.
// ============================================================================
interface ParsedComparisonData {
  quickStats: Array<{ label: string; a: string; b: string }>
  features:   ComparisonFeatureRow[]
  pricing:    { headline?: string; a?: string; b?: string; details?: string } | null
  useCases:   Array<{ title: string; winnerSlug: string; reasoning: string }>
}

function parseComparisonData(
  raw: Record<string, unknown> | null,
): ParsedComparisonData {
  const empty: ParsedComparisonData = {
    quickStats: [],
    features:   [],
    pricing:    null,
    useCases:   [],
  }
  if (!raw || typeof raw !== "object") return empty

  const quickStats = Array.isArray(raw.quickStats)
    ? raw.quickStats.filter(
        (s): s is { label: string; a: string; b: string } =>
          !!s &&
          typeof s === "object" &&
          typeof (s as { label?: unknown }).label === "string" &&
          typeof (s as { a?: unknown }).a === "string" &&
          typeof (s as { b?: unknown }).b === "string",
      )
    : []

  const features = Array.isArray(raw.features)
    ? raw.features.flatMap((f): ComparisonFeatureRow[] => {
        if (!f || typeof f !== "object") return []
        const row = f as Record<string, unknown>
        const feature = row.feature ?? row.name
        if (typeof feature !== "string") return []
        const coerce = (v: unknown) => {
          if (typeof v === "boolean") return v
          if (typeof v === "string") return v
          if (v === null) return null
          return null
        }
        const note = typeof row.note === "string" ? row.note : undefined
        return [{ feature, a: coerce(row.a), b: coerce(row.b), note }]
      })
    : []

  let pricing: ParsedComparisonData["pricing"] = null
  if (raw.pricing && typeof raw.pricing === "object") {
    const p = raw.pricing as Record<string, unknown>
    pricing = {
      headline: typeof p.headline === "string" ? p.headline : undefined,
      a:        typeof p.a        === "string" ? p.a        : undefined,
      b:        typeof p.b        === "string" ? p.b        : undefined,
      details:  typeof p.details  === "string" ? p.details  : undefined,
    }
  }

  const useCases = Array.isArray(raw.useCases)
    ? raw.useCases.flatMap((u) => {
        if (!u || typeof u !== "object") return []
        const row = u as Record<string, unknown>
        if (
          typeof row.title       !== "string" ||
          typeof row.winnerSlug  !== "string" ||
          typeof row.reasoning   !== "string"
        ) return []
        return [{ title: row.title, winnerSlug: row.winnerSlug, reasoning: row.reasoning }]
      })
    : []

  return { quickStats, features, pricing, useCases }
}

// ============================================================================
// Data
// ============================================================================

interface RelatedComparison {
  slug: string
  toolA: { slug: string; name: string; logo_url: string | null }
  toolB: { slug: string; name: string; logo_url: string | null }
  verdict: string | null
}

/**
 * Fetch up to N other published comparisons that share at least one tool
 * with the current pair. Results exclude the current comparison and
 * unpublished rows. Tool metadata (name + logo) is hydrated in a single
 * second query so we don't N+1 the cards.
 */
async function fetchRelatedComparisons(
  currentSlug:   string,
  toolAId:       string,
  toolBId:       string,
  limit:         number,
): Promise<RelatedComparison[]> {
  try {
    const supabase = createServiceClient()
    // Match either tool on either side. The `.or()` filter keeps this
    // server-side rather than fanning out to four queries.
    const { data: rows, error } = await supabase
      .from("comparisons")
      .select("slug, tool_a_id, tool_b_id, verdict")
      .eq("status",   "published")
      .eq("language", "en")
      .neq("slug",    currentSlug)
      .or(
        `tool_a_id.eq.${toolAId},tool_a_id.eq.${toolBId},tool_b_id.eq.${toolAId},tool_b_id.eq.${toolBId}`,
      )
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (error || !rows || rows.length === 0) return []

    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.tool_a_id, r.tool_b_id])),
    )
    const { data: tools } = await supabase
      .from("tools")
      .select("id, slug, name, logo_url")
      .in("id", ids)

    const byId = new Map(tools?.map((t) => [t.id, t]) ?? [])
    return rows
      .map((r): RelatedComparison | null => {
        const a = byId.get(r.tool_a_id)
        const b = byId.get(r.tool_b_id)
        if (!a || !b) return null
        return {
          slug:    r.slug,
          toolA:   { slug: a.slug, name: a.name, logo_url: a.logo_url },
          toolB:   { slug: b.slug, name: b.name, logo_url: b.logo_url },
          verdict: r.verdict,
        }
      })
      .filter((r): r is RelatedComparison => r !== null)
  } catch (err) {
    console.error(`[/compare] related fetch threw:`, err)
    return []
  }
}

async function fetchComparison(slug: string) {
  try {
    const supabase = createServiceClient()
    const { data: cmp, error: cmpErr } = await supabase
      .from("comparisons")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (cmpErr) {
      console.error(`[/compare/${slug}] comparison fetch failed:`, cmpErr.message)
      return null
    }
    if (!cmp) return null

    // Hydrate both tools in parallel — independent reads, no need to serialize.
    const [{ data: toolA }, { data: toolB }] = await Promise.all([
      supabase.from("tools").select("*").eq("id", cmp.tool_a_id).maybeSingle(),
      supabase.from("tools").select("*").eq("id", cmp.tool_b_id).maybeSingle(),
    ])

    if (!toolA || !toolB) {
      console.error(
        `[/compare/${slug}] missing tool — a:${!!toolA} b:${!!toolB}`,
      )
      return null
    }

    return { comparison: cmp, toolA, toolB }
  } catch (err) {
    console.error(`[/compare/${slug}] fetch threw:`, err)
    return null
  }
}

// ============================================================================
// generateStaticParams — try/catch with dynamicParams=true (TZ-2 spec)
// ============================================================================
export async function generateStaticParams() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("comparisons")
      .select("slug")
      .eq("status", "published")
      .eq("language", "en")
      .limit(1000)
    if (error || !data) return []
    return data.map((c) => ({ slug: c.slug }))
  } catch {
    // Migration may not be applied to this DB yet; dynamicParams covers it.
    return []
  }
}

// ============================================================================
// Metadata
// ============================================================================
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  // Always advertise the canonical URL even if the visitor landed on the
  // reverse form — search engines following the canonical pointer end
  // up on the same page the runtime redirect below sends humans to.
  const canonicalSlug = canonicalCompareSlug(slug)
  const row = await fetchComparison(canonicalSlug)

  if (!row) {
    return buildMetadata({
      title:       "Comparison not found",
      description: "We couldn't find this comparison.",
      path:        `/compare/${canonicalSlug}`,
      locale,
      noIndex:     true,
    })
  }

  const { comparison, toolA, toolB } = row
  const title =
    comparison.meta_title ??
    `${toolA.name} vs ${toolB.name} · honest 2026 comparison`
  const description =
    comparison.meta_description ??
    comparison.verdict ??
    `Compare ${toolA.name} and ${toolB.name} on pricing, features, and Shopify integration.`

  const ogPath = `/compare/${canonicalSlug}/opengraph-image`

  return buildMetadata({
    title,
    description,
    path:    `/compare/${canonicalSlug}`,
    locale,
    ogImage: ogPath,
    type:    "article",
    article: {
      publishedTime: comparison.created_at,
      modifiedTime:  comparison.updated_at,
      author:        "Botapolis editorial",
      section:       "comparison",
      tags:          [toolA.slug, toolB.slug, "comparison", "shopify"],
    },
    keywords: [
      toolA.name,
      toolB.name,
      `${toolA.name} vs ${toolB.name}`,
      "shopify",
      "comparison",
    ],
  })
}

// ============================================================================
// Page
// ============================================================================
export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params

  // BUG-FIX (May 2026 audit · TZ fixes #1): a single comparison should
  // resolve to one URL. If the visitor hit the reverse-ordered slug
  // (e.g. /compare/omnisend-vs-klaviyo when the canonical is
  // klaviyo-vs-omnisend), 301 to the canonical form. Migration 004
  // prevents the DB from holding both forms, but link-rot and old
  // backlinks still point at reversed slugs in the wild.
  //
  // The locale-aware path is preserved (proxy.ts sets x-locale from
  // /ru prefix; this handler lives under /compare and /ru/compare both
  // re-export it, so a bare path works in either tree).
  if (!isCanonicalCompareSlug(slug)) {
    const locale = await getLocale()
    const prefix = locale === "ru" ? "/ru" : ""
    redirect(`${prefix}/compare/${canonicalCompareSlug(slug)}`)
  }

  const row = await fetchComparison(slug)
  if (!row) notFound()

  const { comparison, toolA: rawToolA, toolB: rawToolB } = row
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // BUG-FIX (May 2026 audit · TZ fixes #3): MDX-resolved rating wins
  // over the DB cache so the compare page never disagrees with the
  // detail review for the same tool.
  const ratings = await getToolRatings([rawToolA, rawToolB], locale as "en" | "ru")
  const toolA: ToolRow = { ...rawToolA, rating: ratings.get(rawToolA.slug) ?? rawToolA.rating }
  const toolB: ToolRow = { ...rawToolB, rating: ratings.get(rawToolB.slug) ?? rawToolB.rating }

  const parsed = parseComparisonData(comparison.comparison_data)

  // BUG-FIX (May 2026 audit · TZ fixes #2): the compare page used to
  // render a near-empty shell when comparison_data was unset (which is
  // the case for every seeded row today). We now derive Quick stats,
  // Pricing, Features, Integrations, Pros & Cons, and Related directly
  // from the `tools` columns so the page is a real comparison even
  // before editorial fills out comparison_data.
  const related = await fetchRelatedComparisons(slug, toolA.id, toolB.id, 6)
  const integrations = diffIntegrations(toolA, toolB)
  const aHasShopifyPlus = toolA.integrations?.includes("shopify-plus") ?? false
  const bHasShopifyPlus = toolB.integrations?.includes("shopify-plus") ?? false
  const aHasShopify     = toolA.integrations?.includes("shopify")      ?? false
  const bHasShopify     = toolB.integrations?.includes("shopify")      ?? false

  // i18n strings — local until comparisons earn a dict section.
  const t = {
    breadcrumbHome:  locale === "ru" ? "Главная" : "Home",
    eyebrow:         locale === "ru" ? "Сравнение" : "Comparison",
    introHeading:    locale === "ru" ? "Кратко"             : "At a glance",
    quickStatsHeading: locale === "ru" ? "Быстрая сводка"   : "Quick stats",
    pricingHeading:  locale === "ru" ? "Цены"               : "Pricing",
    featuresHeading: locale === "ru" ? "Возможности"        : "Features",
    integrationsHeading: locale === "ru" ? "Интеграции"     : "Integrations",
    shopifyHeading:  locale === "ru" ? "Shopify-интеграция" : "Shopify integration",
    supportHeading:  locale === "ru" ? "Поддержка"          : "Customer support",
    prosConsHeading: locale === "ru" ? "Плюсы и минусы"     : "Pros & cons",
    useCasesHeading: locale === "ru" ? "Когда что лучше"    : "When each one wins",
    verdictHeading:  locale === "ru" ? "Наш вердикт"        : "Our verdict",
    methodologyHeading: locale === "ru" ? "Методология"     : "Methodology",
    relatedHeading:  locale === "ru" ? "Связанные сравнения" : "Related comparisons",
    tryA:           locale === "ru" ? `Открыть ${toolA.name}` : `Try ${toolA.name}`,
    tryB:           locale === "ru" ? `Открыть ${toolB.name}` : `Try ${toolB.name}`,
    visitA:         locale === "ru" ? "Сайт"  : "Website",
    visitB:         locale === "ru" ? "Сайт"  : "Website",
    affiliateNote:  locale === "ru"
      ? "Партнёрская ссылка. Цены и условия определяет вендор."
      : "Affiliate link. Pricing and terms are set by the vendor.",
    affiliateDetails: locale === "ru" ? "подробнее" : "details",
    bestFor:        locale === "ru" ? "Лучше выбрать" : "Pick this when",
    featureCol:     locale === "ru" ? "Параметр"      : "Feature",
    winner:         locale === "ru" ? "Победитель"    : "Winner",
    pros:           locale === "ru" ? "Плюсы"         : "Pros",
    cons:           locale === "ru" ? "Минусы"        : "Cons",
    bothLabel:      locale === "ru" ? "У обоих"       : "Both",
    onlyLabel:      locale === "ru" ? "Только у"      : "Only",
    rating:         locale === "ru" ? "Оценка"        : "Rating",
    integrationsCount: locale === "ru" ? "Интеграций" : "Integrations",
    startingPrice:  locale === "ru" ? "Старт от"      : "Starting price",
    perMonth:       locale === "ru" ? "/мес"          : "/mo",
    upTo:           locale === "ru" ? "до"            : "up to",
    pricingModel:   locale === "ru" ? "Модель"        : "Model",
    shopifyDeep:    locale === "ru"
      ? "Глубокая Shopify-интеграция (включая Shopify Plus)."
      : "Deep Shopify integration (including Shopify Plus).",
    shopifyBasic:   locale === "ru"
      ? "Базовая Shopify-интеграция через стандартное приложение."
      : "Standard Shopify integration via the official app.",
    shopifyNone:    locale === "ru"
      ? "Прямая Shopify-интеграция не заявлена — нужен middleware (Zapier/Make)."
      : "No native Shopify integration listed — middleware (Zapier/Make) required.",
    noData:         locale === "ru" ? "Пока без данных" : "No data yet",
    moreCount:      locale === "ru" ? "ещё" : "more",
    out_of_10:      locale === "ru" ? "из 10" : "/10",
  }

  // JSON-LD: breadcrumb + a SoftwareApplication node per tool.
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.breadcrumbHome, path: `${localePrefix}/` },
    { name: dict.nav.compare, path: `${localePrefix}/compare` },
    { name: `${toolA.name} vs ${toolB.name}`, path: `${localePrefix}/compare/${slug}` },
  ])
  const softwareA = generateSoftwareApplicationSchema(toolA)
  const softwareB = generateSoftwareApplicationSchema(toolB)

  // Intro: prefer editorial copy, else auto-narrate from the tools' data
  // so two different pairs never share identical text.
  const introCopy =
    comparison.custom_intro ?? generateAtAGlance(toolA, toolB, locale as "en" | "ru")

  const pricingNarrative = generatePricingNarrative(toolA, toolB, locale as "en" | "ru")
  const verdictBody = comparison.verdict ?? generateVerdictFallback(toolA, toolB, locale as "en" | "ru")

  // Tiny support summary: pulls from `not_for` so the section says
  // something concrete instead of a stock "both are responsive" line.
  const supportNarrative =
    locale === "ru"
      ? `${toolA.name}: ${toolA.not_for ? `не подходит, когда ${toolA.not_for.toLowerCase()}.` : "стандартная email/chat поддержка по тарифу."} ${toolB.name}: ${toolB.not_for ? `не подходит, когда ${toolB.not_for.toLowerCase()}.` : "стандартная email/chat поддержка по тарифу."}`
      : `${toolA.name}: ${toolA.not_for ? `not the right pick when ${toolA.not_for.toLowerCase()}.` : "standard email/chat support per plan."} ${toolB.name}: ${toolB.not_for ? `not the right pick when ${toolB.not_for.toLowerCase()}.` : "standard email/chat support per plan."}`

  const shopifyNarrative = (tool: ToolRow): string => {
    const hasPlus  = tool.integrations?.includes("shopify-plus")
    const hasCore  = tool.integrations?.includes("shopify")
    if (hasPlus) return t.shopifyDeep
    if (hasCore) return t.shopifyBasic
    return t.shopifyNone
  }

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* ==================================================================
            HERO — Tool A vs Tool B
            ================================================================== */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-45 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)",
            }}
          />

          <div className="container-default relative pt-10 pb-12 lg:pt-14 lg:pb-16">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
            >
              <Link
                href={`${localePrefix}/`}
                className="hover:text-[var(--text-secondary)]"
              >
                {t.breadcrumbHome}
              </Link>
              <span className="opacity-60">/</span>
              <Link
                href={`${localePrefix}/compare`}
                className="hover:text-[var(--text-secondary)]"
              >
                {dict.nav.compare}
              </Link>
              <span className="opacity-60">/</span>
              <span className="text-[var(--text-secondary)]">
                {toolA.name} vs {toolB.name}
              </span>
            </nav>

            <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t.eyebrow}
            </p>

            {/* Title */}
            <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-4xl">
              {toolA.name}{" "}
              <span className="text-[var(--text-tertiary)] font-mono text-[0.7em] align-middle">
                vs
              </span>{" "}
              {toolB.name}
            </h1>
            {comparison.meta_description && (
              <p className="mt-4 max-w-3xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
                {comparison.meta_description}
              </p>
            )}

            {/* Logo-cards row */}
            <div className="mt-10 grid gap-4 md:gap-6 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
              <ToolCardSide
                tool={toolA}
                localePrefix={localePrefix}
                tryLabel={t.tryA}
                visitLabel={t.visitA}
              />

              {/* Vertical "VS" divider — pure CSS so we stay in the server tree */}
              <div className="flex md:flex-col items-center justify-center gap-2 md:gap-3">
                <span
                  aria-hidden="true"
                  className="hidden md:block w-px flex-1 bg-[var(--border-base)]"
                />
                <span
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full px-4",
                    "font-mono text-[12px] font-semibold uppercase tracking-[0.14em]",
                    "text-[var(--brand-fg)]",
                  )}
                  style={{ background: "var(--gradient-cta)" }}
                >
                  vs
                </span>
                <span
                  aria-hidden="true"
                  className="hidden md:block w-px flex-1 bg-[var(--border-base)]"
                />
              </div>

              <ToolCardSide
                tool={toolB}
                localePrefix={localePrefix}
                tryLabel={t.tryB}
                visitLabel={t.visitB}
              />
            </div>

            <p className="mt-6 text-[12px] text-[var(--text-tertiary)] leading-[1.5]">
              {t.affiliateNote}{" "}
              <Link
                href={`${localePrefix}/legal/affiliate-disclosure`}
                className="underline-offset-4 hover:underline"
              >
                {t.affiliateDetails}
              </Link>
            </p>
          </div>
        </section>

        {/* ==================================================================
            01 · At a glance
            ================================================================== */}
        <Section id="at-a-glance" title={t.introHeading} eyebrow="01">
          <p className="max-w-3xl text-[17px] leading-[1.7] text-[var(--text-secondary)]">
            {introCopy}
          </p>
        </Section>

        {/* ==================================================================
            02 · Quick stats (auto from tools columns; jsonb override
            below if present)
            ================================================================== */}
        <Section id="quick-stats" title={t.quickStatsHeading} eyebrow="02">
          <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatBlock
              label={t.startingPrice}
              valueA={
                toolA.pricing_min != null
                  ? formatPrice(toolA.pricing_min, { locale: locale as "en" | "ru", maximumFractionDigits: 0 }) + t.perMonth
                  : "—"
              }
              valueB={
                toolB.pricing_min != null
                  ? formatPrice(toolB.pricing_min, { locale: locale as "en" | "ru", maximumFractionDigits: 0 }) + t.perMonth
                  : "—"
              }
              nameA={toolA.name}
              nameB={toolB.name}
            />
            <StatBlock
              label={t.rating}
              valueA={toolA.rating != null ? `${toolA.rating}${t.out_of_10}` : "—"}
              valueB={toolB.rating != null ? `${toolB.rating}${t.out_of_10}` : "—"}
              nameA={toolA.name}
              nameB={toolB.name}
            />
            <StatBlock
              label={t.integrationsCount}
              valueA={`${toolA.integrations?.length ?? 0}`}
              valueB={`${toolB.integrations?.length ?? 0}`}
              nameA={toolA.name}
              nameB={toolB.name}
            />
          </ul>

          {/* Override layer: if `comparison_data.quickStats` is present in
              the DB, editorial-provided rows render below the auto row.
              Keeps the unique-content promise of TZ-2 §5.2 — hand-tuned
              copy when we have it, auto when we don't. */}
          {parsed.quickStats.length > 0 && (
            <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {parsed.quickStats.map((stat) => (
                <StatBlock
                  key={stat.label}
                  label={stat.label}
                  valueA={stat.a}
                  valueB={stat.b}
                  nameA={toolA.name}
                  nameB={toolB.name}
                />
              ))}
            </ul>
          )}
        </Section>

        {/* ==================================================================
            03 · Pricing
            ================================================================== */}
        <Section id="pricing" title={t.pricingHeading} eyebrow="03">
          <div className="grid gap-4 md:grid-cols-2">
            <PriceTierCard tool={toolA} locale={locale as "en" | "ru"} t={t} />
            <PriceTierCard tool={toolB} locale={locale as "en" | "ru"} t={t} />
          </div>
          <p className="mt-6 max-w-3xl text-[14px] leading-[1.6] text-[var(--text-secondary)]">
            {pricingNarrative}
          </p>
          {parsed.pricing?.details && (
            <p className="mt-3 max-w-3xl text-[14px] leading-[1.6] text-[var(--text-secondary)]">
              {parsed.pricing.details}
            </p>
          )}
        </Section>

        {/* ==================================================================
            04 · Features
            Auto-overlap when jsonb is empty; the editorial table wins.
            ================================================================== */}
        <Section id="features" title={t.featuresHeading} eyebrow="04">
          {parsed.features.length > 0 ? (
            <ComparisonTable
              toolA={{ name: toolA.name, slug: toolA.slug }}
              toolB={{ name: toolB.name, slug: toolB.slug }}
              rows={parsed.features}
              featureHeader={t.featureCol}
              caption={`${toolA.name} vs ${toolB.name} feature comparison`}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FeatureBucket
                toolName={toolA.name}
                features={toolA.features ?? []}
                empty={t.noData}
              />
              <FeatureBucket
                toolName={toolB.name}
                features={toolB.features ?? []}
                empty={t.noData}
              />
            </div>
          )}
        </Section>

        {/* ==================================================================
            05 · Shopify integration
            ================================================================== */}
        <Section id="shopify-integration" title={t.shopifyHeading} eyebrow="05">
          <div className="grid gap-4 md:grid-cols-2">
            <ShopifyCard
              toolName={toolA.name}
              hasShopify={aHasShopify}
              hasShopifyPlus={aHasShopifyPlus}
              narrative={shopifyNarrative(toolA)}
            />
            <ShopifyCard
              toolName={toolB.name}
              hasShopify={bHasShopify}
              hasShopifyPlus={bHasShopifyPlus}
              narrative={shopifyNarrative(toolB)}
            />
          </div>
        </Section>

        {/* ==================================================================
            06 · Integrations (Venn-style A/Both/B)
            ================================================================== */}
        <Section id="integrations" title={t.integrationsHeading} eyebrow="06">
          <div className="grid gap-4 lg:grid-cols-3">
            <IntegrationsBucket
              label={`${t.onlyLabel} ${toolA.name}`}
              items={integrations.onlyA}
              accent="brand"
              empty={t.noData}
            />
            <IntegrationsBucket
              label={t.bothLabel}
              items={integrations.both}
              accent="muted"
              empty={t.noData}
            />
            <IntegrationsBucket
              label={`${t.onlyLabel} ${toolB.name}`}
              items={integrations.onlyB}
              accent="brand"
              empty={t.noData}
            />
          </div>
        </Section>

        {/* ==================================================================
            07 · Customer support
            ================================================================== */}
        <Section id="support" title={t.supportHeading} eyebrow="07">
          <p className="max-w-3xl text-[15px] leading-[1.7] text-[var(--text-secondary)]">
            {supportNarrative}
          </p>
        </Section>

        {/* ==================================================================
            08 · Pros & Cons
            ================================================================== */}
        <Section id="pros-cons" title={t.prosConsHeading} eyebrow="08">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {toolA.name}
              </p>
              <ProsConsList
                pros={toolA.pros ?? []}
                cons={toolA.cons ?? []}
                prosLabel={t.pros}
                consLabel={t.cons}
              />
            </div>
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {toolB.name}
              </p>
              <ProsConsList
                pros={toolB.pros ?? []}
                cons={toolB.cons ?? []}
                prosLabel={t.pros}
                consLabel={t.cons}
              />
            </div>
          </div>
        </Section>

        {/* ==================================================================
            Use cases (jsonb-driven; optional)
            ================================================================== */}
        {parsed.useCases.length > 0 && (
          <Section title={t.useCasesHeading} eyebrow="09">
            <ul role="list" className="grid gap-4 md:grid-cols-2">
              {parsed.useCases.map((u) => {
                const winnerName =
                  u.winnerSlug === toolA.slug
                    ? toolA.name
                    : u.winnerSlug === toolB.slug
                      ? toolB.name
                      : u.winnerSlug
                return (
                  <li
                    key={`${u.title}-${u.winnerSlug}`}
                    className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--brand)]">
                      {t.winner}: {winnerName}
                    </p>
                    <h3 className="mt-2 text-h4 font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      {u.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                      {u.reasoning}
                    </p>
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        {/* ==================================================================
            09 · Verdict (always renders — falls back to auto narrative)
            ================================================================== */}
        <Section id="verdict" title={t.verdictHeading} eyebrow={parsed.useCases.length > 0 ? "10" : "09"}>
          <div className="relative max-w-3xl">
            <div
              aria-hidden="true"
              className="absolute -left-4 top-0 h-full w-1 rounded-full"
              style={{ background: "var(--gradient-cta)" }}
            />
            <p className="pl-6 text-[18px] lg:text-[19px] leading-[1.7] text-[var(--text-primary)]">
              {verdictBody}
            </p>
          </div>
        </Section>

        {/* ==================================================================
            Methodology (only if custom_methodology supplied)
            ================================================================== */}
        {comparison.custom_methodology && (
          <Section title={t.methodologyHeading}>
            <p className="max-w-3xl text-[15px] leading-[1.7] text-[var(--text-secondary)]">
              {comparison.custom_methodology}
            </p>
          </Section>
        )}

        {/* ==================================================================
            CTA TAIL — two-tool side-by-side
            ================================================================== */}
        <section className="container-default py-12 lg:py-16">
          <div className="grid gap-4 md:grid-cols-2">
            <CtaCard
              tool={toolA}
              localePrefix={localePrefix}
              label={t.tryA}
            />
            <CtaCard
              tool={toolB}
              localePrefix={localePrefix}
              label={t.tryB}
            />
          </div>
        </section>

        {/* ==================================================================
            10 · Related comparisons
            ================================================================== */}
        {related.length > 0 && (
          <Section id="related" title={t.relatedHeading}>
            <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`${localePrefix}/compare/${r.slug}`}
                    className={cn(
                      "group block h-full rounded-2xl border border-[var(--border-base)]",
                      "bg-[var(--bg-surface)] p-5 transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ToolLogo
                        src={r.toolA.logo_url}
                        name={r.toolA.name}
                        size={32}
                        className="shrink-0 rounded-md"
                      />
                      <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                        {r.toolA.name}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)]">vs</span>
                      <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                        {r.toolB.name}
                      </span>
                      <ToolLogo
                        src={r.toolB.logo_url}
                        name={r.toolB.name}
                        size={32}
                        className="shrink-0 rounded-md"
                      />
                    </div>
                    {r.verdict && (
                      <p className="mt-3 line-clamp-3 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                        {r.verdict}
                      </p>
                    )}
                    <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-mono text-[var(--brand)] transition-colors group-hover:text-[var(--brand-hover)]">
                      {locale === "ru" ? "Открыть" : "Open"}
                      <ArrowUpRight className="size-3" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>

      <Footer
        strings={{
          tagline:    dict.footer.tagline,
          copyright:  dict.footer.copyright,
          columns:    dict.footer.columns,
          links:      dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix}
      />

      {/* Block C — fires once on mount with the comparison metadata,
          giving PostHog a flat row per page view that joins cleanly with
          subsequent affiliate_clicked events (same `tool_a` / `tool_b`). */}
      <PageViewEvent
        event="comparison_viewed"
        properties={{
          slug,
          tool_a: toolA.slug,
          tool_b: toolB.slug,
          locale,
        }}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareB) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/compare/${slug}`)} />
    </>
  )
}

// ============================================================================
// Reusable section primitive (mirrors /tools/[slug]'s Section)
// ============================================================================
function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id?: string
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="container-default py-10 lg:py-14 border-b border-[var(--border-subtle)]"
    >
      <div className="flex items-center gap-3">
        {eyebrow && (
          <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
            {eyebrow}
          </span>
        )}
        <h2 className="text-h2 font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

// ============================================================================
// StatBlock — one row in the Quick stats grid
// ----------------------------------------------------------------------------
// Two-column "A vs B" presentation. Used twice on the page: once for the
// auto-derived stats (price/rating/integrations) and again for any
// editorial overrides coming from comparison_data.jsonb.
// ============================================================================
function StatBlock({
  label,
  valueA,
  valueB,
  nameA,
  nameB,
}: {
  label: string
  valueA: string
  valueB: string
  nameA: string
  nameB: string
}) {
  return (
    <li className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[14px]">
        <div>
          <p className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em]">{nameA}</p>
          <p className="mt-1 font-mono text-[15px] text-[var(--text-primary)] tabular-nums">{valueA}</p>
        </div>
        <div>
          <p className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em]">{nameB}</p>
          <p className="mt-1 font-mono text-[15px] text-[var(--text-primary)] tabular-nums">{valueB}</p>
        </div>
      </div>
    </li>
  )
}

// ============================================================================
// PriceTierCard — per-tool pricing breakdown (entry / max / model)
// ============================================================================
function PriceTierCard({
  tool,
  locale,
  t,
}: {
  tool: ToolRow
  locale: "en" | "ru"
  t: {
    startingPrice: string
    upTo:          string
    perMonth:      string
    pricingModel:  string
  }
}) {
  const min = tool.pricing_min
  const max = tool.pricing_max
  return (
    <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {tool.name}
      </p>
      <p className="mt-3 font-mono text-[24px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
        {min != null ? formatPrice(min, { locale, maximumFractionDigits: 0 }) : "—"}
        <span className="ml-1 text-[13px] text-[var(--text-tertiary)]">{t.perMonth}</span>
      </p>
      <dl className="mt-4 space-y-1.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--text-tertiary)]">{t.upTo}</dt>
          <dd className="font-mono text-[var(--text-secondary)] tabular-nums">
            {max != null ? formatPrice(max, { locale, maximumFractionDigits: 0 }) + t.perMonth : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--text-tertiary)]">{t.pricingModel}</dt>
          <dd className="text-[var(--text-secondary)]">{tool.pricing_model ?? "—"}</dd>
        </div>
      </dl>
      {tool.pricing_notes && (
        <p className="mt-3 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
          {tool.pricing_notes}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// FeatureBucket — fallback "feature list per tool" when there's no
// jsonb-driven head-to-head table
// ============================================================================
function FeatureBucket({
  toolName,
  features,
  empty,
}: {
  toolName: string
  features: ReadonlyArray<{ name: string; description?: string }>
  empty: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {toolName}
      </p>
      {features.length === 0 ? (
        <p className="mt-3 text-[13px] italic text-[var(--text-tertiary)]">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {features.slice(0, 6).map((f) => (
            <li key={f.name} className="flex gap-2 text-[14px] leading-[1.5] text-[var(--text-primary)]">
              <Check
                className="mt-1 size-3.5 shrink-0 text-[var(--success)]"
                strokeWidth={2.5}
              />
              <span>
                <span className="font-medium">{f.name}</span>
                {f.description && (
                  <span className="text-[var(--text-secondary)]"> — {f.description}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================================
// ShopifyCard — per-tool Shopify integration depth callout
// ============================================================================
function ShopifyCard({
  toolName,
  hasShopify,
  hasShopifyPlus,
  narrative,
}: {
  toolName: string
  hasShopify:     boolean
  hasShopifyPlus: boolean
  narrative: string
}) {
  const accent = hasShopifyPlus
    ? "var(--success)"
    : hasShopify
      ? "var(--brand)"
      : "var(--text-tertiary)"
  const Icon = hasShopify ? Check : Minus
  return (
    <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          {toolName}
        </p>
        <span
          className="inline-flex size-7 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
          aria-hidden="true"
        >
          <Icon className="size-3.5" strokeWidth={2.6} />
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-[1.6] text-[var(--text-primary)]">
        {narrative}
      </p>
    </div>
  )
}

// ============================================================================
// IntegrationsBucket — one column of the Venn (Only-A / Both / Only-B)
// ============================================================================
function IntegrationsBucket({
  label,
  items,
  accent,
  empty,
}: {
  label: string
  items: string[]
  accent: "brand" | "muted"
  empty: string
}) {
  const ring =
    accent === "brand"
      ? "border-[color-mix(in_oklch,var(--brand)_25%,transparent)] bg-[color-mix(in_oklch,var(--brand)_5%,transparent)]"
      : "border-[var(--border-base)] bg-[var(--bg-surface)]"
  return (
    <div className={cn("rounded-2xl border p-5 lg:p-6", ring)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] italic text-[var(--text-tertiary)]">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li
              key={i}
              className="inline-flex items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-base)] px-2.5 py-0.5 text-[12px] text-[var(--text-secondary)]"
            >
              {i.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================================
// Tool side card — used in the hero. Logo + name + tagline + primary &
// secondary CTAs. Primary goes through /go/[slug] (affiliate redirector),
// secondary opens the vendor's marketing URL directly.
// ============================================================================
function ToolCardSide({
  tool,
  localePrefix,
  tryLabel,
  visitLabel,
}: {
  tool: ToolRow
  localePrefix: "" | "/ru"
  tryLabel: string
  visitLabel: string
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <ToolLogo src={tool.logo_url} name={tool.name} size={56} className="shrink-0 rounded-xl" />
        <div className="min-w-0">
          <h2 className="text-h3 font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {tool.name}
          </h2>
          {tool.tagline && (
            <p className="mt-1 text-[14px] leading-[1.5] text-[var(--text-secondary)] line-clamp-2">
              {tool.tagline}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Link
          href={`${localePrefix}/go/${tool.slug}`}
          rel="sponsored nofollow noopener"
          target="_blank"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 px-4 text-[14px] text-white justify-between",
          )}
          style={{
            background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
          }}
        >
          <span>{tryLabel}</span>
          <ArrowUpRight className="size-4" />
        </Link>
        <Link
          href={tool.website_url}
          rel="noopener noreferrer"
          target="_blank"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 px-4 text-[13px] justify-between",
          )}
        >
          <span>{visitLabel}</span>
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

// PriceCard removed in May 2026 audit (TZ fixes #2): the page now always
// renders an auto-derived PriceTierCard for each tool, so the editorial
// "free-form pricing prose" lane through comparison_data.pricing was
// dropped. If editorial later wants per-tool prose back, add a third
// field on ParsedComparisonData and surface it under the auto card.

function CtaCard({
  tool,
  localePrefix,
  label,
}: {
  tool: ToolRow
  localePrefix: "" | "/ru"
  label: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
        "p-6 lg:p-8 shadow-[var(--shadow-sm)]",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-1/2 h-[200%] pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(16,185,129,0.12), transparent 60%)",
        }}
      />
      <div className="relative flex items-center gap-4">
        <ToolLogo src={tool.logo_url} name={tool.name} size={56} className="shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="text-h4 font-semibold tracking-[-0.01em]">
            {tool.name}
          </h3>
          {tool.tagline && (
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)] line-clamp-1">
              {tool.tagline}
            </p>
          )}
        </div>
      </div>
      <Link
        href={`${localePrefix}/go/${tool.slug}`}
        rel="sponsored nofollow noopener"
        target="_blank"
        className={cn(
          buttonVariants({ size: "lg" }),
          "relative mt-5 w-full h-11 px-4 text-[14px] text-white justify-between",
        )}
        style={{
          background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
        }}
      >
        <span>{label}</span>
        <ArrowUpRight className="size-4" />
      </Link>
    </div>
  )
}
