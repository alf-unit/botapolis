import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, ArrowRight, Layers } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { RatingStars } from "@/components/tools/RatingStars"
import { PricingBadge } from "@/components/tools/PricingBadge"
import { buttonVariants } from "@/components/ui/button"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { localizeTool, localizeToolPartial } from "@/lib/content/tool-locale"
import { absoluteUrl, cn } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /alternatives/[slug] — pSEO listicle of alternatives to a given tool
   ----------------------------------------------------------------------------
   For a source tool (e.g. Klaviyo), this renders "Klaviyo alternatives":
   the 4-8 closest competitors from the same category, with a comparison
   grid showing pricing tier, rating, and direct affiliate / detail links.
   Single-segment `[slug]` (same Next 16 constraint as /reviews and /compare).

   pSEO model: this surface ranks for "X alternatives" + "best X alternatives
   for Shopify" queries — high commercial intent without the cold-start
   penalty of a stand-alone review. Each /alternatives/X page is generated
   from Supabase data, so the corpus scales linearly with seed expansion
   (block F adds 5 tools, this page count goes 7 → 12).

   Graceful degradation:
     - When fewer than 2 same-category alternatives exist, we widen the
       net to ANY published tool (excluding the source).
     - When the source slug is bogus, we 404 cleanly via notFound().
---------------------------------------------------------------------------- */

export const revalidate = 86400
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

// Card field set — narrow enough that we never ship long-form fields to
// the browser that the grid won't render. Includes _ru columns so the
// localizeToolPartial helper has the data it needs in one trip.
type AltCard = Pick<
  ToolRow,
  | "id" | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru" | "logo_url"
  | "category" | "rating" | "pricing_model" | "pricing_min" | "pricing_max"
>

