"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* ----------------------------------------------------------------------------
   <NavbarSearch>
   ----------------------------------------------------------------------------
   Inline search form rendered in the navbar on lg+ widths. Replaces the
   button-as-link pattern after the May 2026 audit:

     "Why a button that just opens another page? Just give me the
      damn input right there, plus a Search button that actually goes."

   Behaviour:
     - Always-visible input with a "Search" submit button to its right.
     - On focus the input expands horizontally (CSS-only width
       transition) so visitors who actually plan to type get more room
       without losing the rest of the navbar.
     - Enter or button click → router.push(`${href}?q=…`). NO live search
       as the user types — the page-side committed-query handles that
       once the request lands.
     - Cmd+K / Ctrl+K focuses the input rather than navigating; on
       mobile the form isn't rendered (the navbar falls back to a
       Search icon link), so the shortcut silently no-ops there.

   Layout note: the form is `hidden lg:flex` because anything narrower
   forces an awkward fight with the rest of the right cluster (theme +
   lang + user + subscribe). Mobile/tablet keep the icon-link affordance.
---------------------------------------------------------------------------- */

interface NavbarSearchProps {
  /** Destination path — `/search` or `/ru/search`. */
  href: string
  /** Localised placeholder shown inside the input. */
  placeholder: string
  /** Localised label for the submit button (e.g. "Search" / "Найти"). */
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
  const [focused, setFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Cmd+K / Ctrl+K focuses the inline input. Mounting this listener at
  // the document level means the shortcut fires from any element on the
  // page, matching the muscle memory built up while the palette modal
  // was the primary surface.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K"
      if (!isK) return
      if (!(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      // If the form is hidden (display:none on small viewports), focus()
      // silently no-ops — and the visible mobile fallback Link gives
      // those users an icon to tap instead. No fallthrough needed.
      inputRef.current?.focus()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      // Defensive: button is disabled in this state but keyboard
      // submitters can still hit Enter. Keep focus on the input so the
      // user understands why nothing happened.
      inputRef.current?.focus()
      return
    }
    router.push(`${href}?q=${encodeURIComponent(trimmed)}`)
    // Reset so the navbar input doesn't echo last query on the next
    // page — the dedicated /search page input already mirrors `?q=`.
    setQuery("")
    inputRef.current?.blur()
  }

  const tooShort = query.trim().length < 2

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label={ariaLabel}
      className={cn("flex items-stretch gap-2", className)}
    >
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-md border bg-[var(--bg-muted)]",
          "h-9 px-3 transition-[width,box-shadow,border-color] duration-200 ease-out",
          // Width grows on focus so visitors who actually plan to type
          // get more room. `min(420px, 38vw)` caps the expansion so the
          // navbar doesn't blow out at extreme viewport sizes.
          focused
            ? "w-[min(420px,38vw)] border-[var(--brand)] shadow-[0_0_0_4px_var(--focus-ring)]"
            : "w-[220px] border-[var(--border-base)]",
        )}
      >
        <Search
          className="size-4 shrink-0 text-[var(--text-tertiary)]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className={cn(
            "flex-1 min-w-0 bg-transparent outline-none border-none",
            "text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
          )}
        />
        {/* ⌘K hint hides on focus to free the visible-width cap for the
            typed query. Pure aesthetic touch — kbd is announced via
            aria-hidden so screen readers don't dictate it. */}
        {!focused && (
          <kbd
            aria-hidden="true"
            className={cn(
              "hidden xl:inline-flex h-5 items-center rounded border border-[var(--border-base)]",
              "bg-[var(--bg-surface)] px-1.5 font-mono text-[10px] text-[var(--text-tertiary)]",
            )}
          >
            ⌘K
          </kbd>
        )}
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={tooShort}
        aria-label={buttonLabel}
        className={cn(
          "h-9 px-4 text-[13px] text-white",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        style={{
          background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
        }}
      >
        {buttonLabel}
      </Button>
    </form>
  )
}
