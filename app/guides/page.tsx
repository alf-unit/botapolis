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
   /guides — index of how-to guides
   ----------------------------------------------------------------------------
   Same shape as /reviews but with the editorial framing focused on
   "operator playbooks" rather than per-tool reviews. Both index pages share
   the gradient-blob hero recipe and the 3-col card grid so the navigation
   feels consistent.
---------------------------------------------------------------------------- */

export const revalidate = 21600

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru"
        ? "Гайды для Shopify-операторов"
        : "Operator playbooks for Shopify",
    description:
      locale === "ru"
        ? "Пошаговые гайды для решений, которые двигают магазин: настройка email, AI-описания, рост AOV, удержание."
        : "Step-by-step playbooks for the decisions that actually grow a Shopify store: email setup, AI descriptions, AOV growth, retention.",
    path: "/guides",
    locale,
  })
}

export default async function GuidesIndexPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const guides = await getAllMdxFrontmatter("guides", "en")

  const t = {
    eyebrow: locale === "ru" ? "Гайды" : "Guides",
    headline:
      locale === "ru"
        ? "Пошаговые сценарии для тех, кто реально продаёт."
        : "Step-by-step playbooks for operators who actually ship.",
    lede:
      locale === "ru"
        ? "Каждый гайд — конкретный сценарий, который мы прошли на собственных магазинах. Команды для копипасты, скриншоты, цифры."
        : "Each guide = a concrete play we ran on our own stores. Copy-pasteable commands, screenshots, real numbers — no fluff.",
    empty:
      locale === "ru"
        ? "Первые гайды на подходе. Подпишись, чтобы получить их первым."
        : "First playbooks land soon. Subscribe to catch them first.",
    readMore: locale === "ru" ? "Открыть" : "Read",
    minRead: locale === "ru" ? "мин" : "min read",
  }

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: t.eyebrow, path: `${localePrefix}/guides` },
  ])

  const itemList =
    guides.length > 0
      ? generateItemListSchema({
          name: t.eyebrow,
          items: guides.map((g) => ({
            name: g.frontmatter.title,
            url: `${localePrefix}/guides/${g.slug}`,
          })),
        })
      : null

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-35 blur-[120px]"
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
          {guides.length === 0 ? (
            <div
              className={cn(
                "rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)]",
                "px-6 py-14 text-center",
              )}
            >
              <p className="text-[15px] text-[var(--text-secondary)]">{t.empty}</p>
              <Link
                href={`${localePrefix}/#newsletter`}
                className="mt-5 inline-flex h-10 items-center rounded-md bg-[var(--brand)] px-4 text-[14px] font-medium text-[var(--brand-fg)] hover:bg-[var(--brand-hover)] transition-colors"
              >
                {locale === "ru" ? "Подписаться" : "Subscribe"}
              </Link>
            </div>
          ) : (
            <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guides.map(({ slug, frontmatter }) => (
                <li key={slug}>
                  <Link
                    href={`${localePrefix}/guides/${slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
                    )}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                      <span>{frontmatter.publishedAt}</span>
                      {frontmatter.category && (
                        <>
                          <span className="opacity-50">·</span>
                          <span className="text-[var(--brand)]">
                            {frontmatter.category}
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
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/guides`)} />
    </>
  )
}
