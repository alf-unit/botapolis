/**
 * backfill-page-publications.ts
 * ----------------------------------------------------------------------------
 * Rollout step 2 of the drip-publication gate (migration 020).
 *
 * Seeds `public.page_publications` with one row per CURRENTLY-LIVE page so that
 * when DRIP_GATE_ENABLED flips to true, nothing already in prod disappears.
 * Every seeded row gets:
 *     visible_at  = now()   (already public — stays public)
 *     pool_number = NULL     (already live → NOT part of the drip queue;
 *                             only NEW unpublished content gets numbered at
 *                             Этап H)
 *
 * Sources of "currently live" (must match the sitemap / hub / route filters
 * exactly — this is the contract that guarantees no page is dropped):
 *   • MDX on disk, EN set, non-draft:  content/{pricing,guides,best}/en/*.mdx
 *   • tools       WHERE status='published'           → content_type='tools'
 *   • comparisons WHERE status='published' (distinct slug) → 'comparisons'
 *   • alternatives: one row per published tool slug  → content_type='alternatives'
 *       (/alternatives/[slug] is emitted in the sitemap for every published
 *        tool — see app/sitemap.ts:124-131 — so it is live 1:1 with tools.)
 *
 * Idempotent: upsert with ignoreDuplicates — re-running never overwrites an
 * existing row (so it won't clobber a pool_number assigned later, nor reset a
 * visible_at). Safe to run repeatedly.
 *
 * Run:
 *   npx tsx scripts/backfill-page-publications.ts          # dry-run (counts only)
 *   npx tsx scripts/backfill-page-publications.ts --apply  # write
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { resolve, join } from "path"
import { readdir, readFile } from "node:fs/promises"
import matter from "gray-matter"

config({ path: resolve(process.cwd(), ".env.local") })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const APPLY = process.argv.includes("--apply")
const CONTENT_DIR = resolve(process.cwd(), "content")
const MDX_TYPES = ["pricing", "guides", "best"] as const

interface Row {
  content_type: string
  slug: string
  visible_at: string
  pool_number: null
}

/** Read EN MDX slugs for a type, skipping draft:true (those are NOT live —
 *  the hubs filter them out, so they must not be seeded as visible). */
async function liveMdxSlugs(type: string): Promise<string[]> {
  const dir = join(CONTENT_DIR, type, "en")
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }
  const slugs: string[] = []
  for (const f of files) {
    if (!f.endsWith(".mdx")) continue
    const slug = f.replace(/\.mdx$/, "")
    try {
      const raw = await readFile(join(dir, f), "utf-8")
      const { data } = matter(raw)
      if (data.draft === true) continue // not live
      slugs.push(slug)
    } catch {
      // unreadable file — skip rather than seed a page we can't verify
    }
  }
  return slugs
}

async function main() {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`)
  const nowIso = new Date().toISOString()
  const rows: Row[] = []

  // ----- MDX types (pricing / guides / best), EN, non-draft -----------------
  for (const type of MDX_TYPES) {
    const slugs = await liveMdxSlugs(type)
    for (const slug of slugs) {
      rows.push({ content_type: type, slug, visible_at: nowIso, pool_number: null })
    }
    console.log(`  mdx ${type.padEnd(12)} : ${slugs.length} live`)
  }

  // ----- tools (status='published') -----------------------------------------
  const { data: tools, error: toolsErr } = await sb
    .from("tools")
    .select("slug")
    .eq("status", "published")
  if (toolsErr) throw new Error(`tools fetch failed: ${toolsErr.message}`)
  const toolSlugs = (tools ?? []).map((t) => t.slug)
  for (const slug of toolSlugs) {
    rows.push({ content_type: "tools", slug, visible_at: nowIso, pool_number: null })
  }
  console.log(`  db  tools        : ${toolSlugs.length} published`)

  // ----- alternatives: one per published tool (live 1:1 with tools) ---------
  for (const slug of toolSlugs) {
    rows.push({ content_type: "alternatives", slug, visible_at: nowIso, pool_number: null })
  }
  console.log(`  db  alternatives : ${toolSlugs.length} (mirror of published tools)`)

  // ----- comparisons (status='published', distinct slug) --------------------
  const { data: comparisons, error: cmpErr } = await sb
    .from("comparisons")
    .select("slug")
    .eq("status", "published")
  if (cmpErr) throw new Error(`comparisons fetch failed: ${cmpErr.message}`)
  const cmpSlugs = [...new Set((comparisons ?? []).map((c) => c.slug))]
  for (const slug of cmpSlugs) {
    rows.push({ content_type: "comparisons", slug, visible_at: nowIso, pool_number: null })
  }
  console.log(`  db  comparisons  : ${cmpSlugs.length} published (distinct slug)`)

  console.log(`\n  TOTAL rows to seed: ${rows.length}`)

  if (!APPLY) {
    console.log("\n(dry-run — no writes. Re-run with --apply to seed.)")
    return
  }

  // Upsert in batches; ignoreDuplicates so an existing row is never clobbered
  // (protects any pool_number / visible_at assigned after a prior run).
  const BATCH = 500
  let written = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await sb
      .from("page_publications")
      .upsert(chunk, { onConflict: "content_type,slug", ignoreDuplicates: true })
    if (error) throw new Error(`upsert batch ${i / BATCH} failed: ${error.message}`)
    written += chunk.length
  }
  console.log(`\n  upsert ok (${written} rows sent)\n`)

  // ----- Post-apply coverage report (what actually landed) ------------------
  const { data: seeded, error: cntErr } = await sb
    .from("page_publications")
    .select("content_type")
  if (cntErr) throw new Error(`coverage read failed: ${cntErr.message}`)
  const byType = (seeded ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.content_type] = (acc[r.content_type] ?? 0) + 1
    return acc
  }, {})
  console.log("  coverage in page_publications:")
  for (const [type, n] of Object.entries(byType).sort()) {
    console.log(`    ${type.padEnd(12)} : ${n}`)
  }
  const totalVisible = (seeded ?? []).length
  console.log(`    ${"TOTAL".padEnd(12)} : ${totalVisible}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
