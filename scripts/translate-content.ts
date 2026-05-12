/**
 * scripts/translate-content.ts
 * ----------------------------------------------------------------------------
 * EN → RU MDX translator that hands every EN article a Russian draft.
 *
 *   npm run translate:missing           # translate every EN file with no RU twin
 *   npm run translate -- --type reviews --slug klaviyo-review-2026
 *   npm run translate -- --force ...   # overwrite an existing RU file
 *
 * Why a tooling step at all (the user's question):
 *   Pure auto-translation on commit is technically possible (husky pre-commit
 *   hook → call OpenRouter → write RU file → re-stage) but the resulting
 *   prose lands at ~80% of editorial quality. Botapolis's methodology page
 *   commits us to copy a human would publish, so we ship a tool that
 *   produces a draft + asks the editor to spend ~5 minutes polishing.
 *
 * Implementation:
 *   - gray-matter splits frontmatter from body
 *   - Selected frontmatter fields (title, description, pros, cons, verdict,
 *     bestFor, notFor, steps[].name, steps[].text) translate via one batched
 *     API call to keep tone consistent
 *   - Body translates via a separate call with strict instructions: preserve
 *     MDX JSX components verbatim, preserve link URLs, only translate
 *     visible prose
 *   - Tone matches the existing manual RU translations (informal "ты",
 *     direct sentences, technical terms left in English)
 *
 * Model: anthropic/claude-haiku-4.5 by default (same as /api/tools/description).
 * Override via OPENROUTER_MODEL env if you want to A/B a different route.
 */
import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { parseArgs } from "node:util"

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, "content")

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    missing: { type: "boolean", default: false },
    type:    { type: "string" },
    slug:    { type: "string" },
    force:   { type: "boolean", default: false },
  },
})

const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5"
const API_KEY = process.env.OPENROUTER_API_KEY
if (!API_KEY) {
  console.error("OPENROUTER_API_KEY not set — run `npx vercel env pull` first.")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// OpenRouter call
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are translating English Shopify-ecommerce editorial content to Russian for Botapolis.

Tone rules:
- Informal Russian, "ты"-form (not "вы"). Direct sentences. No fluff.
- Match the voice of an experienced ecommerce operator writing for peers.
- Technical terms, product names, brand names stay in English (Klaviyo, Shopify, Postscript, Omnisend, etc.).
- Numeric data, currency, percentages, durations stay verbatim ($48k, 8.4/10, 200ms, 30 days).
- Acronyms (MRR, TCPA, GDPR, CTIA, SMS, API, AI, ROI, CLV, CTR, AOV, LTV) stay in English.

Format preservation (CRITICAL):
- Preserve all MDX JSX components verbatim — translate ONLY the text children, never the tag name, prop names, or prop string values that are URLs / slugs / IDs.
  Example: <Callout variant="tip" title="Speed test">  →  <Callout variant="tip" title="Тест скорости">
- Preserve markdown structure exactly: same heading levels, same list shape, same table columns.
- Preserve link URLs verbatim, translate only the visible link text.
  Example: [the Klaviyo review](/reviews/klaviyo-review-2026)  →  [обзор Klaviyo](/reviews/klaviyo-review-2026)
- Preserve code blocks verbatim — do NOT translate code, command names, or JSON keys.
- Preserve frontmatter delimiters (---) if you see them — but the input you receive will already be body-only.

Quality bar:
- Translate idiomatically, not literally. Refactor sentence structure when Russian flow demands it.
- Keep paragraph boundaries — one EN paragraph maps to one RU paragraph.
- Don't add or remove sentences. Don't editorialize.

Output ONLY the translated text. No prefix, no suffix, no commentary.`

interface OpenRouterMessage {
  role:    "system" | "user" | "assistant"
  content: string
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string }
    finish_reason?: string
  }>
  error?: { message?: string; type?: string }
}

async function callOpenRouter(userPrompt: string, maxTokens = 4096): Promise<string> {
  const messages: OpenRouterMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: userPrompt },
  ]

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  "https://botapolis.com",
      "X-Title":       "Botapolis · content/translate",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,  // tight — we want fidelity over creativity
      messages,
    }),
    signal: AbortSignal.timeout(120_000),  // 2-minute cap per call
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 400)}`)
  }

  const data = (await res.json()) as OpenRouterResponse
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`)
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error(`OpenRouter returned no content: ${JSON.stringify(data).slice(0, 400)}`)
  return text.trim()
}

// ---------------------------------------------------------------------------
// Body translation — chunks long content to stay under model context limits
// ---------------------------------------------------------------------------
async function translateBody(body: string): Promise<string> {
  // Most of our articles are ~1.5k EN words = ~5-6k tokens including
  // markdown overhead. Claude Haiku handles that in a single call at 4096
  // max_tokens. If we ever ship a 5k-word longread, the chunk-by-section
  // path below kicks in.
  const wordCount = body.split(/\s+/).length
  if (wordCount < 1800) {
    return callOpenRouter(`Translate this MDX body to Russian:\n\n${body}`, 6000)
  }

  // Chunk by ## headings so each chunk is independently translatable and
  // we don't blow past the output token cap. The first chunk is the lede
  // before any ## heading.
  const parts = body.split(/\n(?=##\s)/g)
  const out: string[] = []
  for (const part of parts) {
    const translated = await callOpenRouter(`Translate this MDX section to Russian:\n\n${part}`, 4096)
    out.push(translated)
  }
  return out.join("\n\n")
}

// ---------------------------------------------------------------------------
// Frontmatter translation — only specific user-facing fields
// ---------------------------------------------------------------------------
const TRANSLATABLE_STRING_FIELDS = [
  "title",
  "description",
  "verdict",
  "bestFor",
  "notFor",
] as const

const TRANSLATABLE_ARRAY_FIELDS = ["pros", "cons", "tags"] as const

async function translateStrings(values: string[]): Promise<string[]> {
  if (values.length === 0) return []
  // Send all strings as a numbered list so we can split the response
  // back into the same shape. Cheaper than N separate API calls.
  const numbered = values.map((v, i) => `[${i + 1}] ${v}`).join("\n")
  const userPrompt =
    `Translate the following short editorial strings to Russian. Keep the same numbering. Output ONLY the numbered translations, one per line.\n\n${numbered}`
  const reply = await callOpenRouter(userPrompt, 2000)
  // Parse "[N] translated text" lines back to an array
  const result: string[] = new Array(values.length).fill("")
  for (const line of reply.split("\n")) {
    const m = line.match(/^\[(\d+)\]\s*(.+)$/)
    if (!m) continue
    const idx = parseInt(m[1], 10) - 1
    if (idx >= 0 && idx < values.length) result[idx] = m[2].trim()
  }
  // Fallback for any string the model dropped — leave EN untouched so
  // the editor sees the gap loudly.
  for (let i = 0; i < result.length; i++) {
    if (!result[i]) {
      console.warn(`  [translate] string #${i + 1} not returned by model — keeping EN`)
      result[i] = values[i]
    }
  }
  return result
}

