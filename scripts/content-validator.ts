#!/usr/bin/env node
//
// content-validator — pre-commit gate for staged MDX files
// ----------------------------------------------------------------------------
// Two passes:
//
//   1. SCHEMA  — every MDX file's frontmatter parses against a local Zod
//                schema mirroring lib/content/mdx.ts. Catches missing
//                fields, wrong types, out-of-range ratings, etc.
//                ALWAYS runs.
//
//   2. RATING  — for review MDX files with a `rating:` field, ensure the
//                matching public.tools row carries the same number. Only
//                runs when SUPABASE_SERVICE_ROLE_KEY is set; degrades
//                gracefully when env is missing (mirrors how
//                .husky/pre-commit treats OPENROUTER_API_KEY).
//
// Exit codes:
//   0 — clean
//   1 — schema or rating mismatch (commit blocked)
//   2 — config error (e.g. unreadable file)
//
// Invocation:
//   node --env-file=.env.local --experimental-strip-types --no-warnings \
//     scripts/content-validator.ts [--reviews-only] [path/to/file.mdx ...]
//
// When called with explicit file paths (the pre-commit hook does this),
// we only validate those. With no args, we walk every reviews + guides
// MDX in both locales.
//
// NB: this file deliberately uses line comments instead of /* */ blocks
// because the docstring above references glob patterns containing the
// literal sequence that closes a block comment, which would otherwise
// terminate the comment early.

import fs from "node:fs/promises"
import path from "node:path"

import matter from "gray-matter"
import { z } from "zod"

// Inline mini-schemas mirroring lib/content/mdx.ts. We re-state them here
// instead of importing because lib/content/mdx.ts imports "server-only"
// and pulls in MDX compilation deps — heavy and unnecessary for a CLI
// linter that only ever needs to parse frontmatter.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")

const baseFrontmatter = z.object({
  title:       z.string().min(10).max(120),
  description: z.string().min(40).max(220),
  publishedAt: isoDate,
  updatedAt:   isoDate.optional(),
  author:      z.string().default("Botapolis editorial"),
  tags:        z.array(z.string()).default([]),
  ogImage:     z.string().optional(),
  draft:       z.boolean().default(false),
})

const reviewFrontmatter = baseFrontmatter.extend({
  toolSlug: z.string().min(2),
  rating:   z.number().min(0).max(10).optional(),
  pros:     z.array(z.string()).default([]),
  cons:     z.array(z.string()).default([]),
  verdict:  z.string().optional(),
  bestFor:  z.string().optional(),
  notFor:   z.string().optional(),
  // Accept arbitrary additional fields without failing the lint — Zod
  // 4 has `.passthrough()` to allow keys we don't validate here.
}).passthrough()

const guideFrontmatter = baseFrontmatter.extend({
  category:      z.string().optional(),
  steps:         z
    .array(
      z.object({ name: z.string(), text: z.string(), image: z.string().optional() }),
    )
    .optional(),
  mentionedTools: z.array(z.string()).optional(),
}).passthrough()

// Local opt-out: an RU file with `manuallyTranslated: true` skips schema
// re-checks (the editor hand-tuned it and the auto-translator may have
// generated a less-conformant draft, but we don't want commits to fail
// retroactively). EN never gets this exemption.
function isManuallyTranslatedRu(data: Record<string, unknown>): boolean {
  return data.manuallyTranslated === true
}

interface FileTarget {
  type:   "reviews" | "guides"
  locale: "en" | "ru"
  slug:   string
  abs:    string
  rel:    string
}

const REPO_ROOT = process.cwd()

async function walkContent(): Promise<FileTarget[]> {
  const out: FileTarget[] = []
  for (const type of ["reviews", "guides"] as const) {
    for (const locale of ["en", "ru"] as const) {
      const dir = path.join(REPO_ROOT, "content", type, locale)
      const files = await fs.readdir(dir).catch(() => [])
      for (const f of files) {
        if (!f.endsWith(".mdx")) continue
        const abs = path.join(dir, f)
        out.push({
          type,
          locale,
          slug: f.replace(/\.mdx$/, ""),
          abs,
          rel:  path.relative(REPO_ROOT, abs).replace(/\\/g, "/"),
        })
      }
    }
  }
  return out
}

