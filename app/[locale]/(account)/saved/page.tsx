import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { ArrowUpRight, Bookmark } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buildMetadata } from "@/lib/seo/metadata"
import { createClient } from "@/lib/supabase/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { cn, formatPrice, formatNumber } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { SavedCalculationRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /saved — TZ § 10 + § 4.5 (sprint 5)
   ----------------------------------------------------------------------------
   Lists the current user's saved calculations from `saved_calculations`.
   RLS already restricts the SELECT to `user_id = auth.uid()`, so we use the
   cookie-aware server client (not service role) and the database does the
   filtering for us — defence in depth.

   Schema lives in supabase/migrations/001_initial_schema.sql; the table was
   provisioned in sprint 1 along with its owner-only RLS policies. We don't
   need a new 003_* migration for it.
---------------------------------------------------------------------------- */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Сохранённые расчёты" : "Saved calculations",
    description: locale === "ru"
      ? "Все твои сохранённые расчёты в Botapolis."
      : "All your saved Botapolis calculations.",
    path:        "/saved",
    locale,
    noIndex:     true,
  })
}

export default async function SavedCalculationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/saved")

  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // RLS scopes this to the current user automatically — no `.eq("user_id", …)`
  // needed, but we still apply it defensively so the intent is obvious in
  // code review and we don't rely on a single config-time guarantee.
  const { data: rows, error } = await supabase
    .from("saved_calculations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[/saved] fetch failed:", error.message)
  }

  const t = {
    breadcrumbHome: locale === "ru" ? "Главная" : "Home",
    breadcrumbDash: locale === "ru" ? "Личный кабинет" : "Dashboard",
    eyebrow:        locale === "ru" ? "Сохранённое" : "Saved",
    headline:       locale === "ru" ? "Твои расчёты"  : "Your saved calculations",
    lede: locale === "ru"
      ? "Каждый сохранённый прогон с входными данными и результатом — открой и продолжи откуда остановился."
      : "Every run you saved, with inputs and results — open one to pick up where you left off.",
    countLabel:    locale === "ru" ? "сохранено"      : "saved",
    emptyTitle:    locale === "ru" ? "Пока пусто."     : "Nothing here yet.",
    emptySubtitle: locale === "ru"
      ? "Открой калькулятор Email ROI и нажми «Save calculation» — он окажется здесь."
      : "Open the Email ROI calculator and hit Save calculation — it'll show up here.",
    emptyCta:      locale === "ru" ? "Открыть калькулятор →" : "Open calculator →",
    open:          locale === "ru" ? "Открыть"        : "Open",
    inputs:        locale === "ru" ? "Входные данные" : "Inputs",
  }

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} user={{ email: user.email ?? "" }} />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
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
              <Link
                href={`${localePrefix}/dashboard`}
                className="hover:text-[var(--text-secondary)]"
              >
                {t.breadcrumbDash}
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

            <p className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)]">
              <span className="size-1.5 rounded-full bg-[var(--brand)]" />
              {rows?.length ?? 0} {t.countLabel}
            </p>
          </div>
        </section>

        <section className="container-default py-10 lg:py-14">
          {!rows || rows.length === 0 ? (
            <EmptyState
              title={t.emptyTitle}
              subtitle={t.emptySubtitle}
              cta={{
                label: t.emptyCta,
                href:  `${localePrefix}/tools/email-roi-calculator`,
              }}
            />
          ) : (
            <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => (
                <li key={row.id}>
                  <SavedCard
                    row={row}
                    locale={locale}
                    localePrefix={localePrefix}
                    openLabel={t.open}
                    inputsLabel={t.inputs}
                  />
                </li>
              ))}
            </ul>
          )}
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
    </>
  )
}

