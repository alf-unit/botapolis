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
   /legal/terms — Terms of Service (TZ § 16, sprint 6)
   ----------------------------------------------------------------------------
   Plain-English MVP terms: usage rules, no warranty, IP, account suspension
   for fraud, and how disputes get handled. Not exhaustive — we'll layer in
   class-action waivers and arbitration clauses once we have actual paid
   tiers to protect.
---------------------------------------------------------------------------- */

const LAST_UPDATED = "2026-05-11"
const PATH = "/legal/terms"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Условия использования" : "Terms of service",
    description: locale === "ru"
      ? "Правила использования Botapolis, ограничение ответственности, IP."
      : "How to use Botapolis, limitation of liability, intellectual property.",
    path: PATH,
    locale,
  })
}

export default async function TermsPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",  path: `${localePrefix}/` },
    { name: locale === "ru" ? "Условия" : "Terms", path: `${localePrefix}${PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-30 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.18), transparent 60%)",
            }}
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
              <span className="text-[var(--text-secondary)]">
                {locale === "ru" ? "Условия" : "Terms"}
              </span>
            </nav>
            <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {locale === "ru" ? "Правовое" : "Legal"}
            </p>
            <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-3xl">
              {locale === "ru" ? "Условия использования" : "Terms of service"}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {locale === "ru"
                ? "Базовые правила пользования сайтом и инструментами."
                : "Ground rules for using the site and tools."}
            </p>
            <p className="mt-4 font-mono text-[12px] text-[var(--text-tertiary)]">
              {locale === "ru" ? "Обновлено" : "Last updated"}: {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="container-narrow py-12 lg:py-16">
          <article
            className="flex flex-col gap-6 text-[15px] leading-[1.7] text-[var(--text-secondary)]
                       [&>h2]:mt-4 [&>h2]:text-h3 [&>h2]:font-semibold [&>h2]:tracking-[-0.01em] [&>h2]:text-[var(--text-primary)]
                       [&>p>strong]:text-[var(--text-primary)]
                       [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:my-1"
          >
            <h2>1. {locale === "ru" ? "Согласие" : "Agreement"}</h2>
            <p>
              {locale === "ru"
                ? "Используя Botapolis, ты соглашаешься с этими условиями. Если не согласен с любой частью — не используй сайт."
                : "By using Botapolis you agree to these terms. If you disagree with any part, please stop using the site."}
            </p>

            <h2>2. {locale === "ru" ? "Что мы предоставляем" : "What we provide"}</h2>
            <p>
              {locale === "ru"
                ? "Образовательный контент про AI-инструменты для Shopify, интерактивные калькуляторы, обзоры и сравнения. Это не финансовая, юридическая или налоговая консультация."
                : "Educational content about AI tools for Shopify operators, interactive calculators, reviews, and comparisons. This is not financial, legal, or tax advice."}
            </p>

            <h2>3. {locale === "ru" ? "Аккаунт" : "Your account"}</h2>
            <ul>
              <li>
                {locale === "ru"
                  ? "Один человек — один аккаунт. Ты отвечаешь за безопасность своего email и magic-link сессии."
                  : "One person, one account. You're responsible for the security of your email inbox and any active magic-link sessions."}
              </li>
              <li>
                {locale === "ru"
                  ? "Мы можем заблокировать аккаунт за злоупотребление (массовая накрутка лайков, scraping, скрытие реальной личности при purchase fraud)."
                  : "We may suspend accounts for abuse (vote stuffing, scraping, identity obfuscation during affiliate fraud, etc.)."}
              </li>
            </ul>

            <h2>4. {locale === "ru" ? "Точность данных" : "Accuracy"}</h2>
            <p>
              {locale === "ru"
                ? "Цены инструментов, рейтинги и фичи обновляются вручную. Мы стараемся, но вендоры меняют цены без предупреждения — проверяй детали на сайте вендора перед покупкой."
                : "Tool prices, ratings, and features are updated by hand. We do our best, but vendors change pricing without notice — verify on the vendor's site before purchase."}
            </p>

            <h2>5. {locale === "ru" ? "Интеллектуальная собственность" : "Intellectual property"}</h2>
            <p>
              {locale === "ru"
                ? "Контент сайта (статьи, дизайн, код калькуляторов) принадлежит Botapolis. Свободно цитируй с указанием источника. Не копируй сайты целиком."
                : "Site content (articles, design, calculator code) belongs to Botapolis. Quote freely with attribution; don't clone the site wholesale."}
            </p>

            <h2>6. {locale === "ru" ? "Без гарантий" : "No warranty"}</h2>
            <p>
              {locale === "ru"
                ? "Сайт предоставляется «как есть». Мы не гарантируем непрерывную работу, отсутствие ошибок в калькуляторах или 100% точность прогнозов. Используй на свой страх и риск."
                : "The site is provided 'as is'. We don't guarantee uptime, zero calculator bugs, or 100% accuracy. Use at your own risk."}
            </p>

            <h2>7. {locale === "ru" ? "Ограничение ответственности" : "Limitation of liability"}</h2>
            <p>
              {locale === "ru"
                ? "В максимально разрешённой законом степени, Botapolis не несёт ответственности за упущенную выгоду, потерю данных или любой непрямой ущерб от использования сайта."
                : "To the maximum extent permitted by law, Botapolis is not liable for lost profits, data loss, or any indirect damages arising from your use of the site."}
            </p>

            <h2>8. {locale === "ru" ? "Изменения условий" : "Changes"}</h2>
            <p>
              {locale === "ru"
                ? "Мы можем обновлять эти условия. Дата последнего обновления указана наверху. Продолжение использования сайта после изменений = согласие с новой редакцией."
                : "We may update these terms. The last-updated stamp is at the top of this page. Continued use after a change means you accept the new version."}
            </p>

            <p className="text-[var(--text-tertiary)]">
              <Link
                href={`${localePrefix}/legal/privacy`}
                className="underline-offset-4 hover:underline"
              >
                {locale === "ru" ? "Конфиденциальность" : "Privacy"}
              </Link>
              {" · "}
              <Link
                href={`${localePrefix}/legal/affiliate-disclosure`}
                className="underline-offset-4 hover:underline"
              >
                {locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure"}
              </Link>
            </p>
          </article>
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}${PATH}`)} />
    </>
  )
}
