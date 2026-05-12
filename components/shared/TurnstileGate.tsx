"use client"

import * as React from "react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <TurnstileGate>
   ----------------------------------------------------------------------------
   Thin wrapper around Cloudflare Turnstile that:
     - Renders nothing when no site key is set (dev / preview deployments
       without env wiring degrade to no-captcha, matching the server's
       conditional gate in /api/newsletter and /api/contact).
     - Surfaces the token to the parent via `onToken`; parent stuffs that
       into its form payload.
     - Resets after each form submission so the next attempt isn't blocked
       by a one-use token. Parent calls the `reset()` method via ref.

   Light theme stays — Turnstile's `appearance: 'interaction-only'` keeps
   the widget invisible unless a challenge is required, which matches our
   "honour system unless the user looks like a bot" policy.
---------------------------------------------------------------------------- */

export interface TurnstileGateHandle {
  reset(): void
}

interface TurnstileGateProps {
  /** Called whenever the widget hands us a fresh token. */
  onToken: (token: string) => void
  /** Called on widget error so the parent can fall back to a captcha-less
   *  submission (the server will reject anyway when a secret is configured;
   *  we surface so the UI can disable the submit button if it wants). */
  onError?: () => void
  /** Visual: hide the widget unless Cloudflare flags the visitor — the
   *  "managed" + "interaction-only" combo means most real users never see
   *  anything. */
  appearance?: "always" | "execute" | "interaction-only"
  className?: string
}

export const TurnstileGate = React.forwardRef<TurnstileGateHandle, TurnstileGateProps>(
  function TurnstileGate({ onToken, onError, appearance = "interaction-only", className }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const instanceRef = React.useRef<TurnstileInstance | null>(null)

    React.useImperativeHandle(ref, () => ({
      reset() {
        instanceRef.current?.reset()
      },
    }), [])

    // No key configured? Render nothing — server-side gate is also off.
    if (!siteKey) return null

    return (
      <div className={cn("flex justify-center", className)}>
        <Turnstile
          ref={instanceRef}
          siteKey={siteKey}
          onSuccess={onToken}
          onError={onError}
          onExpire={() => instanceRef.current?.reset()}
          options={{
            theme:      "auto",
            size:       "flexible",
            appearance,
            // Default "managed" challenges interactively; "non-interactive"
            // hides the widget more aggressively but blocks more real users.
            // Stick with managed — Cloudflare's heuristics already keep
            // visible challenges rare.
          }}
        />
      </div>
    )
  },
)
