#!/usr/bin/env node
/* ----------------------------------------------------------------------------
   backfill-gsc-metrics — pull GSC Search Analytics + upsert performance_snapshots
   ----------------------------------------------------------------------------
   One-shot remediation for the 2026-05-26 GSC ingestion incident: OPS has been
   writing null/zero into performance_snapshots while real data exists in the
   API. This script fetches per-day GSC totals + top_pages + position buckets
   for a date range and upserts performance_snapshots (matched on
   snapshot_date). Existing non-GSC columns on the row (subscribers, affiliate
   clicks, etc.) are preserved — upsert only touches columns in the payload.

   Default window: 2026-05-12 .. (today − 2 days, GSC maturity cutoff).
   Override with --start=YYYY-MM-DD --end=YYYY-MM-DD.

   Usage:
     npm run backfill:gsc:dry              # dry-run, no Supabase writes
     npm run backfill:gsc                  # apply
     npm run backfill:gsc -- --start=2026-05-12 --end=2026-05-24

   Required env (.env.local):
     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
     GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN,
     GSC_SITE_URL (default: sc-domain:botapolis.com)

   Notes:
   - GSC maturity: data lags 2-3 days; positions/impressions get revised
     upward as Google backfills. Using today−2 as default end is the
     conservative "stable enough" cutoff for batch backfill.
   - Dates with no GSC rows are skipped (not written as zero) — matches the
     "never write 0 if API said nothing" rule we're installing into OPS.
---------------------------------------------------------------------------- */

import { createClient } from "@supabase/supabase-js"

// ── env ────────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN
const SITE = process.env.GSC_SITE_URL || "sc-domain:botapolis.com"

// ── CLI flags ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY = args.includes("--dry-run")
const START = parseFlag("--start") || "2026-05-12"
const END = parseFlag("--end") || todayMinusDays(2)

function parseFlag(name: string): string | null {
  const hit = args.find((a) => a.startsWith(`${name}=`))
  return hit ? hit.slice(name.length + 1) : null
}

function todayMinusDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function* dateRange(start: string, end: string): IterableIterator<string> {
  const s = new Date(start + "T00:00:00Z")
  const e = new Date(end + "T00:00:00Z")
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    yield d.toISOString().slice(0, 10)
  }
}

// ── GSC HTTP ───────────────────────────────────────────────────────────────
interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

async function mintAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    refresh_token: REFRESH_TOKEN!,
    grant_type: "refresh_token",
  })
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) {
    throw new Error(`OAuth token mint failed: ${r.status} ${await r.text()}`)
  }
  const j = (await r.json()) as { access_token: string; expires_in: number }
  return j.access_token
}

async function queryGsc(
  token: string,
  opts: { startDate: string; endDate: string; dimensions: string[]; rowLimit?: number },
): Promise<GscRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    SITE,
  )}/searchAnalytics/query`
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions,
      rowLimit: opts.rowLimit ?? 25000,
    }),
  })
  if (!r.ok) {
    throw new Error(`GSC query (${opts.dimensions.join(",")}) failed: ${r.status} ${await r.text()}`)
  }
  const j = (await r.json()) as { rows?: GscRow[] }
  return j.rows ?? []
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const missing: string[] = []
  if (!SUPA_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!SUPA_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY")
  if (!CLIENT_ID) missing.push("GSC_OAUTH_CLIENT_ID")
  if (!CLIENT_SECRET) missing.push("GSC_OAUTH_CLIENT_SECRET")
  if (!REFRESH_TOKEN) missing.push("GSC_OAUTH_REFRESH_TOKEN")
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`)
    process.exit(1)
  }

  console.log(`backfill-gsc-metrics: ${START}..${END}  site=${SITE}  dry=${DRY}`)

  const token = await mintAccessToken()
  console.log("  ✓ OAuth access_token minted")

  // 1) Daily totals across full window in one call (dimensions=[date])
  const dailyRows = await queryGsc(token, {
    startDate: START,
    endDate: END,
    dimensions: ["date"],
    rowLimit: 1000,
  })
  console.log(`  ✓ Daily totals: ${dailyRows.length} day(s) with data`)

  const dailyByDate = new Map<string, GscRow>()
  for (const r of dailyRows) dailyByDate.set(r.keys[0], r)

  // Totals for sanity check (compare against CHIEF's direct API observation)
  const sumImp = dailyRows.reduce((a, r) => a + r.impressions, 0)
  const sumClk = dailyRows.reduce((a, r) => a + r.clicks, 0)
  console.log(`  ✓ Totals across window: ${sumImp} impressions / ${sumClk} clicks`)

  const supa = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } }) : null

  let written = 0
  let skipped = 0

  for (const date of dateRange(START, END)) {
    const day = dailyByDate.get(date)
    if (!day) {
      console.log(`  [${date}] no GSC rows — skip (do NOT write zero)`)
      skipped++
      continue
    }

    // Per-day query distribution for top-N position buckets
    const queries = await queryGsc(token, {
      startDate: date,
      endDate: date,
      dimensions: ["query"],
      rowLimit: 25000,
    })
    const top10 = queries.filter((q) => q.position <= 10).length
    const top20 = queries.filter((q) => q.position <= 20).length
    const top50 = queries.filter((q) => q.position <= 50).length

    // Per-day top pages
    const pages = await queryGsc(token, {
      startDate: date,
      endDate: date,
      dimensions: ["page"],
      rowLimit: 20,
    })
    const topPages = pages.map((p) => ({
      path: safePath(p.keys[0]),
      clicks: p.clicks,
      impressions: p.impressions,
      position: round2(p.position),
    }))

    const patch = {
      snapshot_date: date,
      gsc_total_impressions: day.impressions,
      gsc_total_clicks: day.clicks,
      gsc_avg_position: round2(day.position),
      gsc_keywords_top10: top10,
      gsc_keywords_top20: top20,
      gsc_keywords_top50: top50,
      top_pages: topPages,
    }

    console.log(
      `  [${date}] imp=${day.impressions} clk=${day.clicks} pos=${patch.gsc_avg_position}` +
        ` top10/20/50=${top10}/${top20}/${top50} pages=${topPages.length}`,
    )

    if (DRY || !supa) {
      continue
    }

    const { error } = await supa
      .from("performance_snapshots")
      .upsert(patch, { onConflict: "snapshot_date" })

    if (error) {
      console.error(`  [${date}] upsert ERROR: ${error.message}`)
    } else {
      written++
    }
  }

  console.log(
    `\nDone. ${DRY ? "(dry-run) " : ""}wrote=${written} skipped=${skipped} totalDays=${
      [...dateRange(START, END)].length
    }`,
  )

  // Node 24 + Windows libuv fetch+exit race fix (see content-validator.ts).
  await new Promise((r) => setTimeout(r, 50))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function safePath(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname
  } catch {
    return rawUrl
  }
}

main().catch((e) => {
  console.error("Fatal:", e instanceof Error ? e.message : e)
  process.exit(1)
})
