/**
 * Supabase · Browser client
 * ----------------------------------------------------------------------------
 * Use inside Client Components (`"use client"`) and event handlers.
 * Reads cookies set by the proxy/server, so auth state stays consistent.
 */
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
