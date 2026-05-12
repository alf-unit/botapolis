/* /ru/tools/[slug] — Russian mirror.
   Tool detail page reads its locale from x-locale and renders RU strings.
   Route-segment constants must be inlined per Next 16 (`revalidate` and
   `dynamicParams` can't cross module boundaries via re-export). */
export {
  default,
  generateMetadata,
  generateStaticParams,
} from "@/app/tools/[slug]/page"

export const revalidate = 86400
export const dynamicParams = true
