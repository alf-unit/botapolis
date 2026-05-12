"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { i18n, type Locale } from "@/lib/i18n/config"

interface LanguageSwitcherProps {
  className?: string
}

/**
 * Replaces the leading "/ru" segment with "/" (or vice versa) and pushes.
 * Doesn't try to map non-existent translated pages — that's a problem for
 * the destination route (it shows a "not translated" notice and falls back).
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? "/"
  const router = useRouter()

  const currentLocale: Locale =
    pathname === "/ru" || pathname.startsWith("/ru/") ? "ru" : "en"

  const swap = (target: Locale) => {
    if (target === currentLocale) return
    let next: string
    if (target === "ru") {
      next = pathname === "/" ? "/ru" : `/ru${pathname}`
    } else {
      // strip leading /ru
      next = pathname.replace(/^\/ru(\/|$)/, "/") || "/"
      if (next === "") next = "/"
    }
    router.push(next)
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex h-8 items-center rounded-md border border-[var(--border-base)] bg-[var(--bg-surface)] p-0.5 text-[12px] font-medium",
        className,
      )}
    >
      {i18n.locales.map((l) => {
        const active = l === currentLocale
        return (
          <button
            key={l}
            type="button"
            onClick={() => swap(l)}
            aria-pressed={active}
            className={cn(
              "h-7 min-w-[34px] px-2 rounded-[5px] transition-colors",
              active
                ? "bg-[var(--bg-muted)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
            )}
          >
            {l.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
