/* /ru/about — Russian mirror. The EN page reads `getLocale()` from the
   x-locale header proxy.ts sets, so a re-export gives us the RU rendering
   for free. */
export { default, generateMetadata } from "@/app/about/page"
