"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, FileText, Layers, Loader2, Search, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/events"

/* ----------------------------------------------------------------------------
   <SearchPageClient>
   ----------------------------------------------------------------------------
   The body of /search — replaces the Cmd+K modal as the discoverable
   search UX after the May 2026 launch revealed two problems with the
   palette pattern:

     1. CSP was missing `wasm-unsafe-eval`, so Pagefind's WASM compile
        failed silently in modern Chrome/Edge — search literally never
        returned results. (Fixed in next.config.ts.)
     2. The palette UX is "power-user" — most visitors don't know to
        press Cmd+K, and clicking the navbar button opened a modal
        instead of the conventional "input + button + results below"
        pattern visitors expect.

   This page-level component owns:
     - URL-synced `?q=` so search results are sharable + back-button-safe
     - A real <form> so Enter submits and screen readers announce it
     - The same Pagefind runtime the modal uses (loaded lazily on first
       query so visitors hitting /search just to look at the input don't
       pay the ~700 KB index download)
     - Result grouping by type (Tools / Reviews / Guides / Compare)

   The Cmd+K modal is no longer wired into the navbar — it can be
   restored later if power-users miss it, but the navbar's primary
   button now navigates here.
---------------------------------------------------------------------------- */

// ============================================================================
// Pagefind runtime — type shim mirrors the modal's. Two callsites only.
// ============================================================================
interface PagefindResultSub {
  id:   string
  data: () => Promise<PagefindResultData>
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
  search(query: string): Promise<PagefindSearchResult>
  init?(): Promise<void>
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

interface GroupMeta {
  en:   string
  ru:   string
  icon: React.ComponentType<{ className?: string }>
}

const GROUP_LABEL: Record<ResultGroup, GroupMeta> = {
  tool:       { en: "Tools",   ru: "Инструменты", icon: Sparkles },
  review:     { en: "Reviews", ru: "Обзоры",      icon: FileText },
  guide:      { en: "Guides",  ru: "Гайды",       icon: FileText },
  comparison: { en: "Compare", ru: "Сравнения",   icon: Layers   },
  other:      { en: "Other",   ru: "Другое",       icon: Search   },
}

const GROUP_ORDER: ResultGroup[] = ["tool", "review", "guide", "comparison", "other"]

// Module-level singleton so navigating away from /search and back doesn't
// re-download the index. Same pattern the modal used.
let pagefindPromise: Promise<PagefindModule | null> | null = null

async function loadPagefind(): Promise<PagefindModule | null> {
  if (pagefindPromise) return pagefindPromise
  pagefindPromise = (async () => {
    try {
      const mod = await import(
        /* webpackIgnore: true */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — Pagefind ships no TS types for the browser entry
        "/pagefind/pagefind.js"
      ) as PagefindModule
      if (typeof mod.init === "function") await mod.init()
      return mod
    } catch (err) {
      console.error("[SearchPage] failed to load Pagefind:", err)
      return null
    }
  })()
  return pagefindPromise
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

async function fetchResults(
  module: PagefindModule,
  query: string,
): Promise<ResultCard[]> {
  if (query.trim().length < 2) return []
  const search = await module.search(query)
  const all = await Promise.all(
    search.results.slice(0, 30).map(async (r) => {
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

// ============================================================================
// Strings (server → client). Kept as a flat shape so adding a new locale
// is a single object update.
// ============================================================================
export interface SearchPageStrings {
  title:           string
  lede:            string
  inputLabel:      string
  inputPlaceholder:string
  submit:          string
  tooShort:        string
  loadingError:    string
  noResultsTitle:  string
  noResultsBody:   string
  initialTitle:    string
  initialBody:     string
  resultsCount:    { one: string; few?: string; many: string }
  searchingLabel:  string
}

interface SearchPageClientProps {
  strings: SearchPageStrings
  locale:  "en" | "ru"
}

export function SearchPageClient({ strings, locale }: SearchPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initial query comes from `?q=` so the URL stays sharable. We keep an
  // editable mirror in `draft` so users can type freely without committing
  // every keystroke to history — commit on submit (or after a 250 ms idle).
  const initialQuery = searchParams.get("q") ?? ""
  const [draft, setDraft] = React.useState(initialQuery)
  const [committedQuery, setCommittedQuery] = React.useState(initialQuery)
  const [results, setResults] = React.useState<ResultCard[] | null>(null)
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Track the in-flight URL update so we don't fight the user's edits.
  const lastUrlQuery = React.useRef(initialQuery)

  // ----- Autofocus on mount -----------------------------------------------
  React.useEffect(() => {
    inputRef.current?.focus()
    // Move caret to end so the focus ring doesn't sit between characters.
    if (inputRef.current && initialQuery.length > 0) {
      const end = initialQuery.length
      inputRef.current.setSelectionRange(end, end)
    }
  }, [initialQuery])

  // ----- Run the actual search whenever the committed query changes -------
  React.useEffect(() => {
    const trimmed = committedQuery.trim()
    if (trimmed.length < 2) {
      setResults(null)
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")
    ;(async () => {
      const mod = await loadPagefind()
      if (cancelled) return
      if (!mod) {
        setStatus("error")
        return
      }
      try {
        const next = await fetchResults(mod, trimmed)
        if (cancelled) return
        setResults(next)
        setStatus("idle")
        track("search_performed", {
          query_length: trimmed.length,
          result_count: next.length,
          locale,
        })
      } catch (err) {
        if (cancelled) return
        console.error("[SearchPage] search failed:", err)
        setStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [committedQuery, locale])

  // ----- Debounced URL + commit on idle (250 ms) --------------------------
  // We commit the query whenever the user pauses typing for a beat — that
  // gives "live" results but skips the URL churn of pushing on every
  // keystroke. Submit (Enter / button) forces an immediate commit.
  React.useEffect(() => {
    const trimmed = draft.trim()
    const timer = window.setTimeout(() => {
      if (trimmed === committedQuery) return
      setCommittedQuery(trimmed)

      // Mirror to URL with replaceState — no history entry per keystroke.
      if (trimmed === lastUrlQuery.current) return
      const sp = new URLSearchParams(searchParams.toString())
      if (trimmed.length === 0) sp.delete("q")
      else sp.set("q", trimmed)
      lastUrlQuery.current = trimmed
      router.replace(sp.toString() ? `?${sp.toString()}` : "?", { scroll: false })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [draft, committedQuery, router, searchParams])

  // ----- Submit handler — force immediate commit --------------------------
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    setCommittedQuery(trimmed)
    const sp = new URLSearchParams(searchParams.toString())
    if (trimmed.length === 0) sp.delete("q")
    else sp.set("q", trimmed)
    lastUrlQuery.current = trimmed
    // push (not replace) on submit so back-button restores the previous query.
    router.push(sp.toString() ? `?${sp.toString()}` : `?`, { scroll: false })
  }

  // ----- Group results for display ----------------------------------------
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

  const trimmedDraft = draft.trim()
  const showInitial = !results && status !== "error" && committedQuery.trim().length < 2
  const showNoResults = results && results.length === 0 && status !== "loading" && status !== "error"
  const totalResults = results?.length ?? 0

  return (
    <div className="container-default py-10 lg:py-16">
      <header className="max-w-3xl">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
          {strings.title}
        </p>
        <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em]">
          {strings.title}
        </h1>
        <p className="mt-4 text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
          {strings.lede}
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Search form                                                       */}
      {/* ---------------------------------------------------------------- */}
      <form
        onSubmit={onSubmit}
        role="search"
        aria-label={strings.inputLabel}
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <label htmlFor="search-q" className="sr-only">
          {strings.inputLabel}
        </label>
        <div
          className={cn(
            "relative flex-1 flex items-center gap-3 rounded-xl border border-[var(--border-base)]",
            "bg-[var(--bg-surface)] px-4 h-12 lg:h-14 shadow-[var(--shadow-sm)]",
            "focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_4px_var(--focus-ring)]",
            "transition-[box-shadow,border-color] duration-150",
          )}
        >
          <Search className="size-4 text-[var(--text-tertiary)]" aria-hidden="true" />
          <input
            ref={inputRef}
            id="search-q"
            type="search"
            name="q"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={strings.inputPlaceholder}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className={cn(
              "flex-1 bg-transparent outline-none border-none",
              "text-[15px] lg:text-[16px] text-[var(--text-primary)]",
              "placeholder:text-[var(--text-tertiary)]",
            )}
          />
          {status === "loading" && (
            <Loader2
              className="size-4 text-[var(--text-tertiary)] animate-spin"
              aria-hidden="true"
            />
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={trimmedDraft.length < 2}
          className={cn(
            "h-12 lg:h-14 px-6 text-[14px] text-white",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          style={{
            background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
          }}
        >
          {strings.submit}
        </Button>
      </form>

      {/* Too-short hint (under the form) */}
      {trimmedDraft.length === 1 && (
        <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
          {strings.tooShort}
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Results                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-10" aria-live="polite" aria-busy={status === "loading"}>
        {/* Initial state — no query yet */}
        {showInitial && (
          <div className="max-w-xl rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">
              {strings.initialTitle}
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
              {strings.initialBody}
            </p>
          </div>
        )}

        {/* Pagefind failed to load (CSP, blocked WASM, network) */}
        {status === "error" && (
          <div className="max-w-xl rounded-2xl border border-[color-mix(in_oklch,var(--danger)_25%,transparent)] bg-[color-mix(in_oklch,var(--danger)_5%,transparent)] p-6">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">
              {strings.loadingError}
            </p>
          </div>
        )}

        {/* No matches for a valid query */}
        {showNoResults && (
          <div className="max-w-xl rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">
              {strings.noResultsTitle}
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
              {strings.noResultsBody}
            </p>
          </div>
        )}

        {/* Result groups */}
        {grouped.length > 0 && (
          <>
            <p className="mb-6 font-mono text-[12px] text-[var(--text-tertiary)]">
              {formatResultsCount(totalResults, strings.resultsCount, locale)}
            </p>

            <div className="flex flex-col gap-10">
              {grouped.map(({ group, items }) => {
                const Icon = GROUP_LABEL[group].icon
                return (
                  <section key={group}>
                    <h2 className="flex items-center gap-2 mb-4 font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-semibold">
                      <Icon className="size-3.5 text-[var(--brand)]" aria-hidden="true" />
                      {locale === "ru" ? GROUP_LABEL[group].ru : GROUP_LABEL[group].en}
                      <span className="text-[var(--text-tertiary)] font-normal">
                        · {items.length}
                      </span>
                    </h2>
                    <ul className="flex flex-col gap-2">
                      {items.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.url}
                            className={cn(
                              "group flex items-start gap-3 rounded-xl border border-[var(--border-base)]",
                              "bg-[var(--bg-surface)] p-4 lg:p-5",
                              "transition-all duration-150",
                              "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                                {item.title}
                              </p>
                              {item.excerpt && (
                                <p
                                  className={cn(
                                    "mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]",
                                    // Pagefind wraps the matched query in <mark>; theme it.
                                    "[&_mark]:bg-transparent [&_mark]:text-[var(--brand)] [&_mark]:font-semibold",
                                  )}
                                  dangerouslySetInnerHTML={{ __html: item.excerpt }}
                                />
                              )}
                              <p className="mt-2 font-mono text-[11px] text-[var(--text-tertiary)] truncate">
                                {item.url}
                              </p>
                            </div>
                            <ArrowRight
                              className="mt-1.5 size-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--brand)]"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RU has three plural forms; EN has two. The dictionaries ship raw strings
// with `{n}` placeholders — pick the right form and substitute.
// ---------------------------------------------------------------------------
function formatResultsCount(
  n:    number,
  ct:   { one: string; few?: string; many: string },
  loc:  "en" | "ru",
): string {
  const pick = (() => {
    if (loc === "ru") {
      const mod10  = n % 10
      const mod100 = n % 100
      if (mod10 === 1 && mod100 !== 11) return ct.one
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        return ct.few ?? ct.many
      return ct.many
    }
    return n === 1 ? ct.one : ct.many
  })()
  return pick.replace("{n}", String(n))
}
