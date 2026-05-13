import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { SearchPageClient } from "@/components/shared/SearchPageClient"
import { buildMetadata } from "@/lib/seo/metadata"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /search — public search experience
   ----------------------------------------------------------------------------
   Replaces the Cmd+K modal as the primary discovery surface. Launched
   after May 2026 audit feedback:

     "Search opens some senseless window with lots of unnecessary stuff,
      and on top of that, it doesn't find anything!"

   Two issues fixed together:
     - Root cause for "doesn't find anything" was CSP missing
       `wasm-unsafe-eval`. Pagefind's WASM compile was blocked silently
       in modern Chrome/Edge. Patched in next.config.ts.
     - UX is now a regular text-input + Search button + results list,
       which matches what visitors expect from a marketing site. The
       palette modal made search feel like a power-user shortcut even
       though it was the primary entry point.

   The page is intentionally static (no Supabase round-trip on load) —
   all the heavy lifting is the Pagefind WASM index, loaded only after
   the visitor types their first query. SSR cost: just chrome + form.

   Reachable via `?q=<query>` for sharable / back-button-safe URLs.
---------------------------------------------------------------------------- */

// noIndex this route so Google doesn't ingest every `?q=…` permutation
// as a separate URL. Sitemap exposes the bare /search entry only.
export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const ru = locale === "ru"
  return buildMetadata({
    title:       ru ? "Поиск по Botapolis" : "Search Botapolis",
    description: ru
      ? "Поиск по обзорам, гайдам, инструментам и сравнениям Botapolis."
      : "Search across Botapolis reviews, guides, tools, and comparisons.",
    path:    "/search",
    locale,
    // The page is intentionally not indexed — every `?q=` permutation
    // would otherwise count as a unique URL, blowing up the index with
    // duplicate-thin pages. The sitemap doesn't list it either.
    noIndex: true,
  })
}

export default async function SearchPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const ru = locale === "ru"
  const strings = {
    title:            ru ? "Поиск" : "Search",
    lede: ru
      ? "Найди обзор, гайд, инструмент или сравнение. Индекс собирается на каждом деплое — без задержек на серверный поиск."
      : "Find a review, guide, tool, or comparison. The index rebuilds on every deploy — no server round-trips per keystroke.",
    inputLabel:       ru ? "Поиск по сайту"      : "Search the site",
    inputPlaceholder: ru ? "Например, klaviyo, email roi, gorgias vs tidio"
                          : "Try: klaviyo, email roi, gorgias vs tidio",
    submit:           ru ? "Найти"               : "Search",
    tooShort:         ru
      ? "Введи как минимум 2 символа."
      : "Type at least 2 characters.",
    loadingError:     ru
      ? "Не удалось загрузить поисковый индекс. Обнови страницу или загляни в каталог инструментов."
      : "Couldn't load the search index. Refresh the page or browse the tools catalog.",
    noResultsTitle:   ru ? "Ничего не нашли"     : "No results",
    noResultsBody:    ru
      ? "Перефразируй запрос или загляни в каталог инструментов."
      : "Try a different query, or browse the tools catalog.",
    initialTitle:     ru ? "С чего начнём?"      : "What are you looking for?",
    initialBody:      ru
      ? "Инструменты, обзоры, гайды, сравнения — всё в одном поле."
      : "Tools, reviews, guides, comparisons — all in one box.",
    resultsCount: ru
      ? { one: "{n} результат", few: "{n} результата", many: "{n} результатов" }
      : { one: "{n} result",                            many: "{n} results"   },
    searchingLabel:   ru ? "Ищем…" : "Searching…",
  }

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <SearchPageClient strings={strings} locale={locale} />
      </main>

      <Footer
        strings={{
          tagline:    dict.footer.tagline,
          copyright:  dict.footer.copyright,
          columns:    dict.footer.columns,
          links:      dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix}
      />

      <link rel="canonical" href={absoluteUrl(`${localePrefix}/search`)} />
    </>
  )
}
