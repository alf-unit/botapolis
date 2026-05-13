import Link from "next/link"
import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "@/lib/seo/schema"
import { getAllMdxFrontmatter } from "@/lib/content/mdx"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /reviews — index of long-form tool reviews
   ----------------------------------------------------------------------------
   Reads the MDX directory at build time. ISR 6 h to pick up new files without
   waiting for the next prod deploy. EN is authoritative; RU rows fall back
   to EN when a translation isn't present (handled inside the loader).

   Sprint 2 (May 2026): the page intentionally renders the empty state when
   the content directory is missing. We never want a 500 on the listing — a
   broken /reviews on the day a content file ships malformed would tank SEO
   crawl budget faster than the empty-state would.
---------------------------------------------------------------------------- */

export const revalidate = 21600

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru"
        ? "Обзоры AI-инструментов для Shopify"
        : "AI tool reviews for Shopify operators",
    description:
      locale === "ru"
        ? "Подробные обзоры AI-инструментов, протестированных на реальных Shopify-магазинах. Цены, сильные и слабые стороны, честный вердикт."
        : "Hands-on reviews of AI tools tested on real Shopify stores. Pricing, strengths, weaknesses, and an honest verdict.",
    path: "/reviews",
    locale,
  })
}

export default async function ReviewsIndexPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // RU MDX now exists for every published review (auto-translated by the
  // husky pre-commit hook for new commits, manually-translated for the
  // initial 6). Reading the active locale's frontmatter means RU users
  // see RU titles + leads instead of English ones. The per-article page
  // at /ru/reviews/[slug] keeps its own EN fallback inside getMdxContent
  // for any future review whose RU twin is temporarily missing.
  const reviews = await getAllMdxFrontmatter("reviews", locale)

  const t = {
    eyebrow:
      locale === "ru" ? "Обзоры" : "Reviews",
    headline:
      locale === "ru"
        ? "Обзоры, основанные на реальной работе магазина."
        : "Tool reviews built from running real stores.",
    lede:
      locale === "ru"
        ? "Каждый обзор — 60+ дней использования инструмента, реальные цены, реальные минусы. Никаких «оба хорошие»."
        : "Every review = 60+ days using the tool on a real store, real prices, real failure modes. No \"they're all great\" filler.",
    empty:
      locale === "ru"
        ? "Скоро здесь появятся обзоры. Подпишись на рассылку, чтобы не пропустить первые."
        : "Reviews drop here weekly. Subscribe below so you catch the first ones.",
    readMore: locale === "ru" ? "Читать" : "Read",
    minRead: locale === "ru" ? "мин" : "min read",
  }

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: t.eyebrow, path: `${localePrefix}/reviews` },
  ])

  const itemList =
    reviews.length > 0
      ? generateItemListSchema({
          name: t.eyebrow,
          items: reviews.map((r) => ({
            name: r.frontmatter.title,
            url: `${localePrefix}/reviews/${r.slug}`,
          })),
        })
      : null

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* Hero — same gradient blob recipe as /compare and /tools */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
            }}
          />
          <div className="container-default relative pt-10 pb-10 lg:pt-14 lg:pb-12">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
            >
              <Link
                href={`${localePrefix}/`}
                className="hover:text-[var(--text-secondary)]"
              >
                {locale === "ru" ? "Главная" : "Home"}
              </Link>
              <span className="opacity-60">/</span>
              <span className="text-[var(--text-secondary)]">{t.eyebrow}</span>
            </nav>

            <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-3xl">
              {t.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {t.lede}
            </p>
          </div>
        </section>

        {/* Listing */}
        <section className="container-default py-12 lg:py-16">
          {reviews.length === 0 ? (
            <div
              className={cn(
                "rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)]",
                "px-6 py-14 text-center",
              )}
            >
              <p className="text-[15px] text-[var(--text-secondary)]">{t.empty}</p>
              <Link
                href={`${localePrefix}/#newsletter`}
                className="btn-cta mt-5 inline-flex h-10 items-center rounded-md px-4 text-[14px] font-semibold text-white"
              >
                {locale === "ru" ? "Подписаться" : "Subscribe"}
              </Link>
            </div>
          ) : (
            <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map(({ slug, frontmatter }) => (
                <li key={slug}>
                  <Link
                    href={`${localePrefix}/reviews/${slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
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
                    <h2 className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                      {frontmatter.title}
                    </h2>
                    <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)] line-clamp-3">
                      {frontmatter.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand)]">
                      {t.readMore}
                      <ArrowUpRight
                        className="size-[14px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
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
      {itemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/reviews`)} />
    </>
  )
}
