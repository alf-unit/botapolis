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
   /legal/cookie-policy — TZ § 16 (GDPR / ePrivacy compliance)
   ----------------------------------------------------------------------------
   The deliberately short version: Botapolis runs a near-cookieless stack
   (Plausible is cookieless, no ad networks, no third-party trackers). We
   still need this page because:
     - GDPR Article 13 disclosure obligations cover any processing, not just
       cookies. Listing what we DON'T set is itself disclosure.
     - The ePrivacy Directive (Cookie Law) requires informed consent for
       non-essential cookies. We don't set any non-essential cookies, but
       saying so out loud here is the audit-friendly answer to "do you have
       a cookie policy?".

   Two cookies that DO exist:
     1. Supabase auth — `sb-<project>-auth-token`, HttpOnly, SameSite=Lax,
        set when the user signs in. Essential — sign-in doesn't work without it.
     2. Theme preference — `theme` localStorage entry written by next-themes
        so dark/light choice survives page reloads. Functional.

   Both are listed below in plain text so a privacy-conscious reader can see
   the full picture without having to inspect DevTools.
---------------------------------------------------------------------------- */

const LAST_UPDATED = "2026-05-12"
const PATH = "/legal/cookie-policy"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Политика cookies" : "Cookie policy",
    description:
      locale === "ru"
        ? "Какие cookies использует Botapolis (короткий ответ: почти никакие) и какие альтернативы мы выбрали."
        : "Which cookies Botapolis uses (short answer: barely any) and which alternatives we picked.",
    path:   PATH,
    locale,
  })
}

export default async function CookiePolicyPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",      path: `${localePrefix}/` },
    { name: locale === "ru" ? "Правовое" : "Legal",    path: `${localePrefix}${PATH}` },
    { name: locale === "ru" ? "Cookies" : "Cookies",   path: `${localePrefix}${PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <Hero
          eyebrow={locale === "ru" ? "Правовое" : "Legal"}
          title={locale === "ru" ? "Политика cookies" : "Cookie policy"}
          lede={
            locale === "ru"
              ? "Короткий ответ: мы используем минимум. Длинный ответ — ниже."
              : "Short answer: we set the bare minimum. Long answer below."
          }
          updated={LAST_UPDATED}
          locale={locale}
          localePrefix={localePrefix}
        />

        <Article locale={locale}>
          <h2>1. {locale === "ru" ? "Какие cookies мы ставим" : "Cookies we set"}</h2>
          <p>
            {locale === "ru"
              ? "Только функциональные. Никакой рекламной аналитики, никаких пиксельных тегов, никаких трекеров поведения для ретаргетинга."
              : "Functional only. No advertising trackers, no pixel tags, no behavioural cookies for retargeting."}
          </p>
          <table>
            <thead>
              <tr>
                <th>{locale === "ru" ? "Имя" : "Name"}</th>
                <th>{locale === "ru" ? "Назначение" : "Purpose"}</th>
                <th>{locale === "ru" ? "Срок" : "Lifetime"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sb-*-auth-token</code></td>
                <td>{locale === "ru" ? "Сессия Supabase Auth — без неё /dashboard и /saved не работают." : "Supabase Auth session — required for /dashboard and /saved to work."}</td>
                <td>{locale === "ru" ? "До выхода из аккаунта" : "Until sign-out"}</td>
              </tr>
              <tr>
                <td><code>theme</code></td>
                <td>{locale === "ru" ? "Запоминает выбор светлой/тёмной темы. Хранится в localStorage, технически не cookie, но указано для полноты." : "Remembers your light/dark mode choice. Stored in localStorage, technically not a cookie — listed for transparency."}</td>
                <td>{locale === "ru" ? "Постоянно (можно очистить в DevTools)" : "Persistent (clear via DevTools)"}</td>
              </tr>
            </tbody>
          </table>

          <h2>2. {locale === "ru" ? "Что мы НЕ ставим" : "What we don't set"}</h2>
          <ul>
            <li>{locale === "ru" ? "Никакой рекламной аналитики (Google Analytics, Facebook Pixel, и т.п.)." : "No advertising analytics (Google Analytics, Facebook Pixel, etc.)."}</li>
            <li>{locale === "ru" ? "Никаких трекеров поведения для ретаргетинга." : "No behavioural retargeting trackers."}</li>
            <li>{locale === "ru" ? "Никаких third-party iframe'ов которые могли бы ставить свои cookies." : "No third-party iframes that would set their own cookies."}</li>
          </ul>

          <h2>3. {locale === "ru" ? "Сторонние сервисы" : "Third-party services"}</h2>
          <p>
            {locale === "ru"
              ? "Веб-аналитика идёт через Plausible — он работает БЕЗ cookies (хеширует IP, не сохраняет). Событийная аналитика — PostHog: он использует localStorage + distinct_id cookie (можно отключить в браузере)."
              : "Web analytics run through Plausible — it is cookieless by design (hashes IP, doesn't persist). Event analytics use PostHog, which writes a distinct_id cookie + localStorage entry (disable via browser settings if you prefer)."}
          </p>
          <p>
            {locale === "ru"
              ? "Cloudflare Turnstile, если включён на форме, ставит временный токен, который удаляется после успешной проверки."
              : "Cloudflare Turnstile, when enabled on a form, sets a short-lived token that expires after verification."}
          </p>

          <h2>4. {locale === "ru" ? "Как очистить" : "How to clear them"}</h2>
          <p>
            {locale === "ru"
              ? "Любой современный браузер позволяет удалить cookies для конкретного сайта в Настройках → Конфиденциальность. На мобильных — Настройки браузера → Дополнительно → Очистить данные сайтов."
              : "Any modern browser lets you delete cookies for a specific site under Settings → Privacy. On mobile: Browser Settings → Advanced → Clear site data."}
          </p>

          <h2>5. {locale === "ru" ? "Связанные документы" : "Related"}</h2>
          <p className="text-[var(--text-tertiary)]">
            <Link href={`${localePrefix}/legal/privacy`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Политика конфиденциальности" : "Privacy policy"}
            </Link>
            {" · "}
            <Link href={`${localePrefix}/legal/terms`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Условия использования" : "Terms of service"}
            </Link>
            {" · "}
            <Link href={`${localePrefix}/methodology`} className="underline-offset-4 hover:underline">
              {locale === "ru" ? "Методология" : "Methodology"}
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
// Page chrome — inlined rather than abstracted, matching /legal/privacy.
// The three legal pages (privacy, cookies, disclaimer) deliberately share
// no helper module because their copy diverges everywhere except the hero
// gradient; the duplication makes legal review trivially readable.
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
                   [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:my-1
                   [&_table]:w-full [&_table]:border [&_table]:border-[var(--border-base)] [&_table]:rounded-xl [&_table]:overflow-hidden
                   [&_thead]:bg-[var(--bg-muted)] [&_thead]:text-[12px] [&_thead]:uppercase [&_thead]:tracking-[0.06em] [&_thead]:font-mono [&_thead]:text-[var(--text-tertiary)]
                   [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold
                   [&_td]:px-4 [&_td]:py-3 [&_td]:border-t [&_td]:border-[var(--border-subtle)] [&_td]:align-top
                   [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-[var(--bg-muted)] [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-[var(--text-primary)]"
      >
        {children}
      </article>
    </section>
  )
}
