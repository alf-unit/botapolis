/**
 * Botapolis · Proxy (formerly `middleware.ts` — renamed in Next.js 16)
 * ----------------------------------------------------------------------------
 * Responsibilities, in order:
 *   1. Detect locale from the URL    (/ru/* → "ru", otherwise → "en")
 *   2. Refresh the Supabase auth cookies via `updateSession`
 *   3. Gate `/dashboard` and `/saved` (sprint 5) — redirect anonymous users
 *      to `/login?next=<intended-path>` so they land where they were going
 *      after signing in
 *   4. Forward the resolved locale + path to downstream RSCs via headers
 *
 * Excluded by the matcher: `_next/*`, `/api/*`, `/go/*`, anything with a
 * file extension, and `favicon.ico`. Those paths either render no UI or have
 * their own auth/redirect flow (see app/go/[slug]/route.ts).
 *
 * Per the Next.js 16 docs: `proxy` runs on the Node.js runtime — the Edge
 * runtime is no longer supported for this file convention.
 */
import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export const LOCALES = ["en", "ru"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"

function resolveLocale(pathname: string): Locale {
  // First segment === "ru" → russian; everything else → english (default).
  // We don't redirect EN to "/en/…" — bare paths stay locale-clean for SEO.
  if (pathname === "/ru" || pathname.startsWith("/ru/")) return "ru"
  return DEFAULT_LOCALE
}

/**
 * Strip a leading `/ru` so we can match protected paths once instead of
 * once per locale. Locale-less `/dashboard` stays `/dashboard`, while
 * `/ru/dashboard` collapses to `/dashboard`.
 */
function stripLocale(pathname: string): string {
  if (pathname === "/ru") return "/"
  if (pathname.startsWith("/ru/")) return pathname.slice(3) || "/"
  return pathname
}

/** Paths that require an authenticated user (TZ § 10). */
const PROTECTED_PREFIXES = ["/dashboard", "/saved"] as const

function requiresAuth(localelessPath: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => localelessPath === p || localelessPath.startsWith(`${p}/`),
  )
}

/**
 * Supabase cookie sniff: do we have any reason to hit the auth refresh path?
 *
 * `updateSession()` makes a network round-trip to Supabase on every call —
 * cheap per-request but it adds up across bot traffic (Googlebot et al. do
 * not carry auth cookies). We skip the refresh for visitors who clearly
 * aren't logged in: no `sb-*-auth-token` cookie present.
 *
 * Auth-required paths still go through `updateSession` regardless so the
 * gate below sees an authoritative user (and so a signed-in user landing
 * on /dashboard via deep-link gets the proper refresh).
 */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-") && c.name.endsWith("-auth-token")) return true
  }
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = resolveLocale(pathname)
  const localeless = stripLocale(pathname)
  const needsAuth = requiresAuth(localeless)
  const maybeLoggedIn = hasSupabaseAuthCookie(request)

  // Fast path: anonymous visitor on a public page. Skip the Supabase
  // round-trip entirely — we only need locale + pathname headers downstream.
  // This is the cost-saver: bot traffic + first-time visitors are the bulk
  // of requests and they don't need an auth refresh.
  if (!needsAuth && !maybeLoggedIn) {
    const response = NextResponse.next({ request })
    response.headers.set("x-locale", locale)
    response.headers.set("x-pathname", pathname)
    return response
  }

  // Slow path: either the route requires auth, or the visitor has Supabase
  // cookies that may need rotating. Do the full refresh + auth gate.
  const { response, user } = await updateSession(request)

  // Make request context available to Server Components via headers.
  response.headers.set("x-locale", locale)
  response.headers.set("x-pathname", pathname)

  // ----- Auth gate ----------------------------------------------------------
  // Anonymous users hitting /dashboard or /saved get bounced to /login with
  // a `?next=` hint so we can return them to their destination after sign-in.
  // We preserve locale prefix on the redirect so RU users don't get an EN
  // login page; the `next` param keeps the original path intact.
  if (!user && needsAuth) {
    const loginPath = locale === "ru" ? "/ru/login" : "/login"
    const loginUrl = new URL(loginPath, request.url)
    // Preserve the original destination including any search params.
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Run on every path except: API, redirects, Next.js internals, and static files.
  matcher: [
    "/((?!api|go|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|map|woff|woff2|ttf|otf)$).*)",
  ],
}
