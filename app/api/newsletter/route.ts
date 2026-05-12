/**
 * POST /api/newsletter — subscribe to the operator's brief
 * ----------------------------------------------------------------------------
 * Pipeline:
 *   1. Zod-validate { email, source, language, turnstileToken? }
 *   2. Rate limit by IP        (3 / hr)
 *   3. Verify Turnstile token  (skipped if TURNSTILE_SECRET_KEY unset)
 *   4. Forward to Beehiiv      (skipped if BEEHIIV_API_KEY unset)
 *   5. Mirror into `subscribers` for our own attribution + funnels
 */
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createServiceClient } from "@/lib/supabase/service"
import { newsletterLimit } from "@/lib/ratelimit"
import { getClientIp, hashIp } from "@/lib/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// --------------------------------------------------------------------------
// Schema
// --------------------------------------------------------------------------
const bodySchema = z.object({
  email:          z.string().email().max(254),
  source:         z.string().max(80).default("unknown"),
  source_path:    z.string().max(255).optional(),
  language:       z.enum(["en", "ru"]).default("en"),
  turnstileToken: z.string().max(2048).optional(),
})

type ParsedBody = z.infer<typeof bodySchema>

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true  // not configured → skip (dev mode)

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    new URLSearchParams({ secret, response: token, remoteip: ip }),
        // Don't let a slow Turnstile take down our subscribe form.
        signal: AbortSignal.timeout(4_000),
      },
    )
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

interface BeehiivOk {
  data?: { id?: string; status?: string }
}

async function subscribeBeehiiv(body: ParsedBody): Promise<{ ok: boolean; id?: string }> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !pubId) return { ok: true }  // not configured → no-op

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email:               body.email,
          utm_source:          "botapolis",
          utm_medium:          body.source,
          send_welcome_email:  true,
          reactivate_existing: false,
        }),
        signal: AbortSignal.timeout(7_000),
      },
    )
    if (!res.ok) {
      console.error("[/api/newsletter] beehiiv non-OK:", res.status, await res.text().catch(() => ""))
      return { ok: false }
    }
    const json = (await res.json()) as BeehiivOk
    return { ok: true, id: json.data?.id }
  } catch (err) {
    console.error("[/api/newsletter] beehiiv error:", err)
    return { ok: false }
  }
}

// --------------------------------------------------------------------------
// Handler
// --------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Parse + validate
  let body: ParsedBody
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  // 2. Rate limit
  const ip = getClientIp(req)
  const ipHash = await hashIp(ip)
  const { success, remaining, reset } = await newsletterLimit.limit(ipHash)
  if (!success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset":     String(reset),
          "Retry-After":           "300",
        },
      },
    )
  }

  // 3. Turnstile (optional)
  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!body.turnstileToken) {
      return NextResponse.json(
        { error: "captcha_required" },
        { status: 400 },
      )
    }
    const ok = await verifyTurnstile(body.turnstileToken, ip)
    if (!ok) {
      return NextResponse.json({ error: "captcha_failed" }, { status: 403 })
    }
  }

  // 4. Beehiiv (optional but normally configured)
  const beehiiv = await subscribeBeehiiv(body)

  // 5. Mirror into Supabase (idempotent on email)
  const supabase = createServiceClient()
  const { error: dbError } = await supabase
    .from("subscribers")
    .upsert(
      {
        email:       body.email.toLowerCase(),
        source:      body.source,
        source_path: body.source_path ?? null,
        language:    body.language,
        beehiiv_id:  beehiiv.id ?? null,
        status:      beehiiv.ok ? "active" : "pending",
        ip_hash:     ipHash,
      },
      { onConflict: "email" },
    )

  if (dbError) {
    console.error("[/api/newsletter] supabase upsert failed:", dbError.message)
    // We still return success if Beehiiv accepted them — losing our mirror
    // is bad for analytics but not a user-visible failure.
    if (!beehiiv.ok) {
      return NextResponse.json({ error: "subscribe_failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
