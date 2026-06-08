import "server-only"

import { cache } from "react"

import { i18n, type Locale } from "./config"

/* ----------------------------------------------------------------------------
   Request-scoped locale holder (ISR-safe locale resolution)
   ----------------------------------------------------------------------------
   Why this exists: the `/ru/*` route tree is a set of thin mirrors that
   re-use the EN page implementation. Previously the shared code learned its
   locale by reading the `x-locale` header (`getLocale()` → `headers()`).
   Calling `headers()` during render is a Next.js *Dynamic API* — it opts the
   whole route into dynamic rendering, which silently disabled ISR across the
   ENTIRE site (every page re-rendered per request, hammering Supabase and
   blowing the Vercel Fluid Active-CPU budget).

   The fix: stop reading the request. Each RU route wrapper pins its locale
   explicitly via `withLocale("ru", …)` BEFORE the shared implementation runs.
   EN routes never pin, so they fall back to the default. No Dynamic API is
   touched, so pages render statically and ISR/`revalidatePath` work again.

   How it stays request-isolated: React `cache()` returns the SAME object for
   the duration of a single render pass / request and a FRESH one for the
   next. Writing to that object in a route wrapper is therefore visible to
   `getLocale()` downstream within the same render, and never leaks across
   concurrent EN/RU renders (build-time static generation included).

   Reading or writing a `cache()`-returned object is NOT a Dynamic API, so it
   does not force dynamic rendering — that's the whole point.
---------------------------------------------------------------------------- */

const localeHolder = cache(() => ({ current: i18n.defaultLocale as Locale }))

/** Pin the active locale for the current render/request. */
export function setLocale(locale: Locale): void {
  localeHolder().current = locale
}

/** Read the locale pinned for the current render/request (default: EN). */
export function readLocale(): Locale {
  return localeHolder().current
}

/**
 * Pin the locale for a `generateMetadata` render straight from the route
 * params, then return it.
 *
 * Why metadata needs this when the page body doesn't: the `[locale]` layout
 * calls `setLocale` before its children render, so page components resolve
 * `getLocale()` correctly. But `generateMetadata` is NOT guaranteed to run
 * after the layout body — Next resolves metadata in its own pass — so each
 * one must pin its own locale from the authoritative source it IS handed:
 * `params`. The param type is loose (`locale?`) so a dynamic route's
 * `Promise<{ slug }>` params object satisfies it too (extra/optional props),
 * letting both static and `[slug]` pages call this without a type dance.
 */
export async function pinLocale(
  params: Promise<Record<string, string | undefined>>,
): Promise<Locale> {
  const { locale } = await params
  const safe = (
    i18n.locales.includes(locale as Locale) ? locale : i18n.defaultLocale
  ) as Locale
  setLocale(safe)
  return safe
}

/**
 * Wrap a route export (the default page component or `generateMetadata`) so
 * it pins `locale` for this render before delegating to the shared EN
 * implementation. Works for sync and async exports alike — the args and
 * return value pass straight through.
 */
export function withLocale<A extends unknown[], R>(
  locale: Locale,
  fn: (...args: A) => R,
): (...args: A) => R {
  return (...args: A): R => {
    setLocale(locale)
    return fn(...args)
  }
}
