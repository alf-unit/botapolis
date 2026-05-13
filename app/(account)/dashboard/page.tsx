import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { ArrowUpRight, Bookmark, Clock } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buildMetadata } from "@/lib/seo/metadata"
import { createClient } from "@/lib/supabase/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/* ----------------------------------------------------------------------------
   /dashboard — TZ § 10 (sprint 5)
   ----------------------------------------------------------------------------
   The proxy already gates this route — anon users get bounced to /login.
   We still call `getUser()` here as a belt-and-suspenders check so an
   accidental misconfiguration of the proxy matcher can't leak the page.

   Layout: identity card (email + member-since), then two stub sections
   ("Saved calculations", "Recent activity"). Sprint 6+ fills the stubs;
   for now they document what's coming.
---------------------------------------------------------------------------- */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Личный кабинет"   : "Dashboard",
    description: locale === "ru"
      ? "Личный кабинет Botapolis — сохранённые расчёты и активность."
      : "Your Botapolis dashboard — saved calculations and activity.",
    path:        "/dashboard",
    locale,
    noIndex:     true,
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/dashboard")

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // Date formatting is locale-aware and runs server-side so there's no
  // hydration mismatch from time-zone drift between server and client.
  const memberSince = new Date(user.created_at).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  )

  const t = {
    breadcrumbHome: locale === "ru" ? "Главная" : "Home",
    eyebrow:        locale === "ru" ? "Личный кабинет" : "Dashboard",
    headline: locale === "ru"
      ? `Привет${user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.`
      : `Welcome back${user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.`,
    lede: locale === "ru"
      ? "Здесь твои сохранённые расчёты, активность и настройки."
      : "Saved calculations, recent activity, and account settings live here.",
    memberSinceLabel: locale === "ru" ? "С нами с" : "Member since",
    emailLabel:       locale === "ru" ? "Email"    : "Email",
    saved: {
      title: locale === "ru" ? "Сохранённые расчёты" : "Saved calculations",
      empty: locale === "ru"
        ? "Пока пусто. Сохрани первый расчёт прямо из калькулятора Email ROI."
        : "Nothing saved yet. Save your first run straight from the Email ROI calculator.",
      viewAll: locale === "ru" ? "Открыть все →" : "View all →",
      openEmail: locale === "ru" ? "Открыть калькулятор →" : "Open calculator →",
    },
    activity: {
      title: locale === "ru" ? "Активность"     : "Recent activity",
      empty: locale === "ru"
        ? "Активность появится здесь, как только ты сохранишь расчёт или поставишь лайк статье."
        : "Activity shows up here once you save a calculation or like an article.",
    },
  }

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} user={{ email: user.email ?? "" }} />

      <main>
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
              <span className="text-[var(--text-secondary)]">{t.eyebrow}</span>
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

            {/* Identity card */}
            <div className="mt-8 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <Avatar email={user.email ?? "?"} />
              <dl className="grid gap-1 text-[14px]">
                <div className="flex items-baseline gap-2">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] w-28 shrink-0">
                    {t.emailLabel}
                  </dt>
                  <dd className="font-mono text-[var(--text-primary)] break-all">
                    {user.email ?? "—"}
                  </dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] w-28 shrink-0">
                    {t.memberSinceLabel}
                  </dt>
                  <dd className="text-[var(--text-primary)]">{memberSince}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Saved calculations — stub */}
        <Section title={t.saved.title} eyebrow="01" icon={<Bookmark className="size-3.5" />}>
          <EmptyStub
            message={t.saved.empty}
            primary={{
              label: t.saved.openEmail,
              href:  `${localePrefix}/tools/email-roi-calculator`,
            }}
            secondary={{
              label: t.saved.viewAll,
              href:  `${localePrefix}/saved`,
            }}
          />
        </Section>

        {/* Recent activity — stub */}
        <Section title={t.activity.title} eyebrow="02" icon={<Clock className="size-3.5" />}>
          <EmptyStub message={t.activity.empty} />
        </Section>
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
    </>
  )
}

// ============================================================================
// Building blocks
// ============================================================================
function Section({
  title,
  eyebrow,
  icon,
  children,
}: {
  title: string
  eyebrow?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="container-default py-10 lg:py-14 border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        {eyebrow && (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
            {icon}
            {eyebrow}
          </span>
        )}
        <h2 className="text-h2 font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function EmptyStub({
  message,
  primary,
  secondary,
}: {
  message: string
  primary?:   { label: string; href: string }
  secondary?: { label: string; href: string }
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-12 text-center">
      <p className="text-[15px] leading-[1.6] text-[var(--text-secondary)] max-w-xl mx-auto">
        {message}
      </p>
      {(primary || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {primary && (
            <Link
              href={primary.href}
              className={cn(
                buttonVariants({ variant: "cta", size: "sm" }),
                "h-10 text-[13px]",
              )}
            >
              {primary.label}
              <ArrowUpRight className="size-3.5" />
            </Link>
          )}
          {secondary && (
            <Link
              href={secondary.href}
              className="text-[13px] font-medium text-[var(--brand)] underline-offset-4 hover:underline"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Initial-letter avatar — matches <ToolLogo>'s fallback so the design
 * language stays consistent across the site.
 */
function Avatar({ email }: { email: string }) {
  const initial = (email.trim().charAt(0) || "?").toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-14 items-center justify-center rounded-2xl border border-[var(--border-base)] overflow-hidden text-[22px] font-semibold tracking-[-0.04em]"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--brand) 22%, transparent), color-mix(in oklch, var(--violet-500) 22%, transparent))",
        color: "var(--text-primary)",
      }}
    >
      {initial}
    </span>
  )
}
