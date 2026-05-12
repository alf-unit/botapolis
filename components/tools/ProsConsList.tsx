import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   ProsConsList
   ----------------------------------------------------------------------------
   Two-column layout on desktop, stacked on mobile. Staggered entrance via
   CSS animation-delay so the list reveals top-to-bottom on first paint.
   The animation respects `prefers-reduced-motion` automatically via the
   global rule in app/globals.css.
---------------------------------------------------------------------------- */

interface ProsConsListProps {
  pros: string[]
  cons: string[]
  /** Section headings — pass locale-specific strings from the page. */
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
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6",
        className,
      )}
    >
      <Column
        kind="pro"
        label={prosLabel}
        items={pros}
        icon={<Check className="size-3.5" strokeWidth={2.4} />}
      />
      <Column
        kind="con"
        label={consLabel}
        items={cons}
        icon={<X className="size-3.5" strokeWidth={2.4} />}
      />
    </div>
  )
}

interface ColumnProps {
  kind: "pro" | "con"
  label: string
  items: string[]
  icon: React.ReactNode
}

function Column({ kind, label, items, icon }: ColumnProps) {
  const isPro = kind === "pro"
  const accent = isPro ? "var(--success)" : "var(--danger)"

  return (
    <section
      aria-labelledby={`prosconsheading-${kind}`}
      className={cn(
        "rounded-2xl border p-5 lg:p-6",
        isPro
          ? "border-[color-mix(in_oklch,var(--success)_25%,transparent)] bg-[color-mix(in_oklch,var(--success)_5%,transparent)]"
          : "border-[color-mix(in_oklch,var(--danger)_22%,transparent)]  bg-[color-mix(in_oklch,var(--danger)_4%,transparent)]",
      )}
    >
      <h3
        id={`prosconsheading-${kind}`}
        className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] font-mono"
        style={{ color: accent }}
      >
        <span
          className="inline-flex size-5 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
        {label}
      </h3>

      <ul className="mt-4 flex flex-col gap-2.5">
        {items.length === 0 && (
          <li className="text-sm text-[var(--text-tertiary)] italic">
            {isPro ? "No standouts noted yet." : "No serious downsides found."}
          </li>
        )}
        {items.map((item, i) => (
          <li
            key={`${kind}-${i}`}
            className={cn(
              "flex gap-2.5 text-[15px] leading-[1.55] text-[var(--text-primary)]",
              // Staggered fade-in — CSS only, no JS.
              "[animation:proscon-in_var(--duration-medium,400ms)_var(--ease-out-expo,cubic-bezier(0.16,1,0.3,1))_both]",
            )}
            style={{ animationDelay: `${i * 40 + 80}ms` }}
          >
            <span
              aria-hidden="true"
              className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in oklch, ${accent} 18%, transparent)`,
                color: accent,
              }}
            >
              {isPro
                ? <Check className="size-3" strokeWidth={2.6} />
                : <X     className="size-3" strokeWidth={2.6} />
              }
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <style>{`
        @keyframes proscon-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
