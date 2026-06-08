/* /ru/about — Russian mirror.
   Locale is pinned to "ru" via `withLocale` so the shared EN page renders
   Russian WITHOUT reading headers() (which would force dynamic rendering and
   kill ISR). See lib/i18n/locale-store.ts for the rationale. */
import EnPage, { generateMetadata as enGenerateMetadata } from "@/app/about/page"
import { withLocale } from "@/lib/i18n/locale-store"

export const generateMetadata = withLocale("ru", enGenerateMetadata)
export default withLocale("ru", EnPage)
