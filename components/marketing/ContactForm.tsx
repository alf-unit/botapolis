"use client"

import * as React from "react"
import { toast } from "sonner"
import { ArrowUpRight, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics/events"
import { TurnstileGate, type TurnstileGateHandle } from "@/components/shared/TurnstileGate"

/* ----------------------------------------------------------------------------
   <ContactForm>
   ----------------------------------------------------------------------------
   Client island that powers /contact and /ru/contact. POSTs to /api/contact
   with JSON, surfaces success/error via Sonner toasts (same UX pattern as
   NewsletterForm). Form falls back to a `mailto:` link if the network
   submit fails twice in a row — better than letting a frustrated visitor
   give up silently.

   Locale-aware strings come down as props so this client component never
   has to touch getDictionary (which is server-only).
---------------------------------------------------------------------------- */

export interface ContactFormStrings {
  nameLabel:       string
  emailLabel:      string
  subjectLabel:    string
  messageLabel:    string
  submitCta:       string
  submitLoading:   string
  successTitle:    string
  successBody:     string
  errorTitle:      string
  errorRateLimited: string
  errorGeneric:    string
  fallbackTitle:   string
  fallbackBody:    string
  fallbackCta:     string
}

interface ContactFormProps {
  strings:      ContactFormStrings
  contactEmail: string
  language:     "en" | "ru"
  className?:   string
}

type FormStatus = "idle" | "submitting" | "success"

export function ContactForm({
  strings,
  contactEmail,
  language,
  className,
}: ContactFormProps) {
  const [status, setStatus] = React.useState<FormStatus>("idle")
  const [consecutiveFailures, setConsecutiveFailures] = React.useState(0)
  // Block D — Turnstile token (same pattern as NewsletterForm). State lives
  // in the form because the widget hands it over asynchronously.
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null)
  const turnstileRef = React.useRef<TurnstileGateHandle | null>(null)
  const turnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === "submitting") return

    if (turnstileConfigured && !turnstileToken) {
      toast.error(strings.errorTitle, {
        description:
          language === "ru"
            ? "Подожди — мы проверяем что ты не бот."
            : "Hang on — we're verifying you're human.",
      })
      return
    }

    setStatus("submitting")

    const fd = new FormData(e.currentTarget)
    const payload = {
      name:    (fd.get("name")    as string)?.trim() || undefined,
      email:   (fd.get("email")   as string)?.trim(),
      subject: (fd.get("subject") as string)?.trim() || undefined,
      message: (fd.get("message") as string)?.trim(),
      source:  "contact_page",
      turnstileToken: turnstileToken ?? undefined,
    }

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "content-type": "application/json", "accept-language": language },
        body:    JSON.stringify(payload),
      })

      if (res.ok) {
        setStatus("success")
        setConsecutiveFailures(0)
        toast.success(strings.successTitle, { description: strings.successBody })
        // Block C — conversion. Properties stay coarse (no PII): we capture
        // whether a subject was provided + message length so funnel cohorts
        // can distinguish a one-line ping from a detailed inquiry.
        track("contact_submitted", {
          locale: language,
          has_subject:   Boolean(payload.subject),
          message_chars: payload.message?.length ?? 0,
        })
        ;(e.target as HTMLFormElement).reset()
        setTurnstileToken(null)
        turnstileRef.current?.reset()
        return
      }

      // Read the structured error to surface useful copy (rate-limit vs
      // generic). We don't dump server messages directly — they're tuned
      // for engineering audiences, not visitors.
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      const errMsg =
        data.error === "rate_limited" ? strings.errorRateLimited : strings.errorGeneric
      toast.error(strings.errorTitle, { description: errMsg })
      setStatus("idle")
      setConsecutiveFailures((c) => c + 1)
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    } catch {
      // Network blip / firewall. Same UX as a structured error from the API.
      toast.error(strings.errorTitle, { description: strings.errorGeneric })
      setStatus("idle")
      setConsecutiveFailures((c) => c + 1)
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    }
  }

  // After two failures in a row, surface a mailto: escape hatch alongside
  // the form so the user has a backup path.
  const showFallback = consecutiveFailures >= 2

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={strings.nameLabel}>
            <Input
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              placeholder=""
              className="h-11"
            />
          </Field>
          <Field label={strings.emailLabel} required>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@store.com"
              className="h-11"
            />
          </Field>
        </div>

        <Field label={strings.subjectLabel}>
          <Input
            name="subject"
            type="text"
            maxLength={200}
            placeholder=""
            className="h-11"
          />
        </Field>

        <Field label={strings.messageLabel} required>
          <Textarea
            name="message"
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            className="min-h-[160px] resize-y"
            placeholder=""
          />
        </Field>

        {/* Block D — Turnstile sits between the message field and the
            submit button. Most visitors never see anything (managed
            challenge + interaction-only). When the widget is disabled
            (no NEXT_PUBLIC_TURNSTILE_SITE_KEY), it renders null. */}
        <TurnstileGate
          ref={turnstileRef}
          onToken={setTurnstileToken}
          onError={() => setTurnstileToken(null)}
          className="my-1"
        />

        <Button
          type="submit"
          variant="cta"
          size="lg"
          disabled={status === "submitting"}
          className={cn(
            "h-12 mt-2 text-[15px]",
            "disabled:opacity-70 disabled:cursor-not-allowed",
          )}
        >
          {status === "submitting" ? strings.submitLoading : strings.submitCta}
          {status !== "submitting" && (
            <ArrowUpRight className="size-4" aria-hidden="true" />
          )}
        </Button>
      </form>

      {showFallback && (
        <div className="rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-4 flex items-start gap-3">
          <Mail className="size-4 mt-0.5 text-[var(--text-secondary)]" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              {strings.fallbackTitle}
            </p>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
              {strings.fallbackBody}
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand)] hover:underline underline-offset-4"
            >
              {strings.fallbackCta} <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] font-mono text-[var(--text-tertiary)]">
        {label}
        {required && <span className="text-[var(--danger)] ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}
