/* ----------------------------------------------------------------------------
   /ru/compare — RU comparisons index (TZ § 7.6 — sprint 6 MVP)
   ----------------------------------------------------------------------------
   Thin mirror of the EN /compare route. The shared component reads the
   locale from `getLocale()` (which resolves to "ru" via the proxy's
   `x-locale` header for any /ru/* URL) and switches strings, fetches RU
   comparisons (filtered by `language: "ru"`), and emits Russian metadata
   from `generateMetadata`.

   Re-declaring `revalidate` as a literal const here — Next's static
   analyzer keeps segment config simple when it lives directly on the
   route file rather than transiting through a re-export.
---------------------------------------------------------------------------- */
export const revalidate = 3600

export { default, generateMetadata } from "../../compare/page"
