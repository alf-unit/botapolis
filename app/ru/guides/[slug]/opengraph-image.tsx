/* /ru/guides/[slug]/opengraph-image — RU mirror. See sibling under
   /reviews for the re-export rationale. Route-segment metadata is inlined
   to satisfy Next 16's static-parser constraint. */
export { default, generateStaticParams } from "@/app/guides/[slug]/opengraph-image"

export const alt = "Playbook · Botapolis"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"
export const revalidate = 86400
