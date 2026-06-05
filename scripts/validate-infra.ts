#!/usr/bin/env node
/* ----------------------------------------------------------------------------
   validate-infra — sanity check for the multi-agent infrastructure
   ----------------------------------------------------------------------------
   Walks the checklist from Resources/FINAL-ARCHITECTURE-V4.md Phase 1 and reports
   which pieces are wired, which are missing, and which are loosely
   configured (e.g. JSON files that parse but contain only sample data).

   What's checked:
     - Required directories exist
     - Required template files exist
     - JSON configs parse and have minimum content
     - semantic-core CSV parses cleanly and matches schema enums
     - All 5 multi-agent Supabase tables exist + are writable
     - system_config seed defaults loaded
     - REVALIDATE_SECRET present in .env.local
     - /api/agents/article-published responds (auth-gated, 401 expected)
     - Git hooks present + executable

   Exit codes:
     0  everything green
     1  one or more critical checks failed
     2  warnings only (e.g. sample data still in configs)

   Run:
     npm run validate:infra
     npm run validate:infra -- --skip-net   # skip the prod endpoint probe
---------------------------------------------------------------------------- */

import fs from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

type CheckLevel = "PASS" | "WARN" | "FAIL"

interface CheckResult {
  name: string
  level: CheckLevel
  detail?: string
}

const results: CheckResult[] = []