/**
 * Scan an MDX body for opening code fences without a language tag.
 *
 * Bare ```\n blocks render with no syntax highlighting from Shiki (which
 * needs to know the language to tokenise), so the text inherits the page's
 * default near-black colour against the dark `<pre>` background — invisible.
 * mdx-components.tsx ships a fallback text colour so this no longer renders
 * black-on-black, but missing the language tag also forfeits the actual
 * syntax highlighting the author probably wanted. Forcing the tag closes
 * both problems at the authoring layer instead of hiding them behind CSS.
 *
 * Returns one human-readable message per offending opening fence (with line
 * number). Empty array = clean. Tilde fences and indented code blocks are
 * not checked — authors don't use them in practice.
 */
function checkCodeBlockLanguages(
  body: string,
  rel:  string,
  lineOffset: number,
): string[] {
  const lines = body.split(/\r?\n/)
  const violations: string[] = []
  let inFence = false
  let i = 0
  for (const raw of lines) {
    i++
    const trimmed = raw.trimStart()
    if (!trimmed.startsWith("```")) continue
    if (!inFence) {
      // Opening fence. Capture the language token (non-whitespace immediately
      // after the three backticks). Bare ``` (or ``` with only whitespace
      // after) is the failure case. The reported line number includes
      // lineOffset so authors see the actual file line, not body-relative.
      const lang = trimmed.slice(3).trim().split(/\s+/)[0]
      if (!lang) {
        violations.push(
          `✗ ${rel}:${i + lineOffset} code fence has no language tag. Use \`\`\`text for plain output, ` +
          `or \`\`\`bash / \`\`\`json / \`\`\`tsx / etc. for syntax-highlighted code.`,
        )
      }
      inFence = true
    } else {
      // Closing fence — ignore.
      inFence = false
    }
  }
  return violations
}

/**
 * Number of lines occupied by the YAML frontmatter (including both `---`
 * delimiters). Returns 0 for files that don't open with `---`. Used to
 * map body-relative line numbers back to raw-file line numbers in error
 * messages so authors land on the right line in their editor.
 */
function countFrontmatterLines(raw: string): number {
  const lines = raw.split(/\r?\n/)
  if (lines[0] !== "---") return 0
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return i + 1
  }
  return 0
}

