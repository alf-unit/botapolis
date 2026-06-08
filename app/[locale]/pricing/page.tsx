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
   /pricing — index of pricing deep-dives (Etap J-generate)
   ----------------------------------------------------------------------------
   Hub for /pricing/{slug} pages. Type-agnostic by design: discovered via
   getAllMdxFrontmatter("pricing", locale) walking content/pricing/{en,ru}/,
   so any new pricing page added later (and validated by the type-agnostic
   content-gate) automatically lands on this hub — no hardcoded list.

   Card grid mirrors /best and /guides — same hero blob recipe, same 3-col
   md+ grid, same date + chip meta row. The chip uses `toolSlug` instead of
   `segment` (best-of's axis) — pricing's natural eyebrow is the tool name.

   Closes the orphan flagged in session 3 (2026-06-03): 16 EN + 16 RU
   pricing pages shipped to prod with no entry point in Navbar/Footer and
   no /pricing hub. This file + the sitemap + Navbar Resources dropdown
   + Footer Resources column changes close that loop.
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
        ? "Разборы цен AI-инструментов для Shopify"
        : "Pricing breakdowns for Shopify AI tools",
    description:
      locale === "ru"
        ? "Полные разборы цен AI-инструментов для Shopify-операторов: тарифы, скрытые косты, реальная математика на конкретных объёмах, альтернативы. Проверенные цены."
        : "Full pricing breakdowns for Shopify AI tools: tiers, hidden costs, real math at common volumes, alternatives. Verified rates.",
    path: "/pricing",
    locale,
  })
}

export default async function PricingIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = await pinLocale(params)
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // Type-agnostic discovery — every published pricing MDX in the active
  // locale lands here automatically. RU dir falls back gracefully to empty
  // until a translation lands.
  const listings = await getAllMdxFrontmatter("pricing", locale)

  const t = {
    eyebrow: locale === "ru" ? "Цены" : "Pricing",
    headline:
      locale === "ru"
        ? "Реальная стоимость, не маркетинговые ценники."
        : "Real cost, not marketing rates.",
    lede:
      locale === "ru"
        ? "Каждый разбор: тарифы с актуальной датой, скрытые косты, математика на твоём объёме, альтернативы. Считаем по официальной странице вендора + third-party verified."
        : "Each breakdown: tiers with verification date, hidden costs, math at your volume, alternatives. Sourced from vendor pricing pages + third-party verified.",
    empty:
      locale === "ru"
        ? "Разборы цен появятся здесь по мере публикации."
        : "Pricing breakdowns will appear here as we publish them.",
    readMore: locale === "ru" ? "Открыть" : "Read",
  }

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: t.eyebrow, path: `${localePrefix}/pricing` },
  ])

  const itemList =
    listings.length > 0
      ? generateItemListSchema({
          name: t.eyebrow,
          items: listings.map((l) => ({
            name: l.frontmatter.title,
            url: `${localePrefix}/pricing/${l.slug}`,
          })),
        })
      : null

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          {/* Mint + violet glow — same recipe as /best and /guides hero
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
                    href={`${localePrefix}/pricing/${slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                      <span>{frontmatter.publishedAt}</span>
                      {/* `toolSlug` is the pricing page's natural axis —
                          which tool this breakdown is about. Mint-tint
                          mirrors /best's segment chip so the hub family
                          reads consistently. */}
                      {"toolSlug" in frontmatter && frontmatter.toolSlug && (
                        <>
                          <span className="opacity-50">·</span>
                          <span className="text-[var(--brand)]">
                            {frontmatter.toolSlug}
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
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/pricing`)} />
    </>
  )
}
