/**
 * GET /api/cron/drip-publish — Vercel cron (daily)
 * ----------------------------------------------------------------------------
 * Schedule: `0 8 * * *` in vercel.json = 08:00 UTC = 01:00 LA (PDT). Vercel
 * cron is UTC-only (no timezone field — docs: "The timezone is always UTC"),
 * so in winter (PST) this lands at 00:00 LA. The ±1h seasonal drift is
 * immaterial for a nightly publisher; we deliberately avoid a seasonal-switch
 * hack.
 * ----------------------------------------------------------------------------
 * The drip executor. Flips the next N hidden+numbered rows in
 * `page_publications` to visible_at=now(), in pool_number order, then
 * revalidates their paths so they go live immediately.
 *
 * POLICY LIVES IN THE DB (system_config) — no agent involved. Pure Vercel-cron
 * + Supabase:
 *   - rate N (per day) = monthly ramp anchored at system_config
 *       .publishing_start_date, curve from system_config.publishing_ramp
 *       (defaults to 4 → 7 → 10 over months 1/2/3+). See computeRate().
 *       Manual override: system_config.publishing_rate_override (0 = pause).
 *   - order = page_publications.pool_number  (Этап H sequential numbering)
 *   - gate  = page_publications.visible_at   (NULL = hidden)
 * The cron reads that policy and executes it — no OPS, no CHIEF call. The
 * response also returns pool counts {total, published, remaining} every run.
 *
 * Idempotent / race-safe: each flip UPDATE carries `.is('visible_at', null)`
 * so a row already flipped (by a concurrent run or a prior same-day trigger)
 * is never re-flipped or double-counted.
 *
 * semantic_core sync is best-effort and NON-authoritative (page-gate is the
 * source of truth for visibility): on flip we also mark the matching
 * semantic_core_entries row published, by EXACT published_article_path match
 * only (no fuzzy LIKE → no slug-collision false positives). Rows without a
 * 1:1 keyword (best/alternatives/tools) simply don't match — that's fine.
 *
 * Auth: Vercel signs cron invocations with `Authorization: Bearer <CRON_SECRET>`
 *       (same scheme as the other crons in vercel.json). Manual curl is allowed
 *       only when CRON_SECRET is unset (local dev).
 */
import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"

import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // local dev — allow manual curl
  return req.headers.get("authorization") === `Bearer ${secret}`
}

/* ----------------------------------------------------------------------------
   Rate — monthly auto-escalation (4 → 7 → 10), all policy in system_config.
   ----------------------------------------------------------------------------
   No manual intervention needed: N grows by month from publishing_start_date.
   Defaults are hardcoded so the cron works with ZERO system_config rows; the
   keys below only override the defaults when an operator wants to tune.

     publishing_start_date    "YYYY-MM-DD" — ramp anchor. Absent → month 1
                              (ramp effectively paused at tier 1 until the
                              operator sets it on real launch). A fixed date is
                              cleaner than "date of first flip": deterministic,
                              unaffected by test flips / pauses.
     publishing_ramp          [{ "month": 1, "rate": 4 }, ...] — the curve.
                              Absent → DEFAULT_RAMP below.
     publishing_rate_override number — manual flat rate; 0 = pause. Wins over
                              the ramp when set. (Legacy publishing_rate_daily
                              is no longer read — safe to delete.)

   Month bucket = 30-day blocks from the anchor (deterministic, unlike calendar
   months): day 0-29 → month 1, 30-59 → month 2, 60+ → month 3 → rate 10.
---------------------------------------------------------------------------- */
const DEFAULT_RAMP: ReadonlyArray<{ month: number; rate: number }> = [
  { month: 1, rate: 4 },
  { month: 2, rate: 7 },
  { month: 3, rate: 10 },
]
const MAX_RATE = 50

