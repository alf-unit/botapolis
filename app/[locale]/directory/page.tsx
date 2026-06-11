import { permanentRedirect } from "next/navigation"

/**
 * /directory → /tools (permanent)
 * ----------------------------------------------------------------------------
 * The old TZ-1 spec carved `/directory` and `/tools` as separate routes, but
 * after sprint 1 we merged them: the catalog lives at `/tools` and every old
 * `/directory/...` link redirects there permanently.
 *
 * `permanentRedirect()` is the modern (App Router) equivalent of the
 * pages-router `permanent: true` config — Next emits a 308 response, which
 * Google treats identically to a 301 for SEO link-equity transfer (308
 * additionally preserves request method, which 301 historically did not).
 *
 * If we ever need a 301 specifically (e.g. for analytics tooling that
 * doesn't track 308s), move this rule into `next.config.ts > redirects()`.
 */
export default async function DirectoryRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  // Locale-aware: /ru/directory must land on /ru/tools, not the bare EN hub.
  // (Until 2026-06-11 this hardcoded "/tools", so RU readers lost their
  // locale on the redirect — surfaced as a /ru/directory 404 in GSC.)
  const { locale } = await params
  const prefix = locale === "ru" ? "/ru" : ""
  permanentRedirect(`${prefix}/tools`)
}

// Belt-and-suspenders: even if Next prerenders a static stub, the metadata
// keeps the route out of the index.
export const metadata = {
  title:       "Redirecting…",
  robots:      { index: false, follow: false },
  alternates:  { canonical: "/tools" },
}
