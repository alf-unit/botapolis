#!/usr/bin/env node
//
// content-validator — pre-commit gate for staged MDX files
// ----------------------------------------------------------------------------
// Type-agnostic by design: walks content/*/{en,ru}/**/*.mdx without
// enumerating types. A new content directory automatically falls under the
// gate. Mirrors lib/content/mdx.ts schemas locally because mdx.ts imports
// "server-only" and pulls heavy MDX deps — too much for a CLI linter.
//
// Passes:
//   1. SCHEMA  — per-type Zod schema (description ≤ 220 lives here)
//   2. SAFETY  — bare '<' or '>' before $/digit in body (outside code blocks)
//                — these break the MDX parser at SSR time
//   3. FENCE   — opening code-fence blocks must carry a language tag (Shiki)
//   4. PAIRING — every EN slug has an RU twin per type
//                  • default: WARNING (missing RU logs but doesn't fail)
//                  • --strict-pairing: ERROR (missing RU blocks commit)
//                Orphan RU (RU with no EN) is ALWAYS an error.
//                Opt-out per file: `noRuPair: true` in EN frontmatter.
//   5. RATING  — reviews-only: MDX rating === public.tools.rating
//
// Exit codes:
//   0 — clean (or pairing warnings only in default mode)
//   1 — schema / safety / fence / rating mismatch, OR strict-pairing miss
//   2 — config error
//
// Invocation:
//   node --env-file=.env.local --experimental-strip-types --no-warnings \
//     scripts/content-validator.ts [--strict-pairing] [--reviews-only] \
//                                  [path/to/file.mdx ...]
//
// With file args (pre-commit), only those files are checked for passes 1-3.
// The PAIRING pass always runs over the full tree so adding a new EN
// detects missing RU twin even if RU isn't staged.

import fs from "node:fs/promises"
import path from "node:path"

import matter from "gray-matter"
import { z } from "zod"

// ----------------------------------------------------------------------------
// Inline schemas — mirror lib/content/mdx.ts.
// ----------------------------------------------------------------------------

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
  coverImage:  z.string().optional(),
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
}).passthrough()

const guideFrontmatter = baseFrontmatter.extend({
  category:       z.string().optional(),
  steps: z
    .array(z.object({
      name:  z.string(),
      text:  z.string(),
      image: z.string().optional(),
    }))
    .optional(),
  mentionedTools: z.array(z.string()).optional(),
}).passthrough()

const bestFrontmatter = baseFrontmatter.extend({
  segment: z.string().min(2),
  tools:   z.array(z.string()).min(1),
  summary: z.string().optional(),
}).passthrough()

const pricingFrontmatter = baseFrontmatter.extend({
  toolSlug:       z.string().min(2),
  primaryKeyword: z.string().optional(),
  faq:            z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  rating:         z.number().min(0).max(10).optional(),
  pros:           z.array(z.string()).default([]),
  cons:           z.array(z.string()).default([]),
  verdict:        z.string().optional(),
  bestFor:        z.string().optional(),
  notFor:         z.string().optional(),
}).passthrough()

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  reviews:  reviewFrontmatter,
  guides:   guideFrontmatter,
  best:     bestFrontmatter,
  pricing:  pricingFrontmatter,
  news:     baseFrontmatter,
}

// Bridge-only types: MDX files exist as a transport format for the
// webhook → DB pipeline (see /api/agents/article-published). Live pages
// render from public.<table>, NOT from the MDX file. Schema and pairing
// checks are deliberately skipped for these — the DB row is the
// source of truth, MDX is just a courier. Safety + fence checks still
// run (cheap, and harmless if the MDX is ever rendered).
const BRIDGE_ONLY_TYPES = new Set(["comparisons", "alternatives"])

function isManuallyTranslatedRu(data: Record<string, unknown>): boolean {
  return data.manuallyTranslated === true
}

function isNoRuPairOptOut(data: Record<string, unknown>): boolean {
  return data.noRuPair === true
}

// ----------------------------------------------------------------------------
// Universal walker — discovers any content/{type}/{en|ru}/**/*.mdx.
// ----------------------------------------------------------------------------

