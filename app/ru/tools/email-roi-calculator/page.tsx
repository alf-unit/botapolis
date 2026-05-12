/* /ru/tools/email-roi-calculator — Russian mirror.
   The calculator page is a static segment (not a [slug] route), so the
   parent /ru/tools/[slug] stub can't catch it — Next.js routes static
   wins over dynamic. We need a named stub here. Locale resolves via
   x-locale header just like every other RU mirror. */
export { default, generateMetadata } from "@/app/tools/email-roi-calculator/page"

export const revalidate = 86400
