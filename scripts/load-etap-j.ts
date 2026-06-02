/**
 * Etap J — load 220 2nd-wave keywords from botapolis_core_REMAINING.csv
 * into public.semantic_core_entries per operator decisions captured
 * 2026-06-01.
 *
 * Behavior per row:
 *   - 3 pricing dedup (klaviyo/postscript/gorgias pricing): UPDATE existing
 *     row's SEMrush metrics + provenance only; status / template / content
 *     untouched.
 *   - 3 comparison dedup (klaviyo-vs-activecampaign, gorgias-vs-zendesk,
 *     postscript-vs-klaviyo-sms): SKIP — no DB action.
 *   - 2 sidekick low-value (release-date, is-free): INSERT with
 *     status='excluded', template='other', notes carrying skip rationale.
 *   - 33 'other' → INSERT with template='guide', status='second_wave'.
 *   - All remaining (~212 - 33 - 2 = 177): INSERT with mapped template +
 *     status='second_wave'.
 *
 * Run with --apply to write. Default = dry-run.
 *
 * Delete after Etap J load is verified.
 */
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(url, key, { auth: { persistSession: false } })
const APPLY = process.argv.includes("--apply")

// ── Decisions ────────────────────────────────────────────────────────────
const DEDUP_REFRESH = new Set([
  "klaviyo pricing",
  "postscript pricing",
  "gorgias pricing",
])
const DEDUP_SKIP = new Set([
  "klaviyo vs activecampaign",
  "gorgias vs zendesk",
  "postscript vs klaviyo sms",
])
const SIDEKICK_EXCLUDE = new Map<string, string>([
  [
    "shopify sidekick release date",
    "low-value news-style micro-query (vol 20); content would rot quickly. Excluded per operator Etap J load.",
  ],
  [
    "is shopify sidekick free",
    "pricing question already covered in /reviews/shopify-sidekick pricing section (vol 10). Excluded per operator Etap J load.",
  ],
])

const TEMPLATE_MAP: Record<string, string> = {
  pricing: "pricing",
  offer: "discount",
  comparison: "vs-comparison",
  listing: "best-for-segment",
  alternatives: "alternatives",
  review: "review",
  howto: "how-to",
  // 'other' is split per-row: 2 excluded (Map above), 33 → 'guide'.
}

const INTENT_MAP: Record<string, string> = {
  commercial: "commercial-investigation",
  transactional: "transactional",
  informational: "informational",
}

