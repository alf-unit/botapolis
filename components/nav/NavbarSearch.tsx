"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <NavbarSearch>  (Amazon pattern)
   ----------------------------------------------------------------------------
   Audit feedback iteration 3 (May 2026):

     "Drop the Search button, drop the magnifier inside the input on
      the left, drop the focus-expand that crashes into Sign in. Make
      it look like Amazon — just a field with a coloured magnifier
      button glued into the right edge."

   The new shape:
     - One stable-width input (no growth on focus, so the navbar layout
       never shifts under the cursor)
     - No left adornment — the placeholder communicates intent and the
       magnifier sits at the submit end of the affordance
     - A mint-gradient magnifier button welded to the right edge that
       acts as the submit affordance. Enter on the keyboard works too.

   Submit pushes `/search?q=…`. No live search on keystroke; the
   standalone /search page does the actual query work after navigation.
---------------------------------------------------------------------------- */

interface NavbarSearchProps {
  /** Destination path — `/search` or `/ru/search`. */
  href: string
  /** Localised placeholder shown inside the input. */
  placeholder: string
  /** Localised aria-label for the magnifier submit button. */
  buttonLabel: string
  /** Localised aria-label for the surrounding form. */
  ariaLabel: string
  /** Optional class override on the form element. */
  className?: string
}

export function NavbarSearch({
  href,
  placeholder,
  buttonLabel,
  ariaLabel,
  className,
}: NavbarSearchProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Cmd+K / Ctrl+K focuses the inline input rather than opening a
  // modal. Mounted at the document level so the shortcut fires from
  // anywhere on the page.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K"
      if (!isK) return
      if (!(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      // Defensive: button is disabled in this state, but keyboard
      // submitters can still hit Enter. Keep focus so the user
      // understands why nothing happened.
      inputRef.current?.focus()
      return
    }
    router.push(`${href}?q=${encodeURIComponent(trimmed)}`)
    // Clear so the next page load doesn't echo the previous query in
    // the navbar — the /search page input mirrors `?q=` separately.
    setQuery("")
    inputRef.current?.blur()
  }

  const tooShort = query.trim().length < 2

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label={ariaLabel}
      className={cn(
        // Stable, layout-friendly width. No focus-expand; that's what
        // was overlapping the right cluster in iteration 2.
        "relative flex items-stretch h-9 w-[280px]",
        "rounded-md border border-[var(--border-base)] bg-[var(--bg-muted)]",
        "overflow-hidden",
        // CSS focus-within so the field gets the brand ring whenever
        // the input is focused — no JS state needed.
        "transition-[box-shadow,border-color] duration-150",
        "focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--focus-ring)]",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        // pr-[44px] leaves room for the absolutely-positioned magnifier
        // button so typed text never disappears under it.
        className={cn(
          "flex-1 min-w-0 bg-transparent outline-none border-none",
          "pl-3 pr-3 text-[13px] text-[var(--text-primary)]",
          "placeholder:text-[var(--text-tertiary)]",
        )}
      />
      <button
        type="submit"
        disabled={tooShort}
        aria-label={buttonLabel}
        title={buttonLabel}
        className={cn(
          // Welded to the right edge — no gap, no rounded outer corners
          // (the form's overflow-hidden + border-radius does the
          // visual joining for us).
          "flex shrink-0 items-center justify-center h-full w-10",
          "text-white border-l border-[color-mix(in_oklch,var(--brand)_30%,transparent)]",
          "transition-opacity duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:brightness-105 active:brightness-95",
        )}
        style={{
          background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
        }}
      >
        <Search className="size-4" strokeWidth={2.25} aria-hidden="true" />
      </button>
    </form>
  )
}
