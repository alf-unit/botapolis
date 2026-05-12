"use client"

import * as React from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ToolRow } from "@/lib/supabase/types"
import { ToolCard } from "./ToolCard"

/* ----------------------------------------------------------------------------
   ToolsCatalog
   ----------------------------------------------------------------------------
   Client island that owns the filter state. The server component above
   passes `tools` already pre-sorted (Featured DESC, rating DESC); we only
   filter and never re-sort here, so the SSR HTML matches the first paint.

   Categories are derived from the dataset so the chip row stays accurate as
   the catalog grows without code changes.
---------------------------------------------------------------------------- */

type ToolForCard = Pick<
  ToolRow,
  | "slug" | "name" | "tagline" | "logo_url"
  | "category" | "rating" | "pricing_model" | "pricing_min" | "pricing_max"
  | "featured"
>

/**
 * Plural-aware count label. EN ships singular/plural; RU ships one/few/many
 * (1 инструмент / 2-4 инструмента / 5+ инструментов).
 * We can't pass a function from the server component, so we send the parts
 * and pick the right form here.
 */
export interface ResultsCountLabel {
  /** Used for n === 1 (or "one" form in RU). Must include "{n}". */
  one: string
  /** Used for plural / "many" form. Must include "{n}". */
  many: string
  /** Optional RU "few" form for n ending in 2-4 (excluding 12-14). */
  few?: string
}

interface ToolsCatalogProps {
  tools: ToolForCard[]
  /** EN: "", RU: "/ru". */
  localePrefix?: "" | "/ru"
  strings: {
    allCategories: string
    searchPlaceholder: string
    resultsCount: ResultsCountLabel
    empty: string
    clearFilters: string
    cta: string
  }
}

export function ToolsCatalog({
  tools,
  localePrefix = "",
  strings,
}: ToolsCatalogProps) {
  const [category, setCategory] = React.useState<string>("all")
  const [query, setQuery]       = React.useState("")
  // Trim search aggressively so toggles like "Backspace then retype" don't
  // re-render on every keystroke — 120ms is below the perception threshold.
  const debouncedQuery = useDebounced(query, 120)

  const categories = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tools) counts.set(t.category, (counts.get(t.category) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [tools])

  const filtered = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    return tools.filter((t) => {
      if (category !== "all" && t.category !== category) return false
      if (!q) return true
      const haystack = `${t.name} ${t.tagline ?? ""} ${t.category}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [tools, category, debouncedQuery])

  const hasFilters = category !== "all" || query.length > 0

  return (
    <section className="container-default py-10 lg:py-14">
      {/* Filter bar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchPlaceholder}
              className={cn(
                "h-10 w-full rounded-md border border-[var(--border-base)]",
                "bg-[var(--bg-surface)] pl-9 pr-9 text-sm",
                "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
                "outline-none transition-shadow",
                "focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--focus-ring)]",
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-6 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] font-mono">
            <SlidersHorizontal className="size-3.5" />
            {formatCount(filtered.length, strings.resultsCount)}
          </span>
        </div>

        {/* Category chips — horizontal scroll on mobile, wrap on desktop */}
        <div
          role="tablist"
          aria-label="Categories"
          className={cn(
            "-mx-4 px-4 flex items-center gap-2 overflow-x-auto",
            "lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible",
            "scrollbar-none",
          )}
        >
          <CategoryChip
            label={strings.allCategories}
            count={tools.length}
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {categories.map(([cat, count]) => (
            <CategoryChip
              key={cat}
              label={cat}
              count={count}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 lg:mt-10">
        {filtered.length === 0 ? (
          <EmptyState
            message={strings.empty}
            actionLabel={strings.clearFilters}
            onAction={() => {
              setCategory("all")
              setQuery("")
            }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.slug}
                tool={tool}
                localePrefix={localePrefix}
                cta={strings.cta}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-pieces
// ---------------------------------------------------------------------------
interface CategoryChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function CategoryChip({ label, count, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
        "transition-colors duration-150",
        active
          ? "bg-[var(--brand)] text-[var(--brand-fg)] border-transparent"
          : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-base)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]",
      )}
    >
      <span className="capitalize">{label}</span>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums",
          active ? "opacity-80" : "text-[var(--text-tertiary)]",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border-base)] py-16 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--bg-muted)]"
      >
        <Search className="size-5 text-[var(--text-tertiary)]" />
      </span>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs">{message}</p>
      <Button variant="outline" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pluralisation — chooses the right slot and substitutes "{n}".
// ---------------------------------------------------------------------------
function formatCount(n: number, label: ResultsCountLabel): string {
  // If `few` is supplied (RU), use Slavic rules; otherwise EN binary.
  if (label.few) {
    const mod10  = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return label.one.replace("{n}", String(n))
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
      return label.few.replace("{n}", String(n))
    return label.many.replace("{n}", String(n))
  }
  return (n === 1 ? label.one : label.many).replace("{n}", String(n))
}

// ---------------------------------------------------------------------------
// Tiny local debounce — fewer deps, narrower contract than lodash.
// ---------------------------------------------------------------------------
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
