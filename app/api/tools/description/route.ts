/**
 * POST /api/tools/description — TZ § 11.3
 * ----------------------------------------------------------------------------
 * Generates three product-description variations through Claude Haiku 4.5
 * (the dirt-cheap model in the family — TZ specifies it explicitly).
 *
 * Pipeline:
 *   1. Zod-validate the body.
 *   2. Rate-limit by hashed client IP (aiToolGuestLimit = 3 / 24 h, TZ § 11).
 *   3. Build a structured prompt + system instruction so the model returns
 *      exactly 3 variations separated by a `---` delimiter we can split on.
 *   4. POST to api.anthropic.com directly via fetch — no SDK dependency,
 *      no extra cold-start weight, same fetch idiom we use elsewhere.
 *   5. Parse the text block, split into variations, return JSON.
 *
 * Failure modes mapped to clear status codes:
 *   400 invalid_input           — zod validation
 *   429 rate_limited            — too many attempts on this IP today
 *   503 ai_not_configured       — ANTHROPIC_API_KEY missing in this env
 *   502 upstream_error          — Anthropic non-200 / bad shape
 *   500 internal                — anything else
 */
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { aiToolGuestLimit } from "@/lib/ratelimit"
import { getClientIp, hashIp } from "@/lib/utils"

// Force Node.js runtime — Web Crypto + 10s budget is plenty, no Edge gain
// here because Anthropic's tail latency dominates the request.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// --------------------------------------------------------------------------
// Schema
// --------------------------------------------------------------------------
const bodySchema = z.object({
  product:   z.string().min(2).max(120),
  features:  z.string().min(8).max(1200),
  audience:  z.enum([
    "ecom_general",
    "luxury_buyer",
    "value_seeker",
    "tech_savvy",
    "gift_giver",
  ]),
  tone:      z.enum(["professional", "casual", "playful", "luxury"]),
  maxLength: z.number().int().min(40).max(400),
})

type ParsedBody = z.infer<typeof bodySchema>

// --------------------------------------------------------------------------
// Audience descriptions — fed straight into the prompt so the model has
// a concrete persona to write towards. Localized labels live client-side;
// these strings are deliberately English because Claude is being asked to
// write English product copy.
// --------------------------------------------------------------------------
const AUDIENCE_HINT: Record<ParsedBody["audience"], string> = {
  ecom_general: "general DTC ecommerce shoppers — pragmatic, value-conscious, comparison shopping",
  luxury_buyer: "high-end buyers who care about craftsmanship, exclusivity, and signaling quality",
  value_seeker: "deal-driven shoppers — price-sensitive, motivated by savings and clear ROI",
  tech_savvy:   "early adopters and prosumers — technical details, specs, and integrations matter",
  gift_giver:   "gift-shopping customers — emotional benefits, recipient-focused framing, presentation",
}

// --------------------------------------------------------------------------
// Anthropic API types — only the shape we read.
// --------------------------------------------------------------------------
interface AnthropicMessage {
  content?: Array<{ type: string; text?: string }>
  error?:   { message?: string; type?: string }
}

// --------------------------------------------------------------------------
// Prompt construction
// --------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert ecommerce copywriter writing product descriptions for Shopify stores.

Rules:
- Output exactly 3 distinct variations of the product description.
- Separate each variation with a line containing only three dashes: ---
- Do NOT number, label, or prefix the variations (no "Variation 1:", no "Option A:").
- Do NOT include any commentary, intro, outro, or markdown headings.
- Each variation must respect the requested tone and maximum word count.
- Lead with the strongest benefit; write for the specified audience, not for SEO crawlers.
- Plain prose only — no bullet lists, no emoji, no markdown.`

function buildUserPrompt(body: ParsedBody): string {
  return [
    `Product name: ${body.product}`,
    `Key features:\n${body.features}`,
    `Target audience: ${AUDIENCE_HINT[body.audience]}`,
    `Tone: ${body.tone}`,
    `Maximum length per variation: ${body.maxLength} words`,
    "",
    "Write the 3 variations now, separated by --- on their own line.",
  ].join("\n\n")
}

// --------------------------------------------------------------------------
// Variation splitter — defensive: the model occasionally adds a header
// even when told not to. We trim, drop empties, and clamp to 3.
// --------------------------------------------------------------------------
function splitVariations(raw: string): string[] {
  return raw
    .split(/^\s*---\s*$/m)
    .map((part) => part.trim())
    // Strip stray prefixes like "Variation 1:" or "Option A:" if the model
    // smuggled them in despite the system prompt.
    .map((part) => part.replace(/^(?:variation\s*\d+|option\s*[a-z]|version\s*\d+)\s*[:.-]\s*/i, ""))
    .filter((part) => part.length > 0)
    .slice(0, 3)
}

// --------------------------------------------------------------------------
// Anthropic call
// --------------------------------------------------------------------------
async function callAnthropic(body: ParsedBody): Promise<
  | { ok: true; variations: string[] }
  | { ok: false; status: number; reason: string }
> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { ok: false, status: 503, reason: "ai_not_configured" }
  }

  try {
    // Token budget heuristic: ~1.3 tokens per word × 3 variations × maxLength
    // + a 200-token cushion for the delimiters / preamble.
    const maxTokens = Math.min(4096, Math.ceil(body.maxLength * 3 * 1.3) + 200)

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        // TZ-2 § 11.3 explicitly pins the cheap Haiku 4.5 build.
        model:      "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system:     SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUserPrompt(body) },
        ],
      }),
      // Anthropic's p99 is ~10s for Haiku — cap a hair higher to surface
      // a real "upstream slow" error before our serverless function times out.
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error("[/api/tools/description] anthropic non-OK:", res.status, errText.slice(0, 400))
      return { ok: false, status: 502, reason: "upstream_error" }
    }

    const data = (await res.json()) as AnthropicMessage
    const textBlock = data.content?.find((b) => b.type === "text")?.text
    if (!textBlock) {
      console.error("[/api/tools/description] anthropic missing text block:", JSON.stringify(data).slice(0, 400))
      return { ok: false, status: 502, reason: "upstream_error" }
    }

    const variations = splitVariations(textBlock)
    if (variations.length === 0) {
      return { ok: false, status: 502, reason: "upstream_error" }
    }
    return { ok: true, variations }
  } catch (err) {
    console.error("[/api/tools/description] fetch threw:", err)
    return { ok: false, status: 502, reason: "upstream_error" }
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

  // 2. Rate-limit by hashed IP — keeps RLS-leakable PII out of Redis.
  const ip = getClientIp(req)
  const ipHash = await hashIp(ip)
  const { success, remaining, reset } = await aiToolGuestLimit.limit(ipHash)
  if (!success) {
    return NextResponse.json(
      {
        error:   "rate_limited",
        message: "Daily generation limit reached. Sign up free for 20 per day, or come back tomorrow.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset":     String(reset),
          // Anthropic-style retry suggestion — give the client 30 min before
          // the next attempt so we don't get hammered.
          "Retry-After":           "1800",
        },
      },
    )
  }

  // 3. Anthropic
  const result = await callAnthropic(body)
  if (!result.ok) {
    return NextResponse.json(
      {
        error:   result.reason,
        message:
          result.reason === "ai_not_configured"
            ? "AI generation isn't enabled on this environment."
            : "The AI service is having a moment — try again in a few seconds.",
      },
      { status: result.status },
    )
  }

  return NextResponse.json({
    variations: result.variations,
    remaining,  // surfaced for the UI to show "2 / 3 today" if it wants.
  })
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 })
}
