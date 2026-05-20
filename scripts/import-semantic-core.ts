#!/usr/bin/env node
/* ----------------------------------------------------------------------------
   import-semantic-core — seed/refresh public.semantic_core_entries from CSV
   ----------------------------------------------------------------------------
   Reads semantic-core/full-core.csv, applies semantic-core/exclusions.md as
   a denylist, and upserts each row keyed on `keyword`. Workflow state on
   existing rows is preserved — only the CSV-sourced columns are touched.

   Two ways to use it:

     npm run import:semantic-core         # apply (default; idempotent)
     npm run import:semantic-core -- --dry-run   # parse + diff, no writes

   Reads from .env.local via Node 20+'s `--env-file` (see package.json).
   Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; service-
   role is needed because RLS blocks writes from anon/auth roles.

   Why no csv-parse dep: the core has ~430 rows and the schema is
   well-bounded. A 60-line RFC-4180-ish parser handles it correctly and
   avoids pulling in another transitive tree at install time. If we ever
   need multi-line quoted fields or escaped embedded quotes beyond basic
   "" doubling, swap in csv-parse — the call site is small.
---------------------------------------------------------------------------- */

import fs from "node:fs/promises"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

const CORE_PATH       = path.join(process.cwd(), "semantic-core", "full-core.csv")
const EXCLUSIONS_PATH = path.join(process.cwd(), "semantic-core", "exclusions.md")

interface CoreRow {
  cluster:          string
  template:         string
  keyword:          string
  search_intent:    string
  volume_estimate:  number | null
  difficulty:       number | null
  priority_score:   number | null
  content_angle:    string | null
  content_gap:      string | null
  competitors_top3: unknown | null
  notes:            string | null
  language:         string
}

const VALID_TEMPLATES = new Set([
  "review", "vs-comparison", "alternatives", "how-to",
  "guide", "pricing", "best-for-segment", "news",
])
const VALID_INTENTS  = new Set(["transactional", "commercial-investigation", "informational"])
const VALID_LANGS    = new Set(["en", "ru"])

/** RFC-4180-ish CSV parser. Handles quoted cells, "" escapes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row:   string[] = []
  let cell  = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } // escaped quote
        else inQuotes = false
      } else cell += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ",") { row.push(cell); cell = "" }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = "" }
      else if (ch === "\r") { /* swallow — handled by \n branch */ }
      else cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim().length > 0))
}

function toInt(s: string | undefined): number | null {
  if (!s || !s.trim()) return null
  const n = Number.parseInt(s.trim(), 10)
  return Number.isFinite(n) ? n : null
}

function toJson(s: string | undefined): unknown | null {
  if (!s || !s.trim()) return null
  try { return JSON.parse(s) }
  catch { return null }   // a broken JSON cell shouldn't blow up the import
}

async function loadExclusions(): Promise<Set<string>> {
  const text = await fs.readFile(EXCLUSIONS_PATH, "utf-8").catch(() => "")
  const set = new Set<string>()
  // Format: `- \`keyword\` — reason`. Backtick-wrapped phrase is the key.
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*-\s*`([^`]+)`/)
    if (m) set.add(m[1].trim().toLowerCase())
  }
  return set
}

async function loadCore(exclusions: Set<string>): Promise<CoreRow[]> {
  const text = await fs.readFile(CORE_PATH, "utf-8")
  const rows = parseCsv(text)
  if (rows.length === 0) throw new Error("[import] CSV is empty")

  const header = rows[0].map(h => h.trim())
  const required = ["cluster", "template", "keyword", "search_intent"]
  for (const col of required) {
    if (!header.includes(col)) throw new Error(`[import] CSV missing required header: ${col}`)
  }
  const col = (name: string) => header.indexOf(name)

  const out: CoreRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const keyword = (r[col("keyword")] ?? "").trim().toLowerCase()
    if (!keyword) continue
    if (exclusions.has(keyword)) {
      console.warn(`[import] SKIP excluded: ${keyword}`)
      continue
    }

    const template = (r[col("template")] ?? "").trim()
    const intent   = (r[col("search_intent")] ?? "").trim()
    const language = ((r[col("language")] ?? "en").trim() || "en").toLowerCase()

    if (!VALID_TEMPLATES.has(template)) {
      console.warn(`[import] SKIP row ${i + 1}: bad template "${template}" for "${keyword}"`)
      continue
    }
    if (!VALID_INTENTS.has(intent)) {
      console.warn(`[import] SKIP row ${i + 1}: bad search_intent "${intent}" for "${keyword}"`)
      continue
    }
    if (!VALID_LANGS.has(language)) {
      console.warn(`[import] SKIP row ${i + 1}: bad language "${language}" for "${keyword}"`)
      continue
    }

    out.push({
      cluster:          (r[col("cluster")] ?? "").trim().toLowerCase(),
      template,
      keyword,
      search_intent:    intent,
      volume_estimate:  toInt(r[col("volume_estimate")]),
      difficulty:       toInt(r[col("difficulty")]),
      priority_score:   toInt(r[col("priority_score")]),
      content_angle:    (r[col("content_angle")] ?? "").trim() || null,
      content_gap:      (r[col("content_gap")] ?? "").trim() || null,
      competitors_top3: toJson(r[col("competitors_top3")]),
      notes:            (r[col("notes")] ?? "").trim() || null,
      language,
    })
  }
  return out
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[import] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Check .env.local; vercel env pull returns empty strings on this account — see HANDOFF.md.",
    )
    process.exit(2)
  }

  const dryRun = process.argv.includes("--dry-run")
  const exclusions = await loadExclusions()
  const rows = await loadCore(exclusions)

  console.log(`[import] parsed ${rows.length} valid rows (${exclusions.size} exclusions applied)`)
  if (dryRun) {
    console.log("[import] --dry-run set; no writes performed")
    for (const row of rows.slice(0, 5)) console.log("  •", row.keyword, "→", row.template, `(${row.cluster})`)
    if (rows.length > 5) console.log(`  ... +${rows.length - 5} more`)
    process.exit(0)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  let inserted = 0
  let updated  = 0
  let failed   = 0

  for (const row of rows) {
    // Upsert manually so we don't overwrite workflow state on existing rows.
    const { data: existing, error: selErr } = await supabase
      .from("semantic_core_entries")
      .select("id")
      .eq("keyword", row.keyword)
      .maybeSingle()

    if (selErr) { console.error(`[import] select failed for "${row.keyword}":`, selErr.message); failed++; continue }

    if (existing) {
      const { error } = await supabase
        .from("semantic_core_entries")
        .update({
          cluster:          row.cluster,
          template:         row.template,
          search_intent:    row.search_intent,
          volume_estimate:  row.volume_estimate,
          difficulty:       row.difficulty,
          priority_score:   row.priority_score,
          content_angle:    row.content_angle,
          content_gap:      row.content_gap,
          competitors_top3: row.competitors_top3,
          notes:            row.notes,
          language:         row.language,
        })
        .eq("id", existing.id)
      if (error) { console.error(`[import] update failed for "${row.keyword}":`, error.message); failed++; continue }
      updated++
    } else {
      const { error } = await supabase
        .from("semantic_core_entries")
        .insert({ ...row, status: "queued" })
      if (error) { console.error(`[import] insert failed for "${row.keyword}":`, error.message); failed++; continue }
      inserted++
    }
  }

  console.log(`[import] done: inserted=${inserted} updated=${updated} failed=${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch(err => { console.error("[import] fatal:", err); process.exit(1) })
