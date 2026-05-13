/* /ru/compare/[slug] — Russian mirror of the comparison detail page.
   Same locale-via-header pattern as the rest of the /ru/* tree: the shared
   route (app/compare/[slug]/page.tsx) calls getLocale(), discovers "ru"
   via proxy.ts's x-locale header, and fetches the comparisons row whose
   language='ru' alongside the EN twin sharing the same slug (composite
   unique constraint introduced in migration 006).

   Without this file the route doesn't exist at all and /ru/compare/<slug>
   404s — the May 2026 i18n audit caught this; before that, /ru/compare
   was reachable but the per-pair detail page was a dead link.

   Next 16 forbids re-exporting route-segment constants; they're inlined
   below to match the EN counterpart. */
export {
  default,
  generateMetadata,
  generateStaticParams,
} from "@/app/compare/[slug]/page"

export const revalidate = 86400
export const dynamicParams = true
