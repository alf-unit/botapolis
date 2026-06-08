/* /ru/tools/[slug] — Russian mirror.
   Locale is pinned to "ru" via `withLocale` so the shared EN page renders RU
   strings WITHOUT reading headers() (which would force dynamic rendering and
   kill ISR). `generateStaticParams` needs no locale (it returns slugs) and is
   re-exported as-is. Route-segment constants must be declared literally in
   this file (Next 16 — they can't cross a module boundary via re-export). */
import EnPage, {
  generateMetadata as enGenerateMetadata,
  generateStaticParams,
} from "@/app/tools/[slug]/page"
import { withLocale } from "@/lib/i18n/locale-store"

export { generateStaticParams }

export const revalidate = 86400
export const dynamicParams = true

export const generateMetadata = withLocale("ru", enGenerateMetadata)
export default withLocale("ru", EnPage)
