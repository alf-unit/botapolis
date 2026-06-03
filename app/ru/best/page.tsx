/* /ru/best — Russian mirror of the /best listings index.
   The shared module reads locale from header (proxy.ts sets x-locale from
   the /ru prefix) and calls `getAllMdxFrontmatter("best", "ru")`, with a
   graceful empty-list fallback when an RU best-of MDX isn't translated yet.

   Next 16 forbids re-exporting route-segment constants; they're inlined
   below to match the EN counterpart. */
export { default, generateMetadata } from "@/app/best/page"

export const revalidate = 21600
