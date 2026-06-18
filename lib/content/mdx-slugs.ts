import "server-only"

import fs from "node:fs/promises"
import path from "node:path"

import { filterVisibleSlugs } from "@/lib/content/visibility"

/* ----------------------------------------------------------------------------
   MDX slug listing — lightweight, compiler-free (П.7)
   ----------------------------------------------------------------------------
   `getAllMdxSlugs` is just a gated `fs.readdir` — it does NOT need the MDX
   compiler. It lived in `lib/content/mdx.ts`, which imports the entire MDX
   pipeline (compileMDX + rehype/remark plugins + the React `mdxComponents`
   tree). The OG-image routes (`opengraph-image.tsx`) only need the slug list
   for `generateStaticParams`, but importing it from mdx.ts dragged that whole
   compiler graph into the OG serverless bundle — which NFT then over-traced
   ("whole project traced", warning via next.config.ts).

   Splitting the slug walk into this thin module lets the OG routes pull just
   `fs` + the visibility gate, keeping the MDX compiler out of their bundle.
   mdx.ts re-exports these so existing importers are unaffected.
---------------------------------------------------------------------------- */

export type ContentType = "reviews" | "guides" | "best" | "pricing"
export type ContentLocale = "en" | "ru"

export const CONTENT_DIR = path.join(process.cwd(), "content")

/**
 * Read all slugs of a given content type / locale, ignoring drafts.
 * The slug list drives `generateStaticParams` and the index pages.
 * Returns the bare slug (no `.mdx` extension). Drip-gated (locale-agnostic),
 * so unpublished slugs never leak into prerendered params or hubs.
 */
export async function getAllMdxSlugs(
  type: ContentType,
  locale: ContentLocale = "en",
): Promise<string[]> {
  const dir = path.join(CONTENT_DIR, type, locale)
  let files: string[] = []
  try {
    files = await fs.readdir(dir)
  } catch {
    return []
  }
  const slugs = files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
  return filterVisibleSlugs(type, slugs)
}
