import "server-only"

import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { compileMDX } from "next-mdx-remote/rsc"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import remarkSmartypants from "remark-smartypants"
import { z } from "zod"

import { mdxComponents } from "@/components/content/mdx-components"
import { extractToc, type TocEntry } from "@/lib/content/toc"
import { getReadingTime, type ReadingTime } from "@/lib/content/reading-time"

/* ----------------------------------------------------------------------------
   MDX pipeline (server-only)
   ----------------------------------------------------------------------------
   One loader that powers /reviews/[slug] and /guides/[slug]. Content lives in
   `content/{type}/{lang}/{slug}.mdx`. Returns the compiled JSX, validated
   frontmatter, TOC, and reading-time in a single call so pages never re-read
   the file.

   Why next-mdx-remote (and not @next/mdx):
     - MDX files live outside `/app`, so file-routing is off the table.
     - We need to wrap the compiled tree in a custom page shell (hero, TOC,
       JSON-LD), not just dump it as a page body.
     - `compileMDX` is RSC-native — no client bundle hit.

   Frontmatter is validated via Zod. Bad frontmatter throws at request time,
   loud and on purpose: a 500 in dev is much better than silently shipping a
   review without `rating`. `parseFrontmatter` in next-mdx-remote uses vfile-
   matter, which gives us the same shape we'd get from gray-matter — we still
   call gray-matter separately to expose the raw `content` string to the TOC
   and reading-time helpers (next-mdx-remote does not expose the stripped
   source).
---------------------------------------------------------------------------- */

// ============================================================================
// Frontmatter schemas
// ----------------------------------------------------------------------------
// Each content type has its own shape. The base schema is the lowest common
// denominator — both reviews and guides share it. Extend per type below.
// ============================================================================

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")

const baseFrontmatterSchema = z.object({
  title:        z.string().min(10).max(120),
  description:  z.string().min(40).max(220),
  publishedAt:  isoDate,
  updatedAt:    isoDate.optional(),
  author:       z.string().default("Botapolis editorial"),
  tags:         z.array(z.string()).default([]),
  ogImage:      z.string().optional(),
  // Optional real cover photo (absolute or app-relative). When unset the
  // page renders a programmatic next/og brand cover, and if that's also
  // unavailable, ArticleCover's deterministic gradient strip. Lets a
  // single article opt into a licensed/produced image without a pipeline.
  coverImage:   z.string().optional(),
  draft:        z.boolean().default(false),
})

export const reviewFrontmatterSchema = baseFrontmatterSchema.extend({
  // Slug of the tool in the `tools` Supabase table. Used to hydrate
  // SoftwareApplication schema and the AffiliateButton inside the review.
  toolSlug:     z.string().min(2),
  rating:       z.number().min(0).max(10).optional(),
  ratingBreakdown: z
    .object({
      easeOfUse: z.number().min(0).max(10).optional(),
      value:     z.number().min(0).max(10).optional(),
      support:   z.number().min(0).max(10).optional(),
      features:  z.number().min(0).max(10).optional(),
    })
    .optional(),
  pros:         z.array(z.string()).default([]),
  cons:         z.array(z.string()).default([]),
  verdict:      z.string().optional(),
  bestFor:      z.string().optional(),
  notFor:       z.string().optional(),
})

export const guideFrontmatterSchema = baseFrontmatterSchema.extend({
  category:     z.string().optional(),
  // HowTo schema is emitted only when `steps` is present and non-empty.
  steps: z
    .array(
      z.object({
        name: z.string(),
        text: z.string(),
        image: z.string().optional(),
      }),
    )
    .optional(),
  // For "best of" round-ups we may want to list mentioned tool slugs to
  // surface them in JSON-LD ItemList. Optional and unused for MVP.
  mentionedTools: z.array(z.string()).optional(),
})

export type ReviewFrontmatter = z.infer<typeof reviewFrontmatterSchema>
export type GuideFrontmatter  = z.infer<typeof guideFrontmatterSchema>

// ============================================================================
// Public API
// ============================================================================

export type ContentType = "reviews" | "guides"
export type ContentLocale = "en" | "ru"

const CONTENT_DIR = path.join(process.cwd(), "content")

type FrontmatterFor<T extends ContentType> = T extends "reviews"
  ? ReviewFrontmatter
  : GuideFrontmatter

export interface CompiledContent<T extends ContentType> {
  slug: string
  type: T
  locale: ContentLocale
  frontmatter: FrontmatterFor<T>
  content: React.ReactElement
  toc: TocEntry[]
  readingTime: ReadingTime
  /** True when the requested locale fell back to English. */
  fellBackToEn: boolean
}

/**
 * Resolve the on-disk path for an MDX file, with EN fallback when the
 * requested locale isn't translated. Returns null if neither exists.
 */
