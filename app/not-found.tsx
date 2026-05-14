import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowLeft,
  BookText,
  GitCompareArrows,
  Mail,
  Search,
  Star,
} from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buttonVariants } from "@/components/ui/button"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   404 · Page not found
   ----------------------------------------------------------------------------
   Wave 4 audit alignment (Botapolis design v.026 / mockups/edge-states.html
   section 01). Replaces Next.js's bare default 404 with a fully chromed
   page — same Navbar + Footer as the rest of the site, branded gradient
   "4·0·4" numerals, two CTAs, and a curated 4-link "try these instead"
   grid so a misclick doesn't dead-end the visitor.

   Server Component on purpose:
     - getLocale() reads the x-locale header proxy.ts set so the page
       renders in the right language without a client round-trip.
     - All anchor targets are static — no interactive state to manage.
     - Suggestion links bypass the affiliate `/go/` flow because none of
       them are partner CTAs; plain in-site navigation.

   Metadata: `noindex,nofollow` keeps Google from crawling 404 variants
   (it would anyway since the response is HTTP 404, but explicit beats
   implicit for this).
---------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title:       "404 — page not found",
  description: "The page you requested doesn't exist on Botapolis.",
  robots:      { index: false, follow: false },
}

export default async function NotFound() {
  const locale = await getLocale()
  const dict   = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const t = locale === "ru"
    ? {
        statusPill:  "404 · Не найдено",
        headline:    "Упс! Кажется, ты свернул не туда. Или мы.",
        lede:
          "Ссылка могла протухнуть, в URL — опечатка, или страница всё ещё дремлет в черновиках. Что точно живо — вот тут рядом. А ещё есть поиск по инструментам, обзорам и гайдам 👇",
        backHome:    "На главную",
        searchSite:  "Поиск по сайту",
        suggestions: "Попробуй вместо этого",
      }
    : {
        statusPill:  "404 · Not found",
        headline:    "Oops — looks like you took a wrong turn. Or we did.",
        lede:
          "The link might've gone stale, the URL might have a typo, or the page is still snoozing in drafts. What's actually live sits right below — plus there's a search across every tool, review, and guide 👇",
        backHome:    "Back to homepage",
        searchSite:  "Search the site",
        suggestions: "Try one of these instead",
      }

  // Curated "nearby" links — same four anchors the design mockup ships.
  // Hand-picked rather than auto-generated because a stable, predictable
  // 404 surface is more useful than a randomised list ("oh look, the same
  // 4 things every time" = the recovery affordance, not an annoyance).
  const suggestions = [
    {
      title:    locale === "ru" ? "Калькулятор Email ROI"   : "Email ROI Calculator",
      path:     `${localePrefix}/tools/email-roi-calculator`,
      pathLabel: "/tools/email-roi-calculator",
      Icon:     Mail,
    },
    {
      title:    "Klaviyo vs Mailchimp",
      path:     `${localePrefix}/compare/klaviyo-vs-mailchimp`,
      pathLabel: "/compare/klaviyo-vs-mailchimp",
      Icon:     GitCompareArrows,
    },
    {
      title:    locale === "ru" ? "Свежие глубокие обзоры"  : "Latest deep reviews",
      path:     `${localePrefix}/reviews`,
      pathLabel: "/reviews",
      Icon:     Star,
    },
    {
      title:    locale === "ru" ? "Гайды"                   : "Guides",
      path:     `${localePrefix}/guides`,
      pathLabel: "/guides",
      Icon:     BookText,
    },
  ]

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main className="relative overflow-hidden">
        {/* Atmospheric brand glows — same recipe as the hero on /, mint
            top-left and violet bottom-right, but desaturated for an
            "off-key" feel that signals "something is missing here". */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 size-[560px] rounded-full opacity-40 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-32 size-[560px] rounded-full opacity-35 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.16), transparent 60%)",
          }}
        />

        <div className="container-default relative flex flex-col items-center text-center py-16 lg:py-24">
          {/* Status pill — warning dot + mono uppercase label. Yellow dot
              hints "we noticed, this isn't a system failure" (vs danger
              red, which is reserved for /error.tsx). */}
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{
                background: "var(--warning)",
                boxShadow:
                  "0 0 0 4px color-mix(in oklch, var(--warning) 25%, transparent)",
              }}
            />
            {t.statusPill}
          </span>

          {/* Big mono "4·0·4" with the brand mint→violet gradient text. The
              middle-dots are deliberate — they break the number visually so
              it reads as a glyph, not a literal count. */}
          <div
            className="mt-6 font-mono font-medium leading-none tracking-[-0.06em] text-[96px] sm:text-[128px] lg:text-[160px]"
            style={{
              background: "var(--gradient-hero)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
            aria-hidden="true"
          >
            4·0·4
          </div>

          {/* `max-w` bumped from 24ch → 30ch on the headline so the
              two-sentence rewrite breaks at the period rather than
              mid-clause. Lede goes 50ch → 58ch for the same reason —
              new copy is ~30% longer than the prior one-liner. */}
          <h1 className="mt-6 text-h2 lg:text-h1 font-semibold tracking-[-0.03em] max-w-[30ch]">
            {t.headline}
          </h1>

          <p className="mt-4 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            {t.lede}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`${localePrefix}/`}
              className={cn(
                buttonVariants({ variant: "cta", size: "default" }),
                "h-11 px-5 text-[15px]",
              )}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>{t.backHome}</span>
            </Link>
            <Link
              href={`${localePrefix}/search`}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "h-11 px-5 text-[15px] border-[var(--border-base)]",
              )}
            >
              <Search className="size-4" aria-hidden="true" />
              <span>{t.searchSite}</span>
            </Link>
          </div>

          {/* Suggestions strip — divider matches the mockup's dashed rule
              so it reads as a recovery affordance rather than a section
              divider. */}
          <div className="mt-14 pt-8 border-t border-dashed border-[var(--border-base)] w-full max-w-[720px] text-left">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {t.suggestions}
            </p>
            <ul
              role="list"
              className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {suggestions.map(({ title, path, pathLabel, Icon }) => (
                <li key={path}>
                  <Link
                    href={path}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5",
                      "bg-[var(--bg-surface)] border border-[var(--border-base)]",
                      "transition-[transform,border-color,box-shadow] duration-150 ease-[var(--ease-out-expo)]",
                      "hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]",
                    )}
                  >
                    <span
                      className="inline-flex size-7 items-center justify-center rounded-md shrink-0"
                      style={{
                        background:
                          "color-mix(in oklch, var(--brand) 12%, transparent)",
                        color: "var(--brand)",
                      }}
                    >
                      <Icon className="size-[14px]" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[var(--text-primary)]">
                        {title}
                      </span>
                      <span className="block font-mono text-[11px] text-[var(--text-tertiary)] truncate">
                        {pathLabel}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
