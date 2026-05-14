"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, RotateCcw } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   500 · Server error
   ----------------------------------------------------------------------------
   Wave 4 audit alignment (Botapolis design v.026 / mockups/edge-states.html
   section 02). App Router error boundary: any uncaught error inside the
   root segment renders this page instead of Next's default white-screen
   fallback.

   Constraints baked into Next.js for error.tsx:
     - MUST be a Client Component ("use client") — Next requires the
       `reset()` callback to be wired client-side.
     - Inherits the root layout (no <html>/<body> here; that's reserved
       for `global-error.tsx` which we deliberately don't ship since the
       root layout is trivially short).
     - Has access to `error` (Error with optional `digest`) and `reset`
       (re-renders the segment in place — recovery for transient errors).

   Locale: usePathname() over a server context here because the route is
   client-only. `/ru/*` paths render the page in Russian.

   Navbar is rendered here too so the visitor doesn't lose orientation —
   they can still navigate away. Footer is intentionally OMITTED:
     (a) error pages should be lean — fewer dependencies = fewer surfaces
         that could re-throw inside the error boundary
     (b) Footer is a Server Component and importing it into a Client
         Component module would require Next to render-prop-pass it down,
         which is over-engineering for a page where the page-action is
         the only thing that matters
---------------------------------------------------------------------------- */

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// Minimal Navbar strings reused across the error page. We can't reach
// the server-side dictionary loader here, so a small inline dictionary
// per language is good enough — Navbar's prop type names them explicitly.
const NAV_STRINGS = {
  en: {
    tools: "Tools",
    compare: "Compare",
    reviews: "Reviews",
    guides: "Guides",
    directory: "Directory",
    search: "Search",
    subscribe: "Subscribe",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    switchLanguage: "Switch language",
  },
  ru: {
    tools: "Инструменты",
    compare: "Сравнения",
    reviews: "Обзоры",
    guides: "Гайды",
    directory: "Каталог",
    search: "Поиск",
    subscribe: "Подписаться",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    toggleTheme: "Сменить тему",
    switchLanguage: "Сменить язык",
  },
} as const

export default function GlobalError({ error, reset }: ErrorProps) {
  const pathname = usePathname()
  const locale: "en" | "ru" = pathname?.startsWith("/ru") ? "ru" : "en"
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  // Surface the error in the browser console (and any client-side error
  // monitor that hooks `window.onerror` / `console.error`) so we can dig in
  // post-mortem. `error.digest` is Next's stable hash of the server-side
  // stack — useful in correlations even though we don't ship a status page
  // backend yet.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[error.tsx] route error:", error)
    }
  }, [error])

  const t = locale === "ru"
    ? {
        statusPill:    "500 · Ошибка сервера",
        headline:      "Что-то с нашей стороны не отвечает.",
        lede:
          "Мы уже знаем — лог упал на сервер. Попробуй ещё раз через минуту; если не помогло, вернись на главную.",
        retry:         "Повторить",
        backHome:      "На главную",
        referenceLabel: "Reference ID",
      }
    : {
        statusPill:    "500 · Server error",
        headline:      "Something on our end isn't responding.",
        lede:
          "Our team has been pinged. If this keeps happening, try again in a minute or head back to the homepage.",
        retry:         "Retry",
        backHome:      "Back to homepage",
        referenceLabel: "Reference ID",
      }

  return (
    <>
      <Navbar strings={NAV_STRINGS[locale]} localePrefix={localePrefix} />

      <main className="relative overflow-hidden">
        {/* Red→amber glow to underline "something is broken" — distinct
            from the mint+violet 404 palette. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 size-[560px] rounded-full opacity-35 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(239,68,68,0.16), transparent 60%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-32 size-[560px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.16), transparent 60%)",
          }}
        />

        <div className="container-default relative flex flex-col items-center text-center py-16 lg:py-24">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--danger)]">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{
                background: "var(--danger)",
                boxShadow:
                  "0 0 0 4px color-mix(in oklch, var(--danger) 25%, transparent)",
              }}
            />
            {t.statusPill}
          </span>

          {/* Red→amber gradient text — semantically aligned with the
              danger pill above. Same glyph treatment as the 404 page so
              the two error states feel like siblings. */}
          <div
            className="mt-6 font-mono font-medium leading-none tracking-[-0.06em] text-[96px] sm:text-[128px] lg:text-[160px]"
            style={{
              background:
                "linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
            aria-hidden="true"
          >
            5·0·0
          </div>

          <h1 className="mt-6 text-h2 lg:text-h1 font-semibold tracking-[-0.03em] max-w-[26ch]">
            {t.headline}
          </h1>

          <p className="mt-4 max-w-[50ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            {t.lede}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className={cn(
                buttonVariants({ variant: "cta", size: "default" }),
                "h-11 px-5 text-[15px]",
              )}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>{t.retry}</span>
            </button>
            <Link
              href={`${localePrefix}/`}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "h-11 px-5 text-[15px] border-[var(--border-base)]",
              )}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>{t.backHome}</span>
            </Link>
          </div>

          {/* Reference ID — Next-supplied digest of the server-side error
              stack. Surfaces it so visitors who DM us about an error can
              quote a stable identifier we can correlate with logs. */}
          {error.digest && (
            <p className="mt-12 pt-6 border-t border-dashed border-[var(--border-base)] w-full max-w-[480px] font-mono text-[11px] text-[var(--text-tertiary)]">
              <span className="uppercase tracking-[0.08em]">
                {t.referenceLabel}:
              </span>{" "}
              <span className="text-[var(--text-secondary)]">
                {error.digest}
              </span>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
