/* /ru/dashboard — Russian mirror. Auth-gated via proxy.ts (which already
   redirects /ru/dashboard → /ru/login if the user has no session). The
   shared dashboard page renders RU strings from getLocale(). */
export { default, generateMetadata } from "@/app/(account)/dashboard/page"
