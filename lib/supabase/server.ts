/**
 * Supabase · Server client
 * ----------------------------------------------------------------------------
 * Use inside Server Components, Server Actions, and Route Handlers.
 * `cookies()` from `next/headers` is async in Next.js 16 — always await it.
 *
 * Setting cookies from a Server Component will throw; the try/catch swallows
 * that case so this same factory works for both reads (RSC) and writes
 * (Server Actions / Route Handlers).
 */
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./types"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore when a proxy
            // (or Server Action) is refreshing the session for this request.
          }
        },
      },
    }
  )
}
