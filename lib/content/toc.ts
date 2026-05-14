import GithubSlugger from "github-slugger"

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

   IMPORTANT: we use `github-slugger` here, NOT the `slugify` library, because
   `rehype-slug` (which mints the actual `<h2 id="…">` IDs at compile time)
   uses `github-slugger` internally. The two libraries handle non-ASCII text
   differently — `slugify` transliterates Cyrillic to Latin (`Генерируй` →
   `generiruj`), `github-slugger` preserves it (`генерируй`). With slugify the
   RU TOC links would point at hashes the rendered HTML never produced, so
   clicks scrolled to top instead of the target section. Keep this aligned:
   if you change the rehype config, retune this importer in lockstep.
---------------------------------------------------------------------------- */

export interface TocEntry {
  id: string
  title: string
  level: 2 | 3
}

const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/gm
const FENCE_RE = /```[\s\S]*?```/g

export function extractToc(rawMdx: string): TocEntry[] {
  // Strip fenced code blocks first — they can legally contain `## …` lines.
  const withoutCode = rawMdx.replace(FENCE_RE, "")

  // Fresh slugger per page so the duplicate-suffix counter ("foo", "foo-1",
  // "foo-2") resets between extracts — `rehype-slug` instantiates the same
  // way at compile time, so the suffix sequence on a single page lines up.
  const slugger = new GithubSlugger()

  const entries: TocEntry[] = []
  for (const match of withoutCode.matchAll(HEADING_RE)) {
    const hashes = match[1]
    const title = match[2].trim()
    if (!title) continue
    const level = hashes.length === 2 ? 2 : 3
    entries.push({ id: slugger.slug(title), title, level })
  }
  return entries
}
