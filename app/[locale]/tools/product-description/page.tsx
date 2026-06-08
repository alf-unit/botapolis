import Link from "next/link"
import type { Metadata } from "next"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ProductDescriptionGenerator } from "@/components/tools/ProductDescriptionGenerator"
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
   /tools/product-description — TZ § 11.3
   ----------------------------------------------------------------------------
   Server component shell. The client widget POSTs to /api/tools/description
   which is itself rate-limited (aiToolGuestLimit = 3 / 24 h) and gated on
   ANTHROPIC_API_KEY presence — both failure modes are surfaced in the UI.
---------------------------------------------------------------------------- */

export const revalidate = 86400
const TOOL_PATH = "/tools/product-description"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  // Title goes through the root layout's `title.template` ("%s · Botapolis"),
  // so we omit the brand suffix here to avoid double-stamping it.
  const title =
    locale === "ru"
      ? "AI-генератор описаний товаров · бесплатно"
      : "AI Product Description Generator · free"
  const description =
    locale === "ru"
      ? "Три варианта описания товара под тон и аудиторию за 5 секунд. Powered by Claude Haiku 4.5, без регистрации, 3 генерации в день бесплатно."
      : "Three on-brand product description variations in five seconds. Powered by Claude Haiku 4.5, no sign-up, 3 free generations per day."

  return buildMetadata({
    title,
    description,
    path:   TOOL_PATH,
    locale,
    ogImage: `${TOOL_PATH}/opengraph-image`,
    keywords: [
      "ai product description generator",
      "shopify product copy ai",
      "claude haiku product copywriter",
      "free ai copywriter",
    ],
  })
}