interface FileTarget {
  type:   string      // type-agnostic — whatever the directory is named
  locale: "en" | "ru"
  slug:   string
  abs:    string
  rel:    string
}

const REPO_ROOT   = process.cwd()
const CONTENT_DIR = path.join(REPO_ROOT, "content")

async function walkContent(): Promise<FileTarget[]> {
  const out: FileTarget[] = []
  const types = await fs.readdir(CONTENT_DIR).catch(() => [] as string[])
  for (const type of types) {
    const typeDir = path.join(CONTENT_DIR, type)
    const stat = await fs.stat(typeDir).catch(() => null)
    if (!stat?.isDirectory()) continue
    for (const locale of ["en", "ru"] as const) {
      const dir = path.join(typeDir, locale)
      const files = await fs.readdir(dir).catch(() => [] as string[])
      for (const f of files) {
        if (!f.endsWith(".mdx")) continue
        const abs = path.join(dir, f)
        out.push({
          type,
          locale,
          slug: f.replace(/\.mdx$/, ""),
          abs,
          rel: path.relative(REPO_ROOT, abs).replace(/\\/g, "/"),
        })
      }
    }
  }
  return out
}

function parseFileArg(arg: string): FileTarget | null {
  const norm = arg.replace(/\\/g, "/").replace(/^\.\//, "")
  const m = norm.match(/^content\/([^/]+)\/(en|ru)\/([^/]+)\.mdx$/)
  if (!m) return null
  return {
    type:   m[1],
    locale: m[2] as "en" | "ru",
    slug:   m[3],
    abs:    path.join(REPO_ROOT, norm),
    rel:    norm,
  }
}

// ----------------------------------------------------------------------------
// Body-safety check — bare '<' or '>' immediately before $/digit anywhere
// outside fenced code blocks and inline backtick spans. These break the MDX
// parser at SSR time (treated as malformed JSX tag start/end).
//
// Canonical fix the operator uses: '<5K' → 'under 5K', '>120K' → 'over 120K',
// or wrap in backticks (`<5K`). Blockquotes (`> "quote"`) are unaffected
// because the regex requires the digit/$ to follow immediately, no space.
// ----------------------------------------------------------------------------

function checkBareLtGt(body: string, rel: string, lineOffset: number): string[] {
  const lines = body.split(/\r?\n/)
  const violations: string[] = []
  let inFence = false
  let i = 0
  for (const raw of lines) {
    i++
    const trimmed = raw.trimStart()
    if (trimmed.startsWith("```")) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    // Strip inline backtick spans before scanning — `<5K` in backticks
    // renders as code, not JSX, so it's safe.
    const stripped = raw.replace(/`[^`]*`/g, "")

    for (const m of stripped.matchAll(/<(?=[\d$])/g)) {
      const idx = m.index ?? 0
      const ch  = stripped[idx + 1] ?? "?"
      const ctx = stripped.slice(Math.max(0, idx - 15), idx + 15)
      violations.push(
        `✗ ${rel}:${i + lineOffset} bare '<' before '${ch}' — write 'under ${ch}…' or wrap in backticks. Context: …${ctx}…`,
      )
    }

    for (const m of stripped.matchAll(/>(?=[\d$])/g)) {
      const idx = m.index ?? 0
      const ch  = stripped[idx + 1] ?? "?"
      const ctx = stripped.slice(Math.max(0, idx - 15), idx + 15)
      violations.push(
        `✗ ${rel}:${i + lineOffset} bare '>' before '${ch}' — write 'over ${ch}…' or wrap in backticks. Context: …${ctx}…`,
      )
    }
  }
  return violations
}

// ----------------------------------------------------------------------------
// Code-fence language tags (preserved from prior validator).
// ----------------------------------------------------------------------------

function checkCodeBlockLanguages(body: string, rel: string, lineOffset: number): string[] {
  const lines = body.split(/\r?\n/)
  const violations: string[] = []
  let inFence = false
  let i = 0
  for (const raw of lines) {
    i++
    const trimmed = raw.trimStart()
    if (!trimmed.startsWith("```")) continue
    if (!inFence) {
      const lang = trimmed.slice(3).trim().split(/\s+/)[0]
      if (!lang) {
        violations.push(
          `✗ ${rel}:${i + lineOffset} code fence has no language tag. Use \`\`\`text for plain output, ` +
          `or \`\`\`bash / \`\`\`json / \`\`\`tsx / etc. for syntax-highlighted code.`,
        )
      }
      inFence = true
    } else {
      inFence = false
    }
  }
  return violations
}

function countFrontmatterLines(raw: string): number {
  const lines = raw.split(/\r?\n/)
  if (lines[0] !== "---") return 0
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return i + 1
  }
  return 0
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const strictPairing = args.includes("--strict-pairing")
  const reviewsOnly   = args.includes("--reviews-only")  // legacy flag preserved
  const filterArgs    = args.filter((a) => !a.startsWith("--"))

  // Pairing pass always sees the full tree, even when called with staged-only
  // file args — so adding a new EN detects the missing RU twin globally.
  const allTargets = await walkContent()

  let validateTargets: FileTarget[]
  if (filterArgs.length > 0) {
    validateTargets = filterArgs
      .map(parseFileArg)
      .filter((t): t is FileTarget => t !== null)
  } else {
    validateTargets = allTargets
  }
  if (reviewsOnly) validateTargets = validateTargets.filter((t) => t.type === "reviews")

  if (validateTargets.length === 0 && filterArgs.length === 0) {
    console.log("[validate] no MDX targets — nothing to check.")
    process.exit(0)
  }

  // -------------------- Pass 1-3 — per-file checks --------------------
  const schemaErrors: string[] = []
  const safetyErrors: string[] = []
  const fenceErrors:  string[] = []
  const reviewRatings = new Map<string, { rating: number; rel: string }>()

  for (const t of validateTargets) {
    let raw: string
    try {
      raw = await fs.readFile(t.abs, "utf-8")
    } catch (err) {
      schemaErrors.push(`✗ ${t.rel}: unreadable (${(err as Error).message})`)
      continue
    }
    const { data, content: body } = matter(raw)
    const lineOffset = countFrontmatterLines(raw)

    // Safety + fence always run — they catch ship-blockers (500 SSR + invisible code).
    safetyErrors.push(...checkBareLtGt(body, t.rel, lineOffset))
    fenceErrors.push(...checkCodeBlockLanguages(body, t.rel, lineOffset))

    if (BRIDGE_ONLY_TYPES.has(t.type)) {
      // DB-driven type — MDX is a transport, not a render source. Skip
      // schema check; safety/fence already ran.
      continue
    }

    if (t.locale === "ru" && isManuallyTranslatedRu(data)) {
      // Editor-locked RU — skip schema strictness, safety/fence already done.
      continue
    }

    const schema = SCHEMAS[t.type] ?? baseFrontmatter
    if (!SCHEMAS[t.type]) {
      console.warn(
        `[validate] ${t.rel}: unknown type '${t.type}' — falling back to base schema ` +
        `(title/description/publishedAt only). Add a schema in SCHEMAS map if this type ships pages.`,
      )
    }
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

  // -------------------- Pass 4 — EN↔RU pairing (global) --------------------
  const enByType = new Map<string, Set<string>>()
  const ruByType = new Map<string, Set<string>>()
  const noRuPairOptOuts = new Set<string>()  // "type/slug"

  for (const t of allTargets) {
    const map = t.locale === "en" ? enByType : ruByType
    if (!map.has(t.type)) map.set(t.type, new Set())
    map.get(t.type)!.add(t.slug)
    if (t.locale === "en") {
      try {
        const raw = await fs.readFile(t.abs, "utf-8")
        const { data } = matter(raw)
        if (isNoRuPairOptOut(data)) noRuPairOptOuts.add(`${t.type}/${t.slug}`)
      } catch { /* ignore */ }
    }
  }

  const pairingMissingRu: string[] = []
  const pairingOrphanRu:  string[] = []
  for (const [type, enSet] of enByType) {
    if (BRIDGE_ONLY_TYPES.has(type)) continue   // DB owns pairing for bridge types
    const ruSet = ruByType.get(type) ?? new Set<string>()
    for (const slug of enSet) {
      if (!ruSet.has(slug) && !noRuPairOptOuts.has(`${type}/${slug}`)) {
        pairingMissingRu.push(`${type}/${slug}`)
      }
    }
  }
  for (const [type, ruSet] of ruByType) {
    if (BRIDGE_ONLY_TYPES.has(type)) continue
    const enSet = enByType.get(type) ?? new Set<string>()
    for (const slug of ruSet) {
      if (!enSet.has(slug)) pairingOrphanRu.push(`${type}/${slug}`)
    }
  }

  // -------------------- Report --------------------
  if (schemaErrors.length > 0) {
    console.error("\n[validate] schema errors:\n")
    for (const e of schemaErrors) console.error("  " + e)
    console.error("\n  Fix the frontmatter. Schemas live in lib/content/mdx.ts (mirror in this validator).\n")
    process.exit(1)
  }

  if (safetyErrors.length > 0) {
    console.error("\n[validate] body safety errors (bare <> before digit/$ — breaks MDX parser at SSR):\n")
    for (const e of safetyErrors) console.error("  " + e)
    console.error("\n  Replace '<5K' → 'under 5K', '>120K' → 'over 120K', or wrap in backticks (`<5K`).\n")
    process.exit(1)
  }

  if (fenceErrors.length > 0) {
    console.error("\n[validate] code-fence language tags missing:\n")
    for (const e of fenceErrors) console.error("  " + e)
    console.error("\n  Every code block needs a language tag. Common: text, bash, json, tsx, ts, sh, mdx, yaml, sql.\n")
    process.exit(1)
  }

  if (pairingOrphanRu.length > 0) {
    console.error("\n[validate] orphan RU files (RU without EN twin — always error):\n")
    for (const e of pairingOrphanRu) console.error("  ✗ content/" + e + " (ru)")
    console.error("\n  Either restore the EN twin or delete the RU file.\n")
    process.exit(1)
  }

  if (pairingMissingRu.length > 0) {
    const level = strictPairing ? "error" : "warning"
    const label = strictPairing ? "✗" : "⚠"
    console.error(`\n[validate] pairing ${level} — EN files without RU twin:\n`)
    for (const e of pairingMissingRu) console.error(`  ${label} content/${e} (en)`)
    if (strictPairing) {
      console.error("\n  Create content/<type>/ru/<slug>.mdx for each. Same-session EN+RU is project policy.\n")
      process.exit(1)
    } else {
      console.error("\n  (WARNING only — will block once --strict-pairing is enabled in pre-commit.)\n")
    }
  }

  // -------------------- Pass 5 — rating drift vs Supabase --------------------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log("[validate] schema ✓ · safety ✓ · fence ✓ · pairing ✓ — skipping DB rating cross-check (no env).")
    await exitAfterDrain(0)
  }
  if (reviewRatings.size === 0) {
    console.log("[validate] schema ✓ · safety ✓ · fence ✓ · pairing ✓ — no review ratings to cross-check.")
    await exitAfterDrain(0)
  }

  // Raw REST call instead of @supabase/supabase-js. The client library opens
  // an undici Agent that holds TLS handles open past the success log on
  // Node 24 + Windows, triggering a libuv assertion at process.exit.
  const slugs = [...reviewRatings.keys()]
  const slugList = slugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")
  const restUrl =
    `${url!.replace(/\/$/, "")}/rest/v1/tools` +
    `?select=slug,rating&slug=in.(${encodeURIComponent(slugList)})`

  type ToolRow = { slug: string; rating: number | null }
  let rows: ToolRow[] = []
  try {
    const res = await fetch(restUrl, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key!}`,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      console.warn(`[validate] DB lookup failed (HTTP ${res.status}) — schema ✓, skipping drift check.`)
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

  console.log("[validate] schema ✓ · safety ✓ · fence ✓ · pairing ✓ · ratings ✓")
  await exitAfterDrain(0)
}

// Node 24 + Windows + Supabase fetch: short timeout for libuv to close TLS
// handles cleanly before exit. setImmediate isn't enough — ms must elapse.
async function exitAfterDrain(code: number): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  process.exit(code)
}

main().catch((err) => {
  console.error("[validate] fatal:", err)
  process.exit(2)
})
