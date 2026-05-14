import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ArticleHero } from "@/components/content/ArticleHero"
import { TableOfContents } from "@/components/content/TableOfContents"
import { ProsConsList } from "@/components/content/ProsConsList"
import { AffiliateButton } from "@/components/content/AffiliateButton"
import { RelatedArticles } from "@/components/content/RelatedArticles"
import { ScrollMilestone } from "@/components/analytics/ScrollMilestone"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { buttonVariants } from "@/components/ui/button"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateReviewSchema,
} from "@/lib/seo/schema"
import { getAllMdxSlugs, getMdxContent } from "@/lib/content/mdx"
import { createServiceClient } from "@/lib/supabase/service"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /reviews/[slug] — long-form tool review
   ----------------------------------------------------------------------------
   The MDX file at content/reviews/{lang}/{slug}.mdx is the source of truth
   for body copy + frontmatter (rating, pros, cons, toolSlug, ...). We
   additionally hydrate the referenced Supabase tool row to power the
   sidebar "Try it" card and SoftwareApplication schema.

   Routing note: single-segment `[slug]` (not `[...slug]`) because Next 16's
   colocated `opengraph-image.tsx` is incompatible with catch-all routes —
   same constraint /compare/[slug] hit. Single-segment is fine here too.
---------------------------------------------------------------------------- */

export const revalidate = 86400
export const dynamicParams = false  // MDX is build-time, unknown slugs → 404

interface PageProps {
  params: Promise<{ slug: string }>
}

// Pull just enough to power the sidebar + schema; the review body lives in
// MDX so we don't need the long-form fields from Supabase.
type ToolPick = Pick<
  ToolRow,
  | "slug" | "name" | "tagline" | "description"
  | "category" | "logo_url" | "website_url"
  | "pricing_min" | "pricing_max" | "pricing_model"
  | "rating" | "pros" | "cons"
>

async function fetchTool(slug: string): Promise<ToolPick | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select(
        "slug, name, tagline, description, category, logo_url, website_url, pricing_min, pricing_max, pricing_model, rating, pros, cons",
      )
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

export async function generateStaticParams() {
  // Build all locales' slugs together — duplicates collapse to the same
  // route param, no harm done.
  const en = await getAllMdxSlugs("reviews", "en")
  const ru = await getAllMdxSlugs("reviews", "ru")
  const all = new Set([...en, ...ru])
  return [...all].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const review = await getMdxContent("reviews", slug, locale)

  if (!review) {
    return buildMetadata({
      title: "Review not found",
      description: "We couldn't find this review.",
      path: `/reviews/${slug}`,
      locale,
      noIndex: true,
    })
  }

  const { frontmatter } = review
  return buildMetadata({
    title: frontmatter.title,
    description: frontmatter.description,
    path: `/reviews/${slug}`,
    locale,
    type: "article",
    ogImage: frontmatter.ogImage,
    article: {
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt ?? frontmatter.publishedAt,
      author: frontmatter.author,
      tags: frontmatter.tags,
      section: "review",
    },
    keywords: [...frontmatter.tags, "review", "shopify"],
  })
}