/** Highest tier whose `month` ≤ monthIndex (tiers need not be pre-sorted). */
function rateForMonth(
  ramp: ReadonlyArray<{ month: number; rate: number }>,
  monthIndex: number,
): number {
  const sorted = [...ramp].sort((a, b) => a.month - b.month)
  let rate = sorted[0]?.rate ?? DEFAULT_RAMP[0].rate
  for (const t of sorted) {
    if (t.month <= monthIndex) rate = t.rate
    else break
  }
  return rate
}

interface RateInfo {
  rate: number
  monthIndex: number
  source: "override" | "ramp" | "ramp(no-start)"
}

async function computeRate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<RateInfo> {
  try {
    const { data } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["publishing_rate_override", "publishing_ramp", "publishing_start_date"])
    const cfg = new Map((data ?? []).map((r) => [r.key, r.value as unknown]))

    // 1. Manual override wins (incl. 0 = pause).
    const ovRaw = cfg.get("publishing_rate_override")
    if (ovRaw != null) {
      const ov = typeof ovRaw === "number" ? ovRaw : parseInt(String(ovRaw), 10)
      if (Number.isFinite(ov) && ov >= 0) {
        return { rate: Math.min(ov, MAX_RATE), monthIndex: 0, source: "override" }
      }
    }

    // 2. Ramp curve (config or default).
    let ramp = DEFAULT_RAMP
    const rampRaw = cfg.get("publishing_ramp")
    if (Array.isArray(rampRaw)) {
      const parsed = rampRaw.filter(
        (t): t is { month: number; rate: number } =>
          !!t && typeof t.month === "number" && typeof t.rate === "number",
      )
      if (parsed.length > 0) ramp = parsed
    }

    // 3. Month bucket from the anchor.
    let monthIndex = 1
    let hasStart = false
    const startRaw = cfg.get("publishing_start_date")
    const startStr = typeof startRaw === "string" ? startRaw : null
    if (startStr) {
      const start = new Date(`${startStr}T00:00:00Z`)
      if (!Number.isNaN(start.getTime())) {
        hasStart = true
        const days = Math.floor((Date.now() - start.getTime()) / 86_400_000)
        if (days >= 0) monthIndex = Math.floor(days / 30) + 1
      }
    }

    const rate = Math.min(Math.max(rateForMonth(ramp, monthIndex), 1), MAX_RATE)
    return { rate, monthIndex, source: hasStart ? "ramp" : "ramp(no-start)" }
  } catch {
    // Fail safe to month-1 default rather than 0 (don't silently stall the pool).
    return { rate: DEFAULT_RAMP[0].rate, monthIndex: 1, source: "ramp(no-start)" }
  }
}

/** Pool progress among NUMBERED rows (the drip set). */
async function poolCounts(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ total: number; published: number; remaining: number }> {
  const numbered = supabase
    .from("page_publications")
    .select("*", { count: "exact", head: true })
    .not("pool_number", "is", null)
  const { count: total } = await numbered
  const { count: published } = await supabase
    .from("page_publications")
    .select("*", { count: "exact", head: true })
    .not("pool_number", "is", null)
    .not("visible_at", "is", null)
  const t = total ?? 0
  const p = published ?? 0
  return { total: t, published: p, remaining: t - p }
}

/** repo content_type → public URL segment (comparisons live at /compare). */
const URL_SEGMENT: Record<string, string> = {
  pricing: "pricing",
  guides: "guides",
  best: "best",
  tools: "tools",
  comparisons: "compare",
  alternatives: "alternatives",
}

/** Exact published_article_path candidates for the best-effort semantic_core
 *  sync. Exact-match only — never a LIKE — so "klaviyo" can't match
 *  "klaviyo-vs-mailchimp". */
