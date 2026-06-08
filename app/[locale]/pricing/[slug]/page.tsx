import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, Tag } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ArticleHero } from "@/components/content/ArticleHero"
import { ArticleCover } from "@/components/content/ArticleCover"
import { TableOfContents } from "@/components/content/TableOfContents"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { PartnerAlternatives } from "@/components/tools/PartnerAlternatives"
import { buttonVariants } from "@/components/ui/button"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateSoftwareApplicationSchema,
} from "@/lib/seo/schema"
import { getAllMdxSlugs, getMdxContent } from "@/lib/content/mdx"
import {
  fetchBestMentions,
  fetchRelatedComparisons,
} from "@/lib/content/related-blocks"
import { localizeTool } from "@/lib/content/tool-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { pinLocale } from "@/lib/i18n/locale-store"
import { absoluteUrl, cn, formatPrice } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /pricing/[slug] — deep-dive pricing analysis (Etap J-generate)
   ----------------------------------------------------------------------------
   Hybrid: MDX body owns the long-form narrative (tier-by-tier breakdown,
   hidden-cost math, FAQ, "how to lower a bill"); the `tools` row hydrates
   the PriceCard summary chip + sticky right card so the structured price
   stays in lockstep with the catalog.

   Intent split with /tools/[slug] (Phase 0 audit, 2026-06-03):
     - /tools/{slug} answers "is X any good?" — review intent. The pricing
       section stays a ~50-word summary + CTA to the deep dive here.
     - /pricing/{slug} answers "what does X actually cost at my scale?" —
       pricing intent. SERP audit showed 10/10 top-10 results for
       "X pricing" are dedicated pricing pages. Different depth = no
       cannibalisation (proven by the SERP segmenting reviews from
       pricing-page results).

   Canonical: /pricing/{slug} (NOT /tools/{slug}). Breadcrumb passes through
   /tools/{Tool} for navigation but the rel=canonical link tag pins this URL.
---------------------------------------------------------------------------- */

