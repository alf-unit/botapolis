import type { Metadata } from "next"

import { buildMetadata } from "@/lib/seo/metadata"

/* ----------------------------------------------------------------------------
   /ru — Russian homepage mirror (TZ § 7.6 — sprint 6 MVP)
   ----------------------------------------------------------------------------
   We re-export the EN homepage's default component verbatim because every
   string it renders already comes from `getDictionary(locale)`, and the
   proxy sets `x-locale: ru` for any URL under `/ru/*`. The component picks
   up the locale through the same code path it uses for EN — no duplication
   of layout, hero, demo widget, or newsletter card.

   The only thing we ADD here is a Russian generateMetadata so the RU page
   gets a canonical RU URL, a Russian title/description, and `hreflang`
   alternates pointing back to the EN homepage as `x-default`.
---------------------------------------------------------------------------- */
export { default } from "../page"

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title:
      "Botapolis — AI-плейбук для серьёзных Shopify-операторов",
    description:
      "Калькуляторы с реальным ROI. Обзоры на настоящих магазинах. Сравнения с конкретным победителем — без ничьих.",
    path:    "/",
    locale:  "ru",
    // BUG-FIX (May 2026 audit): the homepage title already contains the
    // "Botapolis — " prefix, so the root layout's `%s · Botapolis` template
    // doubled the brand into "Botapolis — … · Botapolis". Setting
    // absoluteTitle bypasses the template for this page only.
    absoluteTitle: true,
  })
}