function semanticPathCandidates(contentType: string, slug: string): string[] {
  const seg = URL_SEGMENT[contentType] ?? contentType
  const repoType = contentType === "comparisons" ? "comparisons" : contentType
  return [`/${seg}/${slug}`, `/content/${repoType}/en/${slug}.mdx`]
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { rate, monthIndex, source: rateSource } = await computeRate(supabase)

  // 1. Pull the next N hidden + numbered rows, in pool order.
  const { data: queue, error: qErr } = await supabase
    .from("page_publications")
    .select("content_type, slug, pool_number")
    .is("visible_at", null)
    .not("pool_number", "is", null)
    .order("pool_number", { ascending: true })
    .limit(rate)

  if (qErr) {
    console.error("[drip-publish] queue read failed:", qErr.message)
    return NextResponse.json({ error: "queue_read_failed", message: qErr.message }, { status: 500 })
  }
  if (!queue || queue.length === 0) {
    return NextResponse.json({
      ok: true,
      flipped: 0,
      note: "queue_empty",
      rate,
      month_index: monthIndex,
      rate_source: rateSource,
      pool: await poolCounts(supabase),
    })
  }

  // 2. Flip each row — race-safe via the visible_at IS NULL guard.
  const nowIso = new Date().toISOString()
  const flipped: Array<{ content_type: string; slug: string; pool_number: number }> = []
  for (const row of queue) {
    const { data: upd, error: uErr } = await supabase
      .from("page_publications")
      .update({ visible_at: nowIso })
      .eq("content_type", row.content_type)
      .eq("slug", row.slug)
      .is("visible_at", null) // skip if already flipped concurrently
      .select("content_type, slug, pool_number")
    if (uErr) {
      console.error(`[drip-publish] flip failed for ${row.content_type}/${row.slug}:`, uErr.message)
      continue
    }
    if (upd && upd.length > 0) {
      flipped.push({ content_type: row.content_type, slug: row.slug, pool_number: row.pool_number })
    }
  }

  if (flipped.length === 0) {
    return NextResponse.json({
      ok: true,
      flipped: 0,
      note: "all_already_visible",
      rate,
      month_index: monthIndex,
      rate_source: rateSource,
      pool: await poolCounts(supabase),
    })
  }

  // 3. Revalidate every newly-visible surface (EN + RU detail, type hub).
  //    Plus the global surfaces (sitemap, homepage) once.
  const revalidated: string[] = []
  const touch = (p: string) => {
    revalidatePath(p)
    revalidated.push(p)
  }
  const hubsTouched = new Set<string>()
  for (const f of flipped) {
    const seg = URL_SEGMENT[f.content_type] ?? f.content_type
    touch(`/${seg}/${f.slug}`)
    touch(`/ru/${seg}/${f.slug}`)
    if (!hubsTouched.has(seg)) {
      touch(`/${seg}`)
      hubsTouched.add(seg)
    }
  }
  touch("/sitemap.xml")
  touch("/")

  // 4. Best-effort semantic_core sync (non-authoritative). Exact path match.
  let semanticSynced = 0
  try {
    const candidates = flipped.flatMap((f) => semanticPathCandidates(f.content_type, f.slug))
    const { data: synced } = await supabase
      .from("semantic_core_entries")
      .update({ status: "published", published_at: nowIso, status_changed_at: nowIso })
      .in("published_article_path", candidates)
      .neq("status", "published")
      .select("id")
    semanticSynced = synced?.length ?? 0
  } catch (err) {
    console.error("[drip-publish] semantic_core sync threw (non-fatal):", err)
  }

  // 5. Audit log — one entry summarising the batch.
  try {
    await supabase.from("agent_logs").insert({
      agent_name: "CLAUDE_CODE",
      event_type: "drip_published",
      severity: "info",
      message: `drip published ${flipped.length} page(s): ${flipped
        .map((f) => `${f.content_type}/${f.slug}#${f.pool_number}`)
        .join(", ")}`,
      context: { rate, flipped, semantic_synced: semanticSynced },
    })
  } catch (err) {
    console.error("[drip-publish] agent_logs insert threw (non-fatal):", err)
  }

  return NextResponse.json({
    ok: true,
    flipped: flipped.length,
    rate,
    month_index: monthIndex,
    rate_source: rateSource,
    pages: flipped,
    semantic_synced: semanticSynced,
    revalidated,
    pool: await poolCounts(supabase),
  })
}
