import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolFeature } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   FeaturesList
   ----------------------------------------------------------------------------
   Renders a tool's features array as a clean two-column checklist (single
   column on mobile). Each row is a name + optional description; tools where
   a feature isn't included render with a muted minus icon instead of mint.
---------------------------------------------------------------------------- */

interface FeaturesListProps {
  features: ToolFeature[]
  /** Force single column even on desktop (useful inside narrow side panels). */
  dense?: boolean
  className?: string
}

export function FeaturesList({
  features,
  dense = false,
  className,
}: FeaturesListProps) {
  if (!features?.length) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] italic">
        No feature breakdown captured yet.
      </p>
    )
  }

  return (
    <ul
      className={cn(
        "grid gap-x-6 gap-y-4",
        dense ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        className,
      )}
    >
      {features.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className={cn(
            "flex gap-3 items-start",
            !f.included && "opacity-60",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
              f.included
                ? "text-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_12%,transparent)]"
                : "text-[var(--text-tertiary)] bg-[var(--bg-muted)]",
            )}
          >
            {f.included
              ? <Check className="size-3.5" strokeWidth={2.4} />
              : <Minus className="size-3.5" strokeWidth={2.4} />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium leading-snug text-[var(--text-primary)]">
              {f.name}
              {!f.included && (
                <span className="ml-2 text-[11px] uppercase tracking-[0.06em] font-mono text-[var(--text-tertiary)]">
                  not included
                </span>
              )}
            </p>
            {f.description && (
              <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                {f.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