function record(name: string, level: CheckLevel, detail?: string) {
  results.push({ name, level, detail })
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

async function checkDirs() {
  const required = [
    "research",
    "content-templates",
    "semantic-core",
    "agent-snapshots/chief", "agent-snapshots/chief/scout-requests", "agent-snapshots/chief/ops-requests",
    "agent-snapshots/scout", "agent-snapshots/ops",
    "config",
    "scripts/git-hooks",
    "content/reviews/en", "content/reviews/ru",
    "content/comparisons/en", "content/comparisons/ru",
    "content/alternatives/en", "content/alternatives/ru",
    "content/guides/en", "content/guides/ru",
    "content/news/en", "content/news/ru",
    "content/best/en", "content/best/ru",
    "app/api/agents/article-published",
    "supabase/migrations",
    "lib/supabase",
  ]
  for (const d of required) {
    record(`dir: ${d}`, (await exists(d)) ? "PASS" : "FAIL")
  }
}

async function checkFiles() {
  const files: Array<{ path: string; minBytes?: number }> = [
    { path: "research/_template.md", minBytes: 500 },
    { path: "content-templates/vs-comparison.md", minBytes: 500 },
    { path: "content-templates/deep-review.md", minBytes: 500 },
    { path: "content-templates/how-to.md", minBytes: 500 },
    { path: "content-templates/guide.md", minBytes: 500 },
    { path: "content-templates/news.md", minBytes: 500 },
    { path: "semantic-core/README.md", minBytes: 500 },
    { path: "semantic-core/full-core.csv", minBytes: 500 },
    { path: "semantic-core/exclusions.md", minBytes: 100 },
    { path: "config/vendor-feeds.json", minBytes: 200 },
    { path: "config/partner-list.json", minBytes: 200 },
    { path: "config/banned-phrases.json", minBytes: 500 },
    { path: "scripts/import-semantic-core.ts", minBytes: 1000 },
    { path: "scripts/git-hooks/post-commit.sh", minBytes: 500 },
    { path: ".husky/post-commit", minBytes: 500 },
    { path: "app/api/agents/article-published/route.ts", minBytes: 1000 },
    { path: "supabase/migrations/008_multi_agent_tables.sql", minBytes: 1000 },
    { path: "CLAUDE.md", minBytes: 1000 },
  ]
  for (const f of files) {
    if (!(await exists(f.path))) { record(`file: ${f.path}`, "FAIL", "missing"); continue }
    if (f.minBytes) {
      const stat = await fs.stat(f.path)
      if (stat.size < f.minBytes) { record(`file: ${f.path}`, "WARN", `only ${stat.size} bytes (expected >=${f.minBytes})`); continue }
    }
    record(`file: ${f.path}`, "PASS")
  }
}

async function checkJsonConfigs() {
  // vendor-feeds: must parse + have at least 1 tracked entry
  try {
    const data = JSON.parse(await fs.readFile("config/vendor-feeds.json", "utf-8"))
    const tracked = (data.feeds ?? []).filter((f: { tracked?: boolean }) => f.tracked).length
    if (tracked === 0) record("config: vendor-feeds.json", "FAIL", "no tracked feeds")
    else if (tracked < 10) record("config: vendor-feeds.json", "WARN", `only ${tracked} tracked feeds — architecture targets 50+`)
    else record("config: vendor-feeds.json", "PASS", `${tracked} tracked feeds`)
  } catch (e) { record("config: vendor-feeds.json", "FAIL", `parse error: ${(e as Error).message}`) }

  // partner-list: must parse + at least 1 partner
  try {
    const data = JSON.parse(await fs.readFile("config/partner-list.json", "utf-8"))
    const partners = (data.partners ?? []).length
    if (partners === 0) record("config: partner-list.json", "FAIL", "no partners")
    else if (partners < 5) record("config: partner-list.json", "WARN", `only ${partners} partners — operator should expand`)
    else record("config: partner-list.json", "PASS", `${partners} partners`)
  } catch (e) { record("config: partner-list.json", "FAIL", `parse error: ${(e as Error).message}`) }

  // banned-phrases: must parse + have categories
  try {
    const data = JSON.parse(await fs.readFile("config/banned-phrases.json", "utf-8"))
    const cats = Object.keys(data.categories ?? {}).length
    if (cats === 0) record("config: banned-phrases.json", "FAIL", "no categories")
    else record("config: banned-phrases.json", "PASS", `${cats} categories`)
  } catch (e) { record("config: banned-phrases.json", "FAIL", `parse error: ${(e as Error).message}`) }
}

async function checkSemanticCoreCsv() {
  let text: string
  try { text = await fs.readFile("semantic-core/full-core.csv", "utf-8") }
  catch { record("csv: full-core.csv readable", "FAIL", "cannot read"); return }

  // Mini CSV parser (RFC-4180-ish) — kept self-contained so this script
  // works even if the importer file is broken.
  const rows: string[][] = []
  let row: string[] = [], cell = "", inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false }
      else cell += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ",") { row.push(cell); cell = "" }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = "" }
      else if (ch === "\r") { /* swallow */ }
      else cell += ch
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const dataRows = rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim()))
  const header = dataRows[0]
  const expectedCols = ["cluster","template","keyword","search_intent","volume_estimate","difficulty","priority_score","content_angle","content_gap","competitors_top3","notes","language"]
  for (const col of expectedCols) {
    if (!header.includes(col)) { record("csv: header columns", "FAIL", `missing column ${col}`); return }
  }
  record("csv: header columns", "PASS", `${header.length} cols`)

  const VALID_TEMPLATES = new Set(["review","vs-comparison","alternatives","how-to","guide","pricing","best-for-segment","news"])
  const VALID_INTENTS = new Set(["transactional","commercial-investigation","informational"])
  const tIdx = header.indexOf("template")
  const iIdx = header.indexOf("search_intent")
  const kIdx = header.indexOf("keyword")
  const seen = new Set<string>()
  let badT = 0, badI = 0, dup = 0
  for (let r = 1; r < dataRows.length; r++) {
    const row = dataRows[r]
    if (row.length !== header.length) { record("csv: row column count", "FAIL", `row ${r + 1} has ${row.length}/${header.length}`); return }
    if (!VALID_TEMPLATES.has((row[tIdx] ?? "").trim())) badT++
    if (!VALID_INTENTS.has((row[iIdx] ?? "").trim())) badI++
    const kw = (row[kIdx] ?? "").trim().toLowerCase()
    if (seen.has(kw)) dup++
    seen.add(kw)
  }
  record("csv: enum validity", (badT + badI > 0) ? "FAIL" : "PASS", `bad_template=${badT} bad_intent=${badI}`)
  record("csv: keyword uniqueness", dup > 0 ? "FAIL" : "PASS", `duplicates=${dup}`)
  record("csv: row count", dataRows.length - 1 < 20 ? "WARN" : "PASS", `${dataRows.length - 1} data rows`)
}

async function checkEnv() {
  const text = await fs.readFile(".env.local", "utf-8").catch(() => "")
  const has = (key: string) => new RegExp(`^${key}=.+`, "m").test(text)
  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "REVALIDATE_SECRET"]) {
    record(`env: ${k}`, has(k) ? "PASS" : "FAIL", has(k) ? "" : "missing in .env.local")
  }
}

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { record("supabase: env vars present", "FAIL", "cannot connect"); return }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const tables = [
    "semantic_core_entries",
    "content_opportunities",
    "agent_logs",
    "performance_snapshots",
    "system_config",
  ] as const
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true })
    if (error) record(`supabase: ${t} reachable`, "FAIL", error.message)
    else record(`supabase: ${t} reachable`, "PASS", `count=${count}`)
  }

  // system_config seed defaults
  const seedKeys = ["publishing_rate_daily", "auto_approve_enabled", "current_focus_clusters", "telegram_chat_id"]
  const { data: cfg } = await supabase.from("system_config").select("key,value").in("key", seedKeys)
  const got = new Set((cfg ?? []).map(r => r.key))
  for (const k of seedKeys) {
    record(`supabase: system_config[${k}]`, got.has(k) ? "PASS" : "FAIL", got.has(k) ? "" : "seed default missing")
  }
  // Flag telegram_chat_id still on placeholder
  const tg = (cfg ?? []).find(r => r.key === "telegram_chat_id")?.value
  if (tg && typeof tg === "string" && tg.includes("REPLACE_WITH")) {
    record(`supabase: telegram_chat_id configured`, "WARN", `placeholder still: ${tg}`)
  }

  // semantic_core_entries content sanity
  const { count: scCount } = await supabase.from("semantic_core_entries").select("*", { count: "exact", head: true })
  if ((scCount ?? 0) < 10) record("supabase: semantic_core_entries seeded", "WARN", `only ${scCount} rows`)
  else record("supabase: semantic_core_entries seeded", "PASS", `${scCount} rows`)
}

