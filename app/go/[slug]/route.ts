/**
 * /go/[slug] — affiliate redirector (fail-closed)
 * ----------------------------------------------------------------------------
 * Reads the tool by slug, logs a click row, and 302-redirects to the
 * monetized partner URL. If the tool has no `affiliate_url` (e.g. Judge.me
 * catalog-no-affiliate carve-out), this route refuses to send the visitor
 * to the vendor for free — instead it redirects to the internal /tools/[slug] page.
 *
 * Owner-locked 2026-06-01: monetisation is single-channel. The /go/ route
 * is the ONLY way out to a vendor and it must never fall through to a
 * vendor's site without affiliate attribution. JSON-LD still uses the raw
 * `website_url` for SoftwareApplication.url (Google signal, no click).
 *
 * - Rate-limited to 10 hits per IP per hour (TZ § 5.3 + § 15.2).
 * - Click logging is fire-and-forget so the redirect doesn't wait on the DB.
 * - UTM params from the inbound URL are propagated to the outbound, with a
 *   default `utm_source=botapolis&utm_medium=affiliate` overlay.
 * - `rel="sponsored nofollow noopener"` is the consumer side's job; here we
 *   just set the redirect.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { affiliateLimit } from "@/lib/ratelimit"
import { getClientIp, hashIp } from "@/lib/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.redirect(new URL("/tools", req.url))
  }

  const ip = getClientIp(req)
  const ipHash = await hashIp(ip)

  // ----- Rate limit ----------------------------------------------------------
  const { success, remaining, reset } = await affiliateLimit.limit(ipHash)
  if (!success) {
    return NextResponse.json(
      { error: "Too many redirects from this IP. Slow down." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset":     String(reset),
          "Retry-After":           "60",
        },
      },
    )
  }

  // ----- Lookup tool ---------------------------------------------------------
  // website_url intentionally NOT selected here — fix #6 (2026-06-01) makes
  // the redirector fail-closed when affiliate_url is missing, so the vendor
  // site is never the fallback target.
  const supabase = createServiceClient()
  const { data: tool, error } = await supabase
    .from("tools")
    .select("id, affiliate_url, status")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !tool || tool.status !== "published") {
    return NextResponse.redirect(new URL("/tools", req.url))
  }

  // Fail-closed: no affiliate_url → never send visitor out to vendor. Land
  // them on the internal tool page (where ToolStickyCard etc. already
  // know to hide CTAs for this tool). Judge.me lives here.
  if (!tool.affiliate_url) {
    return NextResponse.redirect(new URL(`/tools/${slug}`, req.url))
  }

  // ----- Build outbound URL with UTM overlay --------------------------------
  let outbound: URL
  try {
    outbound = new URL(tool.affiliate_url)
  } catch {
    // Stored affiliate_url is malformed — fall back to safe internal route.
    return NextResponse.redirect(new URL(`/tools/${slug}`, req.url))
  }

  const incoming = new URL(req.url)
  const utmSource   = incoming.searchParams.get("utm_source")   ?? "botapolis"
  const utmMedium   = incoming.searchParams.get("utm_medium")   ?? "affiliate"
  const utmCampaign = incoming.searchParams.get("utm_campaign") ?? slug

  if (!outbound.searchParams.has("utm_source"))   outbound.searchParams.set("utm_source",   utmSource)
  if (!outbound.searchParams.has("utm_medium"))   outbound.searchParams.set("utm_medium",   utmMedium)
  if (!outbound.searchParams.has("utm_campaign")) outbound.searchParams.set("utm_campaign", utmCampaign)

  // ----- Log the click (fire-and-forget) ------------------------------------
  // Wrapped in a try so a DB hiccup never breaks a partner redirect.
  const referer  = req.headers.get("referer")
  const ua       = req.headers.get("user-agent")
  let sourcePath: string | null = null
  if (referer) {
    try {
      sourcePath = new URL(referer).pathname
    } catch {
      sourcePath = null
    }
  }

  void supabase
    .from("affiliate_clicks")
    .insert({
      tool_id:      tool.id,
      source_slug:  slug,
      source_path:  sourcePath,
      // No auth join here — anonymous click tracking is by ip_hash only.
      user_id:      null,
      ip_hash:      ipHash,
      user_agent:   ua,
      referer,
      utm_source:   utmSource,
      utm_medium:   utmMedium,
      utm_campaign: utmCampaign,
    })
    .then(({ error: insertErr }) => {
      if (insertErr) {
        console.error("[/go] click log failed:", insertErr.message)
      }
    })

  return NextResponse.redirect(outbound.toString(), { status: 302 })
}
