/**
 * Supabase · Session refresh helper for the proxy layer
 * ----------------------------------------------------------------------------
 * Called from `proxy.ts` (Next.js 16 — formerly `middleware.ts`).
 *
 * Responsibility: refresh the Supabase auth cookies on every request so that
 * Server Components downstream always see a non-expired token. Also surfaces
 * the resolved user to the caller so the proxy can gate protected routes
 * (e.g. /dashboard, /saved) without a second round-trip.
 *
 * Critically, this helper:
 *  - Reads cookies from the incoming `NextRequest`
 *  - Writes refreshed cookies onto a new `NextResponse` that the proxy returns
 *  - Calls `supabase.auth.getUser()` to trigger the refresh (do not remove)
 */
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"

export interface SessionResult {
  /** Refreshed-cookie response the proxy must return downstream. */
  response: NextResponse
  /** Authenticated user, if any. `null` for guests / expired sessions. */
  user: User | null
}

export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: call between createServerClient and the response return.
  // Removing this call breaks the refresh flow — getUser() is what writes
  // the rotated cookies onto `supabaseResponse`. We also surface the user
  // back to the caller so auth gates can short-circuit without re-fetching.
  const { data: { user } } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
