/* /ru/search — Russian mirror of the search page.
   Locale resolves via the x-locale header set by proxy.ts; the shared
   page component picks RU strings automatically. ISR cadence is the
   same as the EN page (the body is mostly client-island anyway). */
export { default, generateMetadata } from "@/app/search/page"

export const revalidate = 86400
