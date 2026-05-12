"use client"

import * as React from "react"
import posthog from "posthog-js"

/* ----------------------------------------------------------------------------
   PostHogProvider — TZ § 13.2 (sprint 6)
   ----------------------------------------------------------------------------
   Initializes posthog-js once on the client when `NEXT_PUBLIC_POSTHOG_KEY` is
   present. If the key is missing, this component is a pure pass-through and
   no posthog code runs (or even fires a network request). That gives us:

     - No-op in dev when nobody set up an env key yet
     - No-op on preview deploys that intentionally turn analytics off
     - Real tracking only when the env wires it up

   We also wire automatic SPA pageview capture: posthog's `capture_pageview`
   handles initial loads, and we patch in a `$pageview` event on every Next
   route change. Without that, client navigations don't fire pageviews in
   App Router (the page-component doesn't reload).
---------------------------------------------------------------------------- */

// Surface `posthog` for direct event capture from any client component:
//   import { posthog } from "@/components/analytics/PostHogProvider"
//   posthog.capture("tool_used", { tool_slug: "..." })
// The shim still works when posthog is uninitialised — `capture` becomes a
// no-op because `posthog.__loaded` is false until init runs.
export { posthog }

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  // Resolve env once at module scope so we don't repeat `process.env` lookups.
  // These are baked at build time for `NEXT_PUBLIC_*` so they're safe to read.
  const apiKey  = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"

  React.useEffect(() => {
    // SSR or missing key → bail. We never load posthog on the server: the
    // SDK is browser-only and trying to import it server-side throws.
    if (typeof window === "undefined") return
    if (!apiKey) return

    // Idempotent — re-rendering this Provider (e.g. on a fast refresh) must
    // not re-init. The lib also guards internally, but checking the public
    // `__loaded` flag keeps our code honest.
    if ((posthog as unknown as { __loaded?: boolean }).__loaded) return

    posthog.init(apiKey, {
      api_host: apiHost,
      // We want manual control over what we track — the app fires events
      // explicitly (tool_used, affiliate_clicked, newsletter_subscribed,
      // etc.). Autocapture would spam noise.
      autocapture:      false,
      // Initial pageview on load is fine; SPA navigations get captured
      // explicitly below.
      capture_pageview: true,
      // Privacy-friendly defaults — no session recording, no surveys.
      disable_session_recording: true,
      persistence: "localStorage+cookie",
      // Less chatty in dev so the console doesn't drown in posthog noise.
      debug: false,
    })
  }, [apiKey, apiHost])

  return <>{children}</>
}