// ── Helpers ──────────────────────────────────────────────────────────────
function toolToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function parseInt0(v: string | undefined): number | null {
  if (v == null || v === "") return null
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

function parseFloat0(v: string | undefined): number | null {
  if (v == null || v === "") return null
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

// ── Parse CSV ────────────────────────────────────────────────────────────
const raw = readFileSync("./botapolis_core_REMAINING.csv", "utf8")
const lines = raw.trim().split(/\r?\n/)
const header = lines[0].split(",")
const rows = lines.slice(1).map((l) => {
  const cells = l.split(",")
  const obj: Record<string, string> = {}
  for (let i = 0; i < header.length; i++) obj[header[i]] = cells[i]
  return obj
})

console.log(`MODE: ${APPLY ? "APPLY (writes)" : "DRY-RUN (pass --apply to write)"}`)
console.log(`CSV rows: ${rows.length}`)
console.log("=".repeat(78))

const counters = {
  refresh: 0,
  skip: 0,
  excluded: 0,
  inserted: 0,
  byTemplate: new Map<string, number>(),
  errors: [] as string[],
}

const refreshDetails: string[] = []
const skipDetails: string[] = []
const excludedDetails: string[] = []

for (const r of rows) {
  const kw = r.keyword.trim()
  const kwLc = kw.toLowerCase()

  // 1. Dedup-skip (3 comparisons)
  if (DEDUP_SKIP.has(kwLc)) {
    counters.skip++
    skipDetails.push(`  ${kw}  (csv: ${r.page_type})`)
    continue
  }

  const toolSlug = toolToSlug(r.tool)
  const volume = parseInt0(r.semrush_volume)
  const kd = parseInt0(r.semrush_kd)
  const cpc = parseFloat0(r.semrush_cpc)
  const sourceCount = parseInt0(r.source_count)
  const priority = parseInt0(r.priority_score)
  const intent = INTENT_MAP[r.intent] ?? r.intent

  // 2. Dedup-refresh (3 pricing)
  if (DEDUP_REFRESH.has(kwLc)) {
    if (APPLY) {
      const { error } = await sb
        .from("semantic_core_entries")
        .update({
          semrush_volume: volume,
          semrush_kd: kd,
          semrush_cpc: cpc,
          source_count: sourceCount,
          affiliate_strength: r.affiliate_strength,
          tool_label: r.tool,
          // Refresh legacy columns to keep them in sync with the new source.
          volume_estimate: volume,
          difficulty: kd,
        })
        .ilike("keyword", kw)
      if (error) counters.errors.push(`refresh ${kw}: ${error.message}`)
    }
    counters.refresh++
    refreshDetails.push(`  ${kw}  vol=${volume} kd=${kd} cpc=${cpc}`)
    continue
  }

  // 3. Template + status resolution
  let template: string
  let status: string
  let notes: string

  const isExcluded = SIDEKICK_EXCLUDE.has(kwLc)
  if (isExcluded) {
    template = "other"
    status = "excluded"
    notes = `[Etap J load 2026-06-01] EXCLUDED: ${SIDEKICK_EXCLUDE.get(kwLc)}`
    counters.excluded++
    excludedDetails.push(`  ${kw}  (${SIDEKICK_EXCLUDE.get(kwLc)?.slice(0, 60)}...)`)
  } else if (r.page_type === "other") {
    template = "guide"
    status = "second_wave"
    notes =
      "[Etap J load 2026-06-01] CSV page_type=other → template=guide (integration / features / Shopify-fit informational query, per operator decision)."
  } else {
    template = TEMPLATE_MAP[r.page_type] ?? r.page_type
    status = "second_wave"
    notes = "[Etap J load 2026-06-01]"
  }

  // 4. INSERT
  if (APPLY) {
    const { error } = await sb.from("semantic_core_entries").insert({
      keyword: kw,
      template,
      cluster: toolSlug,
      search_intent: intent,
      volume_estimate: volume,
      difficulty: kd,
      priority_score: priority,
      related_tool_slugs: [toolSlug],
      language: "en",
      status,
      notes,
      semrush_volume: volume,
      semrush_kd: kd,
      semrush_cpc: cpc,
      source_count: sourceCount,
      affiliate_strength: r.affiliate_strength,
      tool_label: r.tool,
    })
    if (error) {
      counters.errors.push(`insert ${kw}: ${error.message}`)
      continue
    }
  }

  // Don't double-count sidekick excluded rows — they're already in
  // counters.excluded. Keep byTemplate per-template tally for diagnostics.
  if (!isExcluded) {
    counters.inserted++
  }
  counters.byTemplate.set(
    template,
    (counters.byTemplate.get(template) ?? 0) + 1,
  )
}

// ── Output ───────────────────────────────────────────────────────────────
console.log("\n● Refresh (UPDATE metrics on existing pricing rows)")
console.log(`  count: ${counters.refresh}`)
for (const d of refreshDetails) console.log(d)

console.log("\n● Skip (no DB action — already-handled comparison dups)")
console.log(`  count: ${counters.skip}`)
for (const d of skipDetails) console.log(d)

console.log("\n● Excluded (INSERT with status='excluded', template='other')")
console.log(`  count: ${counters.excluded}`)
for (const d of excludedDetails) console.log(d)

console.log("\n● Inserted (INSERT with status='second_wave')")
console.log(`  count: ${counters.inserted}`)
console.log("  by template:")
for (const [t, n] of [...counters.byTemplate.entries()].sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`    ${String(n).padStart(4)} | ${t}`)
}

console.log("\n● Errors")
console.log(`  count: ${counters.errors.length}`)
for (const e of counters.errors) console.log(`  ${e}`)

console.log("\n" + "=".repeat(78))
console.log(
  `TOTAL CSV rows processed: ${rows.length} (refresh ${counters.refresh} + skip ${counters.skip} + excluded ${counters.excluded} + inserted ${counters.inserted} = ${counters.refresh + counters.skip + counters.excluded + counters.inserted})`,
)
console.log("=".repeat(78))