export const revalidate = 86400
// `true` so newly committed pricing MDX renders on the next request without
// waiting for a full redeploy of generateStaticParams. Mirrors /tools/[slug]
// behavior. Unknown slugs still 404 via notFound() inside the page when the
// MDX file isn't on disk.
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

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
      console.error(`[/pricing/${slug}] tool fetch failed:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.error(`[/pricing/${slug}] tool fetch threw:`, err)
    return null
  }
}

export async function generateStaticParams() {
  const en = await getAllMdxSlugs("pricing", "en")
  const ru = await getAllMdxSlugs("pricing", "ru")
  return [...new Set([...en, ...ru])].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await pinLocale(params)
  const article = await getMdxContent("pricing", slug, locale)
  if (!article) {
    return buildMetadata({
      title: "Pricing page not found",
      description: "We couldn't find this pricing breakdown.",
      path: `/pricing/${slug}`,
      locale,
      noIndex: true,
    })
  }
  const { frontmatter } = article
  return buildMetadata({
    title: frontmatter.title,
    description: frontmatter.description,
    path: `/pricing/${slug}`,
    locale,
    type: "article",
    ogImage: frontmatter.ogImage,
    article: {
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt ?? frontmatter.publishedAt,
      author: frontmatter.author,
      tags: frontmatter.tags,
      section: "pricing",
    },
    keywords: [
      ...frontmatter.tags,
      "shopify",
      "pricing",
      frontmatter.primaryKeyword ?? "",
    ].filter(Boolean) as string[],
  })
}

export default async function PricingPage({ params }: PageProps) {
  const { slug } = await params
  const locale = (await pinLocale(params)) as "en" | "ru"
  const article = await getMdxContent("pricing", slug, locale)
  if (!article) notFound()

  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""
  const { frontmatter, content, toc, readingTime, fellBackToEn } = article

  // Hydrate the tool row keyed by frontmatter.toolSlug. Missing tool = soft
  // fail (404) rather than render a pricing page without the PriceCard
  // anchor — that would defeat the hybrid model.
  const rawTool = await fetchTool(frontmatter.toolSlug)
  if (!rawTool) notFound()
  const tool = localizeTool(rawTool, locale)

  const pricingPath = `${localePrefix}/pricing/${slug}`
  const toolPath = `${localePrefix}/tools/${tool.slug}`

  // Related block — curated centre → satellite paths. Same helper set as
  // /tools/[slug] so the cross-link surface stays consistent: alternatives
  // hub + head-to-head comparisons (same-category first) + best-of mentions.
  // PartnerAlternatives renders below as the monetised tail.
  const [relatedComparisons, bestMentions] = await Promise.all([
    fetchRelatedComparisons(rawTool.id, rawTool.category, locale, locale, 3),
    fetchBestMentions(rawTool.slug, locale, 3),
  ])
  const hasRelatedCompares = relatedComparisons.length > 0
  const hasRelatedBests = bestMentions.length > 0

  const t =
    locale === "ru"
      ? {
          eyebrow: "Цены",
          tocLabel: "Содержание",
          summaryHeading: "Кратко по ценам",
          startingPrice: "Старт от",
          upTo: "до",
          pricingModel: "Модель",
          perMonth: "/мес",
          free: "Бесплатно",
          custom: "По запросу",
          openReview: "Открыть обзор",
          tryLabel: "Открыть",
          ratingChip: "Оценка",
          relatedHeading: "Похожее",
          seeAlternativesLabel: `Альтернативы ${tool.name}`,
          headToHeadHeading: "Head-to-head сравнения",
          bestOfMentionsHeading: "В подборках",
          versusSeparator: "vs",
          fellBackTitle: "Перевод в работе",
          fellBackBody:
            "Эта статья пока доступна только на английском. Мы переводим её.",
        }
      : {
          eyebrow: "Pricing",
          tocLabel: "On this page",
          summaryHeading: "Pricing at a glance",
          startingPrice: "Starting price",
          upTo: "up to",
          pricingModel: "Model",
          perMonth: "/mo",
          free: "Free",
          custom: "Custom (sales)",
          openReview: "Read the review",
          tryLabel: "Try",
          ratingChip: "Rating",
          relatedHeading: "Related",
          seeAlternativesLabel: `See ${tool.name} alternatives`,
          headToHeadHeading: "Head-to-head comparisons",
          bestOfMentionsHeading: "Featured in best-of",
          versusSeparator: "vs",
          fellBackTitle: "Translation in progress",
          fellBackBody:
            "This article hasn't been translated yet — you're reading the English original.",
        }

  // Breadcrumb passes through Tools → {Tool} so the reader can backtrack to
  // the canonical tool page; the page itself remains canonically at
  // /pricing/{slug} — see <link rel="canonical"> below.
  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: dict.nav.tools, path: `${localePrefix}/tools` },
    { name: tool.name, path: toolPath },
    { name: t.eyebrow, path: pricingPath },
  ])

  const articleSchema = generateArticleSchema({
    headline: frontmatter.title,
    description: frontmatter.description,
    path: pricingPath,
    publishedAt: frontmatter.publishedAt,
    updatedAt: frontmatter.updatedAt,
    authorName: frontmatter.author,
    section: "pricing",
    tags: [...frontmatter.tags, tool.slug, "pricing"],
  })

  // SoftwareApplication carries the structured Offer (price + priceCurrency
  // + availability + pricing model) — this is what powers schema.org's
  // PriceSpecification semantics on a pricing-page surface. Same shape we
  // emit on /tools/[slug]; here it's a standalone node (no Review wrapper)
  // because /pricing/ isn't an editorial review — it's pricing reference.
  const softwareApp = generateSoftwareApplicationSchema({
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
  })

  const faq =
    frontmatter.faq && frontmatter.faq.length > 0
      ? generateFAQSchema(frontmatter.faq)
      : null

  // Programmatic OG cover — uses guide eyebrow recipe since pricing pages
  // are editorial deep-dives like guides. Swap eyebrow text to localised
  // "Pricing" / "Цены".
  const ogCoverHref = `/api/og?${new URLSearchParams({
    variant: "cover",
    eyebrow: t.eyebrow,
  }).toString()}`

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <ArticleHero
          eyebrow={t.eyebrow}
          title={frontmatter.title}
          lede={frontmatter.description}
          publishedAt={frontmatter.publishedAt}
          updatedAt={frontmatter.updatedAt}
          readingTime={readingTime.text}
          author={frontmatter.author}
          breadcrumbs={[
            { name: dict.nav.tools, href: `${localePrefix}/tools` },
            { name: tool.name, href: toolPath },
            { name: t.eyebrow, href: pricingPath },
          ]}
          localePrefix={localePrefix}
          locale={locale}
          showAffiliateNotice={tool.affiliate_url != null}
          notice={
            fellBackToEn ? (
              <FellBackNotice title={t.fellBackTitle} body={t.fellBackBody} />
            ) : null
          }
        />

        <ArticleCover
          slug={slug}
          coverImage={frontmatter.coverImage}
          ogCoverHref={ogCoverHref}
        />

        <section className="container-default py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_240px] lg:gap-14">
            <article className="min-w-0">
              {/* ── Pricing summary chip — hydrated from `tools` row.
                  Mirrors the PriceCard on /tools/[slug] so the structured
                  signal is consistent across both surfaces. The MDX body
                  below carries the actual tier-by-tier math. */}
              <section className="pb-10 lg:pb-12 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
                    01
                  </span>
                  <h2 className="text-h3 font-semibold tracking-[-0.02em]">
                    {t.summaryHeading}
                  </h2>
                </div>
                <div className="mt-6 max-w-md">
                  <PriceCard tool={tool} locale={locale} t={t} />
                </div>
              </section>

              {/* ── MDX narrative — owns 95% of the page word count.
                  Pricing tiers in numbers, hidden-cost gotchas, full-stack
                  math at concrete contact bands, FAQ, "how to lower a
                  bill", alternatives. The depth that separates /pricing/
                  from /tools/ structurally and SERP-wise. */}
              <div className="pt-2 lg:pt-4 prose-content">{content}</div>

              {/* ── Related — curated centre → satellite paths.
                  Mirrors the /tools/[slug] Related block so the cross-link
                  surface is consistent across both surfaces (pricing reader
                  pivots back to overall review via the alternatives hub or
                  head-to-head pair). PartnerAlternatives renders below as
                  the monetised tail. Cap: 1 + 3 + 3 = 7 links. */}
              <section
                id="related"
                className="py-10 lg:py-12 border-t border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
                    ↗
                  </span>
                  <h2 className="text-h3 font-semibold tracking-[-0.02em]">
                    {t.relatedHeading}
                  </h2>
                </div>
                <div className="mt-6 flex flex-col gap-6 max-w-3xl">
                  {/* a. Alternatives hub for this tool — always present. */}
                  <Link
                    href={`${localePrefix}/alternatives/${slug}`}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-2xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)]",
                      "px-4 py-3 transition-colors hover:border-[var(--border-strong)]",
                    )}
                  >
                    <span className="text-[15px] font-medium text-[var(--text-primary)]">
                      {t.seeAlternativesLabel}
                    </span>
                    <ArrowUpRight
                      className="size-4 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--brand)]"
                      aria-hidden="true"
                    />
                  </Link>

                  {/* b. Head-to-head comparisons — top 3, same-category first. */}
                  {hasRelatedCompares && (
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                        {t.headToHeadHeading}
                      </p>
                      <ul role="list" className="mt-3 flex flex-col gap-2">
                        {relatedComparisons.map((c) => (
                          <li key={c.slug}>
                            <Link
                              href={`${localePrefix}/compare/${c.slug}`}
                              className={cn(
                                "group flex flex-col gap-1 rounded-xl",
                                "border border-[var(--border-base)] bg-[var(--bg-surface)]",
                                "px-4 py-3 transition-colors hover:border-[var(--border-strong)]",
                              )}
                            >
                              <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
                                {c.other.logo_url && (
                                  <ToolLogo
                                    src={c.other.logo_url}
                                    name={c.other.name}
                                    size={20}
                                    className="shrink-0 rounded-md"
                                  />
                                )}
                                <span>
                                  {tool.name}{" "}
                                  <span className="font-mono text-[12px] text-[var(--text-tertiary)]">
                                    {t.versusSeparator}
                                  </span>{" "}
                                  {c.other.name}
                                </span>
                                <ArrowUpRight
                                  className="ml-auto size-3.5 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--brand)]"
                                  aria-hidden="true"
                                />
                              </div>
                              {c.verdict && (
                                <p className="text-[13px] leading-[1.5] text-[var(--text-secondary)] line-clamp-1">
                                  {c.verdict}
                                </p>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* c. Best-of mentions — top 3, publishedAt DESC. */}
                  {hasRelatedBests && (
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                        {t.bestOfMentionsHeading}
                      </p>
                      <ul role="list" className="mt-3 flex flex-col gap-2">
                        {bestMentions.map((b) => (
                          <li key={b.slug}>
                            <Link
                              href={`${localePrefix}/best/${b.slug}`}
                              className={cn(
                                "group flex items-center justify-between gap-3 rounded-xl",
                                "border border-[var(--border-base)] bg-[var(--bg-surface)]",
                                "px-4 py-3 transition-colors hover:border-[var(--border-strong)]",
                              )}
                            >
                              <span className="text-[14px] font-medium text-[var(--text-primary)] line-clamp-2">
                                {b.title}
                              </span>
                              <ArrowUpRight
                                className="size-3.5 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--brand)] shrink-0"
                                aria-hidden="true"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Partner alternatives — emphasized when this tool has no
                  affiliate_url so the block is the page's primary monetised
                  exit. Otherwise it's a bonus discovery surface below the
                  Related list. Same component as /tools/[slug]. */}
              <PartnerAlternatives
                currentSlug={tool.slug}
                currentName={tool.name}
                currentCategory={tool.category}
                currentSubcategories={tool.subcategories ?? []}
                locale={locale}
                localePrefix={localePrefix}
                emphasized={tool.affiliate_url == null}
                maxCount={3}
                bare
              />
            </article>

            {/* Sticky right column — ToC + ToolStickyCard. The card carries
                the /go/ CTA (single monetised exit on this surface; the
                MDX body may also include affiliate CTAs but the sticky
                card guarantees one is always above the fold). */}
            <aside className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto flex flex-col gap-8 lg:gap-10">
              <TableOfContents entries={toc} label={t.tocLabel} sticky={false} />
              <ToolStickyCard
                tool={tool}
                localePrefix={localePrefix}
                locale={locale}
                tryLabel={`${t.tryLabel} ${tool.name}`}
                openReviewLabel={t.openReview}
                ratingLabel={t.ratingChip}
                campaign={`pricing-${slug}`}
              />
            </aside>
          </div>
        </section>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(pricingPath)} />
    </>
  )
}

// ============================================================================
// Local helpers
// ============================================================================

function PriceCard({
  tool,
  locale,
  t,
}: {
  tool: ToolRow
  locale: "en" | "ru"
  t: {
    startingPrice: string
    upTo: string
    pricingModel: string
    perMonth: string
    free: string
    custom: string
  }
}) {
  const min = tool.pricing_min
  const max = tool.pricing_max
  const isFree = tool.pricing_model === "free" || (min === 0 && max == null)
  // Custom-pricing tools (Attentive, Signifyd, Northbeam, Inventory Planner)
  // have min/max=null + model='custom' — the PriceCard would otherwise show
  // a meaningless "—" where the headline price lives. Render the localised
  // "Custom (sales)" / "По запросу" label so the chip carries signal.
  const isCustomQuote = tool.pricing_model === "custom" && min == null
  return (
    <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {t.startingPrice}
      </p>
      <p className="mt-3 font-mono text-[28px] tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
        {isFree ? (
          t.free
        ) : isCustomQuote ? (
          t.custom
        ) : min != null ? (
          <>
            {formatPrice(min, { locale, maximumFractionDigits: 0 })}
            <span className="ml-1 text-[13px] text-[var(--text-tertiary)]">
              {t.perMonth}
            </span>
          </>
        ) : (
          "—"
        )}
      </p>
      <dl className="mt-4 space-y-1.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--text-tertiary)]">{t.upTo}</dt>
          <dd className="font-mono text-[var(--text-secondary)] tabular-nums">
            {max != null
              ? formatPrice(max, { locale, maximumFractionDigits: 0 }) + t.perMonth
              : "—"}
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

function ToolStickyCard({
  tool,
  localePrefix,
  locale,
  tryLabel,
  openReviewLabel,
  ratingLabel,
  campaign,
}: {
  tool: ToolRow
  localePrefix: "" | "/ru"
  locale: "en" | "ru"
  tryLabel: string
  openReviewLabel: string
  ratingLabel: string
  campaign: string
}) {
  // Same shape as /tools/[slug] ToolStickyCard so readers get a familiar
  // anchor. Adds "Read the review" outline button — the centre↔satellite
  // backlink that distinguishes pricing-surface cards from catalog cards
  // (catalog card on /tools/ has no inverse review link because IT IS the
  // review).
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

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tool.category && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--text-secondary)]">
            <Tag className="size-3" />
            {tool.category}
          </span>
        )}
        {tool.featured > 0 && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.06em] text-white"
            style={{ background: "var(--gradient-hero)" }}
          >
            Featured
          </span>
        )}
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
                <span className="text-[var(--text-tertiary)] text-[12px] font-normal">
                  /10
                </span>
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

      {/* Inverse link to the canonical tool page — the satellite→centre
          path. On /tools/[slug] there's no analogous CTA because the
          page IS the centre; here we surface it explicitly so a pricing
          reader can pivot to overall review with one click. */}
      <Link
        href={`${localePrefix}/tools/${tool.slug}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "mt-4 w-full justify-between",
        )}
      >
        <span>{openReviewLabel}</span>
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>

      {showAffiliateCta && (
        <Link
          href={`${localePrefix}/go/${tool.slug}?utm_campaign=${encodeURIComponent(campaign)}`}
          rel="sponsored nofollow noopener"
          target="_blank"
          className={cn(
            buttonVariants({ variant: "cta", size: "default" }),
            "mt-2 w-full justify-between",
          )}
        >
          <span>{tryLabel}</span>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function FellBackNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-muted)] px-4 py-3">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {title}
      </p>
      <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  )
}
