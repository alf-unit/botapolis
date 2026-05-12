/* /ru/reviews/[slug]/opengraph-image — RU mirror of the OG generator.
   Re-exports the renderer; copies the route-segment metadata literals
   because Next 16's static parser only recognises them when declared
   directly in the file. */
export { default, generateStaticParams } from "@/app/reviews/[slug]/opengraph-image"

export const alt = "Review · Botapolis"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"
export const revalidate = 86400
