/* /ru/alternatives/[slug] — Russian mirror.
   Bilingual via getLocale(); route-segment constants inlined per Next 16. */
export {
  default,
  generateMetadata,
  generateStaticParams,
} from "@/app/alternatives/[slug]/page"

export const revalidate = 86400
export const dynamicParams = true
