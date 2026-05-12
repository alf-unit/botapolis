/**
 * POST /api/contact — contact-form inbox
 * ----------------------------------------------------------------------------
 * Pipeline:
 *   1. Zod-validate { name?, email, subject?, message, source?, turnstileToken? }
 *   2. Rate-limit by hashed client IP (contactLimit = 3 / hr)
 *   3. Turnstile verify (skipped if TURNSTILE_SECRET_KEY unset — block A
 *      removed the secret on prod; widget + secret return together in block D)
 *   4. Insert into Supabase `contact_submissions` table with the hashed IP +
 *      user agent for abuse correlation
 *
 * No outbound email (Resend isn't wired yet) — the row sits in the
 * `contact_submissions` table for editorial to triage via the Supabase
 * dashboard. Add a Resend send step here when RESEND_API_KEY lands.
 *
 * Failure codes:
 *   400 invalid_input     — zod
 *   400 invalid_json      — couldn't parse body
 *   429 rate_limited      — too many recent submissions from this IP
 *   403 captcha_failed    — Turnstile rejected (when configured)
 *   503 not_configured    — Supabase service role key missing (shouldn't happen)
 *   500 internal          — anything else
 */
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createServiceClient } from "@/lib/supabase/service"
import { contactLimit } from "@/lib/ratelimit"
import { getClientIp, hashIp } from "@/lib/utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// --------------------------------------------------------------------------
// Schema — message length capped at 4000 to avoid pathological payloads;
// real users send 50–800. Anything past that is almost always a paste of
// auto-generated spam.
// --------------------------------------------------------------------------
const bodySchema = z.object({
  name:           z.string().min(1).max(120).optional(),
  email:          z.string().email().max(254),
  subject:        z.string().min(1).max(200).optional(),
  message:        z.string().min(10).max(4000),
  source:         z.string().max(80).default("contact_page"),
  turnstileToken: z.string().max(2048).optional(),
})

type ParsedBody = z.infer<typeof bodySchema>

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal:  AbortSignal.timeout(4_000),
      },
    )
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // 1. Parse + validate
  let body: ParsedBody
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:   "invalid_input",
          message: "Check the form fields and try again.",
          issues:  parsed.error.issues.map((i) => i.message),
        },
        { status: 400 },
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Could not read request body." },
      { status: 400 },
    )
  }

  // 2. Rate-limit
  const ip = getClientIp(req)
  const ipHash = await hashIp(ip)
  const { success, reset } = await contactLimit.limit(ipHash)
  if (!success) {
    return NextResponse.json(
      {
        error:   "rate_limited",
        message: "Too many submissions. Try again in a few minutes.",
      },
      {
        status:  429,
        headers: {
          "Retry-After":      "1800",
          "X-RateLimit-Reset": String(reset),
        },
      },
    )
  }

  // 3. Turnstile (only when configured — block A removed the prod secret;
  // form falls back to honour-system until the widget lands in block D)
  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!body.turnstileToken) {
      return NextResponse.json(
        { error: "captcha_required", message: "Captcha is required." },
        { status: 400 },
      )
    }
    const ok = await verifyTurnstile(body.turnstileToken, ip)
    if (!ok) {
      return NextResponse.json(
        { error: "captcha_failed", message: "Captcha verification failed." },
        { status: 403 },
      )
    }
  }

  // 4. Insert into Supabase
  try {
    const supabase = createServiceClient()
    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null
    const { error } = await supabase.from("contact_submissions").insert({
      name:       body.name ?? null,
      email:      body.email,
      subject:    body.subject ?? null,
      message:    body.message,
      source:     body.source,
      ip_hash:    ipHash,
      user_agent: ua,
      // status defaults to 'new' in the DB
    })
    if (error) {
      // The most likely cause in the wild is "table not found" — i.e. the
      // 002 migration hasn't been applied yet. Log the message verbatim so
      // an on-call eng sees it in Vercel logs without guesswork.
      console.error("[/api/contact] supabase insert failed:", error.message)
      return NextResponse.json(
        {
          error:   "not_configured",
          message:
            "Contact form isn't fully wired up yet. Email editorial@botapolis.com directly.",
        },
        { status: 503 },
      )
    }
  } catch (err) {
    console.error("[/api/contact] threw:", err)
    return NextResponse.json(
      { error: "internal", message: "Something went sideways. Try again or email editorial@botapolis.com." },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 })
}
