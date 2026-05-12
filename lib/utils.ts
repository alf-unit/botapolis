import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind-aware classname merger.
 * `clsx` handles conditionals; `twMerge` resolves utility conflicts so the
 * last-written rule wins, even across variants.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// Number / price formatting
// ============================================================================

/**
 * Format a money figure as `$1,200` or `$0.50`.
 * Locale-aware; respects RU comma decimal separator.
 *
 *   formatPrice(1200)                  → "$1,200"
 *   formatPrice(0.5, { locale: "ru" })  → "0,50 $"
 *   formatPrice(99, { locale: "en", currency: "USD" })  → "$99"
 *   formatPrice(null)                  → ""
 */
export function formatPrice(
  amount: number | null | undefined,
  options: {
    locale?: "en" | "ru"
    currency?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {},
): string {
  if (amount == null || Number.isNaN(amount)) return ""
  const { locale = "en", currency = "USD" } = options
  const isWhole = Number.isInteger(amount)
  // Derive sensible bounds from one another so callers can pass just `max`
  // (or just `min`) without triggering Intl's "min > max" RangeError when
  // the amount happens to be fractional. `defaultBoth` is what we'd use
  // when nothing is supplied at all.
  const defaultBoth = isWhole ? 0 : 2
  const explicitMin = options.minimumFractionDigits
  const explicitMax = options.maximumFractionDigits
  const maximumFractionDigits =
    explicitMax ?? Math.max(explicitMin ?? defaultBoth, defaultBoth)
  const minimumFractionDigits =
    explicitMin ?? Math.min(explicitMax ?? defaultBoth, defaultBoth)
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount)
}

/**
 * Format a number for display (with thousand separators).
 *
 *   formatNumber(1234567)                  → "1,234,567"
 *   formatNumber(0.34, { style: "percent" }) → "34%"
 *   formatNumber(1234567, { locale: "ru" })  → "1 234 567"
 */
export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions & { locale?: "en" | "ru" } = {},
): string {
  if (value == null || Number.isNaN(value)) return ""
  const { locale = "en", ...nf } = options
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", nf).format(value)
}

// ============================================================================
// Strings
// ============================================================================

/**
 * URL-safe slugifier. Strips diacritics, lowercases, replaces non-alnum with
 * `-`, collapses repeats, trims edges. Cyrillic is transliterated.
 *
 *   slugify("Klaviyo vs Mailchimp")  → "klaviyo-vs-mailchimp"
 *   slugify("Калькулятор Email ROI") → "kalkulator-email-roi"
 */
const RU_TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => RU_TRANSLIT[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")  // strip remaining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

/**
 * Truncate to a max length on word boundaries when possible.
 * Adds an ellipsis (…) by default; pass `suffix` to override.
 *
 *   truncate("The quick brown fox", 10) → "The quick…"
 *   truncate("Short", 100)              → "Short"
 */
export function truncate(
  text: string,
  max: number,
  suffix = "…",
): string {
  if (!text || text.length <= max) return text
  const trimmed = text.slice(0, max - suffix.length)
  const lastSpace = trimmed.lastIndexOf(" ")
  const boundary = lastSpace > max * 0.6 ? lastSpace : trimmed.length
  return trimmed.slice(0, boundary).trimEnd() + suffix
}

// ============================================================================
// Hashing — privacy-preserving IP identifier
// ============================================================================

/**
 * Hash an IP (or any identifier) with the app secret so we can count uniques
 * without storing the raw address — keeps RLS-leakable PII out of the table.
 *
 * Web Crypto SHA-256 → first 32 chars of hex. Runs in both Node 20+ and
 * the proxy/edge runtimes.
 */
export async function hashIp(ip: string, salt?: string): Promise<string> {
  const pepper =
    salt ??
    process.env.REVALIDATE_SECRET ??
    "botapolis-fallback-salt-do-not-use-in-prod"
  const data = new TextEncoder().encode(`${ip}::${pepper}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32)
}

/**
 * Best-effort client IP extraction from common proxy headers.
 * Falls back to "unknown" so callers can hash it anyway and avoid branching.
 */
export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0].trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  // Vercel-specific
  const vercel = req.headers.get("x-vercel-forwarded-for")
  if (vercel) return vercel.split(",")[0].trim()
  return "unknown"
}

/**
 * Build a fully-qualified absolute URL from a path.
 * Used by sitemap, OG image, and JSON-LD generators.
 */
export function absoluteUrl(
  path = "",
  base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://botapolis.com",
): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const trimmedBase = base.replace(/\/+$/, "")
  const trimmedPath = path.startsWith("/") ? path : `/${path}`
  return `${trimmedBase}${trimmedPath}`
}
