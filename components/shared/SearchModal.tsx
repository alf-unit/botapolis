"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, Layers, Loader2, Search, Sparkles, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics/events"

/* ----------------------------------------------------------------------------
   <SearchModal>
   ----------------------------------------------------------------------------
   Cmd+K palette backed by the Pagefind static search index built at
   deploy time (see scripts/build-search-index.ts). Lives at the root of
   the layout tree so any keyboard shortcut from any page hits it.

   Why Pagefind:
     - Index ships as static JSON + WASM (~700KB) — no API round-trip per
       keystroke, so search feels instant even on flaky mobile networks.
     - The same index covers MDX articles, Supabase tools, and comparison
       pages because the build script feeds them all via Pagefind's Node
       API (no on-disk HTML needed).
     - No ongoing server cost; no Supabase row reads per search.

   Why we DON'T use Pagefind's default UI module:
     - It ships its own button + result template with inline CSS that
       doesn't match the Botapolis design system.
     - Custom JS is 200 lines; the upside is full control over keyboard
       nav, result grouping, and locale-aware filtering.

   The Pagefind runtime is dynamically imported on first open — bundling
   it into the main page chunks would add ~30KB to every page even for
   visitors who never invoke search.
---------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Pagefind runtime types — just enough of the API surface to compile.
// The actual library is loaded at runtime from /pagefind/pagefind.js.
// ---------------------------------------------------------------------------
interface PagefindResultSub {
  id:       string
  data:     () => Promise<PagefindResultData>
}
interface PagefindResultData {
  url:      string
  excerpt:  string
  meta:     {
    title?:       string
    description?: string
    image?:       string
    type?:        string
  }
  filters?: Record<string, string[]>
}
interface PagefindSearchResult {
  results: PagefindResultSub[]
}
interface PagefindModule {
  search(query: string, opts?: { filters?: Record<string, unknown> }): Promise<PagefindSearchResult>
  init?(): Promise<void>
  options?(opts: { baseUrl?: string; bundlePath?: string }): Promise<void>
}

type ResultGroup = "tool" | "review" | "guide" | "comparison" | "other"

interface ResultCard {
  id:          string
  url:         string
  title:       string
  description: string
  excerpt:     string
  group:       ResultGroup
}

const GROUP_LABEL: Record<ResultGroup, { en: string; ru: string; icon: React.ComponentType<{ className?: string }> }> = {
  tool:       { en: "Tools",       ru: "Инструменты", icon: Sparkles  },
  review:     { en: "Reviews",     ru: "Обзоры",      icon: FileText  },
  guide:      { en: "Guides",      ru: "Гайды",       icon: FileText  },
  comparison: { en: "Compare",     ru: "Сравнения",   icon: Layers    },
  other:      { en: "Other",       ru: "Другое",       icon: Search    },
}

const GROUP_ORDER: ResultGroup[] = ["tool", "review", "guide", "comparison", "other"]

// ---------------------------------------------------------------------------
// Singleton Pagefind loader — fetch once, reuse across opens.
// ---------------------------------------------------------------------------
let pagefindPromise: Promise<PagefindModule | null> | null = null

async function loadPagefind(): Promise<PagefindModule | null> {
  if (pagefindPromise) return pagefindPromise
  pagefindPromise = (async () => {
    try {
      // Vite/webpack would try to resolve this at build time; @vite-ignore
      // and webpackIgnore tell the bundler to leave it alone. The actual
      // file is served by Next from /public/pagefind/ at runtime.
      const mod = await import(
        /* webpackIgnore: true */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — Pagefind ships no TS types for the browser entry
        "/pagefind/pagefind.js"
      ) as PagefindModule
      // Older Pagefind builds expose .init(); newer ones load lazily.
      if (typeof mod.init === "function") await mod.init()
      return mod
    } catch (err) {
      // Most common cause: deploy hasn't yet had a build with the postbuild
      // script enabled. The component degrades to a "search unavailable"
      // empty state — but doesn't break the page.
      console.error("[SearchModal] failed to load Pagefind:", err)
      return null
    }
  })()
  return pagefindPromise
}

