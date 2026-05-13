"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Info } from "lucide-react"

import { cn, formatPrice, formatNumber } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { track } from "@/lib/analytics/events"

/* ----------------------------------------------------------------------------
   AiCostComparator — TZ § 11.2
   ----------------------------------------------------------------------------
   Plain-React widget. The model catalog and use-case token estimates live in
   this file as flat constants — they update by hand from vendor pricing
   pages every couple of months, exactly the rhythm TZ-2 § 11.2 calls out.

   Inputs:  use case · volume / month · quality tier
   Outputs: ranked bar chart of monthly cost by model, recommended pick
            (cheapest at the requested quality), affiliate CTAs

   The bar chart is hand-rolled HTML — relative widths from the max-cost row
   so we avoid pulling in recharts/echarts for a 6-row chart. Each bar is
   keyboard-focusable for screen readers via the row-level <li>.
---------------------------------------------------------------------------- */

// --------------------------------------------------------------------------
// Use-case → tokens per item
// ----------------------------------------------------------------------------
type UseCaseId = "product_descriptions" | "customer_service" | "ad_copy" | "seo_content"

interface UseCase {
  id:        UseCaseId
  label:     string  // EN; the page passes the localized label in via `strings`
  inputTok:  number
  outputTok: number
}

const USE_CASES: UseCase[] = [
  { id: "product_descriptions", label: "Product descriptions",  inputTok:  350, outputTok:  450 },
  { id: "customer_service",     label: "Customer service",      inputTok:  750, outputTok:  250 },
  { id: "ad_copy",              label: "Ad copy / hooks",       inputTok:  400, outputTok:  200 },
  { id: "seo_content",          label: "SEO long-form content", inputTok: 1500, outputTok: 3000 },
]

// --------------------------------------------------------------------------
// Quality tier scales token usage (more retries + reasoning for "best").
// --------------------------------------------------------------------------
type QualityId = "good" | "great" | "best"
const QUALITY_MULT: Record<QualityId, number> = { good: 1.0, great: 1.4, best: 2.0 }

// --------------------------------------------------------------------------
// Model catalog — $/1M tokens.
// ----------------------------------------------------------------------------
// `tier` is the minimum quality this model is suitable for. We filter out
// models below the requested tier so the chart shows only credible options.
// `affiliate` flags whether /go/{slug} routes anywhere useful today.
// --------------------------------------------------------------------------
interface AiModel {
  id:         string
  name:       string
  provider:   string
  vendor:     "anthropic" | "openai" | "google" | "meta"
  inPer1M:    number
  outPer1M:   number
  minTier:    QualityId
  affiliate:  boolean
  slug:       string  // /go/{slug}
}

const MODELS: AiModel[] = [
  // Anthropic — Claude 4 family
  { id: "haiku45",  name: "Claude Haiku 4.5",  provider: "Anthropic", vendor: "anthropic", inPer1M:  1.00, outPer1M:  5.00, minTier: "good",  affiliate: true,  slug: "anthropic" },
  { id: "sonnet46", name: "Claude Sonnet 4.6", provider: "Anthropic", vendor: "anthropic", inPer1M:  3.00, outPer1M: 15.00, minTier: "great", affiliate: true,  slug: "anthropic" },
  { id: "opus47",   name: "Claude Opus 4.7",   provider: "Anthropic", vendor: "anthropic", inPer1M: 15.00, outPer1M: 75.00, minTier: "best",  affiliate: true,  slug: "anthropic" },
  // OpenAI
  { id: "gpt4o",     name: "GPT-4o",       provider: "OpenAI", vendor: "openai", inPer1M:  2.50, outPer1M: 10.00, minTier: "great", affiliate: false, slug: "openai" },
  { id: "gpt4omini", name: "GPT-4o mini",  provider: "OpenAI", vendor: "openai", inPer1M:  0.15, outPer1M:  0.60, minTier: "good",  affiliate: false, slug: "openai" },
  // Google
  { id: "g25pro",   name: "Gemini 2.5 Pro",   provider: "Google", vendor: "google", inPer1M:  1.25, outPer1M:  5.00, minTier: "great", affiliate: false, slug: "google-cloud" },
  { id: "g25flash", name: "Gemini 2.5 Flash", provider: "Google", vendor: "google", inPer1M:  0.30, outPer1M:  2.50, minTier: "good",  affiliate: false, slug: "google-cloud" },
]

const TIER_ORDER: Record<QualityId, number> = { good: 0, great: 1, best: 2 }

