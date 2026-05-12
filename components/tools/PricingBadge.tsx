import { cn, formatPrice } from "@/lib/utils"
import type { ToolPricingModel } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   PricingBadge
   ----------------------------------------------------------------------------
   One-glance pricing tag for tool cards and hero blocks.

     Free          → mint pill
     Freemium      → mint pill with "Free tier" subtext
     Subscription  → "$10–$900/mo" range with neutral pill
     One-time      → "$199 once" with neutral pill
     Enterprise    → "Custom" pill

   We deliberately don't include currency: USD is the source of truth for
   every Shopify-ecosystem tool in our catalog, so localizing it would lie.
---------------------------------------------------------------------------- */

interface PricingBadgeProps {
  model: ToolPricingModel | null
  min?: number | null
  max?: number | null
  /** Optional editorial gloss, e.g. "/mo billed annually". Hidden on `sm`. */
  notes?: string | null
  size?: "sm" | "md"
  className?: string
}

export function PricingBadge({
  model,
  min,
  max,
  notes,
  size = "md",
  className,
}: PricingBadgeProps) {
  const isFree     = model === "free"
  const isFreemium = model === "freemium"
  const isEnt      = model === "enterprise"

  const range = formatRange(min, max, model)

  const tone =
    isFree || isFreemium
      ? "bg-[color-mix(in_oklch,var(--brand)_12%,transparent)] text-[var(--brand)] border-[color-mix(in_oklch,var(--brand)_25%,transparent)]"
      : isEnt
        ? "bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-base)]"
        : "bg-[var(--bg-muted)] text-[var(--text-primary)] border-[var(--border-base)]"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]",
        tone,
        className,
      )}
    >
      <span className="capitalize">{labelFor(model)}</span>
      {range && (
        <>
          <span className="opacity-40" aria-hidden="true">·</span>
          <span className="font-mono tracking-tight">{range}</span>
        </>
      )}
      {size === "md" && notes && (
        <span className="text-[var(--text-tertiary)] font-normal">
          {notes}
        </span>
      )}
    </span>
  )
}

function labelFor(model: ToolPricingModel | null): string {
  switch (model) {
    case "free":          return "Free"
    case "freemium":      return "Freemium"
    case "subscription":  return "Subscription"
    case "one_time":      return "One-time"
    case "enterprise":    return "Custom"
    default:              return "Pricing"
  }
}

function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  model: ToolPricingModel | null,
): string | null {
  if (model === "free")       return null
  if (model === "enterprise") return null
  if (min == null && max == null) return null

  const minLabel = min != null ? formatPrice(min) : null
  const maxLabel = max != null ? formatPrice(max) : null

  if (model === "freemium" && (min == null || min === 0)) {
    return maxLabel ? `Free → ${maxLabel}/mo` : "Free tier"
  }

  if (minLabel && maxLabel && minLabel !== maxLabel) {
    return `${minLabel}–${maxLabel}/mo`
  }
  if (minLabel) return `${minLabel}/mo`
  if (maxLabel) return `${maxLabel}/mo`
  return null
}
