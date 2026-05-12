import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/LoginForm"
import { buildMetadata } from "@/lib/seo/metadata"
import { createClient } from "@/lib/supabase/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"

/* ----------------------------------------------------------------------------
   /login — TZ § 10 (sprint 5)
   ----------------------------------------------------------------------------
   Server shell. Renders the `LoginForm` client island and short-circuits
   already-authenticated users to the dashboard so the back-button doesn't
   strand them on the login page after sign-in.

   Route group `(auth)` keeps it out of the marketing layout so the page is
   intentionally chrome-light — no Navbar / Footer noise during the actual
   sign-in moment. We surface a small wordmark link in the corner instead.
---------------------------------------------------------------------------- */

// `noIndex` from buildMetadata sets robots: noindex,nofollow — robots.txt
// already disallows /login but a meta-robots fallback is belt-and-suspenders.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru"
        ? "Вход в Botapolis"
        : "Sign in to Botapolis",
    description:
      locale === "ru"
        ? "Вход в личный кабинет Botapolis — сохранённые расчёты и активность."
        : "Sign in to your Botapolis account — saved calculations and activity.",
    path:    "/login",
    locale,
    noIndex: true,
  })
}

interface PageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  // Already signed in? Bounce straight to where they were headed.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { next } = await searchParams
    redirect(next && next.startsWith("/") ? next : "/dashboard")
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const strings = {
    eyebrow:    locale === "ru" ? "Личный кабинет" : "Account",
    headline:   locale === "ru" ? "Войти в Botapolis" : "Sign in to Botapolis",
    lede: locale === "ru"
      ? "Сохраняй расчёты, отслеживай активность, получай повышенные лимиты на AI-инструменты."
      : "Save your calculations, track activity, get higher rate-limits on the AI tools.",
    emailLabel: locale === "ru" ? "Email" : "Email",
    emailPlaceholder: "you@store.com",
    magicLinkCta:  locale === "ru" ? "Прислать magic link" : "Send magic link",
    magicLinkSent: locale === "ru" ? "Проверьте почту" : "Check your inbox",
    magicLinkSentSubtitle: locale === "ru"
      ? "Открой письмо и нажми на ссылку — мы залогиним тебя автоматически."
      : "Open the email and click the link — we'll log you in automatically.",
    googleCta: locale === "ru" ? "Войти через Google" : "Continue with Google",
    divider:   locale === "ru" ? "или" : "or",
    privacyNote: locale === "ru"
      ? "Создавая аккаунт, ты соглашаешься с"
      : "By signing in you agree to our",
    errors: {
      invalidEmail: locale === "ru"
        ? "Похоже, в email опечатка."
        : "That email looks off — double-check it.",
      sendFailed: locale === "ru"
        ? "Не удалось отправить ссылку. Попробуй ещё раз."
        : "Couldn't send the link. Try again in a moment.",
      googleFailed: locale === "ru"
        ? "Не получилось войти через Google."
        : "Couldn't connect to Google. Try the magic link instead.",
    },
  }

  return (
    <main className="relative min-h-svh flex flex-col">
      {/* Background glow — pulls the brand mint→violet duality onto the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-[640px] rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.30), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 size-[640px] rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.32), transparent 60%)",
        }}
      />

      {/* Lightweight top strip — single wordmark + back-to-site link */}
      <header className="relative container-default flex h-16 items-center justify-between">
        <Link
          href={`${localePrefix}/`}
          className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
        >
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full"
            style={{ background: "linear-gradient(135deg,#10B981,#8B5CF6)" }}
          />
          botapolis
        </Link>
        <Link
          href={`${localePrefix}/`}
          className="font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline-offset-4 hover:underline"
        >
          {locale === "ru" ? "← На главную" : "← Back to site"}
        </Link>
      </header>

      <section className="relative flex flex-1 items-center justify-center px-4 py-12">
        <LoginForm
          strings={strings}
          privacyHref={`${localePrefix}/legal/privacy`}
          termsHref={`${localePrefix}/legal/terms`}
        />
      </section>

      <footer className="relative container-default py-6 text-center font-mono text-[11px] text-[var(--text-tertiary)]">
        {dict.footer.copyright}
      </footer>
    </main>
  )
}
