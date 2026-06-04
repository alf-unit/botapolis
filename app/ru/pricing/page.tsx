/* /ru/pricing — Russian mirror of the /pricing listings index.
   The shared module reads locale from header (proxy.ts sets x-locale from
   the /ru prefix) and calls `getAllMdxFrontmatter("pricing", "ru")`, with a
   graceful empty-list fallback when an RU pricing MDX isn't translated yet.

   Next 16 forbids re-exporting route-segment constants; they're inlined
   below to match the EN counterpart. */
export { default, generateMetadata } from "@/app/pricing/page"

export const revalidate = 21600
