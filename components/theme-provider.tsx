"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

/**
 * Botapolis theme provider — thin wrapper over `next-themes`.
 *
 * First-time visitors land in their OS theme (`defaultTheme="system"` is
 * passed from app/layout.tsx). Once they pick a theme via `<ThemeToggle>`
 * in the Navbar, the choice is persisted in localStorage and survives
 * future visits regardless of what their OS does.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
