import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ArticleHero } from "@/components/content/ArticleHero"
import { ArticleCover } from "@/components/content/ArticleCover"
import { TableOfContents } from "@/components/content/TableOfContents"
import { RelatedArticles } from "@/components/content/RelatedArticles"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateHowToSchema,
} from "@/lib/seo/schema"
import { getAllMdxSlugs, getMdxContent } from "@/lib/content/mdx"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /guides/[slug] — long-form playbook
   ----------------------------------------------------------------------------
   Same overall shape as /reviews/[slug] but pared down: no tool sidebar, no
   pros/cons block, narrower content column. The MDX body is the centrepiece.
   Adds a HowTo JSON-LD node when frontmatter.steps is populated — that's
   the rich-result hook for "step-by-step …" SERP cards.
---------------------------------------------------------------------------- */

export const revalidate = 86400
export const dynamicParams = false

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const en = await getAllMdxSlugs("guides", "en")
  const ru = await getAllMdxSlugs("guides", "ru")
  return [...new Set([...en, ...ru])].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const guide = await getMdxContent("guides", slug, locale)

  if (!guide) {
    return buildMetadata({
      title: "Guide not found",
      description: "We couldn't find this guide.",
      path: `/guides/${slug}`,
      locale,
      noIndex: true,
    })
  }

  const { frontmatter } = guide
  return buildMetadata({
    title: frontmatter.title,
    description: frontmatter.description,
    path: `/guides/${slug}`,
    locale,
    type: "article",
    ogImage: frontmatter.ogImage,
    article: {
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt ?? frontmatter.publishedAt,
      author: frontmatter.author,
      tags: frontmatter.tags,
      section: "guide",
    },
    keywords: [...frontmatter.tags, "shopify", "guide"],
  })
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params
  const locale = await getLocale()
  const guide = await getMdxContent("guides", slug, locale)
  if (!guide) notFound()

  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""
  const { frontmatter, content, toc, readingTime, fellBackToEn } = guide

  const guidePath = `${localePrefix}/guides/${slug}`
  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: dict.nav.guides, path: `${localePrefix}/guides` },
    { name: frontmatter.title, path: guidePath },
  ])
  const article = generateArticleSchema({
    headline: frontmatter.title,
    description: frontmatter.description,
    path: guidePath,
    publishedAt: frontmatter.publishedAt,
    updatedAt: frontmatter.updatedAt,
    authorName: frontmatter.author,
    section: "guide",
    tags: frontmatter.tags,
  })
  const howTo =
    frontmatter.steps && frontmatter.steps.length > 0
      ? generateHowToSchema({
          name: frontmatter.title,
          description: frontmatter.description,
          steps: frontmatter.steps,
        })
      : null

  const t = {
    eyebrow: locale === "ru" ? "Гайд" : "Playbook",
    tocLabel: locale === "ru" ? "Содержание" : "On this page",
    stepsLabel: locale === "ru" ? "Шагов" : "Steps",
    fellBackTitle:
      locale === "ru" ? "Перевод в работе" : "Translation in progress",
    fellBackBody:
      locale === "ru"
        ? "Эта статья пока доступна только на английском. Мы переводим её."
        : "This article hasn't been translated yet — you're reading the English original.",
  }

  // Guides have no tool logo, so the programmatic cover is the mint→violet
  // brand atmosphere + the localised eyebrow. `coverImage` frontmatter
  // overrides with a real photo; gradient remains the final fallback.
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
            { name: dict.nav.guides, href: `${localePrefix}/guides` },
            { name: frontmatter.title, href: guidePath },
          ]}
          localePrefix={localePrefix}
          locale={locale}
          showAffiliateNotice={
            // Guides may or may not contain partner CTAs. Default to showing
            // the line — it's never harmful, and authors who skip affiliate
            // links can override by tagging the frontmatter `tags: [no-promo]`
            // (no-op today, hook for future). FTC-safe default.
            true
          }
          notice={
            fellBackToEn ? (
              <FellBackNotice title={t.fellBackTitle} body={t.fellBackBody} />
            ) : null
          }
          aside={
            frontmatter.steps && frontmatter.steps.length > 0 ? (
              <StepsBadge
                count={frontmatter.steps.length}
                label={t.stepsLabel}
              />
            ) : null
          }
        />

        {/* Wave 5 audit alignment (design v.026) — see /reviews/[slug]
            for the same component's role. Deterministic per-slug
            gradient strip; no per-guide config needed. */}
        <ArticleCover
          slug={slug}
          coverImage={frontmatter.coverImage}
          ogCoverHref={ogCoverHref}
        />

        <section className="container-default py-12 lg:py-16">
          {/* Post-Wave-3 audit follow-up: `max-w-[68ch]` was constraining the
              article to ~620px while the grid column was still claiming the
              full `1fr` slack. The empty space between the article's right
              edge and the TOC visually read as a much wider gap on /guides
              than on /reviews or /compare. Removing the cap lets the article
              fill its grid column the same way /reviews/[slug] already does,
              which keeps the TOC right against the content like the other
              editorial pages. */}
          <div className="grid gap-10 lg:grid-cols-[1fr_220px] lg:gap-14">
            <article className="min-w-0">{content}</article>

            <TableOfContents entries={toc} label={t.tocLabel} />
          </div>
        </section>

        {/* Wave 3 audit alignment (design v.026) — "Related guides" row
            below the article body. Mirrors the reviews surface. */}
        <RelatedArticles
          type="guides"
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
      {howTo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(guidePath)} />
    </>
  )
}

function StepsBadge({ count, label }: { count: number; label: string }) {
  return (
    <div className="relative inline-flex flex-col items-center justify-center rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="mt-1 font-mono text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
        {count}
      </span>
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
