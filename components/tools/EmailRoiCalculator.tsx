"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowUpRight, BookmarkPlus, Info, Loader2, Sparkles } from "lucide-react"

import { cn, formatPrice, formatNumber } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/* ----------------------------------------------------------------------------
   EmailRoiCalculator — TZ § 11.1
   ----------------------------------------------------------------------------
   Client island. All math runs in the browser via `useMemo` for instant
   recompute as users drag sliders — the calc is trivially cheap so there's
   no need for a debounce.

   Inputs:  subscribers · open rate · click rate · AOV · platform
   Outputs: monthly revenue · annual projection · platform cost · ROI
            recommended platform (with affiliate CTA)

   Layout:  desktop = two columns (form left, sticky result right),
            mobile  = stacked (result follows form). Result card pins to the
            top of its column on desktop via `lg:sticky lg:top-24` so it
            stays visible as users tweak the form.
---------------------------------------------------------------------------- */

// --------------------------------------------------------------------------
// Platform pricing — rough monthly cost by contact count.
// ----------------------------------------------------------------------------
// These figures are deliberately approximate and not pulled from each
// vendor's live pricing page (which changes silently). They're tier-anchored
// and updated by hand from the seed data; the methodology callout makes the
// approximation explicit to the user.
// --------------------------------------------------------------------------
type PlatformId = "klaviyo" | "mailchimp" | "omnisend" | "other"

interface PlatformOption {
  id:    PlatformId
  name:  string
  /** Slug for the /go/ affiliate redirector. */
  slug:  string
  /** Whether we currently have an affiliate partnership. */
  affiliate: boolean
  /** Tag for the recommended-platform pill. */
  tagline:   string
}

const PLATFORMS: PlatformOption[] = [
  { id: "klaviyo",   name: "Klaviyo",   slug: "klaviyo",   affiliate: true,  tagline: "Deepest Shopify integration" },
  { id: "mailchimp", name: "Mailchimp", slug: "mailchimp", affiliate: false, tagline: "Easiest first platform" },
  { id: "omnisend",  name: "Omnisend",  slug: "omnisend",  affiliate: true,  tagline: "Best price-to-feature" },
  { id: "other",     name: "Other",     slug: "other",     affiliate: false, tagline: "Self-hosted / unknown" },
]

interface PriceTier {
  ceiling: number  // upper-inclusive subscriber count
  cost:    number  // $/mo at this tier
}

const PRICE_TABLE: Record<PlatformId, PriceTier[]> = {
  klaviyo: [
    { ceiling:    250, cost:   0 },
    { ceiling:    500, cost:  20 },
    { ceiling:   1500, cost:  45 },
    { ceiling:   5000, cost: 100 },
    { ceiling:  10000, cost: 175 },
    { ceiling:  25000, cost: 360 },
    { ceiling:  50000, cost: 700 },
    { ceiling: 100000, cost: 1200 },
    { ceiling: Infinity, cost: 1700 },
  ],
  mailchimp: [
    { ceiling:    500, cost:   0 },
    { ceiling:   1500, cost:  20 },
    { ceiling:   5000, cost:  60 },
    { ceiling:  10000, cost: 100 },
    { ceiling:  25000, cost: 230 },
    { ceiling:  50000, cost: 350 },
    { ceiling: Infinity, cost: 600 },
  ],
  omnisend: [
    { ceiling:    250, cost:   0 },
    { ceiling:    500, cost:  16 },
    { ceiling:   2500, cost:  40 },
    { ceiling:   5000, cost:  59 },
    { ceiling:  10000, cost: 100 },
    { ceiling:  25000, cost: 240 },
    { ceiling:  50000, cost: 400 },
    { ceiling: Infinity, cost: 500 },
  ],
  other: [{ ceiling: Infinity, cost: 0 }],
}

function platformCost(platform: PlatformId, subscribers: number): number {
  const tiers = PRICE_TABLE[platform]
  return tiers.find((t) => subscribers <= t.ceiling)?.cost ?? 0
}

/** TZ § 11.1: rough recommendation logic by store stage. */
function recommendPlatform(subscribers: number, monthlyRevenue: number): PlatformId {
  if (subscribers <= 500 && monthlyRevenue < 5_000) return "mailchimp"
  if (subscribers >= 25_000 || monthlyRevenue >= 50_000) return "klaviyo"
  return "omnisend"
}

// --------------------------------------------------------------------------
// Conservative defaults — match what the homepage hero widget hints at.
// --------------------------------------------------------------------------
const DEFAULTS = {
  subscribers:       5_000,
  openRatePct:       28,    // %
  clickRatePct:      2.4,   // %
  conversionRatePct: 1.8,   // %
  aov:               80,    // $
  campaignsPerMonth: 4,     // 1/week is the canonical "good" cadence
  platform:          "omnisend" as PlatformId,
}