// ============================================================================
// Card — one row per saved calculation
// ----------------------------------------------------------------------------
// `inputs` and `results` are jsonb, so we render conservatively — pick the
// fields we recognise (Email ROI today) and fall back to a small summary
// strip for unknown tool slugs. New widgets can teach this card their own
// preview by adding a branch below.
// ============================================================================
function SavedCard({
  row,
  locale,
  localePrefix,
  openLabel,
  inputsLabel,
}: {
  row: SavedCalculationRow
  locale: "en" | "ru"
  localePrefix: "" | "/ru"
  openLabel: string
  inputsLabel: string
}) {
  const createdAt = new Date(row.created_at).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  )

  const summary = describeRow(row, locale)
  const openHref = `${localePrefix}/tools/${row.tool_slug}`

  return (
    <article
      className={cn(
        "group h-full flex flex-col gap-4 rounded-2xl border border-[var(--border-base)]",
        "bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-expo)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2.5 text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--text-secondary)]">
          <Bookmark className="size-3" />
          {row.tool_slug}
        </span>
        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
          {createdAt}
        </span>
      </div>

      <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)]">
        {row.name ?? summary.headline}
      </h3>

      {summary.result && (
        <p className="font-mono text-[24px] tabular-nums text-[var(--text-primary)]">
          {summary.result}
        </p>
      )}

      {summary.inputs.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 text-[12px] mt-auto">
          {summary.inputs.map((it) => (
            <div key={it.label}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {it.label}
              </dt>
              <dd className="mt-0.5 font-mono text-[13px] text-[var(--text-primary)]">
                {it.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {summary.inputs.length === 0 && (
        <p className="text-[12px] text-[var(--text-tertiary)] mt-auto">
          {inputsLabel}: <span className="font-mono">{JSON.stringify(row.inputs).slice(0, 120)}</span>
        </p>
      )}

      <Link
        href={openHref}
        className={cn(
          "inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand)]",
          "transition-transform duration-200 group-hover:translate-x-0.5 self-start",
        )}
      >
        {openLabel}
        <ArrowUpRight className="size-3.5" strokeWidth={2} />
      </Link>
    </article>
  )
}

// ============================================================================
// describeRow — known tool slugs get a tailored preview; everything else
// falls back to a generic "first 3 input keys" strip.
// ============================================================================
interface RowSummary {
  headline: string
  result:   string | null
  inputs:   Array<{ label: string; value: string }>
}

function describeRow(row: SavedCalculationRow, locale: "en" | "ru"): RowSummary {
  const fmtNum = (v: unknown) =>
    typeof v === "number"
      ? formatNumber(v, { locale, maximumFractionDigits: 1 })
      : ""

  switch (row.tool_slug) {
    case "email-roi-calculator": {
      const inputs = (row.inputs ?? {}) as Record<string, unknown>
      const results = (row.results ?? {}) as Record<string, unknown>
      const monthlyRevenue = typeof results.monthlyRevenue === "number"
        ? formatPrice(results.monthlyRevenue, { locale, maximumFractionDigits: 0 })
        : null
      return {
        headline: locale === "ru" ? "Email ROI · прогон" : "Email ROI · run",
        result:   monthlyRevenue ? `${monthlyRevenue}/mo` : null,
        inputs: [
          { label: locale === "ru" ? "Подписчики" : "Subscribers", value: fmtNum(inputs.subscribers) },
          { label: locale === "ru" ? "Open rate" : "Open rate",   value: `${fmtNum(inputs.openRate)}%` },
          { label: locale === "ru" ? "CTR"        : "CTR",         value: `${fmtNum(inputs.clickRate)}%` },
          { label: locale === "ru" ? "AOV"        : "AOV",
            value: typeof inputs.aov === "number"
              ? formatPrice(inputs.aov, { locale, maximumFractionDigits: 0 })
              : "",
          },
        ].filter((it) => it.value.trim() !== ""),
      }
    }
    default: {
      const inputs = (row.inputs ?? {}) as Record<string, unknown>
      const keys = Object.keys(inputs).slice(0, 4)
      return {
        headline: row.tool_slug,
        result:   null,
        inputs: keys.map((k) => ({
          label: k,
          value: String(inputs[k] ?? "—").slice(0, 32),
        })),
      }
    }
  }
}

function EmptyState({
  title,
  subtitle,
  cta,
}: {
  title: string
  subtitle: string
  cta: { label: string; href: string }
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-16 text-center">
      <p className="text-[17px] font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 max-w-md mx-auto text-[14px] leading-[1.55] text-[var(--text-secondary)]">
        {subtitle}
      </p>
      <Link
        href={cta.href}
        className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--brand)] underline-offset-4 hover:underline"
      >
        {cta.label}
      </Link>
    </div>
  )
}
