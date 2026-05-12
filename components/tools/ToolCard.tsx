import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn, truncate } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"
import { ToolLogo } from "./ToolLogo"
import { RatingStars } from "./RatingStars"
import { PricingBadge } from "./PricingBadge"

/* ----------------------------------------------------------------------------
   ToolCard
   ----------------------------------------------------------------------------
   The catalog grid cell. Wraps the entire surface in a <Link> so the whole
   card is one click target — better Fitts'-law ergonomics than nesting CTAs.
   Hover lifts the card, fades a mint glow underneath, and slides the CTA
   arrow. The aria-label captures everything the link does so screen readers
   don't have to walk all the badges to know what they're tapping.

   We accept the full `ToolRow` because that's what `select("*")` returns and
   it keeps call-sites typed without bespoke `Pick<>` shapes.
---------------------------------------------------------------------------- */

interface ToolCardProps {
  tool: Pick<
    ToolRow,
    | "slug" | "name" | "tagline" | "logo_url"
    | "category" | "rating" | "pricing_model" | "pricing_min" | "pricing_max"
    | "featured"
  >
  /** Locale prefix for the link (`""` for EN, `"/ru"` for RU). */
  localePrefix?: "" | "/ru"
  /** CTA label, e.g. "View tool". Localized by the page. */
  cta?: string
  className?: string
}

export function ToolCard({
  tool,
  localePrefix = "",
  cta = "View tool",
  className,
}: ToolCardProps) {
  const href = `${localePrefix}/tools/${tool.slug}`
  const isFeatured = tool.featured > 0

  return (
    <Link
      href={href}
      aria-label={`${tool.name}${tool.tagline ? ` — ${tool.tagline}` : ""}`}
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden",
        "rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
        "p-5 shadow-[var(--shadow-sm)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-expo)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
        // Brand glow on hover — visual reward without forcing layout shift.
        "focus-visible:shadow-[var(--shadow-glow)] focus-visible:outline-none",
        className,
      )}
    >
      {/* Atmospheric glow: hidden until hover */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-12 -right-8 size-40 rounded-full opacity-0 blur-3xl",
          "transition-opacity duration-300 group-hover:opacity-100",
        )}
        style={{ background: "color-mix(in oklch, var(--brand) 28%, transparent)" }}
      />

      {/* Header: logo + featured pip */}
      <div className="relative flex items-start justify-between gap-3">
        <ToolLogo
          src={tool.logo_url}
          name={tool.name}
          size={48}
          className="shrink-0"
        />
        {isFeatured && (
          <span
            className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-mono font-medium uppercase tracking-[0.06em]"
            style={{
              background: "var(--gradient-hero)",
              color: "#FFFFFF",
              borderColor: "transparent",
            }}
          >
            Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="relative flex flex-col gap-1.5 min-w-0">
        <h3 className="text-[18px] font-semibold leading-snug text-[var(--text-primary)] tracking-[-0.01em]">
          {tool.name}
        </h3>
        {tool.tagline && (
          <p className="text-sm leading-[1.55] text-[var(--text-secondary)]">
            {truncate(tool.tagline, 110)}
          </p>
        )}
      </div>

      {/* Spacer to push the foot down on tall cards */}
      <div className="flex-1" />

      {/* Meta row: rating · category */}
      <div className="relative flex items-center justify-between gap-3">
        <RatingStars rating={tool.rating} size="md" />
        <span
          className="inline-flex h-6 items-center rounded-full bg-[var(--bg-muted)] border border-[var(--border-base)] px-2 text-[11px] font-medium font-mono uppercase tracking-[0.06em] text-[var(--text-secondary)]"
        >
          {tool.category}
        </span>
      </div>

      {/* Foot: pricing pill · CTA */}
      <div className="relative flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <PricingBadge
          model={tool.pricing_model}
          min={tool.pricing_min}
          max={tool.pricing_max}
          size="sm"
        />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]",
            "transition-transform duration-200 group-hover:translate-x-0.5",
          )}
        >
          {cta}
          <ArrowUpRight className="size-4" strokeWidth={2} />
        </span>
      </div>
    </Link>
  )
}