export default async function ProductDescriptionPage() {
  const locale = await getLocale()
  const dict   = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const t = {
    breadcrumbHome: locale === "ru" ? "Главная" : "Home",
    eyebrow:        locale === "ru" ? "AI-инструмент" : "AI tool",
    headline: locale === "ru"
      ? "Описание товара под твою аудиторию — за 5 секунд."
      : "On-brand product copy in five seconds.",
    lede: locale === "ru"
      ? "Введи название, ключевые фичи, аудиторию и тон. Получи три разных варианта — копируй понравившийся прямо в Shopify."
      : "Drop in the product name, key features, audience, and tone. Get three distinct variations — copy the one that lands straight into Shopify.",
  }

  // Wave 2 (audit alignment): editorial FAQ + JSON-LD. Questions chosen
  // from real visitor confusion: free tier limits, model under the hood,
  // commercial use, and the "is this AI slop?" objection. Copy lives
  // inline — generation-tool-specific, would bloat dict.
  const faq = locale === "ru"
    ? [
        {
          q: "Почему три варианта, а не один?",
          a: "Лучший вариант редко совпадает с первой попыткой модели. Три варианта дают три разных тона/угла за одну генерацию — выбираешь, что попадает, и копируешь сразу в Shopify. Если ни один не подошёл — нажми «Ещё варианты» (минус 1 из дневного лимита).",
        },
        {
          q: "Сколько генераций в день бесплатно?",
          a: "3 генерации/сутки для гостей (IP-based), 20/сутки для залогиненных. Если упёрся в лимит и нужно больше — заведи аккаунт через magic-link или открой Anthropic Console напрямую (партнёрская ссылка в конце страницы).",
        },
        {
          q: "Какая модель под капотом?",
          a: "Claude Haiku 4.5 от Anthropic — наша рабочая модель для всего креативного на сайте. Отличный баланс скорости (~3-5с/запрос) и качества для product copy в e-com контексте. Те же модели в /tools/ai-cost-comparator если хочешь сравнить с GPT-4o-mini.",
        },
        {
          q: "Можно использовать сгенерированные тексты коммерчески?",
          a: "Да. Anthropic в своих terms даёт право использовать output без ограничений на commercial use. Botapolis тоже не претендует ни на какие права на сгенерированный текст — это твой контент с момента генерации.",
        },
        {
          q: "Это AI-slop? Google не накажет за такой текст?",
          a: "AI-slop — это плохо написанный AI-текст без редактирования. Хорошо написанный AI-текст с человеческой проверкой Google не наказывает (см. их helpful content guidelines, март 2024). Правило: всегда перечитай вариант перед публикацией и поправь факты, если модель что-то выдумала — она может.",
        },
      ]
    : [
        {
          q: "Why three variations, not one?",
          a: "The best output rarely lines up with the model's first attempt. Three variations give you three different tones / angles in one request — pick the one that lands and paste it into Shopify. If none fit, hit 'Regenerate' (costs 1 from your daily quota).",
        },
        {
          q: "How many free generations per day?",
          a: "3 generations per day for guests (rate-limited by IP), 20 per day for signed-in accounts. If you hit the cap and need more, sign in via magic link, or open the Anthropic Console directly (partner link at the bottom of the page).",
        },
        {
          q: "Which model is under the hood?",
          a: "Claude Haiku 4.5 from Anthropic — our default for all creative work on the site. Solid speed-quality balance (~3-5s per request) for product copy in an e-commerce context. Compare against GPT-4o-mini and others via /tools/ai-cost-comparator.",
        },
        {
          q: "Can I use the generated copy commercially?",
          a: "Yes. Anthropic's terms grant unrestricted commercial use of output. Botapolis claims no rights to generated text either — it's yours from the moment it's generated.",
        },
        {
          q: "Is this 'AI slop'? Will Google penalize my pages?",
          a: "AI slop is poorly-written, unedited AI text. Well-written AI text with human review isn't penalized — see Google's helpful-content guidelines from March 2024. The rule: always re-read each variation and fix any facts the model hallucinated (it can and does).",
        },
      ]

  const widgetStrings = {
    inputs: {
      product:   locale === "ru" ? "Название товара"     : "Product name",
      features:  locale === "ru" ? "Ключевые фичи"        : "Key features",
      audience:  locale === "ru" ? "Целевая аудитория"     : "Target audience",
      tone:      locale === "ru" ? "Тон"                  : "Tone",
      maxLength: locale === "ru" ? "Длина (слов)"          : "Length (words)",
      placeholderProduct:  locale === "ru" ? "Например: Hydration Bottle 800ml"        : "e.g. Hydration Bottle 800ml",
      placeholderFeatures: locale === "ru"
        ? "Перечисли через запятую: материал, размер, фичи, чем отличается…"
        : "Comma-separated: material, size, key features, what makes it different…",
    },
    toneLabels: {
      professional: locale === "ru" ? "Профессионально" : "Professional",
      casual:       locale === "ru" ? "Дружелюбно"     : "Casual",
      playful:      locale === "ru" ? "Игриво"         : "Playful",
      luxury:       locale === "ru" ? "Премиум"        : "Luxury",
    },
    audienceLabels: {
      ecom_general: locale === "ru" ? "DTC-покупатели"  : "DTC shoppers",
      luxury_buyer: locale === "ru" ? "Premium"          : "Premium",
      value_seeker: locale === "ru" ? "Экономные"        : "Value-seekers",
      tech_savvy:   locale === "ru" ? "Технари"          : "Tech-savvy",
      gift_giver:   locale === "ru" ? "Дарители"        : "Gift-givers",
    },
    generate:        locale === "ru" ? "Сгенерировать"   : "Generate",
    generating:      locale === "ru" ? "Генерим…"        : "Generating…",
    regenerate:      locale === "ru" ? "Ещё варианты"    : "Regenerate",
    copy:            locale === "ru" ? "Копировать"      : "Copy",
    copied:          locale === "ru" ? "Скопировано"    : "Copied",
    resultsEyebrow:  locale === "ru" ? "Варианты"         : "Variations",
    idleMsg: locale === "ru"
      ? "Заполни форму слева и нажми «Сгенерировать» — варианты появятся здесь."
      : "Fill in the form on the left and hit Generate — three variations will land here.",
    variationLabel: locale === "ru" ? "Вариант {n}" : "Variation {n}",
    errors: {
      rateLimited:   locale === "ru"
        ? "Дневной лимит достигнут (3 генерации). Зарегистрируйтесь — получите 20 в день, или приходите завтра."
        : "Daily limit reached (3 free generations). Sign up for 20/day or come back tomorrow.",
      generic:       locale === "ru"
        ? "Что-то пошло не так. Попробуй ещё раз через секунду."
        : "Something went wrong. Try again in a moment.",
      notConfigured: locale === "ru"
        ? "Генерация недоступна в этом окружении — ANTHROPIC_API_KEY не настроен."
        : "Generation isn't enabled in this environment — ANTHROPIC_API_KEY is missing.",
      invalid:       locale === "ru"
        ? "Проверь поля формы."
        : "Check the form fields.",
    },
    affiliate: {
      eyebrow: locale === "ru" ? "Нужно больше" : "Need more",
      intro: locale === "ru"
        ? "Если упёрся в лимит, попробуй платный API Anthropic — те же модели, без барьеров."
        : "If you hit the limit, plug into the Anthropic API directly — same model, no daily cap.",
      primary:      locale === "ru" ? "Открыть Anthropic Console" : "Open Anthropic Console",
      primarySlug:  "anthropic",
    },
    disclaimerText: locale === "ru"
      ? "Сгенерированный текст проверяй перед публикацией — модель может ошибиться в фактах. Подробнее —"
      : "Always review generated copy before publishing — the model can hallucinate facts. More in",
    methodologyLink: locale === "ru" ? "методология" : "methodology",
  }

  const softwareSchema = generateOwnedToolSchema({
    name: "AI Product Description Generator",
    description:
      "Free AI product description generator for Shopify operators. Three on-brand variations per request, audience- and tone-aware, powered by Claude Haiku 4.5.",
    path:        TOOL_PATH,
  })
  const breadcrumb = generateBreadcrumbSchema([
    { name: t.breadcrumbHome, path: `${localePrefix}/` },
    { name: dict.nav.tools,   path: `${localePrefix}/tools` },
    { name: "Product Description Generator", path: `${localePrefix}${TOOL_PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          {/* Two-tone glow — mint→violet anchors the AI semantic */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-45 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.24), transparent 60%)",
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
              <span className="text-[var(--text-secondary)]">Product Description Generator</span>
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
          <ProductDescriptionGenerator
            strings={widgetStrings}
            localePrefix={localePrefix}
          />
        </section>

        {/* ===================================================================
            FAQ — Wave 2 audit alignment (design v.026)
            ===================================================================
            No separate Recommended Tools section here: the widget already
            ships the Anthropic Console affiliate inside its "Need more"
            block (and only one paid alternative exists for "open the API
            directly"). FAQ + FAQPage schema is the higher-value add. */}
        <ToolFaq
          eyebrow={locale === "ru" ? "Часто спрашивают" : "FAQ"}
          title={locale === "ru" ? "Что спрашивают про генератор" : "What visitors ask about this generator"}
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