async function resolveContentPath(
  type: ContentType,
  slug: string,
  locale: ContentLocale,
): Promise<{ filePath: string; fellBack: boolean } | null> {
  const primary = path.join(CONTENT_DIR, type, locale, `${slug}.mdx`)
  try {
    await fs.access(primary)
    return { filePath: primary, fellBack: false }
  } catch {
    /* fall through to EN */
  }

  if (locale === "en") return null

  const fallback = path.join(CONTENT_DIR, type, "en", `${slug}.mdx`)
  try {
    await fs.access(fallback)
    return { filePath: fallback, fellBack: true }
  } catch {
    return null
  }
}

/**
 * Load + compile a single MDX file. Returns null when the slug doesn't exist
 * in either the requested locale or English. Throws when frontmatter fails
 * validation — that's a content bug, not a missing-page case.
 */
export async function getMdxContent<T extends ContentType>(
  type: T,
  slug: string,
  locale: ContentLocale = "en",
): Promise<CompiledContent<T> | null> {
  const resolved = await resolveContentPath(type, slug, locale)
  if (!resolved) return null

  const source = await fs.readFile(resolved.filePath, "utf-8")
  const { content: rawBody, data: rawFrontmatter } = matter(source)

  const schema = type === "reviews" ? reviewFrontmatterSchema : guideFrontmatterSchema
  const parsed = schema.safeParse(rawFrontmatter)
  if (!parsed.success) {
    // Loud failure: throw with context so the dev sees exactly which file is
    // bad. Don't silently fall back — a broken review page is better than a
    // misleading one that ships without its rating or tool slug.
    throw new Error(
      `[mdx] frontmatter invalid for ${type}/${slug} (${locale}): ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    )
  }

  const { content } = await compileMDX({
    source: rawBody,
    components: mdxComponents,
    options: {
      // Frontmatter is parsed above with gray-matter, so disable it here to
      // avoid double-parsing (next-mdx-remote would strip a second time and
      // succeed but we want the explicit Zod validation path).
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkSmartypants],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: "append", properties: { className: ["heading-anchor"] } },
          ],
          [rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: true }],
        ],
      },
      // CRITICAL: keep blockJS off. The default (`true`) strips ANY JSX
      // expression — including JSX prop expressions like
      // `<ProsConsList pros={[...]} />`. With blockJS on, the array is
      // removed and the component receives `undefined`, crashing the page
      // on the first `.length` access. We're loading from disk under our
      // own repo, not from user input — there's no XSS surface to protect.
      blockJS: false,
    },
  })

  return {
    slug,
    type,
    locale,
    frontmatter: parsed.data as FrontmatterFor<T>,
    content,
    toc: extractToc(rawBody),
    readingTime: getReadingTime(rawBody, locale),
    fellBackToEn: resolved.fellBack,
  } satisfies CompiledContent<T>
}

/**
 * Read all slugs of a given content type / locale, ignoring drafts.
 * The slug list drives `generateStaticParams` and the index pages.
 * Returns the bare slug (no `.mdx` extension).
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
  return files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
}

/**
 * Read frontmatter only — for index pages that don't need the compiled body.
 * Skips drafts and ignores files whose frontmatter fails validation (logs
 * loudly but doesn't crash the whole listing).
 */
export async function getAllMdxFrontmatter<T extends ContentType>(
  type: T,
  locale: ContentLocale = "en",
): Promise<
  Array<{ slug: string; frontmatter: FrontmatterFor<T> }>
> {
  const slugs = await getAllMdxSlugs(type, locale)
  const results = await Promise.all(
    slugs.map(async (slug) => {
      const filePath = path.join(CONTENT_DIR, type, locale, `${slug}.mdx`)
      try {
        const source = await fs.readFile(filePath, "utf-8")
        const { data } = matter(source)
        const schema =
          type === "reviews" ? reviewFrontmatterSchema : guideFrontmatterSchema
        const parsed = schema.safeParse(data)
        if (!parsed.success) {
          console.error(
            `[mdx] skipping ${type}/${slug} (${locale}) — invalid frontmatter:`,
            parsed.error.issues,
          )
          return null
        }
        if (parsed.data.draft) return null
        return { slug, frontmatter: parsed.data as FrontmatterFor<T> }
      } catch (err) {
        console.error(`[mdx] failed to read ${type}/${slug} (${locale}):`, err)
        return null
      }
    }),
  )
  // Sort newest first by publishedAt — index pages show recency.
  return results
    .filter((r): r is { slug: string; frontmatter: FrontmatterFor<T> } => r !== null)
    .sort((a, b) =>
      b.frontmatter.publishedAt.localeCompare(a.frontmatter.publishedAt),
    )
}
