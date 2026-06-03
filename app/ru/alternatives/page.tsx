/* /ru/alternatives — Russian mirror of the /alternatives index.
   The shared module reads locale from header (proxy.ts sets x-locale from
   the /ru prefix) and localises each card via localizeToolPartial — RU
   names + taglines flow through when the *_ru columns are populated,
   English fields fall back when not.

   Next 16 forbids re-exporting route-segment constants; they're inlined
   below to match the EN counterpart. */
export { default, generateMetadata } from "@/app/alternatives/page"

export const revalidate = 21600