export default async function ReviewPage({ params }: PageProps) {
  const { slug } = await params
  const locale = await getLocale()
  const review = await getMdxContent("reviews", slug, locale)
  if (!review) notFound()

  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""
  const { frontmatter, content, toc, readingTime, fellBackToEn } = review

  const tool = await fetchTool(frontmatter.toolSlug)

  // Schema: Article wraps the editorial frame; Review wraps a
  // SoftwareApplication node so Google can render aggregateRating in results.
  const reviewPath = `${localePrefix}/reviews/${slug}`
  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: dict.nav.reviews, path: `${localePrefix}/reviews` },
    { name: frontmatter.title, path: reviewPath },
  ])
  const article = generateArticleSchema({
    headline: frontmatter.title,
    description: frontmatter.description,
    path: reviewPath,
    publishedAt: frontmatter.publishedAt,
    updatedAt: frontmatter.updatedAt,
    authorName: frontmatter.author,
    section: "review",
    tags: frontmatter.tags,
  })

  // Only emit the Review schema if we actually have a hydrated tool — without
  // the SoftwareApplication body, Google flags an incomplete Review node.
  const reviewSchema = tool
    ? generateReviewSchema({
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
          rating: frontmatter.rating ?? tool.rating,
          // Use the article's pros/cons when present (more curated), else
          // fall back to the DB row's lists.
          pros: frontmatter.pros.length ? frontmatter.pros : tool.pros,
          cons: frontmatter.cons.length ? frontmatter.cons : tool.cons,
        },
        authorName: frontmatter.author,
        publishedAt: frontmatter.publishedAt,
        updatedAt: frontmatter.updatedAt ?? frontmatter.publishedAt,
        reviewPath,
      })
    : null

  const t = {
    eyebrow: locale === "ru" ? "Обзор" : "Review",
    prosLabel: locale === "ru" ? "Плюсы" : "Pros",
    consLabel: locale === "ru" ? "Минусы" : "Cons",
    verdictHeading: locale === "ru" ? "Итог" : "Verdict",
    tocLabel: locale === "ru" ? "Содержание" : "On this page",
    sidebarTry: locale === "ru" ? "Открыть" : "Try it",
    sidebarVisit: locale === "ru" ? "Сайт" : "Website",
    bestForLabel: locale === "ru" ? "Лучше всего для" : "Best for",
    notForLabel: locale === "ru" ? "Не подойдёт если" : "Skip if",
    fellBackTitle:
      locale === "ru"
        ? "Перевод в работе"
        : "Translation in progress",
    fellBackBody:
      locale === "ru"
        ? "Эта статья пока доступна только на английском. Мы переводим её."
        : "This article hasn't been translated yet — you're reading the English original.",
  }

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
            { name: dict.nav.reviews, href: `${localePrefix}/reviews` },
            { name: frontmatter.title, href: reviewPath },
          ]}
          localePrefix={localePrefix}
          locale={locale}
          showAffiliateNotice
          notice={
            fellBackToEn ? (
              <FellBackNotice title={t.fellBackTitle} body={t.fellBackBody} />
            ) : null
          }
          aside={
            frontmatter.rating != null ? (
              <RatingBadge value={frontmatter.rating} locale={locale} />
            ) : null
          }
        />

        {/* Body grid: TOC sidebar (desktop) + article column */}
        <section className="container-default py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_240px] lg:gap-14">
            <article className="min-w-0">
              {/* Authors lean on hand-written pros/cons via frontmatter; we
                  render them before the body so the skim-reader gets the
                  verdict without scrolling the whole article. */}
              {(frontmatter.pros.length > 0 || frontmatter.cons.length > 0) && (
                <ProsConsList
                  pros={frontmatter.pros}
                  cons={frontmatter.cons}
                  prosLabel={t.prosLabel}
                  consLabel={t.consLabel}
                  className="my-0 mb-10"
                />
              )}

              {(frontmatter.bestFor || frontmatter.notFor) && (
                <FitChips
                  bestFor={frontmatter.bestFor}
                  notFor={frontmatter.notFor}
                  bestForLabel={t.bestForLabel}
                  notForLabel={t.notForLabel}
                />
              )}

              {content}

              {/* Block C — fires `review_scrolled_50` once when the
                  sentinel below the article body enters the viewport.
                  Captured before the verdict so we measure "did the reader
                  reach the meat of the review", not "did they bounce to
                  the verdict via the TOC". */}
              <ScrollMilestone
                event="review_scrolled_50"
                properties={{ slug, locale }}
              />

              {frontmatter.verdict && (
                <div
                  id="verdict"
                  className="mt-12 rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 lg:p-8 shadow-[var(--shadow-sm)]"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--brand)]">
                    {t.verdictHeading}
                  </p>
                  <p className="mt-3 text-[18px] leading-[1.65] text-[var(--text-primary)]">
                    {frontmatter.verdict}
                  </p>
                </div>
              )}

              {/* Tail CTA — always emit, even without a hydrated tool row.
                  AffiliateButton degrades to slug-only label when DB miss. */}
              <div className="mt-10">
                <AffiliateButton
                  tool={frontmatter.toolSlug}
                  localePrefix={localePrefix}
                  campaign={`review-${slug}`}
                />
              </div>
            </article>

            <div>
              <TableOfContents entries={toc} label={t.tocLabel} />
              {tool && (
                <ToolStickyCard
                  tool={tool}
                  localePrefix={localePrefix}
                  locale={locale}
                  tryLabel={`${t.sidebarTry} ${tool.name}`}
                  visitLabel={t.sidebarVisit}
                  // Wave 3 (audit alignment): rating from the article's own
                  // frontmatter takes priority over the DB row — the editorial
                  // verdict in this review is the load-bearing number, not
                  // the catalog rating which is averaged across all reviews
                  // of the tool. Falls back to tool.rating when frontmatter
                  // omits the field (older reviews pre-sync).
                  articleRating={frontmatter.rating ?? tool.rating}
                  ratingLabel={locale === "ru" ? "Оценка" : "Rating"}
                  campaign={`review-${slug}`}
                />
              )}
            </div>
          </div>
        </section>

        {/* Wave 3 audit alignment (design v.026) — "Related reviews" row
            below the article body. Renders only when there are other
            published reviews to surface (auto-hidden on a brand-new locale). */}
        <RelatedArticles
          type="reviews"
          currentSlug={slug}
          locale={locale}
          localePrefix={localePrefix}
        />
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      {reviewSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(reviewPath)} />
    </>
  )
}

