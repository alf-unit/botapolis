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
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /reviews — index of long-form tool reviews
   ----------------------------------------------------------------------------
   Reads `tools` from Supabase (Etap E flip 2026-06-01 — was MDX-driven).
   One card per published tool, linking to /reviews/[slug] runtime page.
   Sort: Featured DESC, then rating DESC, then name ASC.

   Empty-state is preserved: if the DB is unreachable / has zero published
   rows (preview env, fresh clone), the page renders a "subscribe" prompt
   rather than a 500.
---------------------------------------------------------------------------- */

export const revalidate = 21600

type ReviewCard = Pick<
  ToolRow,
  | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru" | "logo_url"
  | "category" | "rating" | "featured" | "updated_at"
>

const CARD_SELECT =
  "slug, name, name_ru, tagline, tagline_ru, logo_url, category, rating, featured, updated_at" as const

async function fetchReviewableTools(): Promise<ReviewCard[]> {
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
      console.error("[/reviews] tools fetch failed:", error.message)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error("[/reviews] tools fetch threw:", err)
    return []
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru"
        ? "Обзоры AI-инструментов для Shopify"
        : "AI tool reviews for Shopify operators",
    description:
      locale === "ru"
        ? "Аналитические обзоры AI-инструментов для Shopify: цены, фичи, реальные плюсы и минусы, честный вердикт."
        : "Analyst reviews of AI tools for Shopify: pricing, features, real strengths and weaknesses, honest verdict.",
    path: "/reviews",
    locale,
  })
}

export default async function ReviewsIndexPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const rawReviews = await fetchReviewableTools()
  const reviews = rawReviews.map((r) => localizeToolPartial(r, locale))

  const t = {
    eyebrow:
      locale === "ru" ? "Обзоры" : "Reviews",
    headline:
      locale === "ru"
        ? "Аналитические обзоры AI-инструментов для Shopify."
        : "Analyst reviews of AI tools for Shopify.",
    lede:
      locale === "ru"
        ? "Цены, фичи, реальные плюсы и минусы — собрано из data-первых ресёрчей и верифицированных операторских отзывов. Никаких «оба хорошие»."
        : "Pricing, features, real strengths and weaknesses — built from column-wise research and verified operator quotes. No \"they're all great\" filler.",
    empty:
      locale === "ru"
        ? "Скоро здесь появятся обзоры. Подпишись на рассылку, чтобы не пропустить."
        : "Reviews drop here weekly. Subscribe below so you catch the first ones.",
    readMore: locale === "ru" ? "Читать" : "Read",
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
            name: r.name ?? r.slug ?? "Tool",
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
              {reviews.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`${localePrefix}/reviews/${r.slug}`}
                    className={cn(
                      "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl",
                      "border border-[var(--border-base)] bg-[var(--bg-surface)] p-6",
                      "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <ToolLogo
                        src={r.logo_url ?? null}
                        name={r.name ?? r.slug ?? ""}
                        size={44}
                        className="shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)] line-clamp-1">
                          {r.name}
                        </h2>
                        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                          {r.category}
                          {r.rating != null && (
                            <>
                              <span className="mx-1 opacity-50">·</span>
                              <span className="text-[var(--brand)]">{r.rating.toFixed(1)}/10</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {r.tagline && (
                      <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)] line-clamp-3">
                        {r.tagline}
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
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/reviews`)} />
    </>
  )
}