// ---------------------------------------------------------------------------
// Result normaliser — Pagefind hands us back raw fragments, we map them to
// the typed ResultCard the UI renders.
// ---------------------------------------------------------------------------
async function fetchResults(
  module: PagefindModule,
  query: string,
): Promise<ResultCard[]> {
  if (query.trim().length < 2) return []
  const search = await module.search(query)
  const all = await Promise.all(
    search.results.slice(0, 20).map(async (r) => {
      const data = await r.data()
      const group = pickGroup(data.meta?.type ?? data.filters?.type?.[0])
      return {
        id:          r.id,
        url:         data.url,
        title:       data.meta?.title ?? data.url,
        description: data.meta?.description ?? "",
        excerpt:     data.excerpt,
        group,
      } satisfies ResultCard
    }),
  )
  return all
}

function pickGroup(rawType: string | undefined): ResultGroup {
  switch (rawType) {
    case "tool":       return "tool"
    case "review":     return "review"
    case "guide":      return "guide"
    case "comparison": return "comparison"
    default:           return "other"
  }
}

// ===========================================================================
// Component
// ===========================================================================
export interface SearchModalStrings {
  triggerLabel:    string
  placeholder:     string
  closeLabel:      string
  emptyTitle:      string
  emptyBody:       string
  loadingError:    string
  noResultsTitle:  string
  noResultsBody:   string
  resultsLabel:    string
}

interface SearchModalProps {
  strings:      SearchModalStrings
  locale:       "en" | "ru"
  open:         boolean
  onClose:      () => void
}

