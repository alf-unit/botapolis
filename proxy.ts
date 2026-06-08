/**
 * Botapolis · Proxy (formerly `middleware.ts` — renamed in Next.js 16)
 * ----------------------------------------------------------------------------
 * Single responsibility after the [locale] migration: gate the authenticated
 * routes (`/dashboard`, `/saved`, and their locale-prefixed twins). Locale is
 * no longer detected here — it comes from the `[locale]` route param — so the
 * old `x-locale`/`x-pathname` header forwarding is gone, and the matcher is
 * narrowed to ONLY the protected paths.
 *
 * Why the narrow matcher matters: `updateSession()` makes a Supabase network
 * round-trip. Previously this proxy ran on (almost) every request, so bot
 * traffic + first-time visitors each paid that cost — the dominant Vercel
 * Fluid Active-CPU drain ("middleware-46m"). Scoping the matcher to the two
 * auth surfaces means the round-trip only happens for the handful of requests
 * that actually need an authenticated user.
 *
 * Per the Next.js 16 docs: `proxy` runs on the Node.js runtime — the Edge
 * runtime is no longer supported for this file convention.
 */
import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { i18n } from "@/lib/i18n/config"

/**
 * Strip a leading non-default locale segment so protected paths match once
 * instead of once per locale. `/ru/dashboard` → `/dashboard`, `/dashboard`
 * stays put. Derives locales from i18n config, so `es` etc. work for free.
 */
function stripLocale(pathname: string): string {
  for (const loc of i18n.locales) {
    if (loc === i18n.defaultLocale) continue
    if (pathname === `/${loc}`) return "/"
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1) || "/"
  }
  return pathname
}

/** First path segment if it's a non-default locale, else null. */
function localePrefix(pathname: string): string {
  for (const loc of i18n.locales) {
    if (loc === i18n.defaultLocale) continue
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) return `/${loc}`
  }
  return ""
}

/** Paths that require an authenticated user (TZ § 10). */
const PROTECTED_PREFIXES = ["/dashboard", "/saved"] as const

function requiresAuth(localelessPath: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => localelessPath === p || localelessPath.startsWith(`${p}/`),
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The matcher already scopes us to protected paths; this guard is a
  // belt-and-suspenders no-op for anything that slips through.
  if (!requiresAuth(stripLocale(pathname))) {
    return NextResponse.next({ request })
  }

  // Refresh Supabase auth cookies and read the authoritative user.
  const { response, user } = await updateSession(request)

  // Anonymous users hitting a protected path get bounced to /login with a
  // `?next=` hint so they return to their destination after sign-in. Preserve
  // the locale prefix so an RU visitor gets the RU login page.
  if (!user) {
    const loginUrl = new URL(`${localePrefix(pathname)}/login`, request.url)
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Scope to the authenticated surfaces only (bare EN + every non-default
  // locale prefix). Everything else skips the proxy entirely — no locale
  // detection, no Supabase round-trip.
  matcher: [
    "/dashboard/:path*",
    "/saved/:path*",
    "/(ru|es)/dashboard/:path*",
    "/(ru|es)/saved/:path*",
  ],
}
