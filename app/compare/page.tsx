import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ComparisonCard } from "@/components/tools/ComparisonCard"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateItemListSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"
import type { ComparisonRow, ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /compare — pSEO index of head-to-head comparisons
   ----------------------------------------------------------------------------
   Server component fetches `comparisons` filtered by the current locale's
   language + `status='published'`, then bulk-loads the referenced tools
   (slug, name, logo_url) in one query and joins them in memory. Two round-
   trips to Supabase keep the typed client happy (our types.ts declares
   `Relationships: NoRels` so PostgREST embed syntax would collapse to never).

   ISR: 1 h time-based. Supabase webhook on comparison/tool mutations also
   pings /api/revalidate?path=/compare for sub-second freshness on edits.

   We follow the same flat-route convention sprints 1–2 picked for /tools and
   /directory (no `(marketing)` group) so all marketing routes live at the
   top level and `localePrefix` flows uniformly through the tree.
---------------------------------------------------------------------------- */

export const revalidate = 3600

type CardComparison = Pick<
  ComparisonRow,
  "slug" | "tool_a_id" | "tool_b_id" | "verdict" | "updated_at"
>
type CardTool = Pick<ToolRow, "id" | "slug" | "name" | "logo_url">

interface CompareIndexRow {
  comparison: CardComparison
  toolA: CardTool
  toolB: CardTool
}

// --------------------------------------------------------------------------
// Data
// --------------------------------------------------------------------------
async function fetchComparisons(
  language: "en" | "ru",
): Promise<CompareIndexRow[]> {
  try {
    const supabase = createServiceClient()

    const { data: cmps, error: cmpErr } = await supabase
      .from("comparisons")
      .select("slug, tool_a_id, tool_b_id, verdict, updated_at")
      .eq("status", "published")
      .eq("language", language)
      .order("updated_at", { ascending: false })
      .limit(500)

    if (cmpErr) {
      console.error("[/compare] comparisons fetch failed:", cmpErr.message)
      return []
    }
    if (!cmps || cmps.length === 0) return []

    // Collect the unique tool IDs we need to hydrate.
    const ids = Array.from(
      new Set(cmps.flatMap((c) => [c.tool_a_id, c.tool_b_id])),
    )

    const { data: tools, error: toolsErr } = await supabase
      .from("tools")
      .select("id, slug, name, logo_url")
      .in("id", ids)

    if (toolsErr) {
      console.error("[/compare] tools fetch failed:", toolsErr.message)
      return []
    }

    const byId = new Map((tools ?? []).map((t) => [t.id, t]))

    // Drop any comparison whose tools we couldn't resolve — a half-card with
    // a placeholder name is worse than skipping it entirely.
    return cmps.reduce<CompareIndexRow[]>((acc, c) => {
      const toolA = byId.get(c.tool_a_id)
      const toolB = byId.get(c.tool_b_id)
      if (!toolA || !toolB) return acc
      acc.push({ comparison: c, toolA, toolB })
      return acc
    }, [])
  } catch (err) {
    // Migration may not be applied yet — degrade to empty list rather than 500.
    console.error("[/compare] supabase fetch threw:", err)
    return []
  }
}

// --------------------------------------------------------------------------
// Metadata
// --------------------------------------------------------------------------
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const title =
    locale === "ru"
      ? "Сравнения AI-инструментов для Shopify"
      : "AI tool comparisons for Shopify"
  const description =
    locale === "ru"
      ? "Честные head-to-head сравнения Shopify-инструментов: цены, фичи, интеграции, итоговый вердикт."
      : "Honest head-to-head matchups for Shopify operators. Pricing, features, integrations — and a verdict, not a fence-sit."

  return buildMetadata({
    title,
    description,
    path:   "/compare",
    locale,
    ogImage:
      "/api/og?title=" +
      encodeURIComponent(title) +
      "&description=" +
      encodeURIComponent(
        locale === "ru"
          ? "Каждое сравнение тестировалось на реальном Shopify-магазине."
          : "Each matchup tested on a real Shopify store.",
      ) +
      "&eyebrow=compare",
  })
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------
export default async function ComparePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const rows = await fetchComparisons(locale)

  // i18n strings — kept local until comparisons earn a dedicated dict section.
  const t = {
    eyebrow:       locale === "ru" ? "Сравнения"             : "Compare",
    headline:      locale === "ru"
      ? "Head-to-head, без ничьих."
      : "Head-to-head, no fence-sitting.",
    lede: locale === "ru"
      ? "Каждое сравнение собрано на одном реальном Shopify-магазине: цены, интеграции, фичи и итоговый вердикт под конкретный сценарий."
      : "Every matchup is built on one real Shopify store: pricing, integrations, features — and a verdict tied to a specific operator scenario.",
    countLabel:    locale === "ru" ? "опубликовано" : "published",
    methodology:   locale === "ru" ? "Методология"  : "How we compare",
    cardCta:       locale === "ru" ? "Открыть сравнение" : "Read comparison",
    verdictLabel:  locale === "ru" ? "Вердикт"           : "Verdict",
    breadcrumb:    locale === "ru" ? "Главная"           : "Home",
    empty: locale === "ru"
      ? "Пока нет опубликованных сравнений. Загляните позже."
      : "No comparisons published yet. Check back soon.",
    suggestion: locale === "ru"
      ? "А пока — загляните в каталог инструментов."
      : "In the meantime, browse the tool catalog.",
    browseTools: locale === "ru" ? "Открыть каталог →" : "Browse tools →",
  }

  // JSON-LD: ItemList of comparisons + Breadcrumb trail.
  const itemList = generateItemListSchema({
    name: locale === "ru" ? "Сравнения Shopify-инструментов" : "Shopify tool comparisons",
    items: rows.map((r, i) => ({
      name:     `${r.toolA.name} vs ${r.toolB.name}`,
      url:      `${localePrefix}/compare/${r.comparison.slug}`,
      position: i + 1,
    })),
  })
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.breadcrumb,     path: `${localePrefix}/` },
    { name: dict.nav.compare, path: `${localePrefix}/compare` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* ==================================================================
            HERO
            ================================================================== */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          {/* Two-tone glow — mint left, violet right — telegraphs the
              vs/duel nature of the page without burning a real illustration */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)",
            }}
          />

          <div className="container-default relative pt-14 pb-10 lg:pt-20 lg:pb-14">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl text-h1 font-semibold tracking-[-0.03em]">
              {t.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {t.lede}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                {rows.length} {t.countLabel}
              </span>
              <span className="opacity-40">·</span>
              <Link
                href={`${localePrefix}/methodology`}
                className="underline-offset-4 hover:underline text-[var(--text-secondary)]"
              >
                {t.methodology}
              </Link>
            </div>
          </div>
        </section>

        {/* ==================================================================
            GRID
            ================================================================== */}
        <section className="container-default py-10 lg:py-14">
          {rows.length > 0 ? (
            <ul
              role="list"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {rows.map((r) => (
                <li key={r.comparison.slug} className="contents">
                  <ComparisonCard
                    slug={r.comparison.slug}
                    toolA={{
                      slug:    r.toolA.slug,
                      name:    r.toolA.name,
                      logoUrl: r.toolA.logo_url,
                    }}
                    toolB={{
                      slug:    r.toolB.slug,
                      name:    r.toolB.name,
                      logoUrl: r.toolB.logo_url,
                    }}
                    verdict={r.comparison.verdict}
                    localePrefix={localePrefix}
                    cta={t.cardCta}
                    verdictLabel={t.verdictLabel}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t.empty}
              subtitle={t.suggestion}
              ctaLabel={t.browseTools}
              ctaHref={`${localePrefix}/tools`}
            />
          )}
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/compare`)} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Empty state — DB has zero comparisons (or migration hasn't run yet). A
// helpful message + a link onward is friendlier than a bare blank grid.
// ---------------------------------------------------------------------------
function EmptyState({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
}: {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-16 text-center">
      <p className="text-[17px] font-medium text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        {subtitle}
      </p>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex items-center text-[14px] font-medium text-[var(--brand)] underline-offset-4 hover:underline"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
