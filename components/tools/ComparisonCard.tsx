import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { cn, truncate } from "@/lib/utils"
import { ToolLogo } from "./ToolLogo"

/* ----------------------------------------------------------------------------
   ComparisonCard
   ----------------------------------------------------------------------------
   Grid cell for /compare/. Two logos with a "VS" pill between them, the
   comparison title (Tool A vs Tool B), an optional verdict line, then a CTA
   row. The whole surface is wrapped in <Link> for Fitts'-law-friendly clicks —
   same idiom as ToolCard so the catalog and compare grids feel like siblings.

   Server component (no client-only deps) — ToolLogo handles its own onError
   state internally so hover doesn't need a wrapper "use client".
---------------------------------------------------------------------------- */

export interface ComparisonCardTool {
  slug: string
  name: string
  logoUrl?: string | null
}

interface ComparisonCardProps {
  /** Slug of the comparison row, e.g. "klaviyo-vs-mailchimp". */
  slug: string
  toolA: ComparisonCardTool
  toolB: ComparisonCardTool
  /** Optional verdict line (markdown stripped to plain text by the caller). */
  verdict?: string | null
  /** Locale prefix for the href. `""` for EN, `"/ru"` for RU. */
  localePrefix?: "" | "/ru"
  /** Localized CTA label. Defaults to "Read comparison". */
  cta?: string
  /** Localized "Verdict" label prefix. */
  verdictLabel?: string
  className?: string
}

export function ComparisonCard({
  slug,
  toolA,
  toolB,
  verdict,
  localePrefix = "",
  cta = "Read comparison",
  verdictLabel = "Verdict",
  className,
}: ComparisonCardProps) {
  const href = `${localePrefix}/compare/${slug}`
  const title = `${toolA.name} vs ${toolB.name}`

  return (
    <Link
      href={href}
      aria-label={`${title}${verdict ? ` — ${truncate(verdict, 120)}` : ""}`}
      className={cn(
        "group relative flex h-full flex-col gap-5 overflow-hidden",
        "rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
        "p-5 lg:p-6 shadow-[var(--shadow-sm)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-expo)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
        "focus-visible:shadow-[var(--shadow-glow)] focus-visible:outline-none",
        className,
      )}
    >
      {/* Atmospheric mint glow — fades in on hover */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2",
          "size-48 rounded-full opacity-0 blur-3xl transition-opacity duration-300",
          "group-hover:opacity-100",
        )}
        style={{ background: "color-mix(in oklch, var(--brand) 26%, transparent)" }}
      />

      {/* Logos row */}
      <div className="relative flex items-center justify-between gap-3">
        <LogoCluster name={toolA.name} logoUrl={toolA.logoUrl} />
        <VsPill />
        <LogoCluster name={toolB.name} logoUrl={toolB.logoUrl} alignRight />
      </div>

      {/* Title */}
      <h3 className="relative text-[18px] lg:text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)]">
        {title}
      </h3>

      {/* Verdict */}
      {verdict && (
        <p className="relative flex-1 text-sm leading-[1.6] text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">
            {verdictLabel}:
          </span>{" "}
          {truncate(verdict, 180)}
        </p>
      )}

      {/* Footer CTA */}
      <div className="relative flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          {toolA.slug} · {toolB.slug}
        </span>
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

// ---------------------------------------------------------------------------
// Logo cluster — ToolLogo + name. Right-aligned variant flips the flexbox
// direction so the logo sits on the outside (mirroring across the VS pill).
// ---------------------------------------------------------------------------
function LogoCluster({
  name,
  logoUrl,
  alignRight = false,
}: {
  name: string
  logoUrl?: string | null
  alignRight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5",
        alignRight && "flex-row-reverse text-right",
      )}
    >
      <ToolLogo src={logoUrl} name={name} size={40} className="shrink-0" />
      <span className="truncate text-[15px] font-medium text-[var(--text-primary)]">
        {name}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// "VS" pill — small mono badge between the two tools. Pure CSS — no client
// state — so it stays in the server component tree.
// ---------------------------------------------------------------------------
function VsPill() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-full px-2.5",
        "font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
        "text-[var(--brand-fg)] shrink-0",
      )}
      style={{ background: "var(--gradient-cta)" }}
    >
      vs
    </span>
  )
}
