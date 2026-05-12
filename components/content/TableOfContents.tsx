import Link from "next/link"

import { cn } from "@/lib/utils"
import type { TocEntry } from "@/lib/content/toc"

/* ----------------------------------------------------------------------------
   <TableOfContents>
   ----------------------------------------------------------------------------
   Server component, sticky on desktop, collapsible <details> on mobile. We
   stop short of an IntersectionObserver-driven "active section" highlight
   for MVP — that's a client island and would push the long-read pages to
   ship JS just to track scroll position. The plain link list is enough for
   navigation, and we can layer the active-state on later without changing
   this component's API.

   The TOC is hidden entirely when fewer than 3 entries — at that point the
   page is short enough to scroll, and the chrome is visual noise.
---------------------------------------------------------------------------- */

interface TocProps {
  entries: TocEntry[]
  /** Locale-aware label. Defaults to "On this page". */
  label?: string
  className?: string
}

export function TableOfContents({
  entries,
  label = "On this page",
  className,
}: TocProps) {
  if (entries.length < 3) return null

  return (
    <>
      {/* Desktop — sticky aside */}
      <aside
        aria-label={label}
        className={cn(
          "hidden lg:block sticky top-24 self-start",
          className,
        )}
      >
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          {label}
        </p>
        <nav className="mt-4 flex flex-col gap-2 border-l border-[var(--border-base)] pl-4">
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`#${e.id}`}
              className={cn(
                "text-[13px] leading-[1.45] transition-colors",
                "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                e.level === 3 && "pl-3",
              )}
            >
              {e.title}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile — accordion */}
      <details
        className={cn(
          "lg:hidden group rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] mb-8",
        )}
      >
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            {label}
          </span>
          <span
            aria-hidden="true"
            className="text-[12px] font-mono text-[var(--text-tertiary)] transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <nav className="border-t border-[var(--border-subtle)] px-5 py-4 flex flex-col gap-2">
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`#${e.id}`}
              className={cn(
                "text-[14px] leading-[1.5]",
                "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                e.level === 3 && "pl-4",
              )}
            >
              {e.title}
            </Link>
          ))}
        </nav>
      </details>
    </>
  )
}
