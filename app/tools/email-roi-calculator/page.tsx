import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { EmailRoiCalculator } from "@/components/tools/EmailRoiCalculator"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateOwnedToolSchema,
} from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /tools/email-roi-calculator — TZ § 11.1
   ----------------------------------------------------------------------------
   Server component. Hosts the EmailRoiCalculator client island and emits
   metadata + JSON-LD. Static segment under `app/tools/` so it takes
   precedence over the [slug] catch-all that serves catalog detail.

   ISR: 24 h. Page rarely changes; the widget itself is fully client-side
   so revalidation is just about meta tags + JSON-LD freshness.
---------------------------------------------------------------------------- */

export const revalidate = 86400

const TOOL_PATH = "/tools/email-roi-calculator"

// --------------------------------------------------------------------------
// Metadata
// --------------------------------------------------------------------------
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  // Title goes through the root layout's `title.template` ("%s · Botapolis"),
  // so we omit the brand suffix here to avoid double-stamping it.
  const title =
    locale === "ru"
      ? "Калькулятор Email ROI"
      : "Email ROI Calculator"
  const description =
    locale === "ru"
      ? "Оцените реальную выручку с email-рассылок на Shopify: подписчики, open rate, CTR, AOV. Сравните Klaviyo / Mailchimp / Omnisend по стоимости."
      : "Estimate real email revenue for your Shopify store from subscribers, open rate, CTR, and AOV. Compare Klaviyo / Mailchimp / Omnisend by cost."

  return buildMetadata({
    title,
    description,
    path:   TOOL_PATH,
    locale,
    ogImage: `${TOOL_PATH}/opengraph-image`,
    keywords: [
      "email roi calculator",
      "shopify email",
      "klaviyo cost calculator",
      "email marketing roi",
    ],
  })
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------
export default async function EmailRoiCalculatorPage() {
  const locale = await getLocale()
  const dict   = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // i18n strings — local until the calculators earn a dedicated dict section.
  const t = {
    breadcrumbHome: locale === "ru" ? "Главная" : "Home",
    eyebrow:        locale === "ru" ? "Калькулятор" : "Calculator",
    headline: locale === "ru"
      ? "Сколько твоя email-база реально приносит в месяц?"
      : "How much does your email list actually bring in each month?",
    lede: locale === "ru"
      ? "Введи подписчиков, open rate, CTR и средний чек. Получи живой прогноз выручки и подсказку, на какой платформе это выгодно строить."
      : "Plug in subscribers, open rate, CTR, and AOV. Get a live revenue estimate and a hint at which platform makes sense at your stage.",
  }

  const widgetStrings = {
    resultEyebrow:     locale === "ru" ? "Прогноз ROI" : "Live result",
    resultLabel:       locale === "ru" ? "Выручка с email в месяц" : "Estimated monthly email revenue",
    resultMeta: locale === "ru"
      ? "При 4 рассылках/мес и конверсии 1.8% от клика"
      : "Based on 4 sends/mo and 1.8% click-to-order conversion",
    annualLabel:       locale === "ru" ? "За год"          : "Annual",
    platformCostLabel: locale === "ru" ? "Платформа"       : "Platform",
    roiLabel:          locale === "ru" ? "ROI"             : "ROI",
    inputs: {
      subscribers: locale === "ru" ? "Подписчики"       : "Subscribers",
      openRate:    locale === "ru" ? "Open rate"        : "Open rate",
      clickRate:   locale === "ru" ? "Click rate"       : "Click rate",
      aov:         locale === "ru" ? "Средний чек (AOV)" : "Average order value",
      platform:    locale === "ru" ? "Платформа"        : "Platform",
    },
    recommendation: {
      eyebrow:     locale === "ru" ? "Рекомендуем" : "Recommended",
      cta:         locale === "ru" ? "Открыть {name} →" : "Open {name} →",
      methodology: locale === "ru" ? "методология"  : "methodology",
      fallback: locale === "ru"
        ? "Партнёрки нет — выбирай напрямую через сайт вендора."
        : "No affiliate set up — go direct via the vendor's site.",
    },
    methodologyText: locale === "ru"
      ? "Цены платформ — округлённые tier-anchored значения, не живая выгрузка. См."
      : "Platform prices are tier-anchored approximations, not live scrapes. See",
    // Sprint 5 — "Save this calculation" CTA + toast copy.
    save: {
      cta:          locale === "ru" ? "Сохранить расчёт"    : "Save this calculation",
      saving:       locale === "ru" ? "Сохраняем…"         : "Saving…",
      saved:        locale === "ru" ? "Расчёт сохранён"     : "Saved!",
      signInToSave: locale === "ru"
        ? "Войди, чтобы сохранять расчёты."
        : "Sign in to save calculations.",
      failed:       locale === "ru"
        ? "Не удалось сохранить. Попробуй ещё раз."
        : "Couldn't save right now. Try again.",
    },
  }

  // JSON-LD: SoftwareApplication for the calc + breadcrumb trail.
  const softwareSchema = generateOwnedToolSchema({
    name:        "Email ROI Calculator",
    description:
      "Free Shopify email ROI calculator. Estimate monthly revenue from subscribers, open rate, CTR, and AOV; compare Klaviyo / Mailchimp / Omnisend cost.",
    path:        TOOL_PATH,
  })
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.breadcrumbHome, path: `${localePrefix}/` },
    { name: dict.nav.tools,   path: `${localePrefix}/tools` },
    { name: "Email ROI Calculator", path: `${localePrefix}${TOOL_PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* ===================================================================
            HERO
            =================================================================== */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-45 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.22), transparent 60%)",
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
              <span className="text-[var(--text-secondary)]">Email ROI Calculator</span>
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

        {/* ===================================================================
            WIDGET
            =================================================================== */}
        <section className="container-default py-10 lg:py-14">
          <EmailRoiCalculator
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
