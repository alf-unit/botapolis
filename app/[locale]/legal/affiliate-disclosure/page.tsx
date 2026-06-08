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
   /legal/affiliate-disclosure — TZ § 16 (sprint 6)
   ----------------------------------------------------------------------------
   FTC compliance: this page is the canonical disclosure that we earn
   commissions from affiliate partnerships, that those commissions don't
   buy a better review, and that ratings reflect the editorial team's
   actual hands-on testing.
---------------------------------------------------------------------------- */

const LAST_UPDATED = "2026-05-11"
const PATH = "/legal/affiliate-disclosure"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure",
    description:
      locale === "ru"
        ? "Как Botapolis зарабатывает на партнёрских ссылках и почему это не влияет на наши обзоры."
        : "How Botapolis earns from affiliate links and why that doesn't change our reviews.",
    path: PATH,
    locale,
  })
}

export default async function AffiliateDisclosurePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",  path: `${localePrefix}/` },
    { name: locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure",
      path: `${localePrefix}${PATH}` },
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
                "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-25 blur-[120px]"
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
                {locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure"}
              </span>
            </nav>
            <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {locale === "ru" ? "Прозрачность" : "Transparency"}
            </p>
            <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-3xl">
              {locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure"}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {locale === "ru"
                ? "Botapolis — reader-supported. Если ты переходишь по партнёрской ссылке и оплачиваешь продукт, мы можем получить комиссию — без дополнительной стоимости для тебя."
                : "Botapolis is reader-supported. When you click an affiliate link and pay for a product, we may earn a commission — at no extra cost to you."}
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
            {/* Top callout — strong, FTC-aligned statement */}
            <div
              className="not-prose rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-5 lg:p-6 text-[15px] leading-[1.6]"
              style={{
                borderColor:
                  "color-mix(in oklch, var(--brand) 28%, transparent)",
                background:
                  "color-mix(in oklch, var(--brand) 6%, transparent)",
              }}
            >
              <p className="text-[var(--text-primary)]">
                <strong>
                  {locale === "ru" ? "Короткая версия:" : "Plain English:"}
                </strong>{" "}
                {locale === "ru"
                  ? "Мы зарабатываем партнёрские комиссии за переходы по ссылкам с пометкой /go/. Это не влияет на наши оценки, рейтинги или редакционные решения. Если инструмент плох — мы напишем, что он плох, даже если у нас с ним есть партнёрский договор."
                  : "We earn affiliate commissions for clicks on /go/ links. That doesn't shape our scores, rankings, or editorial calls. If a tool is bad, we'll say it's bad — partner status or not."}
              </p>
            </div>

            <h2>1. {locale === "ru" ? "Что такое партнёрская ссылка" : "What an affiliate link is"}</h2>
            <p>
              {locale === "ru"
                ? "Любая ссылка с pathname /go/<tool-slug> — партнёрская. Атрибуты rel=\"sponsored nofollow noopener\" присутствуют по требованиям Google и FTC."
                : "Any link whose pathname is /go/<tool-slug> is an affiliate link. They carry rel=\"sponsored nofollow noopener\" attributes per Google and FTC guidelines."}
            </p>

            <h2>2. {locale === "ru" ? "С кем у нас партнёрства" : "Who we partner with"}</h2>
            <p>
              {locale === "ru"
                ? "Партнёрки оформлены через сети Impact, PartnerStack, Rewardful и напрямую с вендорами. Список партнёров отражён в поле affiliate_partner каждой карточки инструмента в каталоге."
                : "We work through Impact, PartnerStack, Rewardful, and direct vendor programmes. Each tool's partner network is recorded in the catalog (look at the `affiliate_partner` field)."}
            </p>

            <h2>3. {locale === "ru" ? "Как мы оцениваем" : "How we score"}</h2>
            <ul>
              <li>
                {locale === "ru"
                  ? "Каждый инструмент мы тестируем на реальном Shopify-магазине минимум 30 дней перед публикацией обзора."
                  : "We run every tool on a real Shopify store for at least 30 days before publishing a review."}
              </li>
              <li>
                {locale === "ru"
                  ? "Рейтинг (0–10) складывается из четырёх метрик: ease_of_use, value, support, features."
                  : "Scores (0–10) come from four metrics: ease_of_use, value, support, features."}
              </li>
              <li>
                {locale === "ru"
                  ? "Партнёрский статус никак не влияет на сам рейтинг."
                  : "Partner status has no input into the score itself."}
              </li>
            </ul>

            <h2>4. {locale === "ru" ? "Sponsored content" : "Sponsored content"}</h2>
            <p>
              {locale === "ru"
                ? "Если статья оплачена вендором — она помечается баннером \"Sponsored\" в начале и в JSON-LD как `disambiguatingDescription: sponsored`. На MVP-запуске у нас 0 sponsored статей."
                : "Sponsored articles carry a 'Sponsored' banner at the top of the page and are marked in JSON-LD with `disambiguatingDescription: sponsored`. At MVP launch we have zero sponsored articles."}
            </p>

            <h2>5. {locale === "ru" ? "Контакты" : "Contact"}</h2>
            <p>
              {locale === "ru"
                ? "Вопросы или несогласие с обзором — пиши на editorial@botapolis.com. Мы исправляем фактические ошибки и обновляем рейтинги при изменении продукта."
                : "Disagree with a review or spot a factual error? Email editorial@botapolis.com. We update scores when products change in ways we missed."}
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
                href={`${localePrefix}/legal/terms`}
                className="underline-offset-4 hover:underline"
              >
                {locale === "ru" ? "Условия" : "Terms"}
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
