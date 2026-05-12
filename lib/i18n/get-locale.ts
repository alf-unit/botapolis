import "server-only"
import { headers } from "next/headers"
import { i18n, type Locale } from "./config"

/**
 * Resolve the current locale on the server.
 * Reads the `x-locale` header set by `proxy.ts`; falls back to default.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers()
  const fromHeader = h.get("x-locale")
  if (fromHeader && (i18n.locales as readonly string[]).includes(fromHeader)) {
    return fromHeader as Locale
  }
  return i18n.defaultLocale
}
