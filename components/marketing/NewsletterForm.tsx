"use client"

import * as React from "react"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics/events"
import { TurnstileGate, type TurnstileGateHandle } from "@/components/shared/TurnstileGate"

/* ----------------------------------------------------------------------------
   NewsletterForm — TZ § 12 (May 2026 audit replacement)
   ----------------------------------------------------------------------------
   Before this component existed, the homepage and Footer rendered raw
   `<form action="/api/newsletter" method="post">` tags. The API ONLY
   accepts JSON (it calls `await req.json()`), so every form submission
   from the actual UI returned 400 and zero subscribers were ever recorded.
   This client island replaces both, doing a proper `fetch` with JSON.

   Visual: kept neutral and prop-driven so callers (hero card / footer
   strip) supply their own container layout. The form itself is just
   email-input + submit, with loading/success/error states routed through
   Sonner toasts so the UI stays calm.

   Source attribution: each call-site passes a unique `source` string
   ("homepage_hero" / "footer") so the analytics mirror in Supabase can
   tell us which surface converts.
---------------------------------------------------------------------------- */

export interface NewsletterFormStrings {
  placeholder: string
  cta: string
  ctaLoading: string
  ctaSubscribed: string
  successTitle: string
  successDescription: string
  errorTitle: string
  errorInvalid: string
  errorRateLimited: string
}

interface NewsletterFormProps {
  strings: NewsletterFormStrings
  /** Analytics label — e.g. "homepage_hero", "footer", "post_cta". */
  source: string
  /** Locale forwarded to the API for subscriber-level segmentation. */
  language?: "en" | "ru"
  className?: string
  /** Override the input/button styling at the call site. */
  inputClassName?: string
  buttonClassName?: string
}

// Cheap RFC-ish guard for the user-typed value. Real validation runs on the
// server (zod email schema in /api/newsletter); this is just to keep us
// from firing a request the API will obviously reject.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterForm({
  strings,
  source,
  language = "en",
  className,
  inputClassName,
  buttonClassName,
}: NewsletterFormProps) {
  const [email, setEmail] = React.useState("")
  const [status, setStatus] =
    React.useState<"idle" | "loading" | "success">("idle")
  // Block D — Turnstile token. Stays in state because the widget hands it
  // over asynchronously, and the form needs it at submit time.
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null)
  const turnstileRef = React.useRef<TurnstileGateHandle | null>(null)
  // When the site key is unset (dev / preview), TurnstileGate renders null
  // and we never receive a token — the server-side check is also gated on
  // the secret being present, so the submission still succeeds.
  const turnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "loading" || status === "success") return

    const cleaned = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(cleaned)) {
      toast.error(strings.errorInvalid)
      return
    }

    // If the widget is configured but the user submitted before it issued
    // a token, fail fast with a clear toast — better than firing the
    // request and getting a server-side captcha_required 400.
    if (turnstileConfigured && !turnstileToken) {
      toast.error(strings.errorTitle, {
        description:
          language === "ru"
            ? "Подожди секунду — мы проверяем что ты не бот."
            : "Hang on — we're verifying you're human.",
      })
      return
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/newsletter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:    cleaned,
          source,
          language,
          // `source_path` lets us join clicks → subscribes downstream.
          // `window.location.pathname` is OK here — this component is
          // already a client island, no SSR mismatch concern.
          source_path:
            typeof window !== "undefined" ? window.location.pathname : undefined,
          turnstileToken: turnstileToken ?? undefined,
        }),
      })

      if (res.status === 429) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        toast.error(strings.errorRateLimited, { description: data.message })
        setStatus("idle")
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        toast.error(strings.errorTitle, { description: data.message })
        setStatus("idle")
        return
      }

      toast.success(strings.successTitle, {
        description: strings.successDescription,
        duration: 6_000,
      })
      setEmail("")
      setStatus("success")
      // Block C — single conversion event downstream funnels key off. The
      // server-side `subscribers` row in Supabase carries the same `source`
      // value, so PostHog and the SQL view stay attributable to the same
      // surface.
      track("newsletter_subscribed", { source, locale: language })
      // One-use Turnstile tokens — reset the widget for the next session.
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    } catch {
      // Network error / offline / aborted by a unload event.
      toast.error(strings.errorTitle)
      setStatus("idle")
      // Bad attempt → fresh token before the user retries.
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    }
  }

  const subscribed = status === "success"
  const loading    = status === "loading"

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Subscribe to the operator's brief"
      className={cn("flex flex-col gap-2", className)}
      noValidate
    >
    {/* Inner row holds email+button so the Turnstile widget stacks below
        them naturally even when the parent container is row-flex. The
        widget itself is `interaction-only`, so most visitors never see it. */}
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={strings.placeholder}
        aria-label="Email address"
        disabled={loading || subscribed}
        className={cn(
          "h-11 flex-1 rounded-md border border-[var(--border-base)]",
          "bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)]",
          "placeholder:text-[var(--text-tertiary)]",
          "outline-none transition-shadow focus:border-[var(--brand)]",
          "focus:shadow-[0_0_0_3px_var(--focus-ring)]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          inputClassName,
        )}
      />
      <button
        type="submit"
        disabled={loading || subscribed}
        aria-busy={loading || undefined}
        className={cn(
          // .btn-cta supplies mint gradient + shimmer + hover-lift;
          // we keep the local layout (h/px/rounded/flex) and disabled
          // styling since this is a raw <button>, not a Button variant.
          "btn-cta h-11 px-5 rounded-md inline-flex items-center justify-center gap-2",
          "text-white text-sm font-semibold",
          "disabled:opacity-70 disabled:cursor-not-allowed",
          buttonClassName,
        )}
      >
        {subscribed ? (
          <>
            <Check className="size-4" />
            {strings.ctaSubscribed}
          </>
        ) : loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {strings.ctaLoading}
          </>
        ) : (
          strings.cta
        )}
      </button>
    </div>
    <TurnstileGate
      ref={turnstileRef}
      onToken={setTurnstileToken}
      onError={() => setTurnstileToken(null)}
    />
    </form>
  )
}
