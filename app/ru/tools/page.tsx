/* ----------------------------------------------------------------------------
   /ru/tools — RU tools catalog (TZ § 7.6 — sprint 6 MVP)
   ----------------------------------------------------------------------------
   Mirror of /tools. Same Server Component, same ToolsCatalog client island.
   Locale switches every string and the Russian metadata via the shared
   `getLocale()` resolver. `revalidate` is re-declared locally so Next's
   route-config static analyzer sees it at the segment level.
---------------------------------------------------------------------------- */
export const revalidate = 3600

export { default, generateMetadata } from "../../tools/page"
