/**
 * scripts/translate-tools.ts
 * ----------------------------------------------------------------------------
 * Translates the English `tools` rows into the matching Russian columns
 * added by migration 005. Sister script to `scripts/translate-content.ts`
 * (which does MDX bodies) — same OpenRouter route, same tone rules, same
 * "ts-strip-types" entry point.
 *
 *   npm run translate:tools                 # translate every tool that has
 *                                           # ANY _ru column empty
 *   npm run translate:tools -- --slug klaviyo
 *                                           # translate one specific tool
 *   npm run translate:tools -- --force      # re-translate even if _ru
 *                                           # columns are already filled
 *
 * Required env (load via `--env-file=.env.local` — package.json wires this):
 *   - OPENROUTER_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   - OPENROUTER_MODEL   (default anthropic/claude-haiku-4.5)
 *
 * Why structured JSON output instead of one prompt per field:
 *   • Six fields per tool × twelve tools = 72 API calls if done one-at-a-
 *     time. Batched into one call per tool we get 12 calls total — same
 *     cost, much faster, AND tone stays consistent within a tool (all six
 *     fields share the model's "Klaviyo voice" from a single context).
 *   • JSON shape forces the model to keep field boundaries clean; no
 *     prose like "Here's the translation of pros: ...".
 */
import { parseArgs } from "node:util"
import { createClient } from "@supabase/supabase-js"

const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5"

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OPENROUTER_KEY) {
  console.error("OPENROUTER_API_KEY not set. Add it to .env.local or export it inline:")
  console.error('  OPENROUTER_API_KEY="..." npm run translate:tools')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  console.error("Grab the values from Supabase Dashboard → Project Settings → API.")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    slug:  { type: "string" },
    force: { type: "boolean", default: false },
  },
})

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You translate English copy describing Shopify e-commerce SaaS tools into Russian for the Botapolis catalog.

Tone rules:
- Informal Russian, "ты"-form (not "вы"). Direct sentences. No fluff.
- Match the voice of an experienced ecommerce operator writing for peers.
- Brand names, product names, company names stay in English exactly as written (Klaviyo, Shopify, Postscript, Omnisend, Mailchimp, Tidio, Gorgias, ManyChat, etc.).
- Technical acronyms stay in English: SMS, AI, ROI, API, CTR, AOV, LTV, MRR, TCPA, GDPR, CTIA, SaaS, B2B, B2C, CRM, ESP, ETL, A2P 10DLC.
- Numeric data, currency, percentages, durations stay verbatim ($48k, 8.4/10, 200ms, 30 days).
- Common ecommerce nouns translate normally (магазин, корзина, рассылка, обзор, поддержка, чек, конверсия, выручка, кампания, аудитория, интеграция).

Output rules (CRITICAL):
- Output ONLY a JSON object with the keys requested. No commentary, no markdown fence, no prefix.
- Preserve array length: if pros has 4 items, pros_ru must have 4 items.
- Preserve order: pros_ru[0] is the translation of pros[0], etc.
- Each translated string keeps the same punctuation shape as the source (em dash → em dash, ellipsis → ellipsis).
- Never invent new content. If a field is null in the input, omit it from output.

Quality bar:
- Translate idiomatically, not literally. Refactor word order when Russian flow demands it.
- Don't translate "Shopify", "AI", "SMS", "ROI" even when they appear inside a longer phrase.`

type ToolToTranslate = {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  pros: string[]
  cons: string[]
  best_for: string | null
}

type TranslatedFields = {
  name_ru: string
  tagline_ru: string | null
  description_ru: string | null
  pros_ru: string[]
  cons_ru: string[]
  best_for_ru: string | null
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

async function callOpenRouter(userPrompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  "https://botapolis.com",
      "X-Title":       "Botapolis · tools/translate",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.3,
      // Force the model into JSON-output mode when the gateway supports it.
      // OpenRouter passes this through for Anthropic / OpenAI / Gemini.
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`OpenRouter ${res.status}: ${txt.slice(0, 400)}`)
  }

  const data = (await res.json()) as OpenRouterResponse
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`)
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("OpenRouter returned no content")
  return text.trim()
}

function buildPrompt(tool: ToolToTranslate): string {
  // Strip fields that are null/empty so the model doesn't try to invent them.
  const source: Record<string, unknown> = { name: tool.name }
  if (tool.tagline)            source.tagline = tool.tagline
  if (tool.description)        source.description = tool.description
  if (tool.pros.length > 0)    source.pros = tool.pros
  if (tool.cons.length > 0)    source.cons = tool.cons
  if (tool.best_for)           source.best_for = tool.best_for

  // Specify the EXACT keys we want back. The "_ru" suffix makes it easier
  // to verify the model didn't echo English back into our Russian slot.
  const expectedKeys = Object.keys(source).map((k) => `"${k}_ru"`).join(", ")

  return `Translate the following Shopify-ecommerce tool catalog entry to Russian.