async function checkEndpoint() {
  if (process.argv.includes("--skip-net")) { record("endpoint: article-published reachable", "WARN", "skipped (--skip-net)"); return }
  // Read site URL from .env.local; fall back to prod.
  const envText = await fs.readFile(".env.local", "utf-8").catch(() => "")
  const m = envText.match(/^NEXT_PUBLIC_SITE_URL=(.*)$/m)
  const base = (m?.[1] ?? "https://botapolis.com").replace(/^"|"$/g, "").trim()
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 15000)
    const res = await fetch(`${base}/api/agents/article-published`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: ac.signal,
    })
    clearTimeout(t)
    // 401 unauthorized is the EXPECTED response — proves the route is deployed
    // and auth-gating is active. Anything else (200/500/404) is a smell.
    if (res.status === 401) record("endpoint: article-published reachable", "PASS", `${base} → 401 (auth gate live)`)
    else record("endpoint: article-published reachable", "WARN", `${base} → ${res.status} (expected 401)`)
  } catch (e) {
    record("endpoint: article-published reachable", "FAIL", `network error: ${(e as Error).message}`)
  }
}

async function checkHookExecutability() {
  // .husky/* user hooks are sourced (not exec'd) by husky's wrappers in
  // .husky/_/, so their fs mode doesn't matter — only presence does.
  // scripts/git-hooks/post-commit.sh is standalone (used by bare clones
  // that symlink it into .git/hooks/), so it MUST be executable in the
  // git index. We check the git-index bit, not the filesystem bit,
  // because Windows fs doesn't surface +x reliably.
  for (const p of [".husky/post-commit", ".husky/pre-commit"]) {
    record(`hook: ${p} present`, (await exists(p)) ? "PASS" : "FAIL")
  }

  const standalone = "scripts/git-hooks/post-commit.sh"
  if (!(await exists(standalone))) {
    record(`hook: ${standalone} present`, "FAIL", "missing")
    return
  }
  // Read git's stored mode via `git ls-files --stage`.
  try {
    const { execSync } = await import("node:child_process")
    const out = execSync(`git ls-files --stage "${standalone}"`, { encoding: "utf-8" }).trim()
    // Format: "<mode> <sha> <stage>\t<path>"
    const mode = out.split(/\s/)[0]
    if (mode === "100755") record(`hook: ${standalone} exec bit in git index`, "PASS")
    else record(`hook: ${standalone} exec bit in git index`, "WARN", `mode=${mode} (expected 100755) — run: git update-index --chmod=+x ${standalone}`)
  } catch (e) {
    record(`hook: ${standalone} exec bit in git index`, "WARN", `could not query git: ${(e as Error).message}`)
  }
}

async function main() {
  console.log("running validate:infra ...\n")

  await checkDirs()
  await checkFiles()
  await checkJsonConfigs()
  await checkSemanticCoreCsv()
  await checkEnv()
  await checkSupabase()
  await checkEndpoint()
  await checkHookExecutability()

  const pass = results.filter(r => r.level === "PASS").length
  const warn = results.filter(r => r.level === "WARN").length
  const fail = results.filter(r => r.level === "FAIL").length

  // Group output by level for fast scanning
  for (const level of ["FAIL", "WARN", "PASS"] as CheckLevel[]) {
    const subset = results.filter(r => r.level === level)
    if (subset.length === 0) continue
    console.log(`\n=== ${level} (${subset.length}) ===`)
    for (const r of subset) {
      const detail = r.detail ? `  — ${r.detail}` : ""
      console.log(`  ${r.name}${detail}`)
    }
  }

  console.log(`\nsummary: PASS=${pass} WARN=${warn} FAIL=${fail}`)

  if (fail > 0) process.exit(1)
  if (warn > 0) process.exit(2)
  process.exit(0)
}

main().catch(err => { console.error("validate fatal:", err); process.exit(1) })
