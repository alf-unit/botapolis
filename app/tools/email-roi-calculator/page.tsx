import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { EmailRoiCalculator } from "@/components/tools/EmailRoiCalculator"
import { RecommendedTools } from "@/components/tools/RecommendedTools"
import { ToolFaq } from "@/components/tools/ToolFaq"
import { buildMetadata } from "@/lib/seo/metadata"
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateOwnedToolSchema,
} from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn } from "@/lib/utils"

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
// `?embed=1` strips the global chrome (navbar + footer) so the page
// renders cleanly inside a third-party iframe. The bottom of the body
// still shows a small "Powered by Botapolis" link — load-bearing for
// attribution + a backlink we can rely on when bloggers embed the tool.
export default async function EmailRoiCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const embed = params.embed === "1"
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

  // Wave 2 (audit alignment): editorial Q&A for the FAQPage schema + the
  // visible accordion below the calculator. Copy lives inline here so each
  // page owns its own FAQ — the questions are calculator-specific and the
  // dict.json files would bloat fast if we tried to share them.
  const faq = locale === "ru"
    ? [
        {
          q: "Насколько точна оценка?",
          a: "Это ориентир, не отчёт за прошлый месяц. Формула — медианная воронка по магазинам $50k-$2M ARR: 4 рассылки/мес, 28% open, 15% CTO, 2.5% от клика в заказ. Реальные числа у тебя могут быть на ±30% выше или ниже — критичны open rate и конверсия в заказ.",
        },
        {
          q: "Почему click-to-open (CTO), а не click-through (CTR)?",
          a: "CTO = клик/открытие — показывает, насколько контент письма работает после того, как его открыли. CTR = клик/доставка — больше отражает silaб мейлинга. В нашем калькуляторе важна именно сила контента: цены платформ примерно одинаковые, разница в выручке идёт от того, насколько хорошо письмо конвертирует уже открывших.",
        },
        {
          q: "В цены платформ входит SMS?",
          a: "Нет, только email-tier. Klaviyo и Omnisend считают SMS-кредиты отдельно — добавь ~$0.01/SMS US или 1₽/SMS RU поверх. Mailchimp SMS не предлагает.",
        },
        {
          q: "Можно сохранить расчёт?",
          a: "Да, если ты залогинен. Кнопка «Сохранить расчёт» появляется под результатами и пушит вход в /dashboard → /saved. Каждый расчёт — это снепшот всех инпутов и итогов, который можно открыть позже.",
        },
        {
          q: "Можно встроить калькулятор на свой блог?",
          a: "Да. Внизу страницы есть iframe-snippet — копируешь, вставляешь в свой пост, читатели пользуются прямо у тебя. Бесплатно, без брендинга кроме маленькой подписи «Powered by Botapolis →» в подвале iframe.",
        },
      ]
    : [
        {
          q: "How accurate is this estimate?",
          a: "It's a ballpark, not last month's report. The formula uses median-funnel assumptions for stores between $50k–$2M ARR: 4 sends/month, 28% open rate, 15% click-to-open, 2.5% click-to-order conversion. Your real numbers can be ±30% — open rate and conversion-to-order are the levers that move the answer most.",
        },
        {
          q: "Why click-to-open (CTO) and not click-through (CTR)?",
          a: "CTO = clicks ÷ opens — measures how compelling the email is once someone has opened it. CTR = clicks ÷ delivered — also captures inbox placement and subject lines. Since platform prices are roughly comparable at the same contact count, what swings revenue is how well the content converts visible readers. So we expose CTO as the knob.",
        },
        {
          q: "Do platform prices include SMS?",
          a: "No, email tier only. Klaviyo and Omnisend bill SMS credits separately — add roughly $0.01 per SMS for US numbers on top of the figure shown. Mailchimp doesn't offer SMS at all.",
        },
        {
          q: "Can I save a calculation?",
          a: "Yes — once you're signed in. The 'Save this calculation' button surfaces beneath the results and sends you through /dashboard → /saved. Each save snapshots every input and the resulting numbers so you can reopen it later.",
        },
        {
          q: "Can I embed the calculator on my blog?",
          a: "Yes. There's an iframe snippet at the bottom of this page — copy it into your post and readers can use the calculator without leaving your site. No branding beyond a small 'Powered by Botapolis →' link in the iframe footer.",
        },
      ]

  // Editorial Recommended Tools copy — three email platforms we've actually
  // tested. The notes are short audit-driven verdicts. Klaviyo is the
  // current "Our pick" because of attribution depth + native Shopify
  // integration; Omnisend wins on price-to-feature; Mailchimp stays useful
  // for newsletter-first sellers under 1k subs.
  const recommended = {
    title: locale === "ru"
      ? "Email-платформы, которые мы реально тестировали"
      : "Email platforms we actually ship to real stores",
    subtitle: locale === "ru"
      ? "Шорт-лист из трёх — каждый прошёл 30+ дней на живом Shopify-магазине."
      : "Short-list of three — each ran on a live Shopify store for 30+ days.",
    pickLabel: locale === "ru" ? "Наш выбор" : "Our pick",
    items: [
      {
        toolSlug: "klaviyo",
        isPick:   true,
        note: locale === "ru"
          ? "Глубокая нативная интеграция с Shopify и точная атрибуция выручки. Дороже всех past 5k подписчиков, но даёт правду без ловли вентилей."
          : "Deepest native Shopify integration + accurate revenue attribution. Pricing climbs past 5k contacts, but you get the truth without chasing attribution gaps.",
      },
      {
        toolSlug: "omnisend",
        note: locale === "ru"
          ? "Лучшее соотношение «цена/фичи» — те же flows и сегментация, что у Klaviyo, заметно дешевле. SMS включён в той же платформе."
          : "Best price-to-feature in the category — same flows and segmentation depth as Klaviyo at noticeably lower cost. SMS sits in the same platform.",
      },
      {
        toolSlug: "mailchimp",
        note: locale === "ru"
          ? "Имеет смысл, если у тебя меньше 1k подписчиков и newsletter-first контент. На Shopify теряет 12-18% выручки на attribution — заметно после 1.5k."
          : "Makes sense under 1k subscribers and for newsletter-first sellers. On Shopify it leaks 12–18% of revenue attribution — noticeable past 1.5k subs.",
      },
    ],
  }

  const widgetStrings = {
    resultEyebrow:     locale === "ru" ? "Прогноз ROI" : "Live result",
    resultLabel:       locale === "ru" ? "Выручка с email в месяц" : "Estimated monthly email revenue",
    // BUG-FIX (May 2026 audit · TZ fixes #4): meta line now reflects
    // the click-to-open semantic and 2.5% conversion the formula uses.
    resultMeta: locale === "ru"
      ? "При 4 рассылках/мес и конверсии 2.5% от клика в заказ"
      : "Based on 4 sends/mo and a 2.5% click-to-order conversion",
    annualLabel:       locale === "ru" ? "За год"          : "Annual",
    platformCostLabel: locale === "ru" ? "Платформа"       : "Platform",
    roiLabel:          locale === "ru" ? "ROI"             : "ROI",
    revPerSubLabel:    locale === "ru" ? "Выручка на подписчика" : "Revenue per subscriber",
    revPerSubBenchmarkAbove: locale === "ru"
      ? "Выше среднего по индустрии ($0.82/подписчика)"
      : "Above the industry average of $0.82/sub",
    revPerSubBenchmarkBelow: locale === "ru"
      ? "Среднее по индустрии — $0.82/подписчика"
      : "Industry average is $0.82/sub",
    embedFooter:       locale === "ru" ? "Сделано Botapolis →" : "Powered by Botapolis →",
    inputs: {
      subscribers: locale === "ru" ? "Подписчики"          : "Subscribers",
      openRate:    locale === "ru" ? "Open rate"           : "Open rate",
      // BUG-FIX (May 2026 audit · TZ fixes #4): label correctly says
      // "Click-to-open rate" — the underlying formula multiplies opens
      // by this percentage, not sends.
      clickRate:   locale === "ru" ? "Click-to-open rate"  : "Click-to-open rate",
      aov:         locale === "ru" ? "Средний чек (AOV)"  : "Average order value",
      platform:    locale === "ru" ? "Платформа"           : "Platform",
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

  // Embed-mode iframe view: stripped chrome, just the widget + a footer
  // attribution link. The host page is responsible for setting the
  // iframe height (we suggest 640 in the copy-paste snippet below).
  if (embed) {
    return (
      <main className="px-4 py-6 lg:px-6 lg:py-8">
        <EmailRoiCalculator
          strings={widgetStrings}
          localePrefix={localePrefix}
          locale={locale}
        />
        <p className="mt-6 text-center text-[12px] text-[var(--text-tertiary)]">
          <a
            href={`https://botapolis.com${TOOL_PATH}`}
            target="_blank"
            rel="noopener"
            className="underline-offset-4 hover:underline text-[var(--text-secondary)]"
          >
            {widgetStrings.embedFooter}
          </a>
        </p>
      </main>
    )
  }

  // Embed snippet shown at the foot of the standalone page so bloggers
  // can grab the iframe without leaving the tool.
  const embedSrc = `https://botapolis.com${TOOL_PATH}?embed=1`
  const embedSnippet = `<iframe
  src="${embedSrc}"
  width="100%"
  height="640"
  frameborder="0"
  loading="lazy"
  title="Email ROI Calculator by Botapolis"
></iframe>`

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

        {/* ===================================================================
            RECOMMENDED TOOLS — Wave 2 audit alignment (design v.026)
            ===================================================================
            Three email platforms we'd actually ship to a real store. Lives
            right after the widget so the path from "I have an estimate" to
            "here's where to spend it" stays one scroll length. Cards
            hydrate from Supabase; missing slugs degrade to label-only
            (graceful degradation in RecommendedTools). */}
        <RecommendedTools
          title={recommended.title}
          subtitle={recommended.subtitle}
          pickLabel={recommended.pickLabel}
          items={recommended.items}
          localePrefix={localePrefix}
          campaign="tool-email-roi"
        />

        {/* ===================================================================
            FAQ — Wave 2 audit alignment (design v.026)
            ===================================================================
            Single-open accordion answering the five questions visitors
            send to support / write in our subreddit thread. Paired with
            FAQPage JSON-LD below for Google rich results.
            ================================================================ */}
        <ToolFaq
          eyebrow={locale === "ru" ? "Часто спрашивают" : "FAQ"}
          title={locale === "ru" ? "Что спрашивают про этот калькулятор" : "What visitors ask about this calculator"}
          items={faq}
        />

        {/* ===================================================================
            EMBED SNIPPET — TZ § 11.4 "Embed this calculator" + audit fix #4
            ===================================================================
            Lets bloggers and partners drop the calculator into their own
            posts. Backlinks from those embeds are load-bearing for the
            domain authority story we sell to affiliate programs. The
            link inside the iframe (when ?embed=1 renders) carries
            attribution back here. */}
        <section className="container-default pb-20">
          <div
            className={cn(
              "rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
              "p-6 lg:p-8",
            )}
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {locale === "ru" ? "Встроить калькулятор" : "Embed this calculator"}
            </p>
            <p className="mt-2 text-[15px] leading-[1.6] text-[var(--text-secondary)] max-w-2xl">
              {locale === "ru"
                ? "Скопируй iframe в свой пост — читатели смогут воспользоваться калькулятором без перехода."
                : "Copy the iframe below into your blog post — readers can use the calculator without leaving your page."}
            </p>
            <pre
              className={cn(
                "mt-4 overflow-x-auto rounded-md border border-[var(--border-base)]",
                "bg-[var(--bg-base)] p-4 text-[12px] leading-[1.6]",
                "font-mono text-[var(--text-secondary)]",
              )}
            >
              <code>{embedSnippet}</code>
            </pre>
          </div>
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
      {/* FAQPage schema — emit only when there are questions to surface;
          Wave 2 alignment hooks Google rich results to the editorial FAQ. */}
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
