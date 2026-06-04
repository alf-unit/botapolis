import Link from "next/link"
import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "@/lib/seo/schema"
import { localizeToolPartial } from "@/lib/content/tool-locale"
import { filterVisibleRows } from "@/lib/content/visibility"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /alternatives — index of "X alternatives" listicle pages
   ----------------------------------------------------------------------------
   One card per published tool. Each card links to /alternatives/[slug],
   where the listicle ranks credible alternatives in the same category
   (DB-driven runtime grid, with editorial intro/verdict when the source
   tool has an `alternatives_editorial` jsonb — Etap F).

   Source-of-truth: `public.tools` filtered by status='published'. Same
   ordering as /tools (Featured DESC, rating DESC, name ASC) so the two
   indexes feel cohesive when a visitor crosses between them. RU mirror
   lives at /ru/alternatives and re-exports this module.

   Phase A+B (2026-06-03) — closes the orphan: before this hub the 30
   /alternatives/[slug] surfaces existed in the sitemap but had no
   in-app entry point (Navbar didn't surface them, no human-discoverable
   path except search or direct link).
---------------------------------------------------------------------------- */

export const revalidate = 21600

type CardTool = Pick<
  ToolRow,
  | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru" | "logo_url"
  | "category" | "rating" | "featured" | "updated_at"
>

const CARD_SELECT =
  "slug, name, name_ru, tagline, tagline_ru, logo_url, category, rating, featured, updated_at" as const

async function fetchAlternativeSources(): Promise<CardTool[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select(CARD_SELECT)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(500)
    if (error) {
      console.error("[/alternatives] tools fetch failed:", error.message)
      return []
    }
    // Drip gate — /alternatives/[slug] is its own drip unit (content_type=
    // 'alternatives'), mirroring published tools. No-op when the flag is off.
    return filterVisibleRows("alternatives", data ?? [])
  } catch (err) {
    console.error("[/alternatives] tools fetch threw:", err)
    return []
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru"
        ? "Альтернативы AI-инструментов для Shopify"
        : "Alternatives to popular Shopify AI tools",
    description:
      locale === "ru"
        ? "Для каждого инструмента в каталоге — список протестированных альтернатив с честными trade-off'ами по цене, фичам и Shopify-интеграции."
        : "For every tool in the catalog: a shortlist of tested alternatives with honest trade-offs on pricing, features, and Shopify integration.",
    path: "/alternatives",
    locale,
  })
}

export default async function AlternativesIndexPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const rawSources = await fetchAlternativeSources()
  const sources = rawSources.map((r) => localizeToolPartial(r, locale))

  const t = {
    eyebrow:
      locale === "ru" ? "Альтернативы" : "Alternatives",
    headline:
      locale === "ru"
        ? "Не подходит — выбери замену из протестированных."
        : "Not the right fit? Here's the tested shortlist of alternatives.",
    lede:
      locale === "ru"
        ? "Для каждого инструмента — partner-first ранжирование альтернатив той же категории с честным сравнением по ценам, фичам и Shopify-интеграции."
        : "For each tool: a partner-first ranking of same-category alternatives with honest pricing, feature, and Shopify-integration trade-offs.",
    empty:
      locale === "ru"
        ? "Список альтернатив появится здесь по мере публикации каталога."
        : "Alternative listicles will appear here as the catalog grows.",
    readMore:
      locale === "ru" ? "Альтернативы" : "Alternatives",
    cardSuffix:
      locale === "ru" ? "альтернативы" : "alternatives",
  }

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: t.eyebrow, path: `${localePrefix}/alternatives` },
  ])

  const itemList =
    sources.length > 0
      ? generateItemListSchema({
          name: t.eyebrow,
          items: sources.map((s) => ({
            name:
              locale === "ru"
                ? `Альтернативы ${s.name ?? s.slug}`
                : `${s.name ?? s.slug} alternatives`,
            url: `${localePrefix}/alternatives/${s.slug}`,
          })),
        })
      : null

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          {/* Same hero blob recipe as /best, /guides, /compare. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-30 blur-[120px]"
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
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                {sources.length}{" "}
                {locale === "ru" ? "источников" : "source tools"}
              </span>
            </div>
          </div>
        </section>

        <section className="container-default py-12 lg:py-16">
          {sources.length === 0 ? (
            <div
              className={cn(
                "rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)]",
                "px-6 py-14 text-center",
              )}
            >
              <p className="text-[15px] text-[var(--text-secondary)]">{t.empty}</p>
              <Link
                href={`${localePrefix}/tools`}
                className="btn-cta mt-5 inline-flex h-10 items-center rounded-md px-4 text-[14px] font-semibold text-white"
              >
                {locale === "ru" ? "Открыть каталог" : "Browse the catalog"}
              </Link>
            </div>
          ) : (
            <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sources.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`${localePrefix}/alternatives/${s.slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ToolLogo
                        src={s.logo_url ?? null}
                        name={s.name ?? s.slug ?? ""}
                        size={44}
                        className="shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)] line-clamp-1">
                          {locale === "ru"
                            ? `Альтернативы ${s.name}`
                            : `${s.name} alternatives`}
                        </h2>
                        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                          {s.category}
                          {s.rating != null && (
                            <>
                              <span className="mx-1 opacity-50">·</span>
                              <span className="text-[var(--brand)]">
                                {s.rating.toFixed(1)}/10
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {s.tagline && (
                      <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)] line-clamp-3">
                        {s.tagline}
                      </p>
                    )}
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
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/alternatives`)} />
    </>
  )
}
