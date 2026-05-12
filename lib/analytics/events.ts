"use client"

import { posthog } from "@/components/analytics/PostHogProvider"

/* ----------------------------------------------------------------------------
   Analytics events — single source of truth
   ----------------------------------------------------------------------------
   Every PostHog `.capture(name, props)` call routes through this module so:

     1. Event names are typed (no typos that silently shadow a real event).
     2. Properties per event are typed too — the funnel breaks loudly at
        compile time when we forget a required dimension.
     3. The transport is centralised — we can swap PostHog for something
        else (Mixpanel, a Supabase events table) by changing one file.

   Every event name is `snake_case`, past-tense for state changes, present-tense
   for actions. Properties stay flat (no nested objects) — PostHog's funnel
   builder is much faster against flat keys.

   When PostHog isn't initialised (missing env, SSR, preview env), every call
   becomes a no-op — `posthog.capture` is a safe shim until `posthog.init`
   has run on the client.
---------------------------------------------------------------------------- */

// ============================================================================
// Event names + property shapes
// ============================================================================
export type AnalyticsEventMap = {
  // ----- Tools (sprint 4 calculators) --------------------------------------
  /** First interaction with a calculator widget in a session. */
  tool_started: {
    tool_slug: "email-roi-calculator" | "ai-cost-comparator" | "product-description"
    locale:    "en" | "ru"
  }
  /** Calculator produced a result, OR the user clicked "Save" / "Copy". */
  tool_completed: {
    tool_slug: "email-roi-calculator" | "ai-cost-comparator" | "product-description"
    locale:    "en" | "ru"
    /** Optional payload size — calculator-specific. */
    payload?:  Record<string, string | number | boolean>
  }

  // ----- Affiliate funnel --------------------------------------------------
  /**
   * Fired BEFORE the browser navigates through /go/[slug]. Captures slug +
   * source page so we can attribute clicks to specific articles/widgets in
   * PostHog without parsing referers server-side.
   */
  affiliate_clicked: {
    tool_slug: string
    /** Article / widget where the click originated. */
    source:    string
    /** `?utm_campaign=…` passed to /go. Useful for cross-checking against
        Beehiiv / Plausible. */
    campaign?: string
    locale:    "en" | "ru"
  }

  // ----- Forms -------------------------------------------------------------
  newsletter_subscribed: {
    source: string
    locale: "en" | "ru"
  }
  contact_submitted: {
    locale:        "en" | "ru"
    has_subject:   boolean
    message_chars: number
  }
  sign_in_completed: {
    method: "magic_link" | "google"
    locale: "en" | "ru"
  }

  // ----- Editorial surfaces ------------------------------------------------
  comparison_viewed: {
    slug:    string
    tool_a:  string
    tool_b:  string
    locale:  "en" | "ru"
  }
  review_scrolled_50: {
    slug:    string
    locale:  "en" | "ru"
  }

  // ----- Search (placeholder until block D ships Pagefind) -----------------
  search_performed: {
    query_length: number
    result_count: number
    locale:       "en" | "ru"
  }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

// ============================================================================
// track()
// ----------------------------------------------------------------------------
// One typed call site. Strictly client-only — server modules should never
// import this file. If the runtime check ever fires, we've miswired a
// server component to a client analytics call.
// ============================================================================
export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (typeof window === "undefined") {
    // Defensive: should not happen because the file declares "use client".
    // We log instead of throwing so a stray server import doesn't crash
    // the page.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[analytics] track("${event}") called on the server — no-op`)
    }
    return
  }

  // posthog.capture is itself a no-op when posthog isn't initialised
  // (missing env, preview deployment with analytics off). No try/catch
  // needed — the SDK swallows internal errors so we never break the page.
  posthog.capture(event, properties)
}

/**
 * Identify a user after sign-in. Lets PostHog merge anonymous activity
 * (pre-login) with the authenticated user's identity for funnel analysis.
 *
 * Called from the auth callback / dashboard once we have the user row.
 * Pass the Supabase user ID — never the email.
 */
export function identify(userId: string, traits?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return
  posthog.identify(userId, traits)
}

/** Drop the identity on sign-out so a shared device doesn't bleed events. */
export function reset(): void {
  if (typeof window === "undefined") return
  posthog.reset()
}
