/**
 * scripts/translate-comparisons.ts
 * ----------------------------------------------------------------------------
 * Clones each English row in `comparisons` into a Russian twin: same slug,
 * same tool_a_id / tool_b_id, but language='ru' and translated verdict +
 * custom_intro + custom_methodology + meta_title + meta_description.
 *
 *   npm run translate:comparisons               # any EN row that has no RU
 *                                               # twin yet (one with the same
 *                                               # slug + language='ru')
 *   npm run translate:comparisons -- --slug klaviyo-vs-mailchimp
 *   npm run translate:comparisons -- --force    # re-translate even existing
 *                                               # RU rows (UPDATE in place)
 *
 * Required env (same as translate-tools.ts):
 *   - OPENROUTER_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   - OPENROUTER_MODEL   (default anthropic/claude-haiku-4.5)
 *
 * Schema note (migration 006): comparisons.slug is unique within (slug,
 * language) rather than globally unique. That migration MUST be applied
 * before this script runs, or the first INSERT collides on the legacy
 * single-column unique.
 *
 * Tone + format rules are inherited from translate-tools.ts. Comparisons
 * aren't free-form markdown (no MDX bodies, no JSX components inside the
 * fields), so the prompt stays simpler than translate-content.ts's MDX
 * variant — but the field-by-field JSON output keeps tone consistent
 * across the five fields inside one comparison.
 */
import { parseArgs } from "node:util"
import { createClient } from "@supabase/supabase-js"

