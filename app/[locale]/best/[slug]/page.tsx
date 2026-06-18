import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, ArrowRight } from "lucide-react"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ArticleHero } from "@/components/content/ArticleHero"
import { ArticleCover } from "@/components/content/ArticleCover"
import { TableOfContents } from "@/components/content/TableOfContents"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { RatingStars } from "@/components/tools/RatingStars"
import { PricingBadge } from "@/components/tools/PricingBadge"
import { buttonVariants } from "@/components/ui/button"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "@/lib/seo/schema"
import { getAllMdxSlugs, getMdxContent } from "@/lib/content/mdx"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { pinLocale } from "@/lib/i18n/locale-store"
import { localizeToolPartial } from "@/lib/content/tool-locale"
import { absoluteUrl, cn } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /best/[slug] — Etap G "best-for-segment" listicle route
   ----------------------------------------------------------------------------
   Hybrid: MDX body carries the editorial copy; `frontmatter.tools` is a
   ranked slug array hydrated from `public.tools` at render time so
   rating / pricing / affiliate stay live. RankedToolGrid renders between
   the hero and the MDX body; the MDX continues with per-tool prose and
   editorial verdict.

   When `frontmatter.tools` references a slug missing from the tools
   table (typo, archived), that slot is skipped silently — the page
   still ships rather than 500-ing on a single bad reference.
---------------------------------------------------------------------------- */

export const revalidate = 86400
// `true` so a drip-revealed listing renders on-demand the moment its
// page_publications gate flips visible — mirrors /pricing/[slug] and
// /tools/[slug]. With `false`, generateStaticParams is frozen at build time
// (and getAllMdxSlugs filters hidden slugs out of it), so a slug flipped
// visible by the drip cron would stay 404 until the next full deploy because
// revalidatePath can't add a param to a closed set. `true` lets the
// getMdxContent drip gate be the single visibility authority: hidden → 404,
// flip + revalidate → 200, no redeploy. Unknown slugs still 404 via notFound().
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

type RankedCard = Pick<
  ToolRow,
  | "id" | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru" | "logo_url"
  | "category" | "rating" | "pricing_model" | "pricing_min" | "pricing_max"
  | "affiliate_url" | "best_for" | "best_for_ru"
>

async function fetchRanked(slugs: string[]): Promise<RankedCard[]> {
  if (slugs.length === 0) return []
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("tools")
    .select(
      "id, slug, name, name_ru, tagline, tagline_ru, logo_url, category, rating, pricing_model, pricing_min, pricing_max, affiliate_url, best_for, best_for_ru",
    )
    .in("slug", slugs)
  if (error || !data) return []
  // Preserve frontmatter ranked order. Tools missing from DB are skipped.
  const bySlug = new Map(data.map((t) => [t.slug, t as RankedCard]))
  return slugs.flatMap((s) => {
    const t = bySlug.get(s)
    return t ? [t] : []
  })
}

export async function generateStaticParams() {
  const en = await getAllMdxSlugs("best", "en")
  const ru = await getAllMdxSlugs("best", "ru")
  return [...new Set([...en, ...ru])].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await pinLocale(params)
  const article = await getMdxContent("best", slug, locale)
  if (!article) {
    return buildMetadata({
      title: "Listing not found",
      description: "We couldn't find this listing.",
      path: `/best/${slug}`,
      locale,
      noIndex: true,
    })
  }
  const { frontmatter } = article
  return buildMetadata({
    title: frontmatter.title,
    description: frontmatter.description,
    path: `/best/${slug}`,
    locale,
    type: "article",
    // Branded colocated OG card (П.15-best). Point og:image at the new
    // /best/[slug]/opengraph-image route so best-of shares get a branded
    // cover instead of the generic default. frontmatter.ogImage still wins.
    ogImage: frontmatter.ogImage ?? `/best/${slug}/opengraph-image`,
    article: {
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt ?? frontmatter.publishedAt,
      author: frontmatter.author,
      tags: frontmatter.tags,
      section: "best",
    },
    keywords: [...frontmatter.tags, "shopify", frontmatter.segment, "best"],
  })
}

