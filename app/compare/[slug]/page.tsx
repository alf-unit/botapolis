import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, ExternalLink } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ToolLogo } from "@/components/tools/ToolLogo"
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
import { absoluteUrl, cn } from "@/lib/utils"
import type { ComparisonRow, ToolRow } from "@/lib/supabase/types"

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
  const row = await fetchComparison(slug)

  if (!row) {
    return buildMetadata({
      title:       "Comparison not found",
      description: "We couldn't find this comparison.",
      path:        `/compare/${slug}`,
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

  const ogPath = `/compare/${slug}/opengraph-image`

  return buildMetadata({
    title,
    description,
    path:    `/compare/${slug}`,
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
  const row = await fetchComparison(slug)
  if (!row) notFound()

  const { comparison, toolA, toolB } = row
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const parsed = parseComparisonData(comparison.comparison_data)

  // i18n strings — local until comparisons earn a dict section.
  const t = {
    breadcrumbHome: locale === "ru" ? "Главная" : "Home",
    eyebrow:        locale === "ru" ? "Сравнение" : "Comparison",
    introHeading:  locale === "ru" ? "Кратко"    : "At a glance",
    featuresHeading: locale === "ru" ? "Сравнение по фичам" : "Feature-by-feature",
    pricingHeading:  locale === "ru" ? "Цены"               : "Pricing",
    useCasesHeading: locale === "ru" ? "Когда что лучше"    : "When each one wins",
    verdictHeading:  locale === "ru" ? "Наш вердикт"        : "Our verdict",
    methodologyHeading: locale === "ru" ? "Методология" : "Methodology",
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
  }

  // JSON-LD: breadcrumb + a SoftwareApplication node per tool.
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.breadcrumbHome, path: `${localePrefix}/` },
    { name: dict.nav.compare, path: `${localePrefix}/compare` },
    { name: `${toolA.name} vs ${toolB.name}`, path: `${localePrefix}/compare/${slug}` },
  ])
  const softwareA = generateSoftwareApplicationSchema(toolA)
  const softwareB = generateSoftwareApplicationSchema(toolB)

  const introCopy =
    comparison.custom_intro ??
    (locale === "ru"
      ? `Прямое сравнение ${toolA.name} и ${toolB.name} на одном Shopify-магазине. Без ничьих и без «оба отличные».`
      : `Head-to-head between ${toolA.name} and ${toolB.name} on a single Shopify store. No "they're both great" — a real call at the bottom.`)

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
            INTRO
            ================================================================== */}
        <Section title={t.introHeading} eyebrow="01">
          <p className="max-w-3xl text-[17px] leading-[1.7] text-[var(--text-secondary)]">
            {introCopy}
          </p>

          {/* Quick stats (if comparison_data.quickStats exists) */}
          {parsed.quickStats.length > 0 && (
            <ul
              role="list"
              className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {parsed.quickStats.map((stat) => (
                <li
                  key={stat.label}
                  className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    {stat.label}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[14px]">
                    <div>
                      <p className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em]">
                        {toolA.name}
                      </p>
                      <p className="mt-1 font-mono text-[15px] text-[var(--text-primary)]">
                        {stat.a}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em]">
                        {toolB.name}
                      </p>
                      <p className="mt-1 font-mono text-[15px] text-[var(--text-primary)]">
                        {stat.b}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ==================================================================
            FEATURES TABLE
            ================================================================== */}
        {parsed.features.length > 0 && (
          <Section title={t.featuresHeading} eyebrow="02">
            <ComparisonTable
              toolA={{ name: toolA.name, slug: toolA.slug }}
              toolB={{ name: toolB.name, slug: toolB.slug }}
              rows={parsed.features}
              featureHeader={t.featureCol}
              caption={`${toolA.name} vs ${toolB.name} feature comparison`}
            />
          </Section>
        )}

        {/* ==================================================================
            PRICING
            ================================================================== */}
        {parsed.pricing && (parsed.pricing.a || parsed.pricing.b || parsed.pricing.details) && (
          <Section title={t.pricingHeading} eyebrow="03">
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.pricing.a && (
                <PriceCard
                  toolName={toolA.name}
                  body={parsed.pricing.a}
                />
              )}
              {parsed.pricing.b && (
                <PriceCard
                  toolName={toolB.name}
                  body={parsed.pricing.b}
                />
              )}
            </div>
            {parsed.pricing.details && (
              <p className="mt-6 max-w-3xl text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                {parsed.pricing.details}
              </p>
            )}
          </Section>
        )}

        {/* ==================================================================
            USE CASES — "When each one wins"
            ================================================================== */}
        {parsed.useCases.length > 0 && (
          <Section title={t.useCasesHeading} eyebrow="04">
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
            VERDICT
            ================================================================== */}
        {comparison.verdict && (
          <Section title={t.verdictHeading} eyebrow={parsed.features.length > 0 ? "05" : "02"}>
            <div className="relative max-w-3xl">
              <div
                aria-hidden="true"
                className="absolute -left-4 top-0 h-full w-1 rounded-full"
                style={{ background: "var(--gradient-cta)" }}
              />
              <p className="pl-6 text-[18px] lg:text-[19px] leading-[1.7] text-[var(--text-primary)]">
                {comparison.verdict}
              </p>
            </div>
          </Section>
        )}

        {/* ==================================================================
            METHODOLOGY (only if custom_methodology supplied)
            ================================================================== */}
        {comparison.custom_methodology && (
          <Section title={t.methodologyHeading} eyebrow="06">
            <p className="max-w-3xl text-[15px] leading-[1.7] text-[var(--text-secondary)]">
              {comparison.custom_methodology}
            </p>
          </Section>
        )}

        {/* ==================================================================
            CTA TAIL — two-tool side-by-side
            ================================================================== */}
        <section className="container-default pb-20">
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
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section className="container-default py-10 lg:py-14 border-b border-[var(--border-subtle)]">
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

function PriceCard({
  toolName,
  body,
}: {
  toolName: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {toolName}
      </p>
      <p className="mt-2 text-[15px] leading-[1.6] text-[var(--text-primary)]">
        {body}
      </p>
    </div>
  )
}

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
