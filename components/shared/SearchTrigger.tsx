"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchModal, type SearchModalStrings } from "@/components/shared/SearchModal"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <SearchTrigger>
   ----------------------------------------------------------------------------
   The Navbar's search-button + modal pair. Lives as a thin client island so
   the Navbar itself stays a server-friendly tree; the modal owns its own
   open state and global keyboard shortcut listener.

   Cmd+K (mac) / Ctrl+K (windows) opens it; Esc closes it. The shortcut is
   bound at the document level so it works from anywhere on the page, not
   just when the trigger has focus.
---------------------------------------------------------------------------- */

interface SearchTriggerProps {
  /** Locale-resolved strings (label, placeholder, empty/error copy). */
  strings: SearchModalStrings
  /** Locale for analytics + result grouping labels. */
  locale: "en" | "ru"
  /** Optional extra class for the trigger button. */
  className?: string
}

/**
 * Single trigger that scales from icon-only on mobile to full chip with
 * the ⌘K hint on desktop. Mounting this component twice (e.g. one per
 * breakpoint) would create two modals + two competing keyboard listeners,
 * so the responsive treatment lives INSIDE the component instead.
 */
export function SearchTrigger({
  strings,
  locale,
  className,
}: SearchTriggerProps) {
  const [open, setOpen] = React.useState(false)

  // Global Cmd+K / Ctrl+K listener. Mount-once at the document level.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // We use `key === 'k'` not `code === 'KeyK'` so layouts where K is
      // remapped still get the shortcut on the key the user typed.
      const isK = e.key === "k" || e.key === "K"
      if (!isK) return
      if (!(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={strings.triggerLabel}
        onClick={() => setOpen(true)}
        className={cn(
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          className,
        )}
      >
        <Search className="size-4" data-icon="inline-start" />
        <span className="hidden lg:inline">{strings.triggerLabel}</span>
        <kbd
          className={cn(
            "hidden lg:inline-flex h-5 items-center rounded border border-[var(--border-base)] bg-[var(--bg-muted)] px-1.5 ml-1",
            "font-mono text-[10px] text-[var(--text-tertiary)]",
          )}
        >
          ⌘K
        </kbd>
      </Button>

      <SearchModal
        strings={strings}
        locale={locale}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