export default async function BestListingPage({ params }: PageProps) {
  const { slug } = await params
  const locale = await pinLocale(params)
  const article = await getMdxContent("best", slug, locale)
  if (!article) notFound()

  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""
  const { frontmatter, content, toc, readingTime, fellBackToEn } = article

  const path = `${localePrefix}/best/${slug}`
  const rawRanked = await fetchRanked(frontmatter.tools)
  const ranked = rawRanked.map((t) => localizeToolPartial(t, locale as "en" | "ru"))

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: locale === "ru" ? "Подборки" : "Best of", path: `${localePrefix}/best` },
    { name: frontmatter.title, path },
  ])
  const articleSchema = generateArticleSchema({
    headline: frontmatter.title,
    description: frontmatter.description,
    path,
    publishedAt: frontmatter.publishedAt,
    updatedAt: frontmatter.updatedAt,
    authorName: frontmatter.author,
    section: "best",
    tags: frontmatter.tags,
  })
  const itemList =
    ranked.length > 0
      ? generateItemListSchema({
          name: frontmatter.title,
          items: ranked.map((t) => ({
            name: t.name,
            url: `${localePrefix}/tools/${t.slug}`,
          })),
        })
      : null

  const t =
    locale === "ru"
      ? {
          eyebrow: "Подборка",
          tocLabel: "Содержание",
          rankedHeading: "Расстановка",
          tryLabel: "Подробнее в обзоре",
          partnerLabel: "Перейти",
          rank: "#",
          fellBackTitle: "Перевод в работе",
          fellBackBody:
            "Эта статья пока доступна только на английском. Мы переводим её.",
        }
      : {
          eyebrow: "Best of",
          tocLabel: "On this page",
          rankedHeading: "The shortlist",
          tryLabel: "Read the review",
          partnerLabel: "Try it",
          rank: "#",
          fellBackTitle: "Translation in progress",
          fellBackBody:
            "This article hasn't been translated yet — you're reading the English original.",
        }

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
            { name: t.eyebrow, href: `${localePrefix}/best` },
            { name: frontmatter.title, href: path },
          ]}
          localePrefix={localePrefix}
          locale={locale}
          showAffiliateNotice={true}
          notice={
            fellBackToEn ? (
              <FellBackNotice title={t.fellBackTitle} body={t.fellBackBody} />
            ) : null
          }
        />

        <ArticleCover slug={slug} coverImage={frontmatter.coverImage} ogCoverHref={ogCoverHref} />

        {/* Ranked tool grid — server-rendered from DB, preserves frontmatter
            order. Sits between hero and MDX body so the visual shortlist
            anchors the page before the editorial reading copy. */}
        {ranked.length > 0 && (
          <section className="container-default pt-8 lg:pt-12">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
                {ranked.length}
              </span>
              <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                {t.rankedHeading}
              </h2>
            </div>
            <ol role="list" className="mt-6 grid gap-4 md:grid-cols-2">
              {ranked.map((tool, idx) => (
                <li key={tool.slug}>
                  <div
                    className={cn(
                      "group relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6",
                      "shadow-[var(--shadow-sm)]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] font-mono text-[14px] font-semibold text-[var(--text-secondary)]">
                        {t.rank}{idx + 1}
                      </span>
                      <ToolLogo
                        src={tool.logo_url}
                        name={tool.name}
                        size={48}
                        className="shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`${localePrefix}/tools/${tool.slug}`}
                          className="block"
                        >
                          <p className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)] hover:underline underline-offset-4">
                            {tool.name}
                          </p>
                          {tool.tagline && (
                            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)] line-clamp-2">
                              {tool.tagline}
                            </p>
                          )}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-subtle)]">
                      <div className="flex flex-col gap-1">
                        {tool.rating != null && (
                          <RatingStars rating={tool.rating} size="sm" />
                        )}
                        {tool.pricing_model && (
                          <PricingBadge
                            model={tool.pricing_model}
                            min={tool.pricing_min}
                            max={tool.pricing_max}
                            size="sm"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`${localePrefix}/tools/${tool.slug}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-9 px-3 text-[12px]",
                          )}
                        >
                          <span>{t.tryLabel}</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                        {tool.affiliate_url && (
                          <Link
                            href={`${localePrefix}/go/${tool.slug}`}
                            rel="sponsored nofollow noopener"
                            target="_blank"
                            className={cn(
                              buttonVariants({ variant: "cta", size: "sm" }),
                              "h-9 px-3 text-[12px]",
                            )}
                          >
                            <span>{t.partnerLabel}</span>
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="container-default py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_220px] lg:gap-14">
            <article className="min-w-0">{content}</article>
            <TableOfContents entries={toc} label={t.tocLabel} />
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
      {itemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(path)} />
    </>
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