// ============================================================================
// Local helpers — small enough to live with the page
// ============================================================================

function RatingBadge({ value, locale }: { value: number; locale: "en" | "ru" }) {
  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center justify-center",
        "rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-5 py-4",
        "shadow-[var(--shadow-sm)]",
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
        {locale === "ru" ? "Оценка" : "Rating"}
      </span>
      <span className="mt-1 font-mono text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
        {value.toFixed(1)}
        <span className="text-[var(--text-tertiary)] text-[16px] font-normal">/10</span>
      </span>
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
    <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-4">
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

function ToolStickyCard({
  tool,
  localePrefix,
  locale,
  tryLabel,
  visitLabel,
  campaign,
  articleRating,
  ratingLabel,
}: {
  tool: Pick<ToolRow, "slug" | "name" | "tagline" | "logo_url" | "website_url" | "pricing_min" | "pricing_model">
  localePrefix: "" | "/ru"
  locale: "en" | "ru"
  tryLabel: string
  visitLabel: string
  campaign: string
  /** Effective rating shown on the card — caller decides EN priority. */
  articleRating?: number | null
  ratingLabel: string
}) {
  // Wave 3 (audit alignment): the design mockup's right rail surfaces both
  // a rating chip and a pricing line below the brand row. Pricing string
  // mirrors AffiliateButton/RecommendedTools so the language stays consistent
  // across surfaces.
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
    <div className="mt-8 lg:mt-12 lg:sticky lg:top-24">
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

        {/* Rating + pricing strip — only render when at least one value is
            present so the card stays clean for tools we haven't fully scored. */}
        {(articleRating != null || priceText) && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-muted)] px-3 py-2.5">
            {articleRating != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {ratingLabel}
                </span>
                <span className="font-mono text-[18px] font-semibold text-[var(--brand)] tabular-nums">
                  {articleRating.toFixed(1)}
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
        <Link
          href={tool.website_url}
          rel="noopener noreferrer"
          target="_blank"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-2 w-full",
          )}
        >
          {visitLabel}
        </Link>
      </div>
    </div>
  )
}
