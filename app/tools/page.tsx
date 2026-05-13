import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ToolsCatalog } from "@/components/tools/ToolsCatalog"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import { generateItemListSchema, generateBreadcrumbSchema } from "@/lib/seo/schema"
import { getToolRatings } from "@/lib/content/rating"
import { localizeToolPartial } from "@/lib/content/tool-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /tools — the public catalog
   ----------------------------------------------------------------------------
   Server component fetches published tools from Supabase, pre-sorts them
   (Featured DESC, then rating DESC), then hands the slice off to a client
   island that owns search + category filters.

   ISR: 1 h time-based, plus an event-driven webhook from Supabase pings
   /api/revalidate?path=/tools on any tool mutation.
---------------------------------------------------------------------------- */

export const revalidate = 3600

// Fields used by the card / filter UI. Selecting narrowly keeps the SSR
// HTML small (no need to ship `description`/`features` to the browser).
// We include name_ru / tagline_ru so RU rendering resolves locally without
// re-querying — see localizeToolPartial below.
const CARD_SELECT =
  "slug,name,name_ru,tagline,tagline_ru,logo_url,category,rating,pricing_model,pricing_min,pricing_max,featured,status" as const

type CardTool = Pick<
  ToolRow,
  | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru" | "logo_url"
  | "category" | "rating" | "pricing_model" | "pricing_min" | "pricing_max"
  | "featured"
>

async function fetchTools(): Promise<CardTool[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select(CARD_SELECT)
      .eq("status", "published")
      // Postgres sort: Featured first (DESC), then by rating (DESC, NULLS LAST).
      .order("featured", { ascending: false })
      .order("rating",   { ascending: false, nullsFirst: false })
      .order("name",     { ascending: true })
      .limit(500)

    if (error) {
      console.error("[/tools] supabase fetch failed:", error.message)
      return []
    }
    return data ?? []
  } catch (err) {
    // Migration may not be applied yet — degrade to empty state, don't crash.
    console.error("[/tools] supabase fetch threw:", err)
    return []
  }
}

// --------------------------------------------------------------------------
// Metadata
// --------------------------------------------------------------------------
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Инструменты для Shopify" : "AI tools for Shopify operators",
    description: locale === "ru"
      ? "Каталог AI-инструментов для Shopify: реальные обзоры, честные сравнения, прозрачные оценки."
      : "Hand-picked AI tools for serious Shopify operators. Real reviews, fair comparisons, honest ratings.",
    path:        "/tools",
    locale,
    ogImage:
      "/api/og?title=" +
      encodeURIComponent("AI tools for Shopify operators") +
      "&description=" +
      encodeURIComponent("Hand-picked, honestly rated, no fence-sitting.") +
      "&eyebrow=catalog",
  })
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------
export default async function ToolsPage() {
  const locale = await getLocale()
  const dict   = await getDictionary(locale)
  const localePrefix = locale === "ru" ? "/ru" : ""

  const rawTools = await fetchTools()

  // BUG-FIX (May 2026 audit · TZ fixes #3): the catalog rating shown on
  // each card must come from the MDX review when one exists, so cards
  // and detail pages can't disagree. One batch lookup keeps the page
  // server-side, no extra network hop.
  const ratings = await getToolRatings(rawTools, locale as "en" | "ru")
  const tools = rawTools.map((t) => {
    // Resolve RU/EN copy via the shared helper so the catalog card sees
    // tool.name / tool.tagline already in the right language (no per-
    // component fallback knowledge). For EN this is a no-op.
    const localized = localizeToolPartial(t, locale as "en" | "ru")
    return {
      ...localized,
      rating: ratings.get(t.slug) ?? localized.rating,
    }
  })

  // JSON-LD: surface the catalog as an ItemList + a Breadcrumb trail.
  const itemList = generateItemListSchema({
    name:  locale === "ru" ? "AI-инструменты для Shopify" : "AI tools for Shopify",
    items: tools.map((t, i) => ({
      name:     t.name,
      url:      `${localePrefix}/tools/${t.slug}`,
      position: i + 1,
    })),
  })

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",  path: `${localePrefix}/` },
    { name: dict.nav.tools,                        path: `${localePrefix}/tools` },
  ])

  // i18n strings for the client island. We can't pass a `(n) => string`
  // formatter across the server→client boundary (functions aren't
  // serializable in RSC), so plural slots travel as plain strings and the
  // client picks the right one.
  const catalogStrings = {
    allCategories:     locale === "ru" ? "Все категории"      : "All categories",
    searchPlaceholder: locale === "ru" ? "Найти инструмент…" : "Find a tool…",
    resultsCount: locale === "ru"
      ? { one: "{n} инструмент", few: "{n} инструмента", many: "{n} инструментов" }
      : { one: "{n} tool",       many: "{n} tools" },
    empty: locale === "ru"
      ? "Ничего не нашлось. Попробуй другую категорию или сбрось фильтры."
      : "No tools match that filter. Try another category or clear filters.",
    clearFilters: locale === "ru" ? "Сбросить фильтры" : "Clear filters",
    cta:          locale === "ru" ? "Открыть"          : "View tool",
  }

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix as "" | "/ru"} />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-0 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
            }}
          />
          <div className="container-default relative pt-14 pb-10 lg:pt-20 lg:pb-14">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {locale === "ru" ? "Каталог" : "Catalog"}
            </p>
            <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-2xl">
              {locale === "ru"
                ? "AI-инструменты для серьёзных Shopify-операторов."
                : "AI tools for serious Shopify operators."}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {locale === "ru"
                ? "Каждая карточка — наш own-tested tool. Никаких списков ради списков, никаких рейтингов от партнёров."
                : "Every card is a tool we'd actually run on a real Shopify store. No filler, no partner-paid rankings."}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                {tools.length}{" "}
                {locale === "ru" ? "опубликовано" : "published"}
              </span>
              <span className="opacity-40">·</span>
              <Link
                href={`${localePrefix}/methodology`}
                className="underline-offset-4 hover:underline text-[var(--text-secondary)]"
              >
                {locale === "ru" ? "Методология оценки" : "How we rate"}
              </Link>
            </div>
          </div>
        </section>

        <ToolsCatalog
          tools={tools}
          localePrefix={localePrefix as "" | "/ru"}
          strings={catalogStrings}
        />
      </main>

      <Footer
        strings={{
          tagline:    dict.footer.tagline,
          copyright:  dict.footer.copyright,
          columns:    dict.footer.columns,
          links:      dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix as "" | "/ru"}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* Canonical alternate links emitted via generateMetadata; absoluteUrl
          is used internally by buildMetadata. */}
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/tools`)} />
    </>
  )
}

