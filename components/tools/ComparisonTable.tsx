import { Check, Minus, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   ComparisonTable
   ----------------------------------------------------------------------------
   Three-column feature matrix: Feature · Tool A · Tool B.

     - Desktop (≥md): classic <table> with sticky header and zebra rows.
     - Mobile (<md):  the same data restacked as labelled cards (one card per
       row), feature name → small caps eyebrow, then both tool values in a
       two-column grid. We deliberately picked stacked cards over a true
       accordion because the rows are short and an accordion's extra tap step
       only helps when each row hides a lot of body copy.

   Cell value type:
     - `true`  → green check mark
     - `false` → red X
     - `null`  → muted dash (unknown / not applicable)
     - string  → rendered verbatim (e.g. "2,000 contacts", "$29/mo")
---------------------------------------------------------------------------- */

export type ComparisonCellValue = boolean | string | null

export interface ComparisonFeatureRow {
  /** Feature name shown in the leftmost column. */
  feature: string
  /** Value for Tool A (boolean = supported, string = quantitative). */
  a: ComparisonCellValue
  /** Value for Tool B. */
  b: ComparisonCellValue
  /** Optional tiny footnote rendered under the feature name. */
  note?: string
}

interface ComparisonTableProps {
  toolA: { name: string; slug?: string }
  toolB: { name: string; slug?: string }
  rows: ComparisonFeatureRow[]
  /** Localized column header for the feature axis. Defaults to "Feature". */
  featureHeader?: string
  /** Accessible caption read by screen readers. */
  caption?: string
  className?: string
}

export function ComparisonTable({
  toolA,
  toolB,
  rows,
  featureHeader = "Feature",
  caption,
  className,
}: ComparisonTableProps) {
  if (rows.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] overflow-hidden",
        className,
      )}
    >
      {/* ===================================================================
          Desktop / tablet: real table
          =================================================================== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-[var(--bg-muted)]">
            <tr className="border-b border-[var(--border-base)]">
              <th
                scope="col"
                className="h-12 px-5 text-left text-[11px] font-mono font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
                style={{ width: "44%" }}
              >
                {featureHeader}
              </th>
              <th
                scope="col"
                className="h-12 px-5 text-left text-[13px] font-semibold text-[var(--text-primary)]"
              >
                {toolA.name}
              </th>
              <th
                scope="col"
                className="h-12 px-5 text-left text-[13px] font-semibold text-[var(--text-primary)]"
              >
                {toolB.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.feature}-${i}`}
                className={cn(
                  "border-b border-[var(--border-subtle)] last:border-b-0",
                  i % 2 === 1 &&
                    "bg-[color-mix(in_oklch,var(--bg-muted)_45%,transparent)]",
                )}
              >
                <th
                  scope="row"
                  className="px-5 py-4 align-top text-left font-medium text-[var(--text-primary)]"
                >
                  <span className="text-[14px] leading-[1.45]">
                    {row.feature}
                  </span>
                  {row.note && (
                    <span className="mt-1 block text-[12px] leading-[1.4] text-[var(--text-tertiary)]">
                      {row.note}
                    </span>
                  )}
                </th>
                <td className="px-5 py-4 align-top">
                  <Cell value={row.a} />
                </td>
                <td className="px-5 py-4 align-top">
                  <Cell value={row.b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===================================================================
          Mobile: restack each row as a labelled card
          =================================================================== */}
      <ul className="md:hidden flex flex-col divide-y divide-[var(--border-subtle)]">
        {rows.map((row, i) => (
          <li key={`${row.feature}-mobile-${i}`} className="flex flex-col gap-3 p-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                {featureHeader}
              </p>
              <p className="mt-1 text-[14px] font-medium leading-[1.45] text-[var(--text-primary)]">
                {row.feature}
              </p>
              {row.note && (
                <p className="mt-1 text-[12px] leading-[1.4] text-[var(--text-tertiary)]">
                  {row.note}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileCell label={toolA.name} value={row.a} />
              <MobileCell label={toolB.name} value={row.b} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cell renderer — desktop. Booleans become an icon chip; strings render as
// monospaced figures so prices and counts align across rows.
// ---------------------------------------------------------------------------
function Cell({ value }: { value: ComparisonCellValue }) {
  if (value === true) return <IconChip variant="yes" />
  if (value === false) return <IconChip variant="no" />
  if (value == null) {
    return (
      <span
        aria-label="not applicable"
        className="inline-flex items-center text-[var(--text-tertiary)]"
      >
        <Minus className="size-4" strokeWidth={2} />
      </span>
    )
  }
  return (
    <span className="font-mono text-[13px] leading-[1.5] text-[var(--text-primary)]">
      {value}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Cell renderer — mobile. Same value vocabulary, with the tool name above
// so each cell is self-describing without relying on column position.
// ---------------------------------------------------------------------------
function MobileCell({
  label,
  value,
}: {
  label: string
  value: ComparisonCellValue
}) {
  return (
    <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-muted)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <div className="mt-1.5">
        <Cell value={value} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icon chip — semantic check / cross. Matches the rest of the design system:
// tinted background, brand-colored stroke, never just a raw icon (icon-only
// would fail color-contrast for the "no" state on some monitors).
// ---------------------------------------------------------------------------
function IconChip({ variant }: { variant: "yes" | "no" }) {
  const yes = variant === "yes"
  return (
    <span
      aria-label={yes ? "yes" : "no"}
      className="inline-flex size-6 items-center justify-center rounded-full"
      style={{
        background: yes
          ? "color-mix(in oklch, var(--success) 16%, transparent)"
          : "color-mix(in oklch, var(--danger)  16%, transparent)",
        color: yes ? "var(--success)" : "var(--danger)",
      }}
    >
      {yes ? (
        <Check className="size-3.5" strokeWidth={2.5} />
      ) : (
        <X className="size-3.5" strokeWidth={2.5} />
      )}
    </span>
  )
}
