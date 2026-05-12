"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

interface ThemeToggleProps {
  label?: string
}

/**
 * Mounts client-side only — `useTheme()` returns undefined on the server
 * during the first render and would otherwise flash the wrong icon.
 */
export function ThemeToggle({ label = "Toggle theme" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    >
      {/* Render both icons to avoid layout shift before mount — opacity swap */}
      <Sun
        className={`size-4 transition-all duration-200 ${
          mounted && isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        } absolute`}
      />
      <Moon
        className={`size-4 transition-all duration-200 ${
          mounted && isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        }`}
      />
    </Button>
  )
}