Input JSON:
${JSON.stringify(source, null, 2)}

Output ONLY a valid JSON object with these keys: ${expectedKeys}.
For array inputs (pros, cons) preserve length and order. For string inputs return a single translated string. Brand names like "${tool.name}" stay in English.`
}

function parseTranslation(raw: string, source: ToolToTranslate): TranslatedFields {
  // The model sometimes wraps JSON in a markdown fence even with
  // response_format set — strip it defensively.
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim()
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Model returned non-JSON for ${source.slug}:\n${cleaned.slice(0, 400)}`)
  }

  const arr = (v: unknown, expectedLen: number): string[] => {
    if (!Array.isArray(v)) return []
    const out = v.filter((x): x is string => typeof x === "string")
    if (out.length !== expectedLen) {
      console.warn(`  ⚠ array length mismatch for ${source.slug}: ${out.length} vs ${expectedLen}`)
    }
    return out
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null

  return {
    name_ru:        (typeof parsed.name_ru === "string" && parsed.name_ru) || source.name,
    tagline_ru:     str(parsed.tagline_ru),
    description_ru: str(parsed.description_ru),
    pros_ru:        arr(parsed.pros_ru, source.pros.length),
    cons_ru:        arr(parsed.cons_ru, source.cons.length),
    best_for_ru:    str(parsed.best_for_ru),
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false },
  })

  // Decide which rows to translate. Default: anything where at least one
  // _ru column is null AND the source EN column has content.
  // With --force: every published tool, regardless of state.
  // With --slug X: only that one slug.
  let query = supabase
    .from("tools")
    .select("slug, name, tagline, description, pros, cons, best_for, name_ru, tagline_ru, description_ru, pros_ru, cons_ru, best_for_ru")
    .eq("status", "published")

  if (args.slug) query = query.eq("slug", args.slug)

  const { data, error } = await query
  if (error) {
    console.error("Supabase fetch failed:", error.message)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.log("No published tools found.")
    return
  }

  const needsTranslation = data.filter((row) => {
    if (args.force) return true
    // Has anything missing?
    const missing =
      (row.tagline && !row.tagline_ru) ||
      (row.description && !row.description_ru) ||
      (row.pros?.length && (!row.pros_ru || row.pros_ru.length !== row.pros.length)) ||
      (row.cons?.length && (!row.cons_ru || row.cons_ru.length !== row.cons.length)) ||
      (row.best_for && !row.best_for_ru) ||
      !row.name_ru
    return missing
  })

  if (needsTranslation.length === 0) {
    console.log(`All ${data.length} tools already have RU translations. Re-run with --force to overwrite.`)
    return
  }

  console.log(`Translating ${needsTranslation.length} of ${data.length} tools using ${MODEL}…\n`)

  let ok = 0
  let fail = 0
  for (const row of needsTranslation) {
    const source: ToolToTranslate = {
      slug:        row.slug,
      name:        row.name,
      tagline:     row.tagline ?? null,
      description: row.description ?? null,
      pros:        row.pros ?? [],
      cons:        row.cons ?? [],
      best_for:    row.best_for ?? null,
    }

    process.stdout.write(`  ${row.slug}… `)
    try {
      const raw = await callOpenRouter(buildPrompt(source))
      const translation = parseTranslation(raw, source)

      const { error: upErr } = await supabase
        .from("tools")
        .update(translation)
        .eq("slug", row.slug)

      if (upErr) throw new Error(`update failed: ${upErr.message}`)
      console.log("✔")
      ok++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗ ${msg}`)
      fail++
    }
  }

  console.log(`\nDone. ${ok} translated, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
