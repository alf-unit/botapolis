import "server-only"
import { type Locale } from "./config"
import { readLocale } from "./locale-store"

/**
 * Resolve the current locale on the server.
 *
 * Reads the request-scoped locale pinned by the `/ru/*` route wrappers
 * (`withLocale`), defaulting to EN when nothing is pinned. This deliberately
 * does NOT read `headers()` — doing so is a Dynamic API that disables ISR
 * site-wide (see `lib/i18n/locale-store.ts` for the full rationale). Kept
 * async so the many `await getLocale()` call sites stay unchanged.
 */
export async function getLocale(): Promise<Locale> {
  return readLocale()
}
