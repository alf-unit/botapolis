import slugify from "slugify"

/* ----------------------------------------------------------------------------
   Table-of-contents extractor
   ----------------------------------------------------------------------------
   Pulls h2/h3 headings out of the raw MDX source so the page shell can render
   a sticky sidebar TOC without round-tripping through the compiled JSX tree.
   We deliberately scan the raw markdown (post-frontmatter) — that way the
   anchor IDs match what `rehype-slug` will mint at compile time, no special
   coupling needed.

   What we skip:
     - Fenced code blocks (``` … ```) — a # at column 0 inside a code snippet
       is not a heading.
     - h1 — there is exactly one per page (the hero) and the TOC starts at h2.
     - Headings deeper than h3 — for editorial copy, h4+ usually means we've
       over-nested and the TOC should not encourage it.
---------------------------------------------------------------------------- */

export interface TocEntry {
  id: string
  title: string
  level: 2 | 3
}

const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/gm
const FENCE_RE = /```[\s\S]*?```/g

/**
 * Match the anchor rehype-slug will produce. Keep this aligned: if you swap
 * the rehype config, retune the slugify options here in lockstep.
 */
function headingId(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true })
}

export function extractToc(rawMdx: string): TocEntry[] {
  // Strip fenced code blocks first — they can legally contain `## …` lines.
  const withoutCode = rawMdx.replace(FENCE_RE, "")

  const entries: TocEntry[] = []
  for (const match of withoutCode.matchAll(HEADING_RE)) {
    const hashes = match[1]
    const title = match[2].trim()
    if (!title) continue
    const level = hashes.length === 2 ? 2 : 3
    entries.push({ id: headingId(title), title, level })
  }
  return entries
}
