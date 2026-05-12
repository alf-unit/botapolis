"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Check, Copy, Info, Loader2, RefreshCcw, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/* ----------------------------------------------------------------------------
   ProductDescriptionGenerator — TZ § 11.3
   ----------------------------------------------------------------------------
   Form on the left, result column on the right. Submitting POSTs to
   `/api/tools/description`; the API enforces rate-limits and forwards to
   Anthropic. We expect a JSON response { variations: string[3] }.

   States visualized in the result column:
     - idle      — empty + placeholder copy
     - loading   — three skeletons with a shimmer
     - rate_lim  — friendly "daily limit reached" message + retry-after
     - error     — generic failure message + Retry
     - success   — three variation cards with Copy / Regenerate
---------------------------------------------------------------------------- */

// --------------------------------------------------------------------------
// Strings
// --------------------------------------------------------------------------
type ToneId = "professional" | "casual" | "playful" | "luxury"
type AudienceId =
  | "ecom_general"
  | "luxury_buyer"
  | "value_seeker"
  | "tech_savvy"
  | "gift_giver"

export interface ProductDescriptionStrings {
  inputs: {
    product:   string
    features:  string
    audience:  string
    tone:      string
    maxLength: string
    placeholderProduct:  string
    placeholderFeatures: string
  }
  toneLabels:     Record<ToneId, string>
  audienceLabels: Record<AudienceId, string>

  generate:    string
  generating:  string
  regenerate:  string
  copy:        string
  copied:      string
  resultsEyebrow: string
  idleMsg:        string
  variationLabel: string  // "Variation {n}"
  errors: {
    rateLimited:  string
    generic:      string
    notConfigured: string
    invalid:      string
  }
  affiliate: {
    eyebrow:  string
    intro:    string
    primary:  string
    primarySlug: string  // /go/{slug}
    secondary?: string
    secondarySlug?: string
  }
  disclaimerText: string
  methodologyLink: string
}

interface ProductDescriptionGeneratorProps {
  strings:       ProductDescriptionStrings
  localePrefix?: "" | "/ru"
}

// --------------------------------------------------------------------------
// API response shapes
// --------------------------------------------------------------------------
interface GenerateOk {
  variations: string[]
}
interface GenerateErr {
  error:    string
  message?: string
}

const TONE_IDS:     readonly ToneId[]     = ["professional", "casual", "playful", "luxury"] as const
const AUDIENCE_IDS: readonly AudienceId[] = ["ecom_general", "luxury_buyer", "value_seeker", "tech_savvy", "gift_giver"] as const

