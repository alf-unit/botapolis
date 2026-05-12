/**
 * scripts/build-search-index.ts
 * ----------------------------------------------------------------------------
 * Post-build step that produces /public/pagefind/* — the static search
 * index served by SearchModal. Runs through Pagefind's Node API rather
 * than the CLI binary because most of our routes are server-rendered on
 * demand, so there's no on-disk HTML for Pagefind's default crawler to
 * scan. Instead we feed Pagefind records sourced from:
 *
 *   1. MDX articles  (content/reviews/**, content/guides/**)
 *   2. Tools         (Supabase `tools` table, status='published')
 *   3. Comparisons   (Supabase `comparisons` table, status='published')
 *
 * Each record carries a `type` filter so the client modal can group
 * results into the visible buckets (Tools / Reviews / Guides / Compare).
 *
 * The script is opt-in: missing Supabase env or missing /content dir
 * degrades gracefully — search still ships, just with an empty index.
 * That keeps `vercel build` from failing if someone pushes a branch
 * before service-role keys land.
 *
 * Run via `npm run build` (postbuild lifecycle hook in package.json).
 */
import { createIndex, close } from "pagefind"
import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { createClient } from "@supabase/supabase-js"

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, "content")
const OUTPUT_PATH = path.join(ROOT, "public", "pagefind")

interface PagefindIndex {
  addCustomRecord(record: {
    url:      string
    content:  string
    language: string
    meta?:    Record<string, string>
    filters?: Record<string, string[]>
  }): Promise<{ errors: string[]; file: { uniqueWords: number; url: string } }>
  writeFiles(options: { outputPath: string }): Promise<{ errors: string[]; outputPath: string }>
}

// ---------------------------------------------------------------------------
// MDX → records
// ---------------------------------------------------------------------------
/**
 * Strip MDX syntax noise so the search snippet quotes real prose, not
 * `<Callout variant="tip">`. Pagefind's snippet generator is happy with
 * plain text — we don't need anything fancy here, just a regex pass.
 */
function mdxToPlainText(raw: string): string {
  return raw
    // JSX-only lines (e.g. <Callout ...>, </Callout>)
    .replace(/^\s*<\/?[A-Z][^>]*>\s*$/gm, "")
    // Inline self-closing JSX
    .replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, "")
    // Inline JSX expressions {variable}
    .replace(/\{[^{}\n]*\}/g, "")
    // Markdown link syntax — keep the visible text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Heading hashes
    .replace(/^#{1,6}\s+/gm, "")
    // Horizontal rules
    .replace(/^---\s*$/gm, "")
    // Excess whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function indexMdx(
  index: PagefindIndex,
  type: "reviews" | "guides",
  locale: "en" | "ru",
): Promise<number> {
  const dir = path.join(CONTENT_DIR, type, locale)
  let files: string[] = []
  try {
    files = await fs.readdir(dir)
  } catch {
    // Locale directory may not exist (e.g. no RU translations yet).
    return 0
  }

  let added = 0
  for (const file of files) {
    if (!file.endsWith(".mdx")) continue
    const slug = file.replace(/\.mdx$/, "")
    const filePath = path.join(dir, file)
    try {
      const raw = await fs.readFile(filePath, "utf-8")
      const { data, content } = matter(raw)
      if (data.draft === true) continue

      const title = String(data.title ?? slug)
      const description = String(data.description ?? "")
      const url =
        locale === "ru" ? `/ru/${type}/${slug}` : `/${type}/${slug}`

      const body = mdxToPlainText(content)
      // We seed the body with the title + description so even a typo in
      // article copy still surfaces the right card for a "klaviyo review"
      // style query.
      const indexContent = [title, description, body].filter(Boolean).join("\n\n")

      const { errors } = await index.addCustomRecord({
        url,
        content:  indexContent,
        language: locale,
        meta: {
          title,
          description,
          // `image` here is what the SearchModal renders as a thumbnail.
          // We point at the colocated OG image so the modal carousel
          // looks consistent with social-share previews.
          image:    `${url}/opengraph-image`,
          type:     type === "reviews" ? "review" : "guide",
        },
        filters: {
          type: [type === "reviews" ? "review" : "guide"],
        },
      })
      if (errors.length > 0) {
        console.error(`[search-index] mdx ${url}:`, errors)
      } else {
        added++
      }
    } catch (err) {
      console.error(`[search-index] failed to index ${filePath}:`, err)
    }
  }
  return added
}

