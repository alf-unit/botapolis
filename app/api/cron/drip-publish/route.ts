/**
 * GET /api/cron/drip-publish — Vercel cron (daily)
 * ----------------------------------------------------------------------------
 * The drip executor. Flips the next N hidden+numbered rows in
 * `page_publications` to visible_at=now(), in pool_number order, then
 * revalidates their paths so they go live immediately.
 *
 * POLICY LIVES IN THE DB — not in any agent — so it survives the planned
 * OpenClaw rebuild (OPS removed, CHIEF → publishing):
 *   - rate  N  = system_config.publishing_rate_daily (existing key, default 4)
 *   - order    = page_publications.pool_number  (Этап H sequential numbering)
 *   - gate     = page_publications.visible_at   (NULL = hidden)
 * This route reads that policy and executes it. It has NO dependency on OPS
 * and makes NO CHIEF-specific call — it's pure Vercel-cron + Supabase. CHIEF's
 * (or any future publisher's) control surface is the two DB knobs above.
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

/** Default + bounds for the daily flip count. Reads system_config but never
 *  trusts it blindly — a fat-fingered value can't publish the whole pool. */
const DEFAULT_RATE = 4
const MAX_RATE = 50

async function readDailyRate(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "publishing_rate_daily")
      .maybeSingle()
    if (error || !data) return DEFAULT_RATE
    // value is JSONB — a scalar number ('4'::jsonb) comes back as number, but
    // tolerate a stringified value too.
    const raw = data.value as unknown
    const n = typeof raw === "number" ? raw : parseInt(String(raw), 10)
    if (!Number.isFinite(n) || n < 1) return DEFAULT_RATE
    return Math.min(Math.floor(n), MAX_RATE)
  } catch {
    return DEFAULT_RATE
  }
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
  const rate = await readDailyRate(supabase)

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
    return NextResponse.json({ ok: true, flipped: 0, note: "queue_empty" })
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
    return NextResponse.json({ ok: true, flipped: 0, note: "all_already_visible" })
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
    pages: flipped,
    semantic_synced: semanticSynced,
    revalidated,
  })
}