async function translateFrontmatter(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...data }

  // Collect every translatable string into one batched call
  const slots: Array<{ key: string; index?: number; sub?: "name" | "text" }> = []
  const inputs: string[] = []

  for (const key of TRANSLATABLE_STRING_FIELDS) {
    const v = data[key]
    if (typeof v === "string" && v.trim().length > 0) {
      slots.push({ key })
      inputs.push(v)
    }
  }

  for (const key of TRANSLATABLE_ARRAY_FIELDS) {
    if (key === "tags") continue  // tags stay English for semantic-filter consistency
    const arr = data[key]
    if (Array.isArray(arr)) {
      arr.forEach((v, index) => {
        if (typeof v === "string" && v.trim().length > 0) {
          slots.push({ key, index })
          inputs.push(v)
        }
      })
    }
  }

  // HowTo steps[*].name + steps[*].text
  if (Array.isArray(data.steps)) {
    data.steps.forEach((step: unknown, index: number) => {
      if (step && typeof step === "object") {
        const s = step as Record<string, unknown>
        if (typeof s.name === "string") { slots.push({ key: "steps", index, sub: "name" }); inputs.push(s.name) }
        if (typeof s.text === "string") { slots.push({ key: "steps", index, sub: "text" }); inputs.push(s.text) }
      }
    })
  }

  if (inputs.length === 0) return out

  const translated = await translateStrings(inputs)

  // Stitch translated strings back into `out`
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const value = translated[i]
    if (slot.key === "steps" && slot.index != null && slot.sub) {
      const steps = (out.steps as Array<Record<string, unknown>>).slice()
      steps[slot.index] = { ...steps[slot.index], [slot.sub]: value }
      out.steps = steps
    } else if (slot.index != null) {
      const arr = ((out[slot.key] as unknown[]) ?? []).slice()
      arr[slot.index] = value
      out[slot.key] = arr
    } else {
      out[slot.key] = value
    }
  }

  return out
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
async function findMissingFiles(): Promise<Array<{ type: "reviews" | "guides"; slug: string }>> {
  const result: Array<{ type: "reviews" | "guides"; slug: string }> = []
  for (const type of ["reviews", "guides"] as const) {
    const enDir = path.join(CONTENT_DIR, type, "en")
    const ruDir = path.join(CONTENT_DIR, type, "ru")
    let enFiles: string[] = []
    try { enFiles = await fs.readdir(enDir) } catch { continue }
    let ruFiles = new Set<string>()
    try { ruFiles = new Set(await fs.readdir(ruDir)) } catch { /* no RU dir yet */ }
    for (const f of enFiles) {
      if (!f.endsWith(".mdx")) continue
      if (ruFiles.has(f) && !args.force) continue
      result.push({ type, slug: f.replace(/\.mdx$/, "") })
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Main per-file translator
// ---------------------------------------------------------------------------
async function translateFile(type: "reviews" | "guides", slug: string) {
  const enPath = path.join(CONTENT_DIR, type, "en", `${slug}.mdx`)
  const ruPath = path.join(CONTENT_DIR, type, "ru", `${slug}.mdx`)

  // ---- Existing-RU handling ------------------------------------------------
  // Two independent flags govern overwrite:
  //   1. --force (CLI arg) — caller-side override, used by the pre-commit
  //      hook so EN changes always re-translate.
  //   2. `manuallyTranslated: true` in RU frontmatter — opt-out the editor
  //      can set on any RU file to lock in hand-edits against future auto
  //      re-translation. The flag survives because gray-matter round-trips
  //      unknown frontmatter keys cleanly.
  // Precedence: manuallyTranslated wins. If you really want to wipe an
  // opted-out RU file, flip the frontmatter flag first and re-run.
  // --------------------------------------------------------------------------
  if (!args.force) {
    try {
      await fs.access(ruPath)
      console.log(`  [skip] ${type}/${slug} — RU file exists (pass --force to overwrite)`)
      return
    } catch { /* doesn't exist → proceed */ }
  } else {
    // --force is set: still respect the per-file opt-out.
    try {
      const existing = await fs.readFile(ruPath, "utf-8")
      const { data } = matter(existing)
      if (data && (data as Record<string, unknown>).manuallyTranslated === true) {
        console.log(`  [locked] ${type}/${slug} — RU has manuallyTranslated:true, skipping`)
        return
      }
    } catch { /* RU doesn't exist yet, fine */ }
  }

  console.log(`  [translate] ${type}/${slug} …`)
  const source = await fs.readFile(enPath, "utf-8")
  const { content: body, data: frontmatter } = matter(source)

  // Frontmatter + body in parallel — independent calls.
  const [translatedFrontmatter, translatedBody] = await Promise.all([
    translateFrontmatter(frontmatter),
    translateBody(body),
  ])

  // gray-matter.stringify writes YAML + ---fences + body
  const output = matter.stringify(translatedBody, translatedFrontmatter)
  await fs.mkdir(path.dirname(ruPath), { recursive: true })
  await fs.writeFile(ruPath, output, "utf-8")
  console.log(`  [wrote]    ${ruPath.replace(ROOT + path.sep, "")}`)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  let targets: Array<{ type: "reviews" | "guides"; slug: string }> = []

  if (args.missing) {
    targets = await findMissingFiles()
    console.log(`[translate] ${targets.length} missing RU file(s) found`)
  } else if (args.type && args.slug) {
    if (args.type !== "reviews" && args.type !== "guides") {
      console.error("--type must be 'reviews' or 'guides'")
      process.exit(1)
    }
    targets = [{ type: args.type, slug: args.slug }]
  } else {
    console.error("Usage:")
    console.error("  npm run translate -- --missing")
    console.error("  npm run translate -- --type reviews --slug klaviyo-review-2026")
    console.error("  add --force to overwrite an existing RU file")
    process.exit(1)
  }

  for (const t of targets) {
    try {
      await translateFile(t.type, t.slug)
    } catch (err) {
      console.error(`  [error] ${t.type}/${t.slug}:`, err instanceof Error ? err.message : err)
    }
  }
}

main().catch((err) => {
  console.error("[translate] fatal:", err)
  process.exitCode = 1
})
