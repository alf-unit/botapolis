import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ArticleHero } from "@/components/content/ArticleHero"
import { ArticleCover, reviewOgCoverHref } from "@/components/content/ArticleCover"
import { TableOfContents } from "@/components/content/TableOfContents"
import { ProsConsList } from "@/components/content/ProsConsList"
import { AffiliateButton } from "@/components/content/AffiliateButton"
import { PartnerAlternatives } from "@/components/tools/PartnerAlternatives"
import { ScrollMilestone } from "@/components/analytics/ScrollMilestone"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { buttonVariants } from "@/components/ui/button"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateReviewSchema,
} from "@/lib/seo/schema"
import { createServiceClient } from "@/lib/supabase/service"
import { localizeTool } from "@/lib/content/tool-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn, formatPrice } from "@/lib/utils"
import type {
  ToolFeature,
  ToolOperatorQuote,
  ToolRatingBreakdownAxis,
  ToolRow,
} from "@/lib/supabase/types"
import type { TocEntry } from "@/lib/content/toc"

/* ----------------------------------------------------------------------------
   /reviews/[slug] — runtime DB-driven tool review (Phase 0 Etap E)
   ----------------------------------------------------------------------------
   Flipped from legacy MDX-first hybrid to honest runtime generation on
   2026-05-31 (owner-locked Option A). The page now reads everything off the
   tools row in Supabase — frontmatter is gone, MDX body is gone. Sections
   render conditionally based on which jsonb / scalar fields are populated.

   Source of truth: tools.where(slug = $1, status = 'published') + the
   localizeTool helper which swaps EN → *_ru when locale='ru'. Migration 016
   added the *_ru twins for the new long-form fields and the editorial
   verdict pair.

   Static params: union of all published tool slugs (~30 today, scales with
   the catalog). dynamicParams = false — unknown slugs 404 cleanly.

   Routing note: /ru/reviews/[slug] re-exports this module. Locale is read
   via `getLocale()` (proxy.ts sets `x-locale` from the /ru prefix).
---------------------------------------------------------------------------- */

export const revalidate = 86400
export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

// ============================================================================
// Data
// ============================================================================

