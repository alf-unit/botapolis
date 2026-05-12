import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buildMetadata } from "@/lib/seo/metadata"
import { generateBreadcrumbSchema } from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /legal/disclaimer — General disclaimer (TZ § 16)
   ----------------------------------------------------------------------------
   The plain-language version of "this is editorial content, not advice":
   we say what Botapolis ISN'T (financial / legal / tax / professional
   advice) and what we DO promise (good-faith research with stated
   methodology). Belt-and-suspenders alongside the affiliate disclosure and
   the methodology page — those cover specific claims; this one is the
   blanket.
---------------------------------------------------------------------------- */

const LAST_UPDATED = "2026-05-12"
const PATH = "/legal/disclaimer"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Дисклеймер" : "Disclaimer",
    description:
      locale === "ru"
        ? "Botapolis — это редакционный контент, а не финансовый или юридический совет. Что это значит на практике."
        : "Botapolis is editorial content, not financial or legal advice. What that means in practice.",
    path:   PATH,
    locale,
  })
}

export default async function DisclaimerPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",      path: `${localePrefix}/` },
    { name: locale === "ru" ? "Правовое" : "Legal",    path: `${localePrefix}${PATH}` },
    { name: locale === "ru" ? "Дисклеймер" : "Disclaimer", path: `${localePrefix}${PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <Hero
          eyebrow={locale === "ru" ? "Правовое" : "Legal"}
          title={locale === "ru" ? "Дисклеймер" : "Disclaimer"}
          lede={
            locale === "ru"
              ? "Что есть Botapolis, а чего точно нет."
              : "What Botapolis is, and what it definitely isn't."
          }
          updated={LAST_UPDATED}
          locale={locale}
          localePrefix={localePrefix}
        />

        <Article locale={locale}>
          <h2>1. {locale === "ru" ? "Не профессиональный совет" : "Not professional advice"}</h2>
          <p>
            {locale === "ru"
              ? "Контент на Botapolis — это редакционные обзоры, сравнения и калькуляторы, основанные на нашем собственном тестировании и публично доступной информации. Это НЕ финансовый, юридический, налоговый или иной профессиональный совет. Для специфических решений по своему магазину консультируйся с лицензированным специалистом в своей юрисдикции."
              : "Content on Botapolis is editorial reviews, comparisons, and calculators based on our own testing and publicly available information. It is NOT financial, legal, tax, or other professional advice. For decisions specific to your store, consult a licensed professional in your jurisdiction."}
          </p>

          <h2>2. {locale === "ru" ? "Информация может устаревать" : "Information may become stale"}</h2>
          <p>
            {locale === "ru"
              ? "Цены, функции, интеграции и условия партнёрских программ инструментов меняются — иногда без предупреждения. Мы квартально пересматриваем материалы (см. "
              : "Tool pricing, features, integrations, and partner-program terms change — sometimes without warning. We refresh published work quarterly (see "}
            <Link href={`${localePrefix}/methodology`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Методологию" : "Methodology"}
            </Link>
            {locale === "ru"
              ? "), но всегда проверяй актуальные данные на сайте вендора перед покупкой."
              : "), but always verify current data on the vendor's site before purchasing."}
          </p>

          <h2>3. {locale === "ru" ? "Результаты калькуляторов — оценки" : "Calculator outputs are estimates"}</h2>
          <p>
            {locale === "ru"
              ? "Наши калькуляторы (Email ROI, AI Cost Comparator) дают оценки на основе индустриальных бенчмарков и вводных от пользователя. Реальные результаты могут существенно отличаться в зависимости от качества списка, аудитории, отрасли и десятков других переменных. Используй цифры как ориентир, а не прогноз."
              : "Our calculators (Email ROI, AI Cost Comparator) produce estimates based on industry benchmarks and user inputs. Actual results may differ materially depending on list quality, audience, vertical, and dozens of other variables. Treat the numbers as directional, not predictive."}
          </p>

          <h2>4. {locale === "ru" ? "AI-вывод требует ревью" : "AI output requires review"}</h2>
          <p>
            {locale === "ru"
              ? "AI-инструмент для описаний товаров возвращает три варианта, сгенерированных большой языковой моделью. Модели иногда выдумывают факты, нарушают тон бренда или производят шаблонные формулировки. Всегда вычитывай вывод перед публикацией. Botapolis не несёт ответственности за контент, который ты выложишь в своём магазине."
              : "The AI product-description tool returns three model-generated variants. Models occasionally fabricate facts, drift off brand voice, or produce boilerplate phrasing. Always review the output before publishing. Botapolis is not responsible for content you ship to your store."}
          </p>

          <h2>5. {locale === "ru" ? "Партнёрские отношения" : "Affiliate relationships"}</h2>
          <p>
            {locale === "ru"
              ? "Мы получаем партнёрскую комиссию с большинства рекомендуемых инструментов. Полное раскрытие — в "
              : "We earn affiliate commission on most tools we recommend. Full disclosure in our "}
            <Link href={`${localePrefix}/legal/affiliate-disclosure`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Партнёрском disclosure" : "Affiliate disclosure"}
            </Link>
            {locale === "ru"
              ? ". Партнёрский статус не повышает рейтинг — методология описана отдельно."
              : ". Affiliate status doesn't move ratings up — methodology is documented separately."}
          </p>

          <h2>6. {locale === "ru" ? "Ограничение ответственности" : "Limitation of liability"}</h2>
          <p>
            {locale === "ru"
              ? "В пределах, разрешённых применимым законодательством, Botapolis и её авторы не несут ответственности за прямые или косвенные убытки, упущенную выгоду или иные убытки, возникшие в результате использования сайта или решений, принятых на основе его контента."
              : "To the extent permitted by applicable law, Botapolis and its authors are not liable for direct or indirect damages, lost profits, or other losses arising from use of the site or decisions made based on its content."}
          </p>
          <p>
            {locale === "ru"
              ? "Юридически обязывающая редакция этого положения — в "
              : "The legally binding version of this clause lives in our "}
            <Link href={`${localePrefix}/legal/terms`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Условиях использования" : "Terms of service"}
            </Link>
            {locale === "ru" ? "." : "."}
          </p>

          <h2>7. {locale === "ru" ? "Связанные документы" : "Related"}</h2>
          <p className="text-[var(--text-tertiary)]">
            <Link href={`${localePrefix}/methodology`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Методология" : "Methodology"}
            </Link>
            {" · "}
            <Link href={`${localePrefix}/legal/affiliate-disclosure`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure"}
            </Link>
            {" · "}
            <Link href={`${localePrefix}/legal/privacy`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Конфиденциальность" : "Privacy"}
            </Link>
            {" · "}
            <Link href={`${localePrefix}/legal/terms`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Условия" : "Terms"}
            </Link>
          </p>
        </Article>
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}${PATH}`)} />
    </>
  )
}

