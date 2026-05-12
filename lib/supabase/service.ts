import "server-only"
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types"

/**
 * Supabase · Service-role client (bypasses RLS).
 * ----------------------------------------------------------------------------
 * Use this for server-side writes that aren't on behalf of an authenticated
 * user — affiliate click logging, newsletter mirroring, sitemap reads,
 * webhook handlers.
 *
 * NEVER ship this client to a browser. The `server-only` import will refuse
 * to compile if anyone tries.
 */
let cached: SupabaseClient<Database> | null = null

export function createServiceClient(): SupabaseClient<Database> {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    )
  }
  cached = createJsClient<Database>(url, serviceKey, {
    auth: {
      // Service role doesn't need session persistence — we use it stateless.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return cached
}