// ---------------------------------------------------------------------------
// Supabase → records
// ---------------------------------------------------------------------------
async function indexSupabase(index: PagefindIndex): Promise<{ tools: number; comparisons: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log("[search-index] Supabase env not present — skipping DB records.")
    return { tools: 0, comparisons: 0 }
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ----- Tools -----
  const { data: tools, error: toolsErr } = await supabase
    .from("tools")
    .select(
      "slug, name, tagline, description, category, logo_url, pros, cons, best_for",
    )
    .eq("status", "published")
    .limit(2000)

  let toolsAdded = 0
  if (toolsErr) {
    console.error("[search-index] tools fetch error:", toolsErr.message)
  } else {
    for (const tool of tools ?? []) {
      const body = [
        tool.name,
        tool.tagline,
        tool.description,
        tool.best_for,
        (tool.pros ?? []).join("\n"),
        (tool.cons ?? []).join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n")

      const { errors } = await index.addCustomRecord({
        url:      `/tools/${tool.slug}`,
        content:  body,
        language: "en",
        meta: {
          title:       tool.name,
          description: tool.tagline ?? "",
          image:       tool.logo_url ?? "",
          type:        "tool",
          category:    tool.category ?? "",
        },
        filters: {
          type:     ["tool"],
          category: tool.category ? [tool.category] : [],
        },
      })
      if (errors.length > 0) {
        console.error(`[search-index] tool ${tool.slug}:`, errors)
      } else {
        toolsAdded++
      }
    }
  }

  // ----- Comparisons -----
  const { data: comparisons, error: cmpErr } = await supabase
    .from("comparisons")
    .select(
      "slug, verdict, custom_intro, language, tool_a_id, tool_b_id, meta_title, meta_description",
    )
    .eq("status", "published")
    .limit(5000)

  // We need tool names too — hydrate via a single lookup map rather than N+1.
  const toolIds = new Set<string>()
  for (const c of comparisons ?? []) {
    toolIds.add(c.tool_a_id)
    toolIds.add(c.tool_b_id)
  }
  let nameById: Record<string, string> = {}
  if (toolIds.size > 0) {
    const { data: lookup } = await supabase
      .from("tools")
      .select("id, name")
      .in("id", Array.from(toolIds))
    nameById = Object.fromEntries((lookup ?? []).map((r) => [r.id, r.name]))
  }

  let comparisonsAdded = 0
  if (cmpErr) {
    console.error("[search-index] comparisons fetch error:", cmpErr.message)
  } else {
    for (const c of comparisons ?? []) {
      const a = nameById[c.tool_a_id] ?? c.tool_a_id
      const b = nameById[c.tool_b_id] ?? c.tool_b_id
      const title = c.meta_title ?? `${a} vs ${b}`
      const lang = c.language === "ru" ? "ru" : "en"
      const url =
        lang === "ru" ? `/ru/compare/${c.slug}` : `/compare/${c.slug}`

      const body = [title, c.meta_description, c.custom_intro, c.verdict]
        .filter(Boolean)
        .join("\n\n")

      const { errors } = await index.addCustomRecord({
        url,
        content:  body,
        language: lang,
        meta: {
          title,
          description: c.meta_description ?? c.verdict ?? "",
          // Comparisons have their own dynamic OG generator at this path.
          image: `${url}/opengraph-image`,
          type:  "comparison",
        },
        filters: {
          type: ["comparison"],
        },
      })
      if (errors.length > 0) {
        console.error(`[search-index] comparison ${c.slug}:`, errors)
      } else {
        comparisonsAdded++
      }
    }
  }

  return { tools: toolsAdded, comparisons: comparisonsAdded }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("[search-index] building Pagefind index…")
  const { index, errors: setupErrors } = await createIndex({
    forceLanguage: undefined,  // honour per-record language
    verbose: false,
  })
  if (setupErrors.length > 0 || !index) {
    console.error("[search-index] createIndex failed:", setupErrors)
    process.exitCode = 1
    return
  }

  const reviews = await indexMdx(index as PagefindIndex, "reviews", "en")
  const reviewsRu = await indexMdx(index as PagefindIndex, "reviews", "ru")
  const guides = await indexMdx(index as PagefindIndex, "guides", "en")
  const guidesRu = await indexMdx(index as PagefindIndex, "guides", "ru")
  const db = await indexSupabase(index as PagefindIndex)

  const { errors: writeErrors, outputPath } = await (index as PagefindIndex).writeFiles({
    outputPath: OUTPUT_PATH,
  })
  if (writeErrors.length > 0) {
    console.error("[search-index] writeFiles errors:", writeErrors)
    process.exitCode = 1
  } else {
    console.log(
      `[search-index] wrote ${outputPath} — reviews:${reviews + reviewsRu} guides:${guides + guidesRu} tools:${db.tools} comparisons:${db.comparisons}`,
    )
  }

  await close()
}

main().catch((err) => {
  console.error("[search-index] fatal:", err)
  process.exitCode = 1
})
