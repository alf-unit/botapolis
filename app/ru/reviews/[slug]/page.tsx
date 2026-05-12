/* /ru/reviews/[slug] — Russian mirror of the review detail page.
   Same locale-via-header pattern as /ru/reviews. The shared loader resolves
   `content/reviews/ru/{slug}.mdx` first and falls back to the English file,
   surfacing a "translation in progress" notice in the hero when fallback
   kicks in.

   Next 16 forbids re-exporting route-segment constants; they're inlined
   below to match the EN counterpart. */
export {
  default,
  generateMetadata,
  generateStaticParams,
} from "@/app/reviews/[slug]/page"

export const revalidate = 86400
export const dynamicParams = false