// --------------------------------------------------------------------------
// Strings — passed in from the page so RU/EN flow through dictionaries.
// --------------------------------------------------------------------------
export interface EmailRoiStrings {
  resultEyebrow:        string
  resultLabel:          string
  resultMeta:           string
  annualLabel:          string
  platformCostLabel:    string
  roiLabel:             string
  inputs: {
    subscribers:  string
    openRate:     string
    clickRate:    string
    aov:          string
    platform:     string
  }
  recommendation: {
    eyebrow:     string
    cta:         string
    methodology: string
    fallback:    string  // shown when recommended platform isn't affiliated
  }
  methodologyText: string
  /** Sprint 5: "Save this calculation" CTA + toast copy. */
  save: {
    cta:         string
    saving:      string
    saved:       string
    signInToSave: string
    failed:      string
  }
}

interface EmailRoiCalculatorProps {
  strings:      EmailRoiStrings
  /** Locale prefix for /go/ + /methodology links. */
  localePrefix?: "" | "/ru"
  locale?:      "en" | "ru"
}

export function EmailRoiCalculator({
  strings,
  localePrefix = "",
  locale = "en",
}: EmailRoiCalculatorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [subscribers,  setSubscribers]  = React.useState(DEFAULTS.subscribers)
  const [openRate,     setOpenRate]     = React.useState(DEFAULTS.openRatePct)
  const [clickRate,    setClickRate]    = React.useState(DEFAULTS.clickRatePct)
  const [aov,          setAov]          = React.useState(DEFAULTS.aov)
  const [platform,     setPlatform]     = React.useState<PlatformId>(DEFAULTS.platform)
  const [saving,       setSaving]       = React.useState(false)

  // ----- Derived numbers (pure functions of inputs) ------------------------
  const result = React.useMemo(() => {
    const emailsPerMonth = subscribers * DEFAULTS.campaignsPerMonth
    const opens          = emailsPerMonth * (openRate     / 100)
    const clicks         = opens          * (clickRate    / 100)
    const orders         = clicks         * (DEFAULTS.conversionRatePct / 100)
    const monthlyRevenue = orders         * aov
    const annualRevenue  = monthlyRevenue * 12
    const cost           = platformCost(platform, subscribers)
    const annualCost     = cost * 12
    // ROI multiplier: net return per $1 spent on the platform.
    const roi = cost > 0 ? (monthlyRevenue - cost) / cost : null
    return {
      monthlyRevenue,
      annualRevenue,
      monthlyCost:  cost,
      annualCost,
      roi,
    }
  }, [subscribers, openRate, clickRate, aov, platform])

  const recommendedId = recommendPlatform(subscribers, result.monthlyRevenue)
  const recommended = PLATFORMS.find((p) => p.id === recommendedId)!

  // --------------------------------------------------------------------
  // Save handler — POST to /api/calculations. The API returns 401 when
  // the visitor isn't signed in; we use that as the trigger to redirect
  // to /login?next=<current path> so they come back to the same widget
  // after they finish signing in.
  // --------------------------------------------------------------------
  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch("/api/calculations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_slug: "email-roi-calculator",
          inputs: {
            subscribers,
            openRate,
            clickRate,
            aov,
            platform,
          },
          results: {
            monthlyRevenue: result.monthlyRevenue,
            annualRevenue:  result.annualRevenue,
            monthlyCost:    result.monthlyCost,
            roi:            result.roi,
          },
        }),
      })

      if (res.status === 401) {
        toast.info(strings.save.signInToSave)
        const next = pathname ?? "/tools/email-roi-calculator"
        router.push(`${localePrefix}/login?next=${encodeURIComponent(next)}`)
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        toast.error(strings.save.failed, { description: data.message })
        return
      }
      toast.success(strings.save.saved)
    } catch {
      toast.error(strings.save.failed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1fr_minmax(0,440px)]">
      {/* ===================================================================
          LEFT COLUMN — Form
          =================================================================== */}
      <form
        // Pure client recompute — no submit handler, no server roundtrip.
        onSubmit={(e) => e.preventDefault()}
        aria-label="Email ROI inputs"
        className="flex flex-col gap-6"
      >
        <SliderField
          label={strings.inputs.subscribers}
          value={subscribers}
          min={100}
          max={100_000}
          step={100}
          format={(v) => formatNumber(v, { locale })}
          onChange={setSubscribers}
        />
        <SliderField
          label={strings.inputs.openRate}
          value={openRate}
          min={5}
          max={60}
          step={0.5}
          unit="%"
          format={(v) => v.toFixed(1)}
          onChange={setOpenRate}
        />
        <SliderField
          label={strings.inputs.clickRate}
          value={clickRate}
          min={0.1}
          max={10}
          step={0.1}
          unit="%"
          format={(v) => v.toFixed(1)}
          onChange={setClickRate}
        />
        <SliderField
          label={strings.inputs.aov}
          value={aov}
          min={5}
          max={500}
          step={1}
          format={(v) => formatPrice(v, { locale })}
          onChange={setAov}
        />

        {/* Platform select — render as segmented chips so the choice
            feels physical and the contrast with sliders is clear. */}
        <fieldset>
          <legend className="block text-[13px] font-medium text-[var(--text-primary)]">
            {strings.inputs.platform}
          </legend>
          <div
            role="radiogroup"
            aria-label={strings.inputs.platform}
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {PLATFORMS.map((p) => (
              <button
                type="button"
                key={p.id}
                role="radio"
                aria-checked={platform === p.id}
                onClick={() => setPlatform(p.id)}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-md border px-3 text-[13px] font-medium",
                  "transition-[background-color,border-color,color] duration-150",
                  platform === p.id
                    ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_12%,transparent)] text-[var(--text-primary)]"
                    : "border-[var(--border-base)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      {/* ===================================================================
          RIGHT COLUMN — Sticky result card
          =================================================================== */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-[var(--border-base)]",
            "bg-[var(--bg-surface)] p-6 lg:p-8 shadow-[var(--shadow-md)]",
          )}
        >
          {/* Atmospheric glow tied to brand */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 size-64 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.22), transparent 65%)",
            }}
          />

          <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
            <Sparkles className="inline-block size-3 mr-1.5 align-[-1px]" />
            {strings.resultEyebrow}
          </p>

          <p className="relative mt-3 text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            {strings.resultLabel}
          </p>
          <p
            className={cn(
              "relative mt-2 font-mono font-medium tabular-nums tracking-[-0.02em]",
              "text-[40px] leading-none lg:text-[56px]",
              "text-[var(--text-primary)]",
            )}
          >
            {formatPrice(result.monthlyRevenue, { locale, maximumFractionDigits: 0 })}
            <span className="ml-2 text-[14px] font-medium text-[var(--text-tertiary)] lg:text-[16px]">
              /mo
            </span>
          </p>
          <p className="relative mt-3 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
            {strings.resultMeta}
          </p>

          {/* Secondary numbers row */}
          <dl className="relative mt-6 grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-5 text-[12px]">
            <Metric
              label={strings.annualLabel}
              value={formatPrice(result.annualRevenue, { locale, maximumFractionDigits: 0 })}
            />
            <Metric
              label={strings.platformCostLabel}
              value={formatPrice(result.monthlyCost, { locale, maximumFractionDigits: 0 }) + "/mo"}
            />
            <Metric
              label={strings.roiLabel}
              value={
                result.roi == null
                  ? "—"
                  : `${formatNumber(result.roi, { locale, maximumFractionDigits: 1 })}×`
              }
              accent={result.roi != null && result.roi >= 5}
            />
          </dl>

          {/* Recommendation block */}
          <div className="relative mt-6 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {strings.recommendation.eyebrow}
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-[var(--text-primary)]">
              {recommended.name}
            </p>
            <p className="mt-1 text-[12px] leading-[1.5] text-[var(--text-secondary)]">
              {recommended.tagline}
            </p>

            {recommended.affiliate ? (
              <Link
                href={`${localePrefix}/go/${recommended.slug}?utm_campaign=email-roi-calculator`}
                rel="sponsored nofollow noopener"
                target="_blank"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-3 w-full h-10 text-[13px] text-white justify-between",
                )}
                style={{
                  background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                }}
              >
                <span>{strings.recommendation.cta.replace("{name}", recommended.name)}</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            ) : (
              <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">
                {strings.recommendation.fallback}
              </p>
            )}
          </div>

          {/* Save calculation — sprint 5. Anon visitors get bounced to /login
              via the 401 path inside `handleSave`; authed users get a toast. */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving || undefined}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "relative mt-4 w-full h-10 text-[13px] justify-center gap-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookmarkPlus className="size-4" />
            )}
            {saving ? strings.save.saving : strings.save.cta}
          </button>

          {/* Methodology callout */}
          <p className="relative mt-5 flex gap-2 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              {strings.methodologyText}{" "}
              <Link
                href={`${localePrefix}/methodology`}
                className="underline-offset-4 hover:underline text-[var(--text-secondary)]"
              >
                {strings.recommendation.methodology}
              </Link>
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SliderField — labelled numeric slider with a mono live value.
// ============================================================================
function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  format,
  onChange,
}: {
  label:   string
  value:   number
  min:     number
  max:     number
  step:    number
  unit?:   string
  format:  (v: number) => string
  onChange: (v: number) => void
}) {
  // % position on the track — used by the gradient fill behind the thumb.
  const pct = ((value - min) / (max - min)) * 100

  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <span className="font-mono text-[15px] tabular-nums text-[var(--text-primary)]">
          {format(value)}
          {unit && <span className="text-[var(--text-tertiary)] ml-0.5">{unit}</span>}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-3 w-full appearance-none bg-transparent cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg-surface)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-sm)] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--brand)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--bg-surface)]"
        style={{
          // Track + fill via background-image so the brand gradient bleeds
          // up to the current thumb position. No external CSS needed.
          background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${pct}%, var(--bg-muted) ${pct}%, var(--bg-muted) 100%)`,
          height: 6,
          borderRadius: 9999,
        }}
      />
    </label>
  )
}

// ============================================================================
// Metric — small "label + value" cell for the result strip.
// ============================================================================
function Metric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-mono text-[14px] tabular-nums",
          accent ? "text-[var(--brand)]" : "text-[var(--text-primary)]",
        )}
      >
        {value}
      </dd>
    </div>
  )
}
