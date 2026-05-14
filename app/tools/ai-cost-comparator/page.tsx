import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { AiCostComparator } from "@/components/tools/AiCostComparator"
import { ToolFaq } from "@/components/tools/ToolFaq"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
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

  // Wave 2 (audit alignment): editorial FAQ + JSON-LD for the calculator.
  // Questions chosen from real visitor confusion: token math, price
  // freshness, which model to actually choose, and the "Llama is free"
  // objection. Copy lives inline — calculator-specific, would bloat dict.
  const faq = locale === "ru"
    ? [
        {
          q: "Откуда оценки токенов на элемент?",
          a: "Это медианы из наших тестов на реальных Shopify-задачах. Описание товара — ~250 input + ~250 output токенов. Ответ в поддержке — ~150+300. Длинная SEO-статья — ~400+1000. Реальные числа у тебя могут быть ±40% — критичны системный prompt и длина output.",
        },
        {
          q: "Это актуальные цены?",
          a: "Цены обновляются вручную каждые ~60 дней по официальным прайсам Anthropic, OpenAI, Google. Если ты видишь сильное расхождение с тем, что показывает Anthropic Console или OpenAI dashboard — напиши на corrections@botapolis.com, поправим.",
        },
        {
          q: "Какую модель выбрать на самом деле?",
          a: "Для большинства e-com задач — Claude Haiku 4.5 или GPT-4o mini. Качество вытягивает 90% задач при цене на порядок ниже Claude Sonnet или GPT-4o. Иди в топ-tier только если у тебя есть конкретная задача, где «mini» падает (например, длинные multi-step reasoning или специфичные форматы).",
        },
        {
          q: "А Llama / self-hosted? Они же бесплатные.",
          a: "Бесплатные в /per-token, но не в /per-hour. На стандартном A100 один запрос на Llama-3-70B стоит ~$0.5-$2/час compute. Имеет смысл, если у тебя >100k запросов/месяц и есть DevOps. Под Shopify-операторские объёмы (~1-10k запросов/мес) cloud APIs всегда дешевле и проще.",
        },
        {
          q: "Можно использовать AI Cost Comparator в своём посте?",
          a: "Прямой embed iframe пока не предусмотрен — это статический инструмент без user state. Можешь ссылаться на /tools/ai-cost-comparator из своего блога; обновляем регулярно.",
        },
      ]
    : [
        {
          q: "Where do the per-item token estimates come from?",
          a: "They're medians from our own tests on real Shopify tasks. A product description averages ~250 input + ~250 output tokens. A support reply runs ~150 in / 300 out. A long-form SEO article runs ~400 in / 1000 out. Your real numbers can swing ±40% — the system prompt and target output length are the biggest movers.",
        },
        {
          q: "Are these prices current?",
          a: "Vendor prices are refreshed by hand every ~60 days against the official Anthropic, OpenAI, and Google pricing pages. If the figure you see here clashes with your live Anthropic Console / OpenAI dashboard, email corrections@botapolis.com and we'll re-anchor.",
        },
        {
          q: "Which model should I actually pick?",
          a: "For most e-commerce work, Claude Haiku 4.5 or GPT-4o mini. Quality covers 90% of tasks at an order-of-magnitude lower cost than Claude Sonnet or GPT-4o. Move to the top tier only when you have a specific task that 'mini' tier fails on — long multi-step reasoning or a strict format constraint.",
        },
        {
          q: "What about Llama / self-hosting? Those are free.",
          a: "Free per-token, not per-hour. A single Llama-3-70B request on a standard A100 burns ~$0.50–$2 of compute time. Worth it past ~100k requests/month with a real DevOps story. For a Shopify operator running ~1–10k requests/month, cloud APIs are always cheaper and simpler.",
        },
        {
          q: "Can I embed this comparator on my own blog?",
          a: "No iframe embed for now — it's a stateless reference, not a tool with user state to preserve. Link to /tools/ai-cost-comparator from your post; we refresh the prices on a fixed cadence.",
        },
      ]

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

        {/* ===================================================================
            FAQ — Wave 2 audit alignment (design v.026)
            ===================================================================
            No Recommended Tools section here: this calculator is a
            reference, not a routing surface — Anthropic / OpenAI / Google
            aren't in our affiliate program, and the widget itself already
            highlights the best-value model under "Recommended". FAQ +
            FAQPage schema is the high-value add. */}
        <ToolFaq
          eyebrow={locale === "ru" ? "Часто спрашивают" : "FAQ"}
          title={locale === "ru" ? "Что спрашивают про этот калькулятор" : "What visitors ask about this comparator"}
          items={faq}
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
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateFAQSchema(faq)),
          }}
        />
      )}
      <link rel="canonical" href={absoluteUrl(`${localePrefix}${TOOL_PATH}`)} />
    </>
  )
}