async function fetchSource(slug: string): Promise<ToolRow | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (error) {
      console.error(`[/alternatives/${slug}] source fetch failed:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.error(`[/alternatives/${slug}] source threw:`, err)
    return null
  }
}

async function fetchAlternatives(source: ToolRow, limit = 8): Promise<AltCard[]> {
  const supabase = createServiceClient()
  // Includes name_ru / tagline_ru so localizeToolPartial below can resolve
  // RU copy from the same row without a follow-up query.
  const select =
    "id, slug, name, name_ru, tagline, tagline_ru, logo_url, category, rating, pricing_model, pricing_min, pricing_max"

  // Partner-first ordering (2026-06-01): inside the same category, surface
  // tools WITH affiliate_url before those without. Two parallel queries
  // beat a single rating-only sort because the alternative-listicle is the
  // commercial-intent surface — partner tools deserve top placement when
  // they're plausible alternatives, non-partners stay as fillers below.
  const [partnerRes, nonPartnerRes] = await Promise.all([
    supabase
      .from("tools")
      .select(select)
      .eq("status", "published")
      .eq("category", source.category)
      .neq("slug", source.slug)
      .not("affiliate_url", "is", null)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("tools")
      .select(select)
      .eq("status", "published")
      .eq("category", source.category)
      .neq("slug", source.slug)
      .is("affiliate_url", null)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(limit),
  ])

  const partners = partnerRes.data ?? []
  const nonPartners = nonPartnerRes.data ?? []
  const pool: AltCard[] = [...partners, ...nonPartners].slice(0, limit)
  if (pool.length >= 2) return pool

  // Fallback — small categories (today: chat = ManyChat alone). Widen the
  // pool to any other published tool so the page still ships something
  // useful rather than a "no results" placeholder.
  const { data: anyOther } = await supabase
    .from("tools")
    .select(select)
    .eq("status", "published")
    .neq("slug", source.slug)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(limit)

  return anyOther ?? []
}

// --------------------------------------------------------------------------
// generateStaticParams — one route per published tool
// --------------------------------------------------------------------------
export async function generateStaticParams() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("slug")
      .eq("status", "published")
      .limit(1000)
    if (error || !data) return []
    return data.map((t) => ({ slug: t.slug }))
  } catch {
    // Seed not applied to this DB — dynamicParams handles it on demand.
    return []
  }
}

// --------------------------------------------------------------------------
// Metadata
// --------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const rawSource = await fetchSource(slug)

  if (!rawSource) {
    return buildMetadata({
      title:       locale === "ru" ? "Альтернативы не найдены" : "Alternatives not found",
      description: locale === "ru" ? "Не нашли такой инструмент." : "We couldn't find this tool.",
      path:        `/alternatives/${slug}`,
      locale,
      noIndex:     true,
    })
  }

  // Localize source name so the SEO title / description on /ru/* uses the
  // Russian display name when one exists. Falls back to .name (EN) when
  // name_ru hasn't been filled yet.
  const source = localizeTool(rawSource, locale as "en" | "ru")

  const title =
    locale === "ru"
      ? `Альтернативы ${source.name} 2026 · обзор и сравнение`
      : `${source.name} alternatives 2026 · honest comparison for Shopify`
  const description =
    locale === "ru"
      ? `${source.name} не подходит? Сравниваем актуальные альтернативы по ценам, фичам и интеграциям с Shopify.`
      : `${source.name} not the right fit? We compare the realistic alternatives on pricing, features, and Shopify integration depth.`

  return buildMetadata({
    title,
    description,
    path:   `/alternatives/${slug}`,
    locale,
    keywords: [
      `${source.name} alternatives`,
      `best ${source.name} alternatives`,
      `${source.name} competitors`,
      "shopify",
      source.category,
    ],
  })
}

// ============================================================================
// Page
// ============================================================================
export default async function AlternativesPage({ params }: PageProps) {
  const { slug } = await params
  const rawSource = await fetchSource(slug)
  if (!rawSource) notFound()

  const rawAlternatives = await fetchAlternatives(rawSource)
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // Locale-resolve the source tool (full ToolRow → all _ru fields) and
  // each alternative card (partial picked shape). For EN both helpers are
  // no-ops; for RU each falls back to the EN field per-attribute when the
  // _ru value is null.
  const source = localizeTool(rawSource, locale as "en" | "ru")
  const alternatives = rawAlternatives.map((alt) =>
    localizeToolPartial(alt, locale as "en" | "ru"),
  )

  const t =
    locale === "ru"
      ? {
          home:        "Главная",
          eyebrow:     "Альтернативы",
          title:       `Альтернативы ${source.name}`,
          lede:        `${source.name} не подходит для твоего магазина? Вот варианты, которые мы протестировали и считаем заслуживающими внимания.`,
          tagline:     `Категория: ${source.category}`,
          gridHeading: `Что мы рекомендуем вместо ${source.name}`,
          ctaSeeReview:        `Читать обзор ${source.name}`,
          ctaSeeAllTools:      "Все инструменты",
          altReviewLink:       "Подробнее",
          ratingLabel:         "Оценка",
          pricingLabel:        "Цена",
          empty:               "Пока не нашли подходящих альтернатив в каталоге. Загляни в общий каталог инструментов.",
          introHeading:        `Почему ищут альтернативы ${source.name}`,
          verdictHeading:      "Кому что подходит",
        }
      : {
          home:        "Home",
          eyebrow:     "Alternatives",
          title:       `${source.name} alternatives`,
          lede:        `Looking for an alternative to ${source.name}? Here's our tested shortlist — same category, honest pricing, real trade-offs.`,
          tagline:     `Category: ${source.category}`,
          gridHeading: `What we'd recommend instead of ${source.name}`,
          ctaSeeReview:        `Read the ${source.name} review`,
          ctaSeeAllTools:      "All tools",
          altReviewLink:       "Learn more",
          ratingLabel:         "Rating",
          pricingLabel:        "Pricing",
          empty:               "We don't have credible alternatives in the catalog yet. Browse the full tools catalog instead.",
          introHeading:        `Why operators look for ${source.name} alternatives`,
          verdictHeading:      "Who picks which",
        }

  // ── Etap F editorial (migration 017) ──────────────────────────────
  // alternatives_editorial is jsonb on the SOURCE tool row. We pick the
  // EN or RU field per locale with field-level fallback (EN value used
  // when RU twin is missing — consistent with localizeTool() convention).
  // Each section renders independently — intro, per-card why, verdict
  // are all optional. NULL field == section skipped; this keeps the page
  // valid for any source tool that hasn't been populated yet.
  const editorial = rawSource.alternatives_editorial ?? null
  const editorialIntro =
    locale === "ru"
      ? editorial?.intro_ru ?? editorial?.intro ?? null
      : editorial?.intro ?? null
  const editorialVerdict =
    locale === "ru"
      ? editorial?.verdict_ru ?? editorial?.verdict ?? null
      : editorial?.verdict ?? null
  const perCardWhy = new Map<string, string>()
  for (const c of editorial?.perCardContext ?? []) {
    if (typeof c.slug !== "string") continue
    const why =
      locale === "ru"
        ? c.why_ru ?? c.why ?? null
        : c.why ?? null
    if (why) perCardWhy.set(c.slug, why)
  }

  // Phase C (2026-06-03): breadcrumb now points at the /alternatives hub
  // instead of /tools. Mirrors /best/[slug] post-hub-launch and gives
  // visitors a one-click jump back to the index of all alternatives
  // surfaces. The JSON-LD chain and the rendered nav both updated below.
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.home,    path: `${localePrefix}/` },
    { name: dict.nav.alternatives, path: `${localePrefix}/alternatives` },
    { name: t.title,   path: `${localePrefix}/alternatives/${slug}` },
  ])

  const itemList =
    alternatives.length > 0
      ? generateItemListSchema({
          name: t.title,
          items: alternatives.map((a) => ({
            name: a.name,
            url:  `${localePrefix}/tools/${a.slug}`,
          })),
        })
      : null

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* Hero — same gradient blob recipe as /tools/[slug] and /compare/[slug] */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)" }}
          />

          <div className="container-default relative pt-10 pb-12 lg:pt-14 lg:pb-16">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
            >
              <Link href={`${localePrefix}/`} className="hover:text-[var(--text-secondary)]">
                {t.home}
              </Link>
              <span className="opacity-60">/</span>
              <Link href={`${localePrefix}/alternatives`} className="hover:text-[var(--text-secondary)]">
                {dict.nav.alternatives}
              </Link>
              <span className="opacity-60">/</span>
              <span className="text-[var(--text-secondary)]">{t.title}</span>
            </nav>

            <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t.eyebrow}
            </p>

            <div className="mt-3 flex items-start gap-5">
              <ToolLogo
                src={source.logo_url}
                name={source.name}
                size={72}
                className="shrink-0 rounded-2xl border border-[var(--border-base)] shadow-[var(--shadow-sm)]"
              />
              <div className="min-w-0">
                <h1 className="text-h1 font-semibold tracking-[-0.03em]">
                  {t.title}
                </h1>
                <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {t.tagline}
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {t.lede}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`${localePrefix}/tools/${source.slug}`}
                className={cn(
                  buttonVariants({ variant: "cta", size: "lg" }),
                  "h-11 px-4 text-[14px]",
                )}
              >
                {t.ctaSeeReview}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={`${localePrefix}/tools`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-4 text-[14px]",
                )}
              >
                {t.ctaSeeAllTools}
              </Link>
            </div>
          </div>
        </section>

        {/* Editorial intro (migration 017) — cons-driven framing of why
            operators search for alternatives. Renders only when populated;
            null falls back silently to the generic hero + grid below. */}
        {editorialIntro && (
          <section className="container-default py-10 lg:py-12 border-b border-[var(--border-subtle)]">
            <h2 className="text-h2 font-semibold tracking-[-0.02em]">
              {t.introHeading}
            </h2>
            <p className="mt-5 max-w-3xl text-[17px] leading-[1.7] text-[var(--text-secondary)]">
              {editorialIntro}
            </p>
          </section>
        )}

        {/* Alternatives grid */}
        <section className="container-default py-12 lg:py-16">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
              <Layers className="size-3 mr-1" aria-hidden="true" />
              {alternatives.length}
            </span>
            <h2 className="text-h2 font-semibold tracking-[-0.02em]">
              {t.gridHeading}
            </h2>
          </div>

          {alternatives.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-12 text-center">
              <p className="text-[15px] text-[var(--text-secondary)]">{t.empty}</p>
            </div>
          ) : (
            <ul role="list" className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {alternatives.map((a) => {
                const why = perCardWhy.get(a.slug)
                return (
                <li key={a.slug}>
                  <Link
                    href={`${localePrefix}/tools/${a.slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ToolLogo
                        src={a.logo_url}
                        name={a.name}
                        size={48}
                        className="shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)] line-clamp-1">
                          {a.name}
                        </p>
                        {a.tagline && (
                          <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)] line-clamp-2">
                            {a.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Editorial per-card reasoning (migration 017) —
                        renders only when the source tool's editorial
                        carries a why for this specific alt slug. */}
                    {why && (
                      <p className="text-[13.5px] leading-[1.6] text-[var(--text-primary)]">
                        {why}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex flex-col gap-1">
                        {a.rating != null && (
                          <RatingStars rating={a.rating} size="sm" />
                        )}
                        {a.pricing_model && (
                          <PricingBadge
                            model={a.pricing_model}
                            min={a.pricing_min}
                            max={a.pricing_max}
                            size="sm"
                          />
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)]">
                        {t.altReviewLink}
                        <ArrowRight
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Editorial verdict (migration 017) — "who picks which" closer.
            Renders only when populated; the page degrades gracefully when
            this source tool hasn't been editorialised yet. */}
        {editorialVerdict && (
          <section className="container-default pb-12 lg:pb-16">
            <div className="rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 lg:p-8 shadow-[var(--shadow-sm)]">
              <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                {t.verdictHeading}
              </h2>
              <p className="mt-5 max-w-3xl text-[17px] leading-[1.7] text-[var(--text-primary)]">
                {editorialVerdict}
              </p>
            </div>
          </section>
        )}
      </main>

      <Footer
        strings={{
          tagline: dict.footer.tagline,
          copyright: dict.footer.copyright,
          columns: dict.footer.columns,
          links: dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {itemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/alternatives/${slug}`)} />
    </>
  )
}