// ============================================================================
// Chrome — same shape as /legal/privacy and /legal/cookie-policy.
// Intentionally duplicated; sharing a layout component across the legal
// files would obscure copy edits during legal review.
// ============================================================================
function Hero({
  eyebrow,
  title,
  lede,
  updated,
  locale,
  localePrefix,
}: {
  eyebrow: string
  title: string
  lede: string
  updated: string
  locale: "en" | "ru"
  localePrefix: "" | "/ru"
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-base)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)" }}
      />
      <div className="container-default relative pt-10 pb-10 lg:pt-14 lg:pb-12">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
        >
          <Link href={`${localePrefix}/`} className="hover:text-[var(--text-secondary)]">
            {locale === "ru" ? "Главная" : "Home"}
          </Link>
          <span className="opacity-60">/</span>
          <span className="text-[var(--text-secondary)]">{eyebrow}</span>
        </nav>
        <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-3xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
          {lede}
        </p>
        <p className="mt-4 font-mono text-[12px] text-[var(--text-tertiary)]">
          {locale === "ru" ? "Обновлено" : "Last updated"}: {updated}
        </p>
      </div>
    </section>
  )
}

function Article({ children, locale: _locale }: { children: React.ReactNode; locale: "en" | "ru" }) {
  return (
    <section className="container-narrow py-12 lg:py-16">
      <article
        className="prose-legal flex flex-col gap-6 text-[15px] leading-[1.7] text-[var(--text-secondary)]
                   [&>h2]:mt-4 [&>h2]:text-h3 [&>h2]:font-semibold [&>h2]:tracking-[-0.01em] [&>h2]:text-[var(--text-primary)]
                   [&>p>strong]:text-[var(--text-primary)] [&>ul>li>strong]:text-[var(--text-primary)]
                   [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:my-1"
      >
        {children}
      </article>
    </section>
  )
}
