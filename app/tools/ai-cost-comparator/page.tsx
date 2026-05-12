import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { AiCostComparator } from "@/components/tools/AiCostComparator"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateOwnedToolSchema,
} from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /tools/ai-cost-comparator — TZ § 11.2
   ----------------------------------------------------------------------------
   Static segment under /tools. Server component hosts the client widget +
   SEO. The widget owns the model catalog and pricing math; this page only
   provides locale, JSON-LD, and chrome.
---------------------------------------------------------------------------- */

export const revalidate = 86400
const TOOL_PATH = "/tools/ai-cost-comparator"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const title =
    locale === "ru"
      ? "AI Cost Comparator · сколько стоит запустить AI на Shopify"
      : "AI Cost Comparator · cost of running AI on a Shopify store"
  const description =
    locale === "ru"
      ? "Сравни ежемесячную стоимость Claude, GPT-4o, Gemini и других моделей под конкретный use case: описания товаров, support, ad copy, SEO."
      : "Compare monthly cost of Claude, GPT-4o, Gemini and other models for a specific use case: product descriptions, support, ad copy, SEO content."

  return buildMetadata({
    title,
    description,
    path:   TOOL_PATH,
    locale,
    ogImage: `${TOOL_PATH}/opengraph-image`,
    keywords: [
      "ai cost calculator",
      "claude vs gpt-4o pricing",
      "anthropic openai cost",
      "ai pricing comparison",
    ],
  })
}

export default async function AiCostComparatorPage() {
  const locale = await getLocale()
  const dict   = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const t = {
    breadcrumbHome: locale === "ru" ? "Главная" : "Home",
    eyebrow:        locale === "ru" ? "AI-инструмент" : "AI tool",
    headline: locale === "ru"
      ? "Сколько будет стоить AI под твою задачу — в месяц?"
      : "How much will AI actually cost you per month?",
    lede: locale === "ru"
      ? "Выбери задачу, объём и уровень качества — увидишь точную цену по Claude, GPT-4o, Gemini и другим. Без маркетинговых раундов и расплывчатых «зависит»."
      : "Pick a task, monthly volume, and quality tier. Get exact monthly cost on Claude, GPT-4o, Gemini and others — without vendor sales pages dressing it up.",
  }

  const widgetStrings = {
    inputs: {
      useCase: locale === "ru" ? "Задача"      : "Use case",
      volume:  locale === "ru" ? "Объём"       : "Volume",
      quality: locale === "ru" ? "Качество"    : "Quality tier",
    },
    qualityLabels: {
      good:  locale === "ru" ? "Хорошо"   : "Good",
      great: locale === "ru" ? "Отлично"  : "Great",
      best:  locale === "ru" ? "Топ"      : "Best",
    },
    useCaseLabels: {
      product_descriptions: locale === "ru" ? "Описания товаров"   : "Product descriptions",
      customer_service:     locale === "ru" ? "Поддержка клиентов" : "Customer service",
      ad_copy:              locale === "ru" ? "Рекламные тексты"    : "Ad copy / hooks",
      seo_content:          locale === "ru" ? "SEO-контент"         : "SEO long-form content",
    },
    resultEyebrow:    locale === "ru" ? "Месячная цена" : "Monthly cost",
    totalLabel:       locale === "ru" ? "По провайдерам" : "By provider",
    perItemLabel:     locale === "ru" ? "за элемент"     : "per item",
    recommendedLabel: locale === "ru" ? "Рекомендуем"    : "Recommended",
    recommendedCta:   locale === "ru" ? "Открыть {name} →" : "Try {name} →",
    methodologyText:  locale === "ru"
      ? "Токен-оценки — медианные значения из тестов на реальных Shopify-задачах. Цены вендоров обновляем вручную раз в пару месяцев. См."
      : "Token estimates are medians from real-store tests. Vendor prices refreshed by hand every couple of months. See",
    methodologyLink:  locale === "ru" ? "методология" : "methodology",
    itemsPerMonth:    locale === "ru" ? "/мес" : "/mo",
    tokenLine:        locale === "ru"
      ? "Оценка токенов на элемент: {tokens}."
      : "Estimated tokens per item: {tokens}.",
  }

  const softwareSchema = generateOwnedToolSchema({
    name:        "AI Cost Comparator",
    description:
      "Free AI cost comparator for Shopify operators. Estimate monthly cost across Claude, GPT-4o, Gemini and others for product descriptions, support, ad copy, and SEO content.",
    path:        TOOL_PATH,
  })
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.breadcrumbHome, path: `${localePrefix}/` },
    { name: dict.nav.tools,   path: `${localePrefix}/tools` },
    { name: "AI Cost Comparator", path: `${localePrefix}${TOOL_PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          {/* Violet glow leans into the "AI" semantic per design tokens */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-45 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.24), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)",
            }}
          />
          <div className="container-default relative pt-10 pb-10 lg:pt-14 lg:pb-12">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
            >
              <Link href={`${localePrefix}/`} className="hover:text-[var(--text-secondary)]">
                {t.breadcrumbHome}
              </Link>
              <span className="opacity-60">/</span>
              <Link href={`${localePrefix}/tools`} className="hover:text-[var(--text-secondary)]">
                {dict.nav.tools}
              </Link>
              <span className="opacity-60">/</span>
              <span className="text-[var(--text-secondary)]">AI Cost Comparator</span>
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

        <section className="container-default py-10 lg:py-14">
          <AiCostComparator
            strings={widgetStrings}
            localePrefix={localePrefix}
            locale={locale}
          />
        </section>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}${TOOL_PATH}`)} />
    </>
  )
}