function parseFileArg(arg: string): FileTarget | null {
  // Husky pre-commit invokes us with `content/reviews/en/<slug>.mdx`
  // style paths. Anything outside content/{reviews,guides}/{en,ru}/ we
  // silently ignore (the hook glob already restricts what's passed in).
  const norm = arg.replace(/\\/g, "/").replace(/^\.\//, "")
  const m = norm.match(/^content\/(reviews|guides)\/(en|ru)\/([^/]+)\.mdx$/)
  if (!m) return null
  return {
    type:   m[1] as "reviews" | "guides",
    locale: m[2] as "en" | "ru",
    slug:   m[3],
    abs:    path.join(REPO_ROOT, norm),
    rel:    norm,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const reviewsOnly = args.includes("--reviews-only")
  const filterArgs = args.filter((a) => !a.startsWith("--"))

  let targets: FileTarget[]
  if (filterArgs.length > 0) {
    targets = filterArgs
      .map(parseFileArg)
      .filter((t): t is FileTarget => t !== null)
  } else {
    targets = await walkContent()
  }
  if (reviewsOnly) targets = targets.filter((t) => t.type === "reviews")

  if (targets.length === 0) {
    console.log("[validate] no MDX targets — nothing to check.")
    process.exit(0)
  }

  // --------------------------------------------------------------------
  // Pass 1 — schema + code-fence language tags
  // --------------------------------------------------------------------
  const schemaErrors: string[] = []
  const fenceErrors:  string[] = []
  // Tool-slug → rating map, populated as we go. Pass 2 reuses this.
  const reviewRatings = new Map<string, { rating: number; rel: string }>()

  for (const t of targets) {
    let raw: string
    try {
      raw = await fs.readFile(t.abs, "utf-8")
    } catch (err) {
      schemaErrors.push(`✗ ${t.rel}: unreadable (${(err as Error).message})`)
      continue
    }
    const { data, content: body } = matter(raw)

    // Code-fence language check runs even for manuallyTranslated RU — a
    // missing language tag is an authoring issue, not a translation drift.
    fenceErrors.push(...checkCodeBlockLanguages(body, t.rel, countFrontmatterLines(raw)))

    if (t.locale === "ru" && isManuallyTranslatedRu(data)) {
      // Editor-locked RU — skip schema strictness. EN is still validated.
      continue
    }

    const schema = t.type === "reviews" ? reviewFrontmatter : guideFrontmatter
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("; ")
      schemaErrors.push(`✗ ${t.rel}: ${issues}`)
      continue
    }

    if (t.type === "reviews" && t.locale === "en") {
      const fm = parsed.data as z.infer<typeof reviewFrontmatter>
      if (typeof fm.rating === "number") {
        reviewRatings.set(fm.toolSlug, { rating: fm.rating, rel: t.rel })
      }
    }
  }

  if (schemaErrors.length > 0) {
    console.error("\n[validate] schema errors:\n")
    for (const e of schemaErrors) console.error("  " + e)
    console.error("\n  Fix the frontmatter or add `manuallyTranslated: true` to a")
    console.error("  hand-tuned RU file. Schema lives in lib/content/mdx.ts.\n")
    process.exit(1)
  }

  if (fenceErrors.length > 0) {
    console.error("\n[validate] code-fence language tags missing:\n")
    for (const e of fenceErrors) console.error("  " + e)
    console.error(
      "\n  Every code block needs a language tag so Shiki can highlight it.\n" +
      "  Common choices: text, bash, json, tsx, ts, sh, mdx, yaml, sql, html, css.\n",
    )
    process.exit(1)
  }

  // --------------------------------------------------------------------
  // Pass 2 — rating drift vs Supabase
  // --------------------------------------------------------------------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log(
      "[validate] schema ✓ — skipping DB rating cross-check (no NEXT_PUBLIC_SUPABASE_URL " +
        "or SUPABASE_SERVICE_ROLE_KEY in env). This is fine for routine commits; CI / " +
        "the rare environment with creds enforces it.",
    )
    process.exit(0)
  }
  if (reviewRatings.size === 0) {
    console.log("[validate] schema ✓ — no review ratings to cross-check.")
    process.exit(0)
  }

  // Raw REST call instead of @supabase/supabase-js. The client library opens
  // an undici Agent that holds TLS handles open past the success log on
  // Node 24 + Windows, triggering a libuv assertion at process.exit.
  // PostgREST URL: GET /rest/v1/tools?slug=in.(a,b,c)&select=slug,rating
  const slugs = [...reviewRatings.keys()]
  const slugList = slugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")
  const restUrl =
    `${url.replace(/\/$/, "")}/rest/v1/tools` +
    `?select=slug,rating&slug=in.(${encodeURIComponent(slugList)})`

  type ToolRow = { slug: string; rating: number | null }
  let rows: ToolRow[] = []
  try {
    const res = await fetch(restUrl, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      console.warn(
        `[validate] DB lookup failed (HTTP ${res.status}) — schema ✓, skipping drift check.`,
      )
      await exitAfterDrain(0)
    }
    rows = (await res.json()) as ToolRow[]
  } catch (err) {
    console.warn(
      "[validate] DB lookup failed (" + (err as Error).message + ") — schema ✓, skipping drift check.",
    )
    await exitAfterDrain(0)
  }

  const dbBySlug = new Map<string, number | null>()
  for (const r of rows) dbBySlug.set(r.slug, r.rating)

  const drift: string[] = []
  for (const [slug, { rating, rel }] of reviewRatings.entries()) {
    if (!dbBySlug.has(slug)) {
      console.log(`[validate] ${slug}: MDX=${rating}, DB row missing — skipping`)
      continue
    }
    const dbRating = dbBySlug.get(slug)
    if (dbRating == null || Math.abs(dbRating - rating) > 0.001) {
      drift.push(`✗ ${rel}: MDX rating ${rating} ≠ DB rating ${dbRating ?? "NULL"} for tool "${slug}"`)
    }
  }

  if (drift.length > 0) {
    console.error("\n[validate] rating drift detected:\n")
    for (const d of drift) console.error("  " + d)
    console.error("\n  Resolve by running:")
    console.error("    npm run sync:ratings:apply   # push MDX ratings into DB")
    console.error("  …or revert the MDX rating to the DB value if the DB is canonical.\n")
    process.exit(1)
  }

  console.log("[validate] schema ✓ · ratings ✓")
  await exitAfterDrain(0)
}

// Node 24 on Windows hits a libuv assertion
// (`!(handle->flags & UV_HANDLE_CLOSING)` in src/win/async.c) when fetch
// against Supabase leaves TLS handles mid-close as process.exit() runs.
// A short timeout gives libuv enough wall time to finish closing those
// handles cleanly before we exit. setImmediate is NOT enough — actual ms
// must elapse. Kept narrow so non-DB code paths (early exits above) stay
// instant.
async function exitAfterDrain(code: number): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  process.exit(code)
}

main().catch((err) => {
  console.error("[validate] fatal:", err)
  process.exit(2)
})