function modelEligible(m: AiModel, requested: QualityId): boolean {
  return TIER_ORDER[m.minTier] <= TIER_ORDER[requested]
}

// --------------------------------------------------------------------------
// Strings
// --------------------------------------------------------------------------
export interface AiCostStrings {
  inputs: {
    useCase:  string
    volume:   string
    quality:  string
  }
  qualityLabels: Record<QualityId, string>
  useCaseLabels: Record<UseCaseId, string>
  resultEyebrow:   string
  totalLabel:      string
  perItemLabel:    string
  recommendedLabel:string
  recommendedCta:  string
  methodologyText: string
  methodologyLink: string
  itemsPerMonth:   string
  // Format strings with {tokens} placeholder.
  tokenLine:       string
}

interface AiCostComparatorProps {
  strings:       AiCostStrings
  localePrefix?: "" | "/ru"
  locale?:       "en" | "ru"
}

const DEFAULTS = {
  useCase: "product_descriptions" as UseCaseId,
  volume:  1_000,
  quality: "great" as QualityId,
}

export function AiCostComparator({
  strings,
  localePrefix = "",
  locale = "en",
}: AiCostComparatorProps) {
  const [useCaseId, setUseCaseId] = React.useState<UseCaseId>(DEFAULTS.useCase)
  const [volume,    setVolume]    = React.useState(DEFAULTS.volume)
  const [quality,   setQuality]   = React.useState<QualityId>(DEFAULTS.quality)

  // Block C — fire `tool_started` on the first non-default input. The
  // comparator has no terminal "save / generate" action, so we don't pair
  // this with a `tool_completed` event; engagement IS the started event.
  const startedRef = React.useRef(false)
  React.useEffect(() => {
    if (startedRef.current) return
    const dirty =
      useCaseId !== DEFAULTS.useCase ||
      volume    !== DEFAULTS.volume  ||
      quality   !== DEFAULTS.quality
    if (dirty) {
      startedRef.current = true
      track("tool_started", { tool_slug: "ai-cost-comparator", locale })
    }
  }, [useCaseId, volume, quality, locale])

  const useCase = USE_CASES.find((u) => u.id === useCaseId)!

  // ----- Compute per-model monthly cost ---------------------------------
  const rows = React.useMemo(() => {
    const mult = QUALITY_MULT[quality]
    const inputTok  = useCase.inputTok  * mult
    const outputTok = useCase.outputTok * mult

    const eligible = MODELS.filter((m) => modelEligible(m, quality))

    const computed = eligible.map((m) => {
      const perItemCost =
        (inputTok  * m.inPer1M  + outputTok * m.outPer1M) / 1_000_000
      const monthlyCost = perItemCost * volume
      return { model: m, perItemCost, monthlyCost, inputTok, outputTok }
    })

    computed.sort((a, b) => a.monthlyCost - b.monthlyCost)
    return computed
  }, [useCaseId, volume, quality, useCase.inputTok, useCase.outputTok])

  const maxCost = rows.length > 0 ? rows[rows.length - 1].monthlyCost : 0
  const recommended = rows[0]

  return (
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1fr_minmax(0,560px)]">
      {/* ===================================================================
          LEFT COLUMN — Form
          =================================================================== */}
      <form
        onSubmit={(e) => e.preventDefault()}
        aria-label="AI cost inputs"
        className="flex flex-col gap-6"
      >
        {/* Use case */}
        <fieldset>
          <legend className="text-[13px] font-medium text-[var(--text-primary)]">
            {strings.inputs.useCase}
          </legend>
          <div
            role="radiogroup"
            aria-label={strings.inputs.useCase}
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            {USE_CASES.map((u) => (
              <button
                type="button"
                key={u.id}
                role="radio"
                aria-checked={useCaseId === u.id}
                onClick={() => setUseCaseId(u.id)}
                className={cn(
                  "inline-flex h-11 items-center justify-start rounded-md border px-3 text-[13px] font-medium text-left",
                  "transition-[background-color,border-color,color] duration-150",
                  useCaseId === u.id
                    ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_12%,transparent)] text-[var(--text-primary)]"
                    : "border-[var(--border-base)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
                )}
              >
                {strings.useCaseLabels[u.id]}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Volume */}
        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-[var(--text-primary)]">
              {strings.inputs.volume}
            </span>
            <span className="font-mono text-[15px] tabular-nums text-[var(--text-primary)]">
              {formatNumber(volume, { locale })}
              <span className="ml-1 text-[var(--text-tertiary)] text-[12px]">
                {strings.itemsPerMonth}
              </span>
            </span>
          </span>
          <input
            type="range"
            min={50}
            max={50_000}
            step={50}
            value={volume}
            aria-label={strings.inputs.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="mt-3 w-full appearance-none bg-transparent cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg-surface)] [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--brand)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--bg-surface)]"
            style={{
              background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${((volume - 50) / (50_000 - 50)) * 100}%, var(--bg-muted) ${((volume - 50) / (50_000 - 50)) * 100}%, var(--bg-muted) 100%)`,
              height: 6,
              borderRadius: 9999,
            }}
          />
        </label>

        {/* Quality tier */}
        <fieldset>
          <legend className="text-[13px] font-medium text-[var(--text-primary)]">
            {strings.inputs.quality}
          </legend>
          <div role="radiogroup" className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(QUALITY_MULT) as QualityId[]).map((q) => (
              <button
                type="button"
                key={q}
                role="radio"
                aria-checked={quality === q}
                onClick={() => setQuality(q)}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-md border px-3 text-[13px] font-medium",
                  "transition-[background-color,border-color,color] duration-150",
                  quality === q
                    ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_12%,transparent)] text-[var(--text-primary)]"
                    : "border-[var(--border-base)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
                )}
              >
                {strings.qualityLabels[q]}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="flex gap-2 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <span>
            {strings.tokenLine
              .replace(
                "{tokens}",
                `${formatNumber(useCase.inputTok * QUALITY_MULT[quality], { locale, maximumFractionDigits: 0 })} → ${formatNumber(useCase.outputTok * QUALITY_MULT[quality], { locale, maximumFractionDigits: 0 })}`,
              )}
          </span>
        </p>
      </form>

      {/* ===================================================================
          RIGHT COLUMN — Bar chart + recommendation
          =================================================================== */}
      <div className="lg:sticky lg:top-24 lg:self-start">
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
            {strings.resultEyebrow}
          </p>
          <p className="relative mt-3 text-[12px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            {strings.totalLabel}
          </p>

          {/* Bar chart */}
          <ul role="list" className="relative mt-4 flex flex-col gap-3">
            {rows.map((r) => {
              const width = maxCost > 0 ? (r.monthlyCost / maxCost) * 100 : 0
              const isWinner = r === recommended
              return (
                <li
                  key={r.model.id}
                  aria-label={`${r.model.name} — ${formatPrice(r.monthlyCost, { locale })} per month`}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span
                      className={cn(
                        "min-w-0 truncate",
                        isWinner
                          ? "font-semibold text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]",
                      )}
                    >
                      {r.model.name}
                      <span className="ml-2 font-mono text-[11px] text-[var(--text-tertiary)]">
                        {r.model.provider}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[14px] tabular-nums whitespace-nowrap",
                        isWinner ? "text-[var(--brand)]" : "text-[var(--text-primary)]",
                      )}
                    >
                      {formatPrice(r.monthlyCost, { locale, maximumFractionDigits: r.monthlyCost < 10 ? 2 : 0 })}
                      <span className="text-[var(--text-tertiary)] ml-0.5">/mo</span>
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out-expo)]"
                      style={{
                        width: `${Math.max(width, 2)}%`,
                        background: isWinner
                          ? "linear-gradient(90deg, #34D399, #10B981)"
                          : "color-mix(in oklch, var(--text-tertiary) 60%, transparent)",
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Recommended */}
          {recommended && (
            <div className="relative mt-6 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {strings.recommendedLabel}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-[var(--text-primary)]">
                {recommended.model.name}{" "}
                <span className="font-mono text-[12px] font-normal text-[var(--text-tertiary)]">
                  {formatPrice(recommended.perItemCost, { locale, maximumFractionDigits: 4 })} / {strings.perItemLabel}
                </span>
              </p>
              {recommended.model.affiliate ? (
                <Link
                  href={`${localePrefix}/go/${recommended.model.slug}?utm_campaign=ai-cost-comparator`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "cta", size: "sm" }),
                    "mt-3 w-full h-10 text-[13px] justify-between",
                  )}
                >
                  <span>{strings.recommendedCta.replace("{name}", recommended.model.name)}</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          )}

          <p className="relative mt-5 flex gap-2 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              {strings.methodologyText}{" "}
              <Link
                href={`${localePrefix}/methodology`}
                className="underline-offset-4 hover:underline text-[var(--text-secondary)]"
              >
                {strings.methodologyLink}
              </Link>
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
