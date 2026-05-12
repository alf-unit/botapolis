/**
 * GET /auth/callback — Supabase Auth handoff
 * ----------------------------------------------------------------------------
 * Both magic-link emails and the Google OAuth round-trip land here with a
 * `?code=…` query param. We exchange the code for a session (which writes
 * fresh auth cookies via the SSR cookie adapter) and then redirect the user
 * to wherever they were originally headed.
 *
 * `next` is supplied by LoginForm when the proxy gate bounced the user from
 * a protected route; we only honor it when it's a same-origin path so an
 * open-redirect bug can't sneak in via a crafted email link.
 *
 * Path note: route groups (the `(auth)` folder) don't add URL segments, so
 * placing this file under `(auth)/auth/callback/` resolves to `/auth/callback`
 * — the canonical Supabase callback path that TZ-2 § 10 and robots.ts both
 * already assume.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Open-redirect guard — `next` must be a same-origin absolute path. */
function safeNext(next: string | null): string {
  if (!next) return "/dashboard"
  // Reject schemes, protocol-relative URLs, and anything that escapes the site.
  if (!next.startsWith("/")) return "/dashboard"
  if (next.startsWith("//")) return "/dashboard"
  return next
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const next = safeNext(url.searchParams.get("next"))

  // Supabase surfaces auth errors via these params when the user denies the
  // OAuth consent screen or the magic link has already been used.
  const error = url.searchParams.get("error")
  if (error) {
    const errParams = new URLSearchParams({
      error: url.searchParams.get("error_description") ?? error,
    })
    return NextResponse.redirect(new URL(`/login?${errParams.toString()}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error("[/auth/callback] exchange failed:", exchangeError.message)
    return NextResponse.redirect(
      new URL(`/login?error=exchange_failed`, req.url),
    )
  }

  // Successful sign-in — bounce to the original destination (or /dashboard).
  return NextResponse.redirect(new URL(next, req.url))
}
