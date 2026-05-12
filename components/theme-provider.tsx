"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

/**
 * Botapolis theme provider — thin wrapper over `next-themes`.
 * Defaults to dark mode (per spec) but follows the system if the user has
 * never picked one. Toggled by `<ThemeToggle>` in the Navbar.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