export function SearchModal({ strings, locale, open, onClose }: SearchModalProps) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<ResultCard[] | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [loadStatus, setLoadStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const lastQueryRef = React.useRef("")

  // ----- Focus input + reset state when opening ----------------------------
  React.useEffect(() => {
    if (!open) return
    // Reset state per session — if the user types, navigates, comes back,
    // we want a fresh palette, not stale results.
    setQuery("")
    setResults(null)
    setActiveIndex(0)
    setLoadStatus("idle")
    // requestAnimationFrame because Sheet/Dialog content can mount one
    // tick before the input is focusable.
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  // ----- Debounced search --------------------------------------------------
  React.useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(null)
      lastQueryRef.current = ""
      return
    }
    if (trimmed === lastQueryRef.current) return

    let cancelled = false
    setLoadStatus("loading")
    const timer = window.setTimeout(async () => {
      const mod = await loadPagefind()
      if (cancelled) return
      if (!mod) {
        setLoadStatus("error")
        return
      }
      try {
        const next = await fetchResults(mod, trimmed)
        if (cancelled) return
        setResults(next)
        setActiveIndex(0)
        setLoadStatus("idle")
        lastQueryRef.current = trimmed
        track("search_performed", {
          query_length: trimmed.length,
          result_count: next.length,
          locale,
        })
      } catch (err) {
        if (cancelled) return
        console.error("[SearchModal] search failed:", err)
        setLoadStatus("error")
      }
    }, 150)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query, locale])

  // ----- Keyboard handlers -------------------------------------------------
  const flatResults = results ?? []
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!open) return
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (flatResults.length === 0) return
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === "Enter") {
      const r = flatResults[activeIndex]
      if (r) {
        e.preventDefault()
        onClose()
        router.push(r.url)
      }
    }
  }

  // ----- Group results -----------------------------------------------------
  const grouped = React.useMemo(() => {
    if (!results) return [] as Array<{ group: ResultGroup; items: ResultCard[] }>
    const map = new Map<ResultGroup, ResultCard[]>()
    for (const r of results) {
      const bucket = map.get(r.group) ?? []
      bucket.push(r)
      map.set(r.group, bucket)
    }
    return GROUP_ORDER.flatMap((g) => {
      const items = map.get(g)
      return items && items.length > 0 ? [{ group: g, items }] : []
    })
  }, [results])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 lg:pt-[10vh]"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={strings.closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_oklch,var(--bg-base)_85%,transparent)] backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full max-w-2xl rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
          "shadow-[var(--shadow-xl)] overflow-hidden",
        )}
      >
        <h2 id="search-modal-title" className="sr-only">
          {strings.triggerLabel}
        </h2>

        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--border-base)] px-5 h-14">
          <Search className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={strings.placeholder}
            className={cn(
              "flex-1 bg-transparent outline-none border-none",
              "text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
            )}
            autoComplete="off"
            spellCheck={false}
          />
          {loadStatus === "loading" && (
            <Loader2 className="size-4 text-[var(--text-tertiary)] animate-spin" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.closeLabel}
            className="inline-flex size-7 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Empty state — no query yet */}
          {query.trim().length < 2 && (
            <div className="px-6 py-10 text-center">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {strings.emptyTitle}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                {strings.emptyBody}
              </p>
            </div>
          )}

          {/* Load error (Pagefind missing) */}
          {loadStatus === "error" && (
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-[var(--text-secondary)]">{strings.loadingError}</p>
            </div>
          )}

          {/* No results for query */}
          {results && results.length === 0 && loadStatus !== "loading" && (
            <div className="px-6 py-10 text-center">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {strings.noResultsTitle}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                {strings.noResultsBody}
              </p>
            </div>
          )}

          {/* Result groups */}
          {grouped.map(({ group, items }) => (
            <section key={group} className="px-2 py-3 border-t border-[var(--border-subtle)] first:border-t-0">
              <h3 className="px-3 mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-semibold">
                {locale === "ru" ? GROUP_LABEL[group].ru : GROUP_LABEL[group].en}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const overallIndex = flatResults.indexOf(item)
                  const isActive = overallIndex === activeIndex
                  const Icon = GROUP_LABEL[group].icon
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.url}
                        onClick={onClose}
                        onMouseEnter={() => setActiveIndex(overallIndex)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl px-3 py-2.5",
                          isActive
                            ? "bg-[var(--bg-muted)]"
                            : "hover:bg-[var(--bg-muted)]/60",
                        )}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] line-clamp-1">
                            {item.title}
                          </p>
                          {item.excerpt && (
                            <p
                              className={cn(
                                "mt-0.5 text-[12.5px] leading-[1.45] text-[var(--text-secondary)] line-clamp-2",
                                // Pagefind wraps the matched query in <mark> tags; bring them
                                // to brand colour rather than the default yellow highlight.
                                "[&_mark]:bg-transparent [&_mark]:text-[var(--brand)] [&_mark]:font-semibold",
                              )}
                              dangerouslySetInnerHTML={{ __html: item.excerpt }}
                            />
                          )}
                        </div>
                        <ArrowRight className="mt-1.5 size-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between gap-4 border-t border-[var(--border-base)] bg-[var(--bg-muted)] px-5 py-2.5 text-[11px] font-mono text-[var(--text-tertiary)]">
          <div className="flex items-center gap-3">
            <KeyHint>↵</KeyHint>
            <span>{locale === "ru" ? "открыть" : "open"}</span>
            <KeyHint>↑↓</KeyHint>
            <span>{locale === "ru" ? "навигация" : "nav"}</span>
            <KeyHint>esc</KeyHint>
            <span>{locale === "ru" ? "закрыть" : "close"}</span>
          </div>
          <div>{strings.resultsLabel}</div>
        </div>
      </div>
    </div>
  )
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded border border-[var(--border-base)] bg-[var(--bg-surface)] px-1.5 font-mono text-[10px] text-[var(--text-secondary)]">
      {children}
    </kbd>
  )
}
