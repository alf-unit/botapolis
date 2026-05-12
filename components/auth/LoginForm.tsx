"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Loader2, Mail } from "lucide-react"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { buttonVariants } from "@/components/ui/button"

/* ----------------------------------------------------------------------------
   LoginForm — TZ § 10 (sprint 5)
   ----------------------------------------------------------------------------
   Two auth paths, both stateless from our side:
     - Magic Link  → supabase.auth.signInWithOtp({ email })
     - Google      → supabase.auth.signInWithOAuth({ provider: 'google' })

   Both route through `/auth/callback?code=…&next=<dest>` once Supabase has
   verified the credential. The `next` query param flows from the auth-gate
   redirect in proxy.ts so users land on the page they originally requested.

   Layout: single column, generous spacing — minimal cognitive load, no
   decoration. The brand mint→violet gradient lives on the primary CTA so the
   page still feels like the rest of the site even with almost no chrome.
---------------------------------------------------------------------------- */

interface LoginFormStrings {
  eyebrow:        string
  headline:       string
  lede:           string
  emailLabel:     string
  emailPlaceholder: string
  magicLinkCta:   string
  magicLinkSent:  string
  magicLinkSentSubtitle: string
  googleCta:      string
  divider:        string
  privacyNote:    string
  errors: {
    invalidEmail: string
    sendFailed:   string
    googleFailed: string
  }
}

interface LoginFormProps {
  strings: LoginFormStrings
  /** Locale-aware path to the affiliate-disclosure / privacy policy. */
  privacyHref: string
  termsHref:   string
}

export function LoginForm({ strings, privacyHref, termsHref }: LoginFormProps) {
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  // Where to land after a successful auth round-trip. The proxy gate sets
  // this when bouncing anon users off /dashboard or /saved.
  const next = searchParams.get("next") || "/dashboard"

  const callbackBase =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "/auth/callback"
  const callbackUrl = `${callbackBase}?next=${encodeURIComponent(next)}`

  // ----- Magic link -----------------------------------------------------
  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (sending || googleLoading) return

    const cleaned = email.trim().toLowerCase()
    // Defensive check — the input already requires type=email, but we
    // surface a friendlier toast for obvious typos.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      toast.error(strings.errors.invalidEmail)
      return
    }

    setSending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: cleaned,
        options: { emailRedirectTo: callbackUrl },
      })
      if (error) {
        toast.error(strings.errors.sendFailed, { description: error.message })
        return
      }
      setSent(true)
      toast.success(strings.magicLinkSent, {
        description: strings.magicLinkSentSubtitle,
        duration: 8_000,
      })
    } finally {
      setSending(false)
    }
  }

  // ----- Google OAuth ----------------------------------------------------
  async function signInWithGoogle() {
    if (sending || googleLoading) return
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      })
      // On success the browser is mid-redirect; we never reach this line.
      // If we DO reach here, Supabase returned an error without throwing.
      if (error) {
        toast.error(strings.errors.googleFailed, { description: error.message })
        setGoogleLoading(false)
      }
    } catch {
      toast.error(strings.errors.googleFailed)
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "relative w-full max-w-md mx-auto rounded-3xl border border-[var(--border-base)]",
        "bg-[var(--bg-surface)] p-7 lg:p-9 shadow-[var(--shadow-md)] overflow-hidden",
      )}
    >
      {/* Atmospheric glow — keeps the page feeling like the rest of the brand */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-12 size-64 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.25), transparent 65%)",
        }}
      />

      <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
        {strings.eyebrow}
      </p>
      <h1 className="relative mt-2 text-[28px] font-semibold tracking-[-0.02em] leading-[1.15]">
        {strings.headline}
      </h1>
      <p className="relative mt-2 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        {strings.lede}
      </p>

      {/* Google OAuth — primary path for users who already have accounts */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={sending || googleLoading}
        aria-busy={googleLoading || undefined}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "relative mt-7 w-full h-12 text-[14px] justify-center gap-3",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleMark className="size-4" />
        )}
        {strings.googleCta}
      </button>

      {/* Divider */}
      <div
        role="separator"
        className="relative mt-6 flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
      >
        <span className="h-px flex-1 bg-[var(--border-base)]" />
        {strings.divider}
        <span className="h-px flex-1 bg-[var(--border-base)]" />
      </div>

      {/* Magic link */}
      <form onSubmit={sendMagicLink} className="relative mt-6 flex flex-col gap-3">
        <label htmlFor="login-email" className="block">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
            {strings.emailLabel}
          </span>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={strings.emailPlaceholder}
            autoComplete="email"
            required
            maxLength={254}
            className={cn(
              "mt-2 block w-full rounded-md border border-[var(--border-base)]",
              "bg-[var(--bg-surface)] px-3 py-2.5 text-[14px] text-[var(--text-primary)]",
              "placeholder:text-[var(--text-tertiary)]",
              "focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--focus-ring)]",
              "transition-colors duration-150",
            )}
          />
        </label>

        <button
          type="submit"
          disabled={sending || googleLoading || sent}
          aria-busy={sending || undefined}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 px-5 text-[14px] text-white justify-center gap-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          style={{
            background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
          }}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          {sent ? strings.magicLinkSent : strings.magicLinkCta}
          {!sent && !sending && <ArrowRight className="size-4" />}
        </button>

        {sent && (
          <p
            role="status"
            className="text-[12px] leading-[1.5] text-[var(--text-secondary)]"
          >
            {strings.magicLinkSentSubtitle}
          </p>
        )}
      </form>

      {/* Privacy / terms note */}
      <p className="relative mt-7 text-[11px] leading-[1.5] text-[var(--text-tertiary)]">
        {strings.privacyNote}{" "}
        <Link href={privacyHref} className="underline-offset-4 hover:underline">
          Privacy
        </Link>
        {" · "}
        <Link href={termsHref} className="underline-offset-4 hover:underline">
          Terms
        </Link>
        .
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Google G-mark — keeps the OAuth button on-brand without a third-party
// asset request. Inlined so the page hydrates without an icon fetch.
// ---------------------------------------------------------------------------
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.12V7.04H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  )
}
