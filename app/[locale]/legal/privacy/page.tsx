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
   /legal/privacy — Privacy Policy (TZ § 16, sprint 6)
   ----------------------------------------------------------------------------
   MVP-grade policy. Names the actual processors (Supabase, Plausible,
   PostHog, Beehiiv, Vercel) so it survives a real GDPR audit instead of
   the lorem-ipsum filler most launches ship with. Long-form structure on a
   narrow container — legal copy is unreadable wider than ~70ch.
---------------------------------------------------------------------------- */

const LAST_UPDATED = "2026-05-11"
const PATH = "/legal/privacy"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru" ? "Политика конфиденциальности" : "Privacy policy",
    description:
      locale === "ru"
        ? "Какие данные Botapolis собирает, зачем и как ты можешь их удалить."
        : "What data Botapolis collects, why, and how you can request its deletion.",
    path: PATH,
    locale,
  })
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",      path: `${localePrefix}/` },
    { name: locale === "ru" ? "Правовое" : "Legal",    path: `${localePrefix}/legal/privacy` },
    { name: locale === "ru" ? "Конфиденциальность" : "Privacy", path: `${localePrefix}/legal/privacy` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <LegalHero
          eyebrow={locale === "ru" ? "Правовое" : "Legal"}
          title={locale === "ru" ? "Политика конфиденциальности" : "Privacy policy"}
          lede={
            locale === "ru"
              ? "Какие данные мы собираем, зачем, как храним и как удалить."
              : "What we collect, why, how we store it, and how to delete it."
          }
          updated={LAST_UPDATED}
          localePrefix={localePrefix}
          locale={locale}
        />

        <LegalArticle locale={locale}>
          <h2>1. {locale === "ru" ? "Что мы собираем" : "What we collect"}</h2>
          <p>
            {locale === "ru"
              ? "Botapolis собирает минимально необходимый набор: email при регистрации через Supabase Auth, хешированный IP (SHA-256) для антифрод-логики /go/* и ratelimit, а также агрегированную аналитику просмотров через Plausible (cookieless) и событийную через PostHog."
              : "Botapolis collects the minimum it needs to operate: your email when you sign up via Supabase Auth, a SHA-256-hashed IP for /go/* anti-fraud and rate limiting, and aggregate analytics via Plausible (cookieless) plus event-based capture via PostHog."}
          </p>
          <p>
            {locale === "ru"
              ? "Мы не передаём твой email и поведение никому, кроме процессоров, перечисленных в разделе 4."
              : "We don't share your email or behaviour with anyone outside the processors listed in section 4."}
          </p>

          <h2>2. {locale === "ru" ? "Зачем мы это собираем" : "Why we collect it"}</h2>
          <ul>
            <li>
              {locale === "ru"
                ? "Email — чтобы хранить твои расчёты, активность и подписку на рассылку."
                : "Email — so we can store your saved calculations, activity, and newsletter preferences."}
            </li>
            <li>
              {locale === "ru"
                ? "IP-хеш — чтобы блокировать автоматизированные клики по партнёрским ссылкам и ограничивать частоту запросов к AI-инструментам."
                : "IP hash — to block automated affiliate-click fraud and rate-limit the AI tools."}
            </li>
            <li>
              {locale === "ru"
                ? "Аналитика — чтобы понимать, какие статьи и калькуляторы работают, и убирать те, что не работают."
                : "Analytics — to understand which articles and calculators land, and retire the ones that don't."}
            </li>
          </ul>

          <h2>3. {locale === "ru" ? "Cookies" : "Cookies"}</h2>
          <p>
            {locale === "ru"
              ? "Мы используем только функциональные cookies: сессия Supabase для логина и `theme` для запоминания тёмной/светлой темы. Plausible работает без cookies. PostHog использует localStorage + cookie для distinct_id (можно отключить в браузере)."
              : "We only set functional cookies: the Supabase session cookie for sign-in and `theme` for remembering your dark/light preference. Plausible runs cookieless. PostHog uses localStorage + a distinct_id cookie (disable in your browser if you prefer)."}
          </p>

          <h2>4. {locale === "ru" ? "Сторонние процессоры" : "Third-party processors"}</h2>
          <ul>
            <li><strong>Supabase</strong> — {locale === "ru" ? "auth + база, EU/US регионы" : "auth + database, EU/US regions"}</li>
            <li><strong>Vercel</strong> — {locale === "ru" ? "хостинг" : "hosting"}</li>
            <li><strong>Plausible</strong> — {locale === "ru" ? "веб-аналитика, EU-only" : "web analytics, EU-only"}</li>
            <li><strong>PostHog</strong> — {locale === "ru" ? "событийная аналитика" : "event analytics"}</li>
            <li><strong>Beehiiv</strong> — {locale === "ru" ? "email-рассылка" : "newsletter delivery"}</li>
            <li><strong>Anthropic</strong> — {locale === "ru" ? "AI-инференс для инструмента описания товаров" : "AI inference for the product-description tool"}</li>
            <li><strong>Upstash</strong> — {locale === "ru" ? "Redis для rate-limit" : "Redis for rate limiting"}</li>
          </ul>

          <h2>5. {locale === "ru" ? "Твои права (GDPR / CCPA)" : "Your rights (GDPR / CCPA)"}</h2>
          <p>
            {locale === "ru"
              ? "Ты можешь запросить копию своих данных, их удаление или экспорт, написав на privacy@botapolis.com. Мы ответим в течение 30 дней."
              : "You can request a copy of your data, its deletion, or an export by emailing privacy@botapolis.com. We respond within 30 days."}
          </p>
          <p>
            {locale === "ru"
              ? "Удаление аккаунта через личный кабинет так же удаляет все связанные записи (saved_calculations, content_likes) благодаря cascade-связи в БД."
              : "Deleting your account from the dashboard cascades through saved_calculations and content_likes — your row IDs vanish along with the user record."}
          </p>

          <h2>6. {locale === "ru" ? "Изменения политики" : "Policy updates"}</h2>
          <p>
            {locale === "ru"
              ? `Эта политика обновлялась ${LAST_UPDATED}. Существенные изменения мы анонсируем по email подписчикам и через баннер на сайте за 30 дней до вступления в силу.`
              : `This policy was last updated ${LAST_UPDATED}. Material changes are announced via newsletter and an on-site banner 30 days before they take effect.`}
          </p>

          <p className="text-[var(--text-tertiary)]">
            <Link
              href={`${localePrefix}/legal/terms`}
              className="underline-offset-4 hover:underline"
            >
              {locale === "ru" ? "Условия использования" : "Terms of service"}
            </Link>
            {" · "}
            <Link
              href={`${localePrefix}/legal/affiliate-disclosure`}
              className="underline-offset-4 hover:underline"
            >
              {locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure"}
            </Link>
          </p>
        </LegalArticle>
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
// Shared legal building blocks — inlined here for the privacy page.
// The Terms and Affiliate Disclosure pages duplicate these intentionally:
// the three legal pages don't share a common layout in any meaningful way,
// only superficial chrome, and over-abstracting one-shot files makes them
// harder to read in a legal review.
// ============================================================================
function LegalHero({
  eyebrow,
  title,
  lede,
  updated,
  localePrefix,
  locale,
}: {
  eyebrow: string
  title: string
  lede: string
  updated: string
  localePrefix: "" | "/ru"
  locale: "en" | "ru"
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-base)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-30 blur-[120px]"
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

function LegalArticle({
  children,
  locale: _locale,
}: {
  children: React.ReactNode
  locale: "en" | "ru"
}) {
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