export function ProductDescriptionGenerator({
  strings,
  localePrefix = "",
}: ProductDescriptionGeneratorProps) {
  // ----- Form state ------------------------------------------------------
  const [product,   setProduct]   = React.useState("")
  const [features,  setFeatures]  = React.useState("")
  const [audience,  setAudience]  = React.useState<AudienceId>("ecom_general")
  const [tone,      setTone]      = React.useState<ToneId>("professional")
  const [maxLength, setMaxLength] = React.useState(160)

  // ----- Async state -----------------------------------------------------
  type Status = "idle" | "loading" | "success" | "rate_limited" | "error"
  const [status,     setStatus]     = React.useState<Status>("idle")
  const [variations, setVariations] = React.useState<string[]>([])
  const [errorMsg,   setErrorMsg]   = React.useState<string | null>(null)

  // Bail-out for rapid double-submit races (don't disable submit during
  // loading — disabled buttons frustrate; instead AbortController the prior).
  const abortRef = React.useRef<AbortController | null>(null)

  const canSubmit = product.trim().length > 0 && features.trim().length > 0

  async function generate() {
    if (!canSubmit) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setStatus("loading")
    setErrorMsg(null)

    try {
      const res = await fetch("/api/tools/description", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product:   product.trim(),
          features:  features.trim(),
          audience,
          tone,
          maxLength,
        }),
        signal: ctrl.signal,
      })

      if (res.status === 429) {
        const data = (await res.json().catch(() => ({}))) as GenerateErr
        setErrorMsg(data.message ?? strings.errors.rateLimited)
        setStatus("rate_limited")
        return
      }
      if (res.status === 503) {
        setErrorMsg(strings.errors.notConfigured)
        setStatus("error")
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as GenerateErr
        setErrorMsg(data.message ?? strings.errors.generic)
        setStatus("error")
        return
      }

      const data = (await res.json()) as GenerateOk
      if (!Array.isArray(data.variations) || data.variations.length === 0) {
        setErrorMsg(strings.errors.generic)
        setStatus("error")
        return
      }
      setVariations(data.variations.slice(0, 3))
      setStatus("success")
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return
      setErrorMsg(strings.errors.generic)
      setStatus("error")
    }
  }

  return (
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* ===================================================================
          LEFT — Form
          =================================================================== */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          generate()
        }}
        className="flex flex-col gap-5"
        aria-label="Product description inputs"
      >
        <Field label={strings.inputs.product} htmlFor="pdg-product">
          <input
            id="pdg-product"
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={strings.inputs.placeholderProduct}
            maxLength={120}
            required
            className={inputClasses}
          />
        </Field>

        <Field label={strings.inputs.features} htmlFor="pdg-features">
          <textarea
            id="pdg-features"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder={strings.inputs.placeholderFeatures}
            maxLength={1200}
            required
            rows={5}
            className={cn(inputClasses, "min-h-[120px] resize-y leading-[1.5]")}
          />
        </Field>

        {/* Audience */}
        <fieldset>
          <legend className="text-[13px] font-medium text-[var(--text-primary)]">
            {strings.inputs.audience}
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {AUDIENCE_IDS.map((id) => (
              <Chip
                key={id}
                active={audience === id}
                onClick={() => setAudience(id)}
              >
                {strings.audienceLabels[id]}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* Tone */}
        <fieldset>
          <legend className="text-[13px] font-medium text-[var(--text-primary)]">
            {strings.inputs.tone}
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TONE_IDS.map((id) => (
              <Chip
                key={id}
                active={tone === id}
                onClick={() => setTone(id)}
              >
                {strings.toneLabels[id]}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* Max length */}
        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-[var(--text-primary)]">
              {strings.inputs.maxLength}
            </span>
            <span className="font-mono text-[15px] tabular-nums text-[var(--text-primary)]">
              {maxLength}
              <span className="ml-1 text-[var(--text-tertiary)] text-[12px]">w</span>
            </span>
          </span>
          <input
            type="range"
            min={50}
            max={300}
            step={10}
            value={maxLength}
            onChange={(e) => setMaxLength(Number(e.target.value))}
            aria-label={strings.inputs.maxLength}
            className="mt-3 w-full appearance-none bg-transparent cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg-surface)] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--brand)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--bg-surface)]"
            style={{
              background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${((maxLength - 50) / (300 - 50)) * 100}%, var(--bg-muted) ${((maxLength - 50) / (300 - 50)) * 100}%, var(--bg-muted) 100%)`,
              height: 6,
              borderRadius: 9999,
            }}
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || status === "loading"}
          aria-busy={status === "loading" || undefined}
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-2 h-12 px-5 text-base text-white justify-center disabled:cursor-not-allowed disabled:opacity-60",
          )}
          style={{
            background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
          }}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {strings.generating}
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              {strings.generate}
            </>
          )}
        </button>
      </form>

      {/* ===================================================================
          RIGHT — Results
          =================================================================== */}
      <div className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-4">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-[var(--border-base)]",
            "bg-[var(--bg-surface)] p-6 lg:p-8 shadow-[var(--shadow-md)]",
          )}
        >
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 size-64 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.22), transparent 65%)",
            }}
          />
          <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
            {strings.resultsEyebrow}
          </p>

          <div className="relative mt-4">
            {status === "idle" && (
              <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                {strings.idleMsg}
              </p>
            )}

            {status === "loading" && (
              <ul role="list" className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="h-24 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] animate-pulse"
                  />
                ))}
              </ul>
            )}

            {(status === "rate_limited" || status === "error") && errorMsg && (
              <ErrorPanel
                message={errorMsg}
                onRetry={status === "error" ? () => generate() : undefined}
                retryLabel={strings.regenerate}
              />
            )}

            {status === "success" && variations.length > 0 && (
              <ul role="list" className="flex flex-col gap-3">
                {variations.map((v, i) => (
                  <VariationCard
                    key={i}
                    index={i + 1}
                    label={strings.variationLabel.replace("{n}", String(i + 1))}
                    copyLabel={strings.copy}
                    copiedLabel={strings.copied}
                    body={v}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => generate()}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-10 mt-1 self-start text-[13px]",
                  )}
                >
                  <RefreshCcw className="size-3.5" />
                  {strings.regenerate}
                </button>
              </ul>
            )}
          </div>

          {/* Disclaimer + methodology */}
          <p className="relative mt-6 flex gap-2 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              {strings.disclaimerText}{" "}
              <Link
                href={`${localePrefix}/methodology`}
                className="underline-offset-4 hover:underline text-[var(--text-secondary)]"
              >
                {strings.methodologyLink}
              </Link>
            </span>
          </p>
        </div>

        {/* Affiliate footer */}
        <div className="rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            {strings.affiliate.eyebrow}
          </p>
          <p className="mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">
            {strings.affiliate.intro}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`${localePrefix}/go/${strings.affiliate.primarySlug}?utm_campaign=product-description`}
              rel="sponsored nofollow noopener"
              target="_blank"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-10 text-[13px] text-white",
              )}
              style={{
                background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
              }}
            >
              {strings.affiliate.primary}
              <ArrowUpRight className="size-3.5" />
            </Link>
            {strings.affiliate.secondary && strings.affiliate.secondarySlug && (
              <Link
                href={`${localePrefix}/go/${strings.affiliate.secondarySlug}?utm_campaign=product-description`}
                rel="sponsored nofollow noopener"
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-10 text-[13px]",
                )}
              >
                {strings.affiliate.secondary}
                <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================
const inputClasses = cn(
  "block w-full rounded-md border border-[var(--border-base)] bg-[var(--bg-surface)] px-3 py-2.5",
  "text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
  "focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--focus-ring)]",
  "transition-colors duration-150",
)

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-[13px] font-medium text-[var(--text-primary)]">
        {label}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md border px-3 text-[13px] font-medium",
        "transition-[background-color,border-color,color] duration-150",
        active
          ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_12%,transparent)] text-[var(--text-primary)]"
          : "border-[var(--border-base)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </button>
  )
}

function VariationCard({
  index,
  label,
  body,
  copyLabel,
  copiedLabel,
}: {
  index: number
  label: string
  body: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      // Reset the copied state after a short interval — long enough for
      // users to register the change, short enough that successive copies
      // don't feel stale.
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // navigator.clipboard can fail on HTTP/older browsers — silently
      // ignore; the visible body text is still selectable manually.
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : copyLabel}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-base)] bg-[var(--bg-surface)] px-2 text-[11px] font-medium",
            copied ? "text-[var(--success)]" : "text-[var(--text-secondary)]",
            "hover:border-[var(--border-strong)] transition-colors",
          )}
        >
          {copied ? (
            <>
              <Check className="size-3" />
              {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="size-3" />
              {copyLabel}
            </>
          )}
        </button>
      </div>
      <p className="text-[14px] leading-[1.55] text-[var(--text-primary)] whitespace-pre-wrap">
        {body}
      </p>
    </li>
  )
}

function ErrorPanel({
  message,
  onRetry,
  retryLabel,
}: {
  message:    string
  onRetry?:   () => void
  retryLabel: string
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in oklch, var(--danger) 28%, transparent)",
        background:  "color-mix(in oklch, var(--danger) 6%, transparent)",
      }}
    >
      <p className="text-[14px] leading-[1.55] text-[var(--text-primary)]">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-3 h-9 text-[12px]",
          )}
        >
          <RefreshCcw className="size-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
