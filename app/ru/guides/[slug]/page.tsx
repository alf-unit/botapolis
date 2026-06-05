/* /ru/guides/[slug] — Russian mirror.
   Same locale-via-header pattern as /ru/reviews/[slug]; relies on the
   loader's EN fallback when a translation is missing. Route-segment
   constants must be declared literally in this file (Next 16). */
export {
  default,
  generateMetadata,
  generateStaticParams,
} from "@/app/guides/[slug]/page"

export const revalidate = 86400
// Mirror /guides/[slug]: dynamicParams=true so drip-revealed RU guides render
// on-demand without a redeploy (the getMdxContent gate is the visibility
// authority). See the EN route for the full rationale.
export const dynamicParams = true
