/**
 * GET /api/cron/digest-affiliate-clicks — Vercel cron (weekly)
 * ----------------------------------------------------------------------------
 * Aggregates the last 7 days of /go/[slug] clicks into a per-tool digest.
 * Today the digest is just logged + returned as JSON (visible in Vercel
 * logs and via manual curl); once Resend lands, we'll add an email step
 * that ships the digest to editorial. Coded that way deliberately — the
 * SQL aggregation is the hard part, swapping `console.log` for an email
 * call is a one-line change.
 *
 * Authentication mirrors /api/cron/refresh-tool-data: CRON_SECRET bearer
 * when configured; open to curl in dev.
 */
import { NextResponse, type NextRequest } from "next/server"

import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = req.headers.get("authorization")
  return header === `Bearer ${secret}`
}

interface ClickRow {
  tool_id:    string | null
  source_slug: string | null
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()

    // We bucket by `tool_id` (canonical) but fall back to `source_slug`
    // (the /go/[slug] path component) for rows where the tool_id failed
    // to resolve at click time. This way the digest never silently drops
    // affiliate clicks just because the seed didn't have a row.
    const { data: clicks, error } = await supabase
      .from("affiliate_clicks")
      .select("tool_id, source_slug")
      .gte("created_at", since)
      .limit(20_000)

    if (error) {
      console.error("[/api/cron/digest-affiliate-clicks] fetch failed:", error.message)
      return NextResponse.json(
        { error: "supabase_error", message: error.message },
        { status: 500 },
      )
    }

    // Resolve tool_id → slug in one batch.
    const toolIds = new Set<string>()
    for (const c of (clicks ?? []) as ClickRow[]) {
      if (c.tool_id) toolIds.add(c.tool_id)
    }
    let slugById: Record<string, string> = {}
    if (toolIds.size > 0) {
      const { data: lookup } = await supabase
        .from("tools")
        .select("id, slug")
        .in("id", Array.from(toolIds))
      slugById = Object.fromEntries((lookup ?? []).map((r) => [r.id, r.slug]))
    }

    const tally: Record<string, number> = {}
    for (const c of (clicks ?? []) as ClickRow[]) {
      const slug = (c.tool_id && slugById[c.tool_id]) || c.source_slug || "unknown"
      tally[slug] = (tally[slug] ?? 0) + 1
    }

    // Sort descending by count, cap to top 25 for log readability.
    const sorted = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([slug, count]) => ({ slug, count }))

    const total = (clicks ?? []).length
    console.log(
      `[/api/cron/digest-affiliate-clicks] 7d total=${total} top=${sorted
        .map((r) => `${r.slug}:${r.count}`)
        .join(",")}`,
    )

    // TODO (block F / Resend integration): POST `sorted` to a Resend
    // template targeted at editorial@botapolis.com. Until then the digest
    // is observable via Vercel logs + this JSON response.
    return NextResponse.json({
      ok:    true,
      since,
      total,
      top:   sorted,
    })
  } catch (err) {
    console.error("[/api/cron/digest-affiliate-clicks] threw:", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
