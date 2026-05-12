import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <ProsConsList>
   ----------------------------------------------------------------------------
   Two-column verdict block. Used inside review/guide MDX (as the
   <ProsConsList pros={…} cons={…} /> shortcode) AND as a standalone server
   component from page shells that already pull pros/cons out of frontmatter.

   Always two columns side-by-side on tablet+, stacks on mobile. Empty arrays
   collapse the column — never render an empty card.
---------------------------------------------------------------------------- */

interface ProsConsListProps {
  pros: string[]
  cons: string[]
  /** Locale-aware column titles. Defaults to English. */
  prosLabel?: string
  consLabel?: string
  className?: string
}

export function ProsConsList({
  pros,
  cons,
  prosLabel = "Pros",
  consLabel = "Cons",
  className,
}: ProsConsListProps) {
  if (pros.length === 0 && cons.length === 0) return null

  return (
    <div
      className={cn(
        "my-8 grid gap-4 md:grid-cols-2",
        className,
      )}
    >
      {pros.length > 0 && (
        <Column
          label={prosLabel}
          items={pros}
          tone="pros"
        />
      )}
      {cons.length > 0 && (
        <Column
          label={consLabel}
          items={cons}
          tone="cons"
        />
      )}
    </div>
  )
}

function Column({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: "pros" | "cons"
}) {
  const Icon = tone === "pros" ? Check : X
  const accent =
    tone === "pros"
      ? {
          chip:        "bg-[var(--accent-100)] text-[var(--accent-700)]",
          border:      "border-[var(--accent-200)]",
          iconBg:      "bg-[var(--accent-100)]",
          iconColor:   "text-[var(--accent-700)]",
        }
      : {
          chip:        "bg-[#FEE2E2] text-[#B91C1C]",
          border:      "border-[var(--border-base)]",
          iconBg:      "bg-[#FEE2E2]",
          iconColor:   "text-[#B91C1C]",
        }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--bg-surface)] p-5 lg:p-6 shadow-[var(--shadow-sm)]",
        accent.border,
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 items-center rounded-full px-2.5",
          "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
          accent.chip,
        )}
      >
        {label}
      </span>
      <ul role="list" className="mt-4 flex flex-col gap-3">
        {items.map((item, i) => (
          <li
            key={`${tone}-${i}`}
            className="flex items-start gap-3 text-[15px] leading-[1.55] text-[var(--text-primary)]"
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                accent.iconBg,
              )}
            >
              <Icon className={cn("size-3", accent.iconColor)} strokeWidth={3} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
