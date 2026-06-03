/* /ru/pricing/[slug] — Russian mirror.
   Same locale-via-header pattern as /ru/guides/[slug]; relies on the
   loader's EN fallback when a translation is missing. Route-segment
   constants must be declared literally in this file (Next 16). */
export {
  default,
  generateMetadata,
  generateStaticParams,
} from "@/app/pricing/[slug]/page"

export const revalidate = 86400
export const dynamicParams = false