const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5"

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OPENROUTER_KEY) {
  console.error("OPENROUTER_API_KEY not set. Add to .env.local or export inline.")
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.")
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
const SYSTEM_PROMPT = `You translate English head-to-head SaaS comparison copy into Russian for the Botapolis catalog.

Tone rules:
- Informal Russian, "ты"-form (not "вы"). Direct sentences, peer-to-peer voice.
- Brand names stay in English (Klaviyo, Shopify, Mailchimp, Postscript, Omnisend, Tidio, Gorgias, ManyChat, etc.).
- Technical acronyms stay in English: SMS, AI, ROI, API, CTR, AOV, LTV, MRR, TCPA, GDPR, CTIA, SaaS, B2B, B2C, CRM, ESP.
- Numbers, currency, percentages, durations stay verbatim ($48k, 8.4/10, 200ms, 30 days).
- "Verdict" copy is opinionated and prescriptive — keep that energy in Russian. Don't soften.

Output rules (CRITICAL):
- Output ONLY a JSON object with the keys requested. No markdown fence, no commentary, no prefix.
- For null inputs, omit the key from output.
- Don't translate URLs, slugs, or anchor strings (like "/compare/klaviyo-vs-mailchimp").

Quality bar:
- Translate idiomatically; refactor word order when Russian flow demands it.
- Verdict often starts with "Under $50k MRR: Omnisend, every time." — preserve the colon-led structure.`

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
      "X-Title":       "Botapolis · comparisons/translate",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      temperature: 0.3,
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

type ComparisonRow = {
  id: string
  slug: string
  tool_a_id: string
  tool_b_id: string
  verdict: string | null
  winner_for: unknown
  comparison_data: unknown
  custom_intro: string | null
  custom_methodology: string | null
  language: string
  status: string
  meta_title: string | null
  meta_description: string | null
}

type Translatable = {
  verdict?: string
  custom_intro?: string
  custom_methodology?: string
  meta_title?: string
  meta_description?: string
}

function buildPrompt(slug: string, source: Translatable): string {
  const expected = Object.keys(source).map((k) => `"${k}"`).join(", ")
  return `Translate the following head-to-head comparison fields to Russian. The comparison slug is "${slug}".

Input JSON:
${JSON.stringify(source, null, 2)}

Output ONLY a valid JSON object with these keys: ${expected}.
Return one translated string per key. Preserve the prescriptive tone of "verdict".`
}

function parseTranslation(
  raw:    string,
  source: Translatable,
  slug:   string,
): Translatable {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim()
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Model returned non-JSON for ${slug}:\n${cleaned.slice(0, 400)}`)
  }

  const out: Translatable = {}
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined

  if (source.verdict)           out.verdict           = str(parsed.verdict)
  if (source.custom_intro)      out.custom_intro      = str(parsed.custom_intro)
  if (source.custom_methodology) out.custom_methodology = str(parsed.custom_methodology)
  if (source.meta_title)        out.meta_title        = str(parsed.meta_title)
  if (source.meta_description)  out.meta_description  = str(parsed.meta_description)
  return out
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { persistSession: false },
  })

  // Pull every EN comparison; we'll decide per-row whether to insert/skip.
  let q = supabase
    .from("comparisons")
    .select("*")
    .eq("language", "en")
    .eq("status",   "published")
  if (args.slug) q = q.eq("slug", args.slug)

  const { data: enRows, error: enErr } = await q
  if (enErr) {
    console.error("Fetch EN comparisons failed:", enErr.message)
    process.exit(1)
  }
  if (!enRows || enRows.length === 0) {
    console.log("No EN comparisons to translate.")
    return
  }

  // Pull existing RU rows so we know which slugs to skip (unless --force).
  const { data: ruRows, error: ruErr } = await supabase
    .from("comparisons")
    .select("slug")
    .eq("language", "ru")
  if (ruErr) {
    console.error("Fetch RU comparisons failed:", ruErr.message)
    process.exit(1)
  }
  const ruSlugs = new Set(ruRows?.map((r) => r.slug) ?? [])

  const todo = enRows.filter((r) => args.force || !ruSlugs.has(r.slug))
  if (todo.length === 0) {
    console.log(
      `All ${enRows.length} EN comparisons already have RU twins. Re-run with --force to overwrite.`,
    )
    return
  }

  console.log(`Translating ${todo.length} of ${enRows.length} comparisons using ${MODEL}…\n`)

  let ok = 0
  let fail = 0
  for (const row of todo as ComparisonRow[]) {
    process.stdout.write(`  ${row.slug}… `)
    try {
      const source: Translatable = {}
      if (row.verdict)            source.verdict            = row.verdict
      if (row.custom_intro)       source.custom_intro       = row.custom_intro
      if (row.custom_methodology) source.custom_methodology = row.custom_methodology
      if (row.meta_title)         source.meta_title         = row.meta_title
      if (row.meta_description)   source.meta_description   = row.meta_description

      // If the source has nothing translatable, still create the RU row so
      // the route /ru/compare/<slug> works — verdict/intro will fall back
      // to the EN copy at the React layer via comparison_data narratives.
      const translated = Object.keys(source).length > 0
        ? parseTranslation(await callOpenRouter(buildPrompt(row.slug, source)), source, row.slug)
        : {}

      const ruRow = {
        slug:               row.slug,
        tool_a_id:          row.tool_a_id,
        tool_b_id:          row.tool_b_id,
        verdict:            translated.verdict            ?? row.verdict,
        winner_for:         row.winner_for,
        // comparison_data carries auto-narrative data + structured tables;
        // its visible strings on the page are generated client-side via
        // lib/content/pseo.ts, which is locale-aware. We copy the JSON
        // verbatim — it points at tool IDs, not free-form RU/EN strings.
        comparison_data:    row.comparison_data,
        custom_intro:       translated.custom_intro       ?? row.custom_intro,
        custom_methodology: translated.custom_methodology ?? row.custom_methodology,
        language:           "ru",
        status:             row.status,
        meta_title:         translated.meta_title         ?? row.meta_title,
        meta_description:   translated.meta_description   ?? row.meta_description,
      }

      if (args.force && ruSlugs.has(row.slug)) {
        const { error: upErr } = await supabase
          .from("comparisons")
          .update(ruRow)
          .eq("slug", row.slug)
          .eq("language", "ru")
        if (upErr) throw new Error(`update failed: ${upErr.message}`)
      } else {
        const { error: insErr } = await supabase
          .from("comparisons")
          .insert(ruRow)
        if (insErr) throw new Error(`insert failed: ${insErr.message}`)
      }

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
