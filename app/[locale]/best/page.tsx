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
import { pinLocale } from "@/lib/i18n/locale-store"
import { absoluteUrl, cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /best — index of best-for-segment listicles (Etap G + onward)
   ----------------------------------------------------------------------------
   Card grid identical in shape to /guides — same hero blob recipe, same 3-col
   md+ grid, same date + chip meta row. Source-of-truth is the MDX frontmatter
   walked by `getAllMdxFrontmatter("best", locale)`. RU mirror lives at
   /ru/best and re-exports this module.

   Phase A+B (2026-06-03) — closes the orphan: before this hub /best/[slug]
   detail pages had no entry point (Navbar didn't surface them, sitemap
   didn't list them, and the breadcrumb on each listicle pointed at /best
   which 404'd). Listed in the sitemap now (see app/sitemap.ts).
---------------------------------------------------------------------------- */

export const revalidate = 86400

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = await pinLocale(params)
  return buildMetadata({
    title:
      locale === "ru"
        ? "Подборки AI-инструментов для Shopify"
        : "Best AI tools for Shopify — round-ups by segment",
    description:
      locale === "ru"
        ? "Ранжированные подборки лучших AI-инструментов для Shopify по категориям и сегментам. Email, поддержка, attribution, SMS, product content и больше."
        : "Ranked round-ups of the best AI tools for Shopify by category and segment. Email, support, attribution, SMS, product content, and more.",
    path: "/best",
    locale,
  })
}

export default async function BestIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = await pinLocale(params)
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // Like /guides — load active-locale frontmatter; getAllMdxFrontmatter
  // returns [] gracefully when the RU dir is missing files (until they
  // get translated, the RU index just shows what's actually published).
  const listings = await getAllMdxFrontmatter("best", locale)

  const t = {
    eyebrow: locale === "ru" ? "Подборки" : "Best of",
    headline:
      locale === "ru"
        ? "Ранжированные подборки для тех, кто реально продаёт."
        : "Ranked shortlists for operators who actually ship.",
    lede:
      locale === "ru"
        ? "Каждая подборка собрана из честных данных по тулзам каталога: цены, фичи, partner-fit, реальные операторские отзывы. Без «все хороши»."
        : "Each shortlist is built from honest catalog data: pricing, features, partner-fit, real operator feedback. No \"they're all great\" filler.",
    empty:
      locale === "ru"
        ? "Подборки появятся здесь по мере публикации."
        : "Listings will appear here as we publish them.",
    readMore: locale === "ru" ? "Открыть" : "Read",
  }

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: t.eyebrow, path: `${localePrefix}/best` },
  ])

  const itemList =
    listings.length > 0
      ? generateItemListSchema({
          name: t.eyebrow,
          items: listings.map((l) => ({
            name: l.frontmatter.title,
            url: `${localePrefix}/best/${l.slug}`,
          })),
        })
      : null

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          {/* Mint + violet glow — same recipe as /guides and /compare hero
              so the editorial hubs read as a coherent family. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-30 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.18), transparent 60%)",
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

        <section className="container-default py-12 lg:py-16">
          {listings.length === 0 ? (
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
              {listings.map(({ slug, frontmatter }) => (
                <li key={slug}>
                  <Link
                    href={`${localePrefix}/best/${slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                      <span>{frontmatter.publishedAt}</span>
                      {/* `segment` is the listicle's targeting axis ("email
                          for sub-$50k MRR", "support for high-ticket DTC",
                          etc.) — it's the eyebrow that distinguishes one
                          best-of from another, so it earns the brand-mint
                          tint here. */}
                      {"segment" in frontmatter && frontmatter.segment && (
                        <>
                          <span className="opacity-50">·</span>
                          <span className="text-[var(--brand)]">
                            {frontmatter.segment}
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
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/best`)} />
    </>
  )
}
