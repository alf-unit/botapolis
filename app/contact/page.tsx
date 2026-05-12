import type { Metadata } from "next"
import Link from "next/link"
import { Mail } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ContactForm } from "@/components/marketing/ContactForm"
import { buildMetadata } from "@/lib/seo/metadata"
import { generateBreadcrumbSchema } from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /contact — TZ § 16, block B
   ----------------------------------------------------------------------------
   Hybrid surface: explicit email link (always the fastest path for anyone
   who needs us today) + ContactForm client island writing into Supabase.
   The form intentionally does NOT have a Turnstile widget yet — block A
   removed the secret, block D will add the widget and re-enable the gate
   on both newsletter and contact in a single coordinated change.
---------------------------------------------------------------------------- */

const PATH = "/contact"
const CONTACT_EMAIL = "editorial@botapolis.com"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Связаться" : "Contact",
    description:
      locale === "ru"
        ? "Связаться с редакцией Botapolis: предложения по обзорам, корректировки, партнёрство."
        : "Reach the Botapolis editorial team: review suggestions, corrections, partnerships.",
    path:   PATH,
    locale,
  })
}

export default async function ContactPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",    path: `${localePrefix}/` },
    { name: locale === "ru" ? "Связаться" : "Contact", path: `${localePrefix}${PATH}` },
  ])

  const t =
    locale === "ru"
      ? {
          eyebrow:        "Связаться",
          title:          "Напиши нам",
          lede:           "Предложения по обзорам, корректировки фактов, партнёрство — на любую тему. Отвечаем в течение 1–2 рабочих дней.",
          emailLabel:     "Прямой email",
          emailHelper:    "Самый быстрый путь — особенно для срочных корректировок.",
          formHeading:    "Форма",
          formSubheading: "Или заполни форму, если так удобнее.",
          form: {
            nameLabel:        "Имя",
            emailLabel:       "Email",
            subjectLabel:     "Тема",
            messageLabel:     "Сообщение",
            submitCta:        "Отправить",
            submitLoading:    "Отправляем…",
            successTitle:     "Готово.",
            successBody:      "Получили. Ответим в течение 1–2 рабочих дней.",
            errorTitle:       "Не удалось отправить",
            errorRateLimited: "Слишком много попыток. Попробуй через час или напиши на email напрямую.",
            errorGeneric:     "Что-то сломалось. Попробуй ещё раз или используй email ниже.",
            fallbackTitle:    "Нужна помощь?",
            fallbackBody:     "Форма не отправляется — напиши на email напрямую, ответим так же быстро.",
            fallbackCta:      `Написать на ${CONTACT_EMAIL}`,
          },
        }
      : {
          eyebrow:        "Contact",
          title:          "Get in touch",
          lede:           "Review suggestions, fact corrections, partnerships, anything else — drop us a note. We respond within 1–2 business days.",
          emailLabel:     "Direct email",
          emailHelper:    "Fastest path — especially for urgent corrections.",
          formHeading:    "Form",
          formSubheading: "Or use the form if you'd rather.",
          form: {
            nameLabel:        "Name",
            emailLabel:       "Email",
            subjectLabel:     "Subject",
            messageLabel:     "Message",
            submitCta:        "Send message",
            submitLoading:    "Sending…",
            successTitle:     "Got it.",
            successBody:      "Message received. We'll respond within 1–2 business days.",
            errorTitle:       "Couldn't send",
            errorRateLimited: "Too many attempts. Try again in an hour or email directly.",
            errorGeneric:     "Something broke. Try again or use the email link below.",
            fallbackTitle:    "Need a hand?",
            fallbackBody:     "Form not going through — email us directly and we'll respond just as fast.",
            fallbackCta:      `Email ${CONTACT_EMAIL}`,
          },
        }

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* Hero — same gradient blob recipe as /legal/* and /methodology */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)" }}
          />

          <div className="container-default relative pt-10 pb-12 lg:pt-14 lg:pb-16">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
            >
              <Link href={`${localePrefix}/`} className="hover:text-[var(--text-secondary)]">
                {locale === "ru" ? "Главная" : "Home"}
              </Link>
              <span className="opacity-60">/</span>
              <span className="text-[var(--text-secondary)]">{t.eyebrow}</span>
            </nav>

            <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-3xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {t.lede}
            </p>
          </div>
        </section>

        {/* Body — two columns: email card (left, narrow) + form (right) */}
        <section className="container-default py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[320px_1fr] lg:gap-14">
            {/* Email card */}
            <aside className="lg:sticky lg:top-24 self-start">
              <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6 shadow-[var(--shadow-sm)]">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {t.emailLabel}
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-3 inline-flex items-center gap-2 text-[15px] font-medium text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  <span className="underline-offset-4 hover:underline">{CONTACT_EMAIL}</span>
                </a>
                <p className="mt-3 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
                  {t.emailHelper}
                </p>

                <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {locale === "ru" ? "См. также" : "Related"}
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-[13px] text-[var(--text-secondary)]">
                  <li>
                    <Link
                      href={`${localePrefix}/methodology`}
                      className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline"
                    >
                      {locale === "ru" ? "Методология" : "Methodology"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/legal/affiliate-disclosure`}
                      className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline"
                    >
                      {locale === "ru" ? "Партнёрский disclosure" : "Affiliate disclosure"}
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Form */}
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {t.formHeading}
              </p>
              <h2 className="mt-2 text-h3 font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                {t.formSubheading}
              </h2>
              <div className="mt-6">
                <ContactForm
                  strings={t.form}
                  contactEmail={CONTACT_EMAIL}
                  language={locale}
                />
              </div>
            </div>
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}${PATH}`)} />
    </>
  )
}
