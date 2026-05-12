/**
 * GET /api/cron/refresh-tool-data — Vercel cron (weekly)
 * ----------------------------------------------------------------------------
 * Bumps `updated_at` on every published tool so the sitemap stays fresh and
 * Google's crawler sees the rows as "recently touched". We don't actually
 * re-scrape vendor sites from this job today — that's an editorial process
 * (TZ § 16 §4 "Refresh cadence"). The job's purpose is purely SEO hygiene:
 * keep the `lastmod` in sitemap.xml fresh enough that Google re-checks
 * pages, even if the article copy hasn't materially changed.
 *
 * Authentication: Vercel signs cron invocations with a shared bearer in
 * `Authorization: Bearer <CRON_SECRET>`. We compare against the
 * `CRON_SECRET` env (set by Vercel automatically for projects with a
 * vercel.json crons block; manual env addition required if you ever call
 * this endpoint externally).
 *
 * Idempotent: re-running the same day costs nothing — the touched-recently
 * predicate skips rows that are already fresh.
 */
import { NextResponse, type NextRequest } from "next/server"

import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(req: NextRequest): boolean {
  // Vercel sets CRON_SECRET in the runtime env for projects with crons
  // configured. If unset (local dev), we still accept the request — it's
  // useful to be able to curl the endpoint manually for testing.
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = req.headers.get("authorization")
  return header === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    // Touch rows whose `updated_at` is older than 14 days. Bumping them
    // forces sitemap.xml to advertise a fresh `lastmod` so Googlebot
    // re-fetches; rows touched recently by an editor are left alone.
    const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString()
    const { data, error } = await supabase
      .from("tools")
      .update({ updated_at: new Date().toISOString() })
      .eq("status", "published")
      .lt("updated_at", cutoff)
      .select("slug")

    if (error) {
      console.error("[/api/cron/refresh-tool-data] update failed:", error.message)
      return NextResponse.json(
        { error: "supabase_error", message: error.message },
        { status: 500 },
      )
    }

    const touched = data?.map((r) => r.slug) ?? []
    console.log(`[/api/cron/refresh-tool-data] touched ${touched.length} rows`)

    // Ping the sitemap revalidator so Vercel's CDN drops the cached
    // sitemap.xml — Google's next fetch sees the new lastmod values.
    try {
      const revalidateSecret = process.env.REVALIDATE_SECRET
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://botapolis.com"
      if (revalidateSecret) {
        await fetch(`${siteUrl}/api/revalidate?path=/sitemap.xml&secret=${encodeURIComponent(revalidateSecret)}`, {
          method: "POST",
          signal: AbortSignal.timeout(4_000),
        })
      }
    } catch (err) {
      // The cron job isn't responsible for keeping revalidate alive —
      // log and move on.
      console.warn("[/api/cron/refresh-tool-data] revalidate ping failed:", err)
    }

    return NextResponse.json({
      ok: true,
      touched: touched.length,
      slugs:   touched,
    })
  } catch (err) {
    console.error("[/api/cron/refresh-tool-data] threw:", err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
