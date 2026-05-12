/* /ru/reviews — Russian mirror.
   The underlying page reads its locale via `await getLocale()` (which in
   turn reads the `x-locale` header set by proxy.ts), so a thin re-export
   is enough: the RU prefix in the URL flips the header, and the same page
   module renders RU strings + falls back to EN MDX when a translation isn't
   present. Keeping this stub file means the route exists in Next's static
   route table (without it, /ru/reviews 404s) without duplicating logic.

   Note (Next 16): route-segment config constants (`revalidate`,
   `dynamicParams`, …) must be declared *literally* in each route file —
   re-exports through `export { revalidate } from "…"` are rejected by the
   compile-time static-parser. So we copy `revalidate` here while still
   re-exporting the functions (default, generateMetadata) from the EN file. */
export { default, generateMetadata } from "@/app/reviews/page"

export const revalidate = 21600