async function fetchTool(slug: string): Promise<ToolRow | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (error) {
      console.error(`[/reviews/${slug}] tool fetch failed:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.error(`[/reviews/${slug}] tool fetch threw:`, err)
    return null
  }
}

/**
 * Fetch the slug + name + logo for every tool referenced in
 * `integrates_with_tools`. Used to render the cross-link grid in the
 * Integrations section. Empty input → empty output, no DB hit.
 */
async function fetchCrossLinkedTools(
  slugs: ReadonlyArray<string>,
): Promise<Array<Pick<ToolRow, "slug" | "name" | "name_ru" | "logo_url" | "affiliate_url">>> {
  if (slugs.length === 0) return []
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("slug, name, name_ru, logo_url, affiliate_url")
      .eq("status", "published")
      .in("slug", slugs as string[])
    if (error) {
      console.error(`[/reviews] cross-link fetch failed:`, error.message)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error(`[/reviews] cross-link fetch threw:`, err)
    return []
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("slug")
      .eq("status", "published")
      .limit(500)
    if (error || !data) return []
    return data.map((t) => ({ slug: t.slug }))
  } catch {
    // Migration may not be applied to this DB yet; without published rows the
    // build emits zero static review URLs and the route surface is empty.
    return []
  }
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const rawTool = await fetchTool(slug)

  if (!rawTool) {
    return buildMetadata({
      title:       "Review not found",
      description: "We couldn't find this review.",
      path:        `/reviews/${slug}`,
      locale,
      noIndex:     true,
    })
  }

  const tool = localizeTool(rawTool, locale as "en" | "ru")

  const fallbackTitle = locale === "ru"
    ? `${tool.name} — обзор 2026 для Shopify`
    : `${tool.name} review 2026 for Shopify`
  const fallbackDescription = tool.tagline
    ?? tool.description
    ?? `${tool.name} — review.`

  return buildMetadata({
    title:       tool.meta_title       ?? fallbackTitle,
    description: tool.meta_description ?? fallbackDescription,
    path:        `/reviews/${slug}`,
    locale,
    type:        "article",
    article: {
      publishedTime: tool.created_at,
      modifiedTime:  tool.updated_at,
      author:        "Botapolis editorial",
      section:       "review",
      tags:          [slug, "review", "shopify", tool.category],
    },
    keywords:    [tool.name, "review", "shopify", tool.category],
  })
}

// ============================================================================
// Helpers — render-side normalisers
// ============================================================================

/** Rating breakdown axes: accept legacy `number` and Etap-D `{value, source}`. */
function axisValue(axis: ToolRatingBreakdownAxis | undefined): number | null {
  if (axis == null) return null
  return typeof axis === "number" ? axis : axis.value
}
function axisSource(axis: ToolRatingBreakdownAxis | undefined): "H" | "I" | null {
  if (axis == null || typeof axis === "number") return null
  return axis.source ?? null
}

/** Coarse reading-time estimate from concatenated long-form fields. */
function estimateReadingTime(tool: ToolRow, locale: "en" | "ru"): string {
  const parts = [
    tool.description ?? "",
    tool.pricing_notes ?? "",
    tool.shopify_native_notes ?? "",
    tool.verdict ?? "",
    ...(tool.features ?? []).map((f) => `${f.name} ${f.description ?? ""}`),
    ...(tool.operator_quotes ?? []).map((q) => q.quote),
  ]
  const words = parts.join(" ").split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 220))
  return locale === "ru" ? `${minutes} мин чтения` : `${minutes} min read`
}

// ============================================================================
// Page
// ============================================================================

export default async function ReviewPage({ params }: PageProps) {
  const { slug } = await params
  const rawTool = await fetchTool(slug)
  if (!rawTool) notFound()

  const locale = (await getLocale()) as "en" | "ru"
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""
  const tool = localizeTool(rawTool, locale)

  const reviewPath = `${localePrefix}/reviews/${slug}`

  // Cross-linked tools — one DB call covering the integrates_with_tools list.
  const crossLinked = await fetchCrossLinkedTools(tool.integrates_with_tools ?? [])

  // i18n strings — local until reviews earn a dict section.
  const t = {
    eyebrow:          locale === "ru" ? "Обзор" : "Review",
    bestForLabel:     locale === "ru" ? "Лучше всего для" : "Best for",
    notForLabel:      locale === "ru" ? "Не подойдёт если" : "Skip if",
    prosLabel:        locale === "ru" ? "Плюсы" : "Pros",
    consLabel:        locale === "ru" ? "Минусы" : "Cons",
    tldrHeading:      locale === "ru" ? "Кратко" : "TL;DR",
    fitHeading:       locale === "ru" ? "Кому подойдёт" : "Who it fits",
    prosConsHeading:  locale === "ru" ? "Плюсы и минусы" : "Pros & cons",
    pricingHeading:   locale === "ru" ? "Цены" : "Pricing",
    featuresHeading:  locale === "ru" ? "Возможности" : "Features",
    shopifyHeading:   locale === "ru" ? "Shopify-интеграция" : "Shopify integration",
    integrationsHeading: locale === "ru" ? "Интеграции" : "Integrations",
    ratingsHeading:   locale === "ru" ? "Оценка по 4 осям" : "Rating breakdown",
    externalRatingsHeading: locale === "ru" ? "Сторонние рейтинги" : "External ratings",
    operatorQuotesHeading: locale === "ru" ? "Что говорят операторы" : "What operators say",
    verdictHeading:   locale === "ru" ? "Наш вывод" : "Our verdict",
    tocLabel:         locale === "ru" ? "Содержание" : "On this page",
    perMonth:         locale === "ru" ? "/мес" : "/mo",
    startingPrice:    locale === "ru" ? "Старт от" : "Starting price",
    upTo:             locale === "ru" ? "до" : "up to",
    pricingModel:     locale === "ru" ? "Модель" : "Model",
    pricingSource:    locale === "ru" ? "Источник цен" : "Pricing source",
    free:             locale === "ru" ? "Бесплатно" : "Free",
    externalPlatformsLabel: locale === "ru" ? "Внешние платформы" : "External platforms",
    crossLinkedLabel: locale === "ru" ? "Интеграции с тулзами каталога" : "Catalog integrations",
    tryCta:           locale === "ru" ? "Открыть" : "Try",
    ratingChip:       locale === "ru" ? "Оценка" : "Rating",
    sourceHandsOn:    locale === "ru" ? "руки в продукте" : "hands-on",
    sourceInferred:   locale === "ru" ? "выведено" : "inferred",
    reviewsLabel:     locale === "ru" ? "отзывов" : "reviews",
    axes: {
      ease_of_use: locale === "ru" ? "Удобство" : "Ease of use",
      features:    locale === "ru" ? "Возможности" : "Features",
      value:       locale === "ru" ? "Цена/качество" : "Value",
      support:     locale === "ru" ? "Поддержка" : "Support",
    },
  }

  // ──────────────────────────────────────────────────────────────────────
  // Synthetic ToC — sections render conditionally; only include the IDs
  // we actually emit. Order matches the body below.
  // ──────────────────────────────────────────────────────────────────────
  const hasFitChips = !!tool.best_for || !!tool.not_for
  const hasProsCons = (tool.pros?.length ?? 0) > 0 || (tool.cons?.length ?? 0) > 0
  const hasFeatures = (tool.features?.length ?? 0) > 0
  const hasShopifyNotes = !!tool.shopify_native_notes
  const hasIntegrations = (tool.integrations?.length ?? 0) > 0 || crossLinked.length > 0
  const hasRatingBreakdown = !!tool.rating_breakdown && Object.keys(tool.rating_breakdown).length > 0
  const hasExternalRatings = !!tool.external_ratings && Object.values(tool.external_ratings).some(
    (p) => p != null && (p.score != null || p.reviews != null),
  )
  const hasOperatorQuotes = (tool.operator_quotes?.length ?? 0) > 0
  const hasVerdict = !!tool.verdict

  const tocEntries: TocEntry[] = []
  if (tool.description) tocEntries.push({ id: "tldr", title: t.tldrHeading, level: 2 })
  if (hasFitChips)       tocEntries.push({ id: "fit", title: t.fitHeading, level: 2 })
  if (hasProsCons)       tocEntries.push({ id: "pros-cons", title: t.prosConsHeading, level: 2 })
  tocEntries.push({ id: "pricing", title: t.pricingHeading, level: 2 })
  if (hasFeatures)         tocEntries.push({ id: "features", title: t.featuresHeading, level: 2 })
  if (hasShopifyNotes)     tocEntries.push({ id: "shopify-integration", title: t.shopifyHeading, level: 2 })
  if (hasIntegrations)     tocEntries.push({ id: "integrations", title: t.integrationsHeading, level: 2 })
  if (hasRatingBreakdown)  tocEntries.push({ id: "rating-breakdown", title: t.ratingsHeading, level: 2 })
  if (hasExternalRatings)  tocEntries.push({ id: "external-ratings", title: t.externalRatingsHeading, level: 2 })
  if (hasOperatorQuotes)   tocEntries.push({ id: "operator-quotes", title: t.operatorQuotesHeading, level: 2 })
  if (hasVerdict)          tocEntries.push({ id: "verdict", title: t.verdictHeading, level: 2 })

  // ──────────────────────────────────────────────────────────────────────
  // JSON-LD
  // ──────────────────────────────────────────────────────────────────────
  const headline = tool.meta_title ?? `${tool.name} review 2026`
  const description = tool.meta_description ?? tool.tagline ?? tool.description ?? ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: dict.nav.reviews, path: `${localePrefix}/reviews` },
    { name: tool.name, path: reviewPath },
  ])
  const article = generateArticleSchema({
    headline,
    description,
    path: reviewPath,
    publishedAt: tool.created_at,
    updatedAt: tool.updated_at,
    authorName: "Botapolis editorial",
    section: "review",
    tags: [slug, tool.category, "review", "shopify"],
  })
  const reviewSchema = generateReviewSchema({
    tool: {
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      tagline: tool.tagline,
      category: tool.category,
      logo_url: tool.logo_url,
      website_url: tool.website_url,
      pricing_min: tool.pricing_min,
      pricing_model: tool.pricing_model,
      rating: tool.rating,
      pros: tool.pros ?? [],
      cons: tool.cons ?? [],
    },
    authorName: "Botapolis editorial",
    publishedAt: tool.created_at,
    updatedAt: tool.updated_at,
    reviewPath,
  })

  // ──────────────────────────────────────────────────────────────────────
  // Programmatic OG cover — same recipe as legacy reviews
  // ──────────────────────────────────────────────────────────────────────
  const ogCoverHref = reviewOgCoverHref({
    toolName: tool.name,
    logoUrl: tool.logo_url,
    rating: tool.rating,
    eyebrowWord: t.eyebrow,
  })

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <ArticleHero
          eyebrow={t.eyebrow}
          title={headline}
          lede={tool.tagline ?? tool.description ?? ""}
          publishedAt={tool.created_at.slice(0, 10)}
          updatedAt={tool.updated_at.slice(0, 10)}
          readingTime={estimateReadingTime(tool, locale)}
          author="Botapolis editorial"
          breadcrumbs={[
            { name: dict.nav.reviews, href: `${localePrefix}/reviews` },
            { name: tool.name, href: reviewPath },
          ]}
          localePrefix={localePrefix}
          locale={locale}
          showAffiliateNotice={tool.affiliate_url != null}
          aside={tool.rating != null ? (
            <RatingBadge value={tool.rating} locale={locale} chipLabel={t.ratingChip} />
          ) : null}
        />

        <ArticleCover slug={slug} ogCoverHref={ogCoverHref} />

        <section className="container-default py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_240px] lg:gap-14">
            <article className="min-w-0">
              {/* ── TL;DR ──────────────────────────────────────────────── */}
              {tool.description && (
                <Section id="tldr" title={t.tldrHeading} eyebrow="01">
                  <p className="max-w-3xl text-[17px] leading-[1.7] text-[var(--text-secondary)]">
                    {tool.description}
                  </p>
                </Section>
              )}

              {/* ── Best for / Not for ────────────────────────────────── */}
              {hasFitChips && (
                <Section id="fit" title={t.fitHeading} eyebrow="02">
                  <FitChips
                    bestFor={tool.best_for ?? undefined}
                    notFor={tool.not_for ?? undefined}
                    bestForLabel={t.bestForLabel}
                    notForLabel={t.notForLabel}
                  />
                </Section>
              )}

              {/* ── Pros & Cons ────────────────────────────────────────── */}
              {hasProsCons && (
                <Section id="pros-cons" title={t.prosConsHeading} eyebrow="03">
                  <ProsConsList
                    pros={tool.pros ?? []}
                    cons={tool.cons ?? []}
                    prosLabel={t.prosLabel}
                    consLabel={t.consLabel}
                  />
                </Section>
              )}

              {/* ── Pricing ────────────────────────────────────────────── */}
              <Section id="pricing" title={t.pricingHeading} eyebrow="04">
                <div className="max-w-md">
                  <PriceCard tool={tool} locale={locale} t={t} />
                </div>
                {tool.pricing_notes && (
                  <div className="mt-6 max-w-3xl whitespace-pre-line text-[14px] leading-[1.7] text-[var(--text-secondary)]">
                    {tool.pricing_notes}
                  </div>
                )}
                {tool.pricing_source_url && (
                  <p className="mt-4 text-[12px] text-[var(--text-tertiary)] leading-[1.5]">
                    {t.pricingSource}:{" "}
                    <span className="text-[var(--text-secondary)] break-all">
                      {tool.pricing_source_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  </p>
                )}
              </Section>

              {/* ── Features ───────────────────────────────────────────── */}
              {hasFeatures && (
                <Section id="features" title={t.featuresHeading} eyebrow="05">
                  <FeatureGrid features={tool.features ?? []} locale={locale} />
                </Section>
              )}

              {/* ── Shopify integration ───────────────────────────────── */}
              {hasShopifyNotes && (
                <Section id="shopify-integration" title={t.shopifyHeading} eyebrow="06">
                  <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6 max-w-3xl">
                    <p className="whitespace-pre-line text-[15px] leading-[1.7] text-[var(--text-primary)]">
                      {tool.shopify_native_notes}
                    </p>
                  </div>
                </Section>
              )}

              {/* ── Integrations ──────────────────────────────────────── */}
              {hasIntegrations && (
                <Section id="integrations" title={t.integrationsHeading} eyebrow="07">
                  {tool.integrations && tool.integrations.length > 0 && (
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                        {t.externalPlatformsLabel}
                      </p>
                      <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
                        {tool.integrations.map((i) => (
                          <li
                            key={i}
                            className="inline-flex items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-base)] px-2.5 py-0.5 text-[12px] text-[var(--text-secondary)]"
                          >
                            {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {crossLinked.length > 0 && (
                    <div className="mt-8">
                      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                        {t.crossLinkedLabel}
                      </p>
                      <ul role="list" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {crossLinked.map((c) => (
                          <li key={c.slug}>
                            <Link
                              href={`${localePrefix}/reviews/${c.slug}`}
                              className={cn(
                                "group flex items-center gap-2.5 rounded-xl border border-[var(--border-base)]",
                                "bg-[var(--bg-surface)] px-3 py-2 transition-colors",
                                "hover:border-[var(--border-strong)]",
                              )}
                            >
                              <ToolLogo
                                src={c.logo_url}
                                name={locale === "ru" ? (c.name_ru ?? c.name) : c.name}
                                size={24}
                                className="shrink-0 rounded-md"
                              />
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {locale === "ru" ? (c.name_ru ?? c.name) : c.name}
                              </span>
                              <ArrowUpRight className="ml-auto size-3.5 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--brand)]" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Section>
              )}

              {/* ── Rating breakdown ──────────────────────────────────── */}
              {hasRatingBreakdown && tool.rating_breakdown && (
                <Section id="rating-breakdown" title={t.ratingsHeading} eyebrow="08">
                  <RatingBreakdownGrid
                    breakdown={tool.rating_breakdown}
                    labels={t.axes}
                    sourceLabels={{ H: t.sourceHandsOn, I: t.sourceInferred }}
                  />
                </Section>
              )}

              {/* ── External ratings ──────────────────────────────────── */}
              {hasExternalRatings && tool.external_ratings && (
                <Section id="external-ratings" title={t.externalRatingsHeading} eyebrow="09">
                  <ExternalRatingsList
                    external={tool.external_ratings}
                    reviewsLabel={t.reviewsLabel}
                  />
                </Section>
              )}

              {/* ── Operator quotes ───────────────────────────────────── */}
              {hasOperatorQuotes && (
                <Section id="operator-quotes" title={t.operatorQuotesHeading} eyebrow="10">
                  <OperatorQuotesList quotes={tool.operator_quotes} />
                </Section>
              )}

              <ScrollMilestone event="review_scrolled_50" properties={{ slug, locale }} />

              {/* ── Verdict ───────────────────────────────────────────── */}
              {hasVerdict && tool.verdict && (
                <Section id="verdict" title={t.verdictHeading} eyebrow="11">
                  <div className="relative max-w-3xl">
                    <div
                      aria-hidden="true"
                      className="absolute -left-4 top-0 h-full w-1 rounded-full"
                      style={{ background: "var(--gradient-cta)" }}
                    />
                    <p className="whitespace-pre-line pl-6 text-[18px] leading-[1.7] text-[var(--text-primary)]">
                      {tool.verdict}
                    </p>
                  </div>
                </Section>
              )}

              {/* ── Partner alternatives — emphasized when this tool has no
                  affiliate_url so the block is the page's primary monetised
                  exit. Otherwise it's a bonus discovery surface below the
                  verdict. Compare-links rendered per-card when an existing
                  /compare/[X-vs-Y] page is published. */}
              <PartnerAlternatives
                currentSlug={tool.slug}
                currentName={tool.name}
                currentCategory={tool.category}
                locale={locale}
                localePrefix={localePrefix}
                emphasized={tool.affiliate_url == null}
                maxCount={3}
                bare
              />

              {/* ── Tail CTA (Judge.me carve-out: null when affiliate_url IS NULL) ── */}
              <div className="mt-10">
                <AffiliateButton
                  tool={tool.slug}
                  localePrefix={localePrefix}
                  campaign={`review-${slug}`}
                />
              </div>
            </article>

            {/* Sticky right column — ToC + try card */}
            <aside className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto flex flex-col gap-8 lg:gap-10">
              <TableOfContents entries={tocEntries} label={t.tocLabel} sticky={false} />
              <ToolStickyCard
                tool={tool}
                localePrefix={localePrefix}
                locale={locale}
                tryLabel={`${t.tryCta} ${tool.name}`}
                ratingLabel={t.ratingChip}
                campaign={`review-${slug}`}
              />
            </aside>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <link rel="canonical" href={absoluteUrl(reviewPath)} />
    </>
  )
}

// ============================================================================
// Local helpers — small enough to live with the page
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
      className="py-10 lg:py-12 border-b border-[var(--border-subtle)] first:pt-0"
    >
      <div className="flex items-center gap-3">
        {eyebrow && (
          <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
            {eyebrow}
          </span>
        )}
        <h2 className="text-h3 font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function RatingBadge({
  value,
  locale,
  chipLabel,
}: {
  value: number
  locale: "en" | "ru"
  chipLabel: string
}) {
  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center justify-center",
        "rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-5 py-4",
        "shadow-[var(--shadow-sm)]",
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
        {chipLabel}
      </span>
      <span className="mt-1 font-mono text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
        {value.toFixed(1)}
        <span className="text-[var(--text-tertiary)] text-[16px] font-normal">/10</span>
      </span>
      <span className="sr-only">{locale === "ru" ? "из 10" : "out of 10"}</span>
    </div>
  )
}

function FitChips({
  bestFor,
  notFor,
  bestForLabel,
  notForLabel,
}: {
  bestFor?: string
  notFor?: string
  bestForLabel: string
  notForLabel: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-4 max-w-3xl">
      {bestFor && (
        <p className="flex flex-wrap items-baseline gap-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-700)]">
            {bestForLabel}
          </span>
          <span className="text-[var(--text-primary)]">{bestFor}</span>
        </p>
      )}
      {notFor && (
        <p className="flex flex-wrap items-baseline gap-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#B91C1C]">
            {notForLabel}
          </span>
          <span className="text-[var(--text-primary)]">{notFor}</span>
        </p>
      )}
    </div>
  )
}

function PriceCard({
  tool,
  locale,
  t,
}: {
  tool: ToolRow
  locale: "en" | "ru"
  t: {
    startingPrice: string
    perMonth: string
    upTo: string
    pricingModel: string
    free: string
  }
}) {
  const min = tool.pricing_min
  const max = tool.pricing_max
  const isFree = tool.pricing_model === "free" || (min === 0 && max == null)
  return (
    <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {t.startingPrice}
      </p>
      <p className="mt-3 font-mono text-[28px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
        {isFree
          ? t.free
          : min != null
            ? <>{formatPrice(min, { locale, maximumFractionDigits: 0 })}<span className="ml-1 text-[13px] text-[var(--text-tertiary)]">{t.perMonth}</span></>
            : "—"
        }
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
    </div>
  )
}

function FeatureGrid({
  features,
  locale,
}: {
  features: ToolFeature[]
  locale: "en" | "ru"
}) {
  return (
    <ul role="list" className="grid gap-3 md:grid-cols-2">
      {features.map((f) => (
        <li
          key={f.name}
          className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-4 lg:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-[15px] tracking-[-0.005em] text-[var(--text-primary)]">
              {f.name}
            </p>
            {f.is_ai && (
              <span className="inline-flex items-center rounded-full border border-[var(--accent-300)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.06em] text-[var(--brand)]">
                AI
              </span>
            )}
          </div>
          {f.description && (
            <p className="mt-2 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
              {f.description}
            </p>
          )}
          {(f.ai_kind || f.plan_availability) && (
            <dl className="mt-3 grid gap-1 text-[12px]">
              {f.ai_kind && (
                <div className="flex flex-wrap gap-1.5">
                  <dt className="font-mono uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                    {locale === "ru" ? "тип AI" : "AI kind"}
                  </dt>
                  <dd className="text-[var(--text-secondary)]">{f.ai_kind}</dd>
                </div>
              )}
              {f.plan_availability && (
                <div className="flex flex-wrap gap-1.5">
                  <dt className="font-mono uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                    {locale === "ru" ? "тариф" : "plan"}
                  </dt>
                  <dd className="text-[var(--text-secondary)]">{f.plan_availability}</dd>
                </div>
              )}
            </dl>
          )}
        </li>
      ))}
    </ul>
  )
}

function RatingBreakdownGrid({
  breakdown,
  labels,
  sourceLabels,
}: {
  breakdown: ToolRow["rating_breakdown"]
  labels: { ease_of_use: string; features: string; value: string; support: string }
  sourceLabels: { H: string; I: string }
}) {
  if (!breakdown) return null
  const axes: Array<{ key: "ease_of_use" | "features" | "value" | "support"; label: string }> = [
    { key: "ease_of_use", label: labels.ease_of_use },
    { key: "features",    label: labels.features },
    { key: "value",       label: labels.value },
    { key: "support",     label: labels.support },
  ]
  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {axes.map(({ key, label }) => {
        const axis = breakdown[key]
        const value = axisValue(axis)
        const source = axisSource(axis)
        return (
          <li
            key={key}
            className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-4 lg:p-5"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {label}
            </p>
            <p className="mt-2 font-mono text-[22px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
              {value != null ? value.toFixed(1) : "—"}
              {value != null && (
                <span className="ml-1 text-[12px] font-normal text-[var(--text-tertiary)]">/10</span>
              )}
            </p>
            {source && (
              <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                [{source}] {source === "H" ? sourceLabels.H : sourceLabels.I}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ExternalRatingsList({
  external,
  reviewsLabel,
}: {
  external: NonNullable<ToolRow["external_ratings"]>
  reviewsLabel: string
}) {
  const platforms: Array<{ key: keyof typeof external; label: string }> = [
    { key: "g2",             label: "G2" },
    { key: "shopify_store",  label: "Shopify App Store" },
    { key: "trustpilot",     label: "Trustpilot" },
  ]
  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-3">
      {platforms.map(({ key, label }) => {
        const p = external[key]
        if (!p) return null
        return (
          <li
            key={key}
            className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-4 lg:p-5"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {label}
            </p>
            <p className="mt-2 font-mono text-[22px] font-semibold tracking-tight tabular-nums text-[var(--text-primary)]">
              {p.score != null ? `${p.score.toFixed(1)}/5` : "—"}
            </p>
            {p.reviews != null && (
              <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)] tabular-nums">
                {p.reviews.toLocaleString()} {reviewsLabel}
              </p>
            )}
            {p.note && (
              <p className="mt-2 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
                {p.note}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function OperatorQuotesList({ quotes }: { quotes: ToolOperatorQuote[] }) {
  return (
    <ul role="list" className="grid gap-4 md:grid-cols-2">
      {quotes.map((q, i) => (
        <li
          key={i}
          className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6"
        >
          <p className="text-[15px] leading-[1.6] text-[var(--text-primary)] italic">
            &ldquo;{q.quote}&rdquo;
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            {q.source}{q.date ? ` · ${q.date}` : ""}
          </p>
        </li>
      ))}
    </ul>
  )
}

function ToolStickyCard({
  tool,
  localePrefix,
  locale,
  tryLabel,
  ratingLabel,
  campaign,
}: {
  tool: ToolRow
  localePrefix: "" | "/ru"
  locale: "en" | "ru"
  tryLabel: string
  ratingLabel: string
  campaign: string
}) {
  // Judge.me carve-out: tools without affiliate_url get a "Visit website"
  // button only — no /go/[slug] CTA. Keeps the right rail consistent across
  // tools while honouring the honest-framing rule from content-flags.md.
  const showAffiliateCta = tool.affiliate_url != null

  const priceText =
    tool.pricing_min == null
      ? null
      : tool.pricing_model === "free"
      ? locale === "ru" ? "Бесплатно" : "Free"
      : tool.pricing_model === "freemium"
      ? locale === "ru"
        ? `Free · от $${tool.pricing_min}/мес`
        : `Free · from $${tool.pricing_min}/mo`
      : locale === "ru"
      ? `от $${tool.pricing_min}/мес`
      : `from $${tool.pricing_min}/mo`

  return (
    <div className="mt-0">
      <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <ToolLogo
            src={tool.logo_url}
            name={tool.name}
            size={48}
            className="shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">
              {tool.name}
            </p>
            {tool.tagline && (
              <p className="mt-0.5 text-[12px] leading-[1.4] text-[var(--text-tertiary)] line-clamp-2">
                {tool.tagline}
              </p>
            )}
          </div>
        </div>

        {(tool.rating != null || priceText) && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-muted)] px-3 py-2.5">
            {tool.rating != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {ratingLabel}
                </span>
                <span className="font-mono text-[18px] font-semibold text-[var(--brand)] tabular-nums">
                  {tool.rating.toFixed(1)}
                  <span className="text-[var(--text-tertiary)] text-[12px] font-normal">/10</span>
                </span>
              </div>
            ) : (
              <span aria-hidden="true" />
            )}
            {priceText && (
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {priceText}
              </span>
            )}
          </div>
        )}

        {showAffiliateCta && (
          <Link
            href={`${localePrefix}/go/${tool.slug}?utm_campaign=${encodeURIComponent(campaign)}`}
            rel="sponsored nofollow noopener"
            target="_blank"
            className={cn(
              buttonVariants({ variant: "cta", size: "default" }),
              "mt-4 w-full justify-between",
            )}
          >
            <span>{tryLabel}</span>
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        )}
        {/* "Website" secondary button removed 2026-06-01 outbound-link sweep:
            it duplicated the /go/ primary on the same vendor URL, so it
            offered a free non-monetised escape hatch around /go/. Owner
            rule: single monetised exit. Tools without affiliate_url
            (Judge.me) now show no outbound CTA at all — logo + name +
            rating + price only. */}
      </div>
    </div>
  )
}
