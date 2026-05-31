/**
 * Phase 0 (Data-First pSEO Blueprint) — Этап D: parse all 6 research files
 * and either dry-run (print per-tool snapshots) or apply UPDATEs to tools.
 *
 * Run:
 *   npx tsx scripts/apply-phase0-research.ts --dry                    # all 34
 *   npx tsx scripts/apply-phase0-research.ts --dry --tools=klaviyo,judge-me
 *   npx tsx scripts/apply-phase0-research.ts --apply                  # WRITES
 *
 * Format/shape handling per research (from memory project_phase-0-etap-d-plan):
 *   R1 Identity         — markdown table inside `## Details` block, wide
 *   R2 Pricing          — CSV inside ```csv fence, wide, comma-separated
 *   R3 Features         — CSV inside ```csv fence, long (1 row per feature)
 *   R4 Integrations     — PIPE-separated inside ```csv fence (label misnomer)
 *   R5 Reviews          — CSV with embedded pseudo-JSON literals
 *   R6 Monetization     — CSV comma, wide
 *
 * Strict separation enforced:
 *   - R5 ratings_4axis    → tools.rating_breakdown (our editorial 4-axis)
 *   - R5 g2/trustpilot/shopify_store → tools.external_ratings (raw vendor)
 *
 * Content-generation flags (Yotpo sunset, Klaviyo commission disputed, etc.)
 * are read from /research/phase0-content-flags.md by Etap E generator —
 * NOT written to tools by this script.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

const RESEARCH_DIR = resolve(process.cwd(), 'research')

// ── Name → slug normalization map ───────────────────────────────────────────
// Different research files use different name shapes:
//   R1 markdown uses DB slugs (judge-me, loop-subscriptions)
//   R2-R6 use display names (Judge.me, Loop Subscriptions)
//   Some have parenthetical suffixes (Inventory Planner (by Sage),
//     Pencil (by The Brandtech Group), Skio (a Recharge Company))
const NAME_TO_SLUG: Record<string, string> = {
  Klaviyo: 'klaviyo',
  Gorgias: 'gorgias',
  Postscript: 'postscript',
  Recharge: 'recharge',
  Omnisend: 'omnisend',
  Mailchimp: 'mailchimp',
  Tidio: 'tidio',
  'Judge.me': 'judge-me',
  'judge-me': 'judge-me',
  judgeme: 'judge-me',
  'Smile.io': 'smile-io',
  'smile-io': 'smile-io',
  smile: 'smile-io',
  Loox: 'loox',
  Yotpo: 'yotpo',
  ManyChat: 'manychat',
  'Loop Subscriptions': 'loop-subscriptions',
  'loop-subscriptions': 'loop-subscriptions',
  'loop-subs': 'loop-subscriptions',
  Skio: 'skio',
  'Skio (a Recharge Company)': 'skio',
  'Loop Returns': 'loop-returns',
  'loop-returns': 'loop-returns',
  'Stay AI': 'stay-ai',
  'stay-ai': 'stay-ai',
  'Triple Whale': 'triple-whale',
  'triple-whale': 'triple-whale',
  Rebuy: 'rebuy',
  Attentive: 'attentive',
  LoyaltyLion: 'loyaltylion',
  AfterShip: 'aftership',
  Signifyd: 'signifyd',
  'Shopify Sidekick': 'shopify-sidekick',
  'shopify-sidekick': 'shopify-sidekick',
  Pebblely: 'pebblely',
  'AdCreative.ai': 'adcreative-ai',
  'adcreative-ai': 'adcreative-ai',
  adcreative: 'adcreative-ai',
  'Flair AI': 'flair-ai',
  'flair-ai': 'flair-ai',
  flair: 'flair-ai',
  Flair: 'flair-ai',
  'Booth AI': 'booth-ai',
  'booth-ai': 'booth-ai',
  booth: 'booth-ai',
  Booth: 'booth-ai',
  'Inventory Planner': 'inventory-planner',
  'Inventory Planner (by Sage)': 'inventory-planner',
  'inventory-planner': 'inventory-planner',
  Prediko: 'prediko',
  Northbeam: 'northbeam',
  'Polar Analytics': 'polar-analytics',
  'polar-analytics': 'polar-analytics',
  polar: 'polar-analytics',
  Polar: 'polar-analytics',
  Cogsy: 'cogsy',
  LimeSpot: 'limespot',
  Pencil: 'pencil',
  'Pencil (by The Brandtech Group)': 'pencil',
}

function normalizeSlug(rawName: string): string | null {
  if (!rawName) return null
  const trimmed = rawName.trim()
  const direct = NAME_TO_SLUG[trimmed]
  if (direct) return direct
  // Fallback heuristic: lowercase + replace dots/spaces with hyphens
  const auto = trimmed.toLowerCase().replace(/[.\s]+/g, '-').replace(/-+/g, '-')
  return auto
}

const NOT_FOUND_MARKERS = ['NOT FOUND', 'НЕ НАЙДЕНО', 'n/a', 'N/A']
const isNotFound = (s: string | null | undefined): boolean => {
  if (!s) return true
  const t = s.trim()
  return NOT_FOUND_MARKERS.some(m => t === m || t === `[${m}]`)
}

// ── Affiliate platform normalization (R6 column "platform") ─────────────────
function normalizeAffiliatePartner(rawPlatform: string): string | null {
  if (!rawPlatform || isNotFound(rawPlatform)) return null
  const lower = rawPlatform.toLowerCase()
  // Use startsWith only — Recharge has "Lasso (moved off PartnerStack 15 Mar 2026)"
  // which would erroneously match 'partnerstack' with includes(). The actual
  // platform is always the first token.
  if (lower.startsWith('direct')) return 'direct'
  if (lower.startsWith('lasso')) return 'lasso'
  if (lower.startsWith('partnerstack')) return 'partnerstack'
  if (lower.startsWith('impact')) return 'impact'
  if (lower.startsWith('rewardful')) return 'rewardful'
  if (lower.startsWith('tapfiliate')) return 'tapfiliate'
  if (lower.startsWith('partnerportal')) return 'partnerportal'
  return 'direct' // fallback for unknown platform descriptions
}

// ── CSV parser (RFC 4180-ish, supports comma OR pipe separator) ─────────────
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field.trim())
      field = ''
    } else if (ch === '\n') {
      row.push(field.trim())
      field = ''
      rows.push(row)
      row = []
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field || row.length) {
    row.push(field.trim())
    rows.push(row)
  }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]))
}

// ── Format detection ────────────────────────────────────────────────────────
function extractFencedCsv(markdown: string): { text: string; delimiter: string } | null {
  const m = markdown.match(/```csv\s*\n([\s\S]*?)\n```/m)
  if (!m) return null
  const body = m[1]
  // Detect delimiter from first non-empty line (header)
  const firstLine = body.split('\n').find(l => l.trim())
  if (!firstLine) return null
  const pipeCount = (firstLine.match(/\s\|\s/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = pipeCount >= 3 && pipeCount > commaCount / 2 ? '|' : ','
  return { text: body, delimiter }
}

function extractMarkdownTable(markdown: string): string[][] | null {
  // Find pipe-bordered table: lines starting with `|` separated by `|---|---|`
  const lines = markdown.split('\n')
  let inTable = false
  let headerLine = ''
  let dataLines: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!inTable && trimmed.startsWith('|') && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|$/)) {
      headerLine = trimmed
      inTable = true
      i++ // skip separator line
      continue
    }
    if (inTable) {
      if (trimmed.startsWith('|')) {
        dataLines.push(trimmed)
      } else if (trimmed === '') {
        break // table ended
      } else {
        break
      }
    }
  }
  if (!headerLine) return null

  const parseRow = (line: string): string[] => {
    // Strip leading/trailing pipe; handle escaped pipes (`\|`) within cells
    // — used by R1 for tools like Klaviyo where tagline contains a pipe
    // ('"AI Email Marketing & SMS \| B2C CRM"').
    const MARK = '__BTPLS_ESCAPED_PIPE__'
    const escaped = line.replace(/\\\|/g, MARK)
    const inner = escaped.replace(/^\|/, '').replace(/\|$/, '')
    return inner
      .split(/\s*\|\s*/)
      .map(s => s.trim().split(MARK).join( '|'))
  }

  return [parseRow(headerLine), ...dataLines.map(parseRow)]
}

// ── R5 pseudo-JSON parsers ──────────────────────────────────────────────────
function parseRatings4Axis(raw: string): Record<string, { value: number; source: 'H' | 'I' }> | null {
  if (!raw || isNotFound(raw)) return null
  const result: Record<string, { value: number; source: 'H' | 'I' }> = {}
  const regex = /(\w+):\s*([\d.]+)\[([HI])\]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(raw)) !== null) {
    const axis = m[1] === 'ease' ? 'ease_of_use' : m[1]
    result[axis] = { value: parseFloat(m[2]), source: m[3] as 'H' | 'I' }
  }
  return Object.keys(result).length ? result : null
}

function parseSingleQuotedArray(raw: string): string[] {
  if (!raw || isNotFound(raw)) return []
  // Match all 'string' patterns (handles content with commas/spaces inside)
  const matches = raw.match(/'([^']*)'/g) || []
  return matches.map(m => m.slice(1, -1))
}

function parseOperatorQuotes(raw: string): Array<{ quote: string; source: string; date: string }> {
  if (!raw || isNotFound(raw)) return []
  const quotes: Array<{ quote: string; source: string; date: string }> = []
  // Match each {quote:'...', source:'...', date:'...'}
  const objRegex = /\{\s*quote:\s*'([^']*)'\s*,\s*source:\s*'([^']*)'\s*,\s*date:\s*'([^']*)'\s*\}/g
  let m: RegExpExecArray | null
  while ((m = objRegex.exec(raw)) !== null) {
    quotes.push({ quote: m[1], source: m[2], date: m[3] })
  }
  return quotes
}

function parseExternalRating(raw: string): { score: number | null; reviews: number | null; note?: string } | null {
  if (!raw || isNotFound(raw)) return null
  // Examples:
  //   "4.6/5 (1352 reviews)"
  //   "5.0/5 (37490+ reviews)"
  //   "4.x (limited G2 footprint, sub-100 reviews)"
  //   "Mixed — no consolidated business profile, frequent negative billing reviews"
  //   "NOT FOUND on G2 (acquired by Recharge April 2026)"
  const scoreMatch = raw.match(/(\d+\.?\d*)\/5/)
  const reviewsMatch = raw.match(/\(([\d,]+)\+?\s*(?:G2\s*)?reviews?\)/)
    || raw.match(/(\d+)\+?\s*reviews/)
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : null
  const reviews = reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, ''), 10) : null
  const note = raw.includes('NOT FOUND') ? raw : (scoreMatch || reviewsMatch ? undefined : raw)
  if (score === null && reviews === null && !note) return null
  return { score, reviews, ...(note ? { note } : {}) }
}

// ── Bracket-array parser (R4 `[Tool1, Tool2, ...]`) ────────────────────────
function parseBracketArray(raw: string): string[] {
  if (!raw || isNotFound(raw)) return []
  const cleaned = raw.trim().replace(/^\[|\]$/g, '')
  if (!cleaned || isNotFound(cleaned)) return []
  return cleaned.split(',').map(s => s.trim()).filter(s => s && !isNotFound(s))
}

// ── Research parsers ────────────────────────────────────────────────────────
type R1Profile = {
  tagline: string
  description: string
  best_for: string
  not_for: string
  category: string
  subcategories: string[]
}

function parseR1(filePath: string): Map<string, R1Profile> {
  const raw = readFileSync(filePath, 'utf8')
  const rows = extractMarkdownTable(raw)
  if (!rows) throw new Error('R1: no markdown table found')
  const result = new Map<string, R1Profile>()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 8) continue
    const slug = normalizeSlug(r[0])
    if (!slug) continue
    result.set(slug, {
      tagline: r[2],
      description: r[3],
      best_for: r[4],
      not_for: r[5],
      category: r[6],
      subcategories: r[7].split(',').map(s => s.trim()).filter(Boolean),
    })
  }
  return result
}

type R2Profile = {
  pricing_model: string | null
  pricing_min: number | null
  pricing_max: number | null
  pricing_notes: string
  pricing_source_url: string | null
}

function parseR2(filePath: string): Map<string, R2Profile> {
  const raw = readFileSync(filePath, 'utf8')
  const extracted = extractFencedCsv(raw)
  if (!extracted) throw new Error('R2: no csv block found')
  const rows = parseDelimited(extracted.text, extracted.delimiter)
  const result = new Map<string, R2Profile>()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 8) continue
    const slug = normalizeSlug(r[0])
    if (!slug) continue
    const pricingModelRaw = r[1].toLowerCase()
    const pricing_model = isNotFound(pricingModelRaw) ? null : pricingModelRaw
    const priceMinRaw = r[2]
    const priceMaxRaw = r[3]
    const pricing_min = isNotFound(priceMinRaw) || priceMinRaw === 'custom' ? null : parseFloat(priceMinRaw)
    const pricing_max = isNotFound(priceMaxRaw) || priceMaxRaw === 'custom' ? null : (priceMaxRaw === 'custom' ? null : parseFloat(priceMaxRaw))
    const tiers = r[4]
    const gotchas = r[5]
    const freePlan = r[6]
    const dateChecked = r[7]
    const sourceUrl = r[8] || null
    const pricing_notes = [
      `Tiers: ${tiers}`,
      `Pricing gotchas: ${gotchas}`,
      `Free plan: ${freePlan}`,
      `Verified ${dateChecked}`,
    ].filter(Boolean).join('\n\n')
    result.set(slug, {
      pricing_model: isNaN(pricing_min as number) ? null : pricing_model,
      pricing_min: isNaN(pricing_min as number) ? null : pricing_min,
      pricing_max: isNaN(pricing_max as number) ? null : pricing_max,
      pricing_notes,
      pricing_source_url: sourceUrl && !isNotFound(sourceUrl) ? sourceUrl : null,
    })
  }
  return result
}

type R3Feature = {
  name: string
  description: string
  plan_availability: string
  is_ai: boolean
  ai_kind?: string
}

function parseR3(filePath: string): Map<string, R3Feature[]> {
  const raw = readFileSync(filePath, 'utf8')
  const extracted = extractFencedCsv(raw)
  if (!extracted) throw new Error('R3: no csv block found')
  const rows = parseDelimited(extracted.text, extracted.delimiter)
  const result = new Map<string, R3Feature[]>()
  const STRUCTURAL_MARKERS = ['structural', 'strategic', 'verify with vendor']
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 5) continue
    const slug = normalizeSlug(r[0])
    if (!slug) continue
    const plan_availability = r[3]
    // Skip structural-notes-as-features (Recharge Skio Acquisition, etc.)
    if (STRUCTURAL_MARKERS.some(m => plan_availability.toLowerCase().includes(m))) {
      continue
    }
    const isAiRaw = r[4].trim()
    const is_ai = isAiRaw.toLowerCase().startsWith('yes')
    const ai_kind = is_ai && isAiRaw.includes(' - ')
      ? isAiRaw.split(' - ').slice(1).join(' - ').trim()
      : undefined
    const feature: R3Feature = {
      name: r[1],
      description: r[2],
      plan_availability,
      is_ai,
      ...(ai_kind ? { ai_kind } : {}),
    }
    const arr = result.get(slug) || []
    arr.push(feature)
    result.set(slug, arr)
  }
  return result
}

type R4Profile = {
  shopify_native_notes: string
  integrates_with_tools: string[]
  integrations: string[] // external systems
}

function parseR4(filePath: string): Map<string, R4Profile> {
  const raw = readFileSync(filePath, 'utf8')
  const extracted = extractFencedCsv(raw)
  if (!extracted) throw new Error('R4: no csv block found')
  // R4 uses pipe separator
  const rows = parseDelimited(extracted.text, '|')
  const result = new Map<string, R4Profile>()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 4) continue
    const slug = normalizeSlug(r[0])
    if (!slug) continue
    const shopify_native_notes = r[1]
    const integratesWithRaw = r[2]
    const externalRaw = r[3]
    // Map internal tool names to slugs (R4 uses display names)
    const internalSlugs = parseBracketArray(integratesWithRaw)
      .map(name => normalizeSlug(name))
      .filter((s): s is string => s !== null && s !== slug)
    const externals = parseBracketArray(externalRaw)
    result.set(slug, {
      shopify_native_notes,
      integrates_with_tools: internalSlugs,
      integrations: externals,
    })
  }
  return result
}

type R5Profile = {
  external_ratings: Record<string, { score: number | null; reviews: number | null; note?: string }>
  rating_breakdown: Record<string, { value: number; source: 'H' | 'I' }> | null
  pros: string[]
  cons: string[]
  operator_quotes: Array<{ quote: string; source: string; date: string }>
}

function parseR5(filePath: string): Map<string, R5Profile> {
  const raw = readFileSync(filePath, 'utf8')
  const extracted = extractFencedCsv(raw)
  if (!extracted) throw new Error('R5: no csv block found')
  const rows = parseDelimited(extracted.text, ',')
  const result = new Map<string, R5Profile>()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 8) continue
    const slug = normalizeSlug(r[0])
    if (!slug) continue
    const external_ratings: Record<string, { score: number | null; reviews: number | null; note?: string }> = {}
    const g2 = parseExternalRating(r[1])
    const trustpilot = parseExternalRating(r[2])
    const shopify_store = parseExternalRating(r[3])
    if (g2) external_ratings.g2 = g2
    if (trustpilot) external_ratings.trustpilot = trustpilot
    if (shopify_store) external_ratings.shopify_store = shopify_store
    result.set(slug, {
      external_ratings,
      rating_breakdown: parseRatings4Axis(r[4]),
      pros: parseSingleQuotedArray(r[5]),
      cons: parseSingleQuotedArray(r[6]),
      operator_quotes: parseOperatorQuotes(r[7]),
    })
  }
  return result
}

type R6Profile = {
  has_program: boolean
  affiliate_commission: string | null
  affiliate_partner: string | null
  affiliate_program_url: string | null
  affiliate_cookie_window: string | null
  archive: boolean // true if НЕ НАЙДЕНО / no findable program
}

function parseR6(filePath: string): Map<string, R6Profile> {
  const raw = readFileSync(filePath, 'utf8')
  const extracted = extractFencedCsv(raw)
  if (!extracted) throw new Error('R6: no csv block found')
  const rows = parseDelimited(extracted.text, ',')
  const result = new Map<string, R6Profile>()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 7) continue
    const slug = normalizeSlug(r[0])
    if (!slug) continue
    const hasProgramRaw = r[1]
    const archive = isNotFound(hasProgramRaw)
    const has_program = !archive && hasProgramRaw.toLowerCase().startsWith('yes')
    const commissionRaw = r[2]
    const typeRaw = r[3]
    const platformRaw = r[4]
    const programUrlRaw = r[5]
    const cookieRaw = r[6]
    result.set(slug, {
      has_program,
      affiliate_commission: isNotFound(commissionRaw) ? null : `${commissionRaw}${typeRaw && !isNotFound(typeRaw) ? ` (type: ${typeRaw})` : ''}`,
      affiliate_partner: normalizeAffiliatePartner(platformRaw),
      affiliate_program_url: isNotFound(programUrlRaw) ? null : programUrlRaw,
      affiliate_cookie_window: isNotFound(cookieRaw) ? null : cookieRaw,
      archive,
    })
  }
  return result
}

// ── Per-tool profile merger ─────────────────────────────────────────────────
type FullProfile = {
  slug: string
  // R1
  tagline?: string
  description?: string
  best_for?: string
  not_for?: string
  category?: string
  subcategories?: string[]
  // R2
  pricing_model?: string | null
  pricing_min?: number | null
  pricing_max?: number | null
  pricing_notes?: string
  pricing_source_url?: string | null
  // R3
  features?: R3Feature[]
  // R4
  shopify_native_notes?: string
  integrates_with_tools?: string[]
  integrations?: string[]
  // R5
  external_ratings?: Record<string, any>
  rating_breakdown?: Record<string, any> | null
  rating?: number | null
  pros?: string[]
  cons?: string[]
  operator_quotes?: Array<{ quote: string; source: string; date: string }>
  // R6
  affiliate_commission?: string | null
  affiliate_partner?: string | null
  affiliate_program_url?: string | null
  affiliate_cookie_window?: string | null
  // Status
  status: 'draft' | 'published' | 'archived'
  // Coverage flags for debug
  _coverage: { r1: boolean; r2: boolean; r3: boolean; r4: boolean; r5: boolean; r6: boolean }
}

function deriveOverallRating(breakdown: Record<string, { value: number; source: 'H' | 'I' }> | null | undefined): number | null {
  if (!breakdown) return null
  const values = Object.values(breakdown).map(v => v.value)
  if (!values.length) return null
  const avg = values.reduce((s, v) => s + v, 0) / values.length
  return Math.round(avg * 10) / 10
}

function buildProfile(
  slug: string,
  r1: R1Profile | undefined,
  r2: R2Profile | undefined,
  r3: R3Feature[] | undefined,
  r4: R4Profile | undefined,
  r5: R5Profile | undefined,
  r6: R6Profile | undefined,
): FullProfile {
  // Status decision
  let status: 'draft' | 'published' | 'archived' = 'published'
  if (r6?.archive) status = 'archived'
  // Special carve-outs (per memory project_phase-0-etap-d-plan):
  //   - Judge.me: published, no affiliate (owner decision)
  //   - Shopify Sidekick: published, direct→Shopify (Blueprint §7)

  const profile: FullProfile = {
    slug,
    status,
    _coverage: {
      r1: !!r1,
      r2: !!r2,
      r3: !!r3?.length,
      r4: !!r4,
      r5: !!r5,
      r6: !!r6,
    },
  }

  if (r1) {
    profile.tagline = r1.tagline
    profile.description = r1.description
    profile.best_for = r1.best_for
    profile.not_for = r1.not_for
    profile.category = r1.category
    profile.subcategories = r1.subcategories
  }

  if (r2) {
    profile.pricing_model = r2.pricing_model
    profile.pricing_min = r2.pricing_min
    profile.pricing_max = r2.pricing_max
    profile.pricing_notes = r2.pricing_notes
    profile.pricing_source_url = r2.pricing_source_url
  }

  if (r3?.length) profile.features = r3

  if (r4) {
    profile.shopify_native_notes = r4.shopify_native_notes
    profile.integrates_with_tools = r4.integrates_with_tools
    profile.integrations = r4.integrations
  }

  if (r5) {
    profile.external_ratings = r5.external_ratings
    profile.rating_breakdown = r5.rating_breakdown
    profile.rating = deriveOverallRating(r5.rating_breakdown)
    profile.pros = r5.pros
    profile.cons = r5.cons
    profile.operator_quotes = r5.operator_quotes
  }

  if (r6) {
    profile.affiliate_commission = r6.affiliate_commission
    profile.affiliate_partner = r6.affiliate_partner
    profile.affiliate_program_url = r6.affiliate_program_url
    profile.affiliate_cookie_window = r6.affiliate_cookie_window
  }

  // Carve-outs
  if (slug === 'judge-me') {
    // Owner decision 2026-05-30: keep published, no affiliate
    profile.affiliate_commission = 'n/a (no affiliate program per founder, kept as catalog entry)'
    profile.affiliate_partner = null
    profile.affiliate_program_url = null
    profile.affiliate_cookie_window = null
  }
  if (slug === 'shopify-sidekick') {
    profile.affiliate_partner = 'direct'
    profile.affiliate_commission = 'Rolls into Shopify Affiliate & Partner Program'
    profile.affiliate_program_url = 'https://www.shopify.com/affiliates'
  }

  return profile
}

// ── Audit constants ─────────────────────────────────────────────────────────
const PLACEHOLDER_CATEGORIES_MIG_013: Record<string, string> = {
  'loop-returns': 'returns',
  'stay-ai': 'upsell',
  'triple-whale': 'attribution',
  rebuy: 'personalization',
  attentive: 'sms',
  loyaltylion: 'loyalty',
  aftership: 'returns',
  signifyd: 'fraud',
  'shopify-sidekick': 'product-content',
  pebblely: 'product-content',
  'adcreative-ai': 'ads',
  'flair-ai': 'product-content',
  'booth-ai': 'product-content',
  'inventory-planner': 'inventory',
  prediko: 'inventory',
  northbeam: 'attribution',
  'polar-analytics': 'attribution',
  cogsy: 'inventory',
  limespot: 'personalization',
  pencil: 'ads',
}

const EXPECTED_ARCHIVES = ['booth-ai', 'pebblely', 'prediko', 'cogsy']
const CARVE_OUT_NO_AFFILIATE = ['judge-me', 'shopify-sidekick']

function computeFlags(p: FullProfile): string[] {
  const flags: string[] = []
  const coverageCount = Object.values(p._coverage).filter(v => v).length

  if (p.status === 'published' && coverageCount < 6) {
    const missing = Object.entries(p._coverage)
      .filter(([_, v]) => !v)
      .map(([k]) => k)
      .join(',')
    flags.push(`INCOMPLETE(missing:${missing})`)
  }

  if (!p.category || p.category.trim() === '') flags.push('NO_CATEGORY')

  if (p.status === 'archived' && !EXPECTED_ARCHIVES.includes(p.slug)) {
    flags.push('UNEXPECTED_ARCHIVE')
  }

  if (
    p.status === 'published' &&
    !CARVE_OUT_NO_AFFILIATE.includes(p.slug) &&
    !p.affiliate_partner
  ) {
    flags.push('NO_AFFILIATE')
  }

  return flags
}

function categoryDisplay(p: FullProfile): string {
  const cat = p.category || '<NULL>'
  const placeholder = PLACEHOLDER_CATEGORIES_MIG_013[p.slug]
  if (placeholder && cat !== placeholder) {
    return `${cat} (was: ${placeholder})`
  }
  return cat
}

function printSummary(profiles: FullProfile[]) {
  console.log('\n' + '='.repeat(110))
  console.log(`SUMMARY (${profiles.length} tools)`)
  console.log('='.repeat(110))
  console.log(
    'slug'.padEnd(22) +
      'status'.padEnd(12) +
      'cov'.padEnd(6) +
      'category'.padEnd(42) +
      'flags',
  )
  console.log('-'.repeat(110))

  const sorted = [...profiles].sort((a, b) => a.slug.localeCompare(b.slug))
  for (const p of sorted) {
    const coverage = Object.values(p._coverage).filter(v => v).length
    const flags = computeFlags(p)
    const isArchiveExpected =
      p.status === 'archived' && EXPECTED_ARCHIVES.includes(p.slug)
    const flagDisplay = isArchiveExpected
      ? 'EXPECTED'
      : flags.length
        ? flags.join(' ')
        : ''
    console.log(
      p.slug.padEnd(22) +
        p.status.padEnd(12) +
        `${coverage}/6`.padEnd(6) +
        categoryDisplay(p).padEnd(42).slice(0, 42) +
        flagDisplay,
    )
  }
  console.log('-'.repeat(110))

  const actualArchives = profiles
    .filter(p => p.status === 'archived')
    .map(p => p.slug)
    .sort()
  const missingArchives = EXPECTED_ARCHIVES.filter(s => !actualArchives.includes(s))
  const unexpectedArchives = actualArchives.filter(s => !EXPECTED_ARCHIVES.includes(s))

  console.log('\nArchive audit:')
  console.log(`  expected: ${EXPECTED_ARCHIVES.join(', ')}`)
  console.log(`  actual:   ${actualArchives.length ? actualArchives.join(', ') : '<none>'}`)
  if (missingArchives.length) console.log(`  MISSING:    ${missingArchives.join(', ')}`)
  if (unexpectedArchives.length) console.log(`  UNEXPECTED: ${unexpectedArchives.join(', ')}`)

  const carveOuts = sorted.filter(p => CARVE_OUT_NO_AFFILIATE.includes(p.slug))
  console.log('\nCarve-out audit (Judge.me + Shopify Sidekick):')
  for (const p of carveOuts) {
    console.log(
      `  ${p.slug}: status=${p.status}, affiliate_partner=${p.affiliate_partner ?? '<null>'}, commission=${p.affiliate_commission?.slice(0, 80) ?? '<null>'}`,
    )
  }

  console.log('\nMigration-013 placeholder category audit (20 new drafts):')
  let matchCount = 0
  let differCount = 0
  const differences: string[] = []
  for (const [slug, placeholder] of Object.entries(PLACEHOLDER_CATEGORIES_MIG_013)) {
    const p = profiles.find(x => x.slug === slug)
    if (!p) continue
    if (p.category === placeholder) matchCount++
    else {
      differCount++
      differences.push(`${slug}: ${placeholder} → ${p.category}`)
    }
  }
  console.log(`  R1 confirmed placeholder: ${matchCount}/20`)
  console.log(`  R1 overrode placeholder:  ${differCount}/20`)
  if (differences.length) {
    console.log(`  Overrides:`)
    differences.forEach(d => console.log(`    ${d}`))
  }

  console.log('\nOverall:')
  const totalFlags = profiles.reduce((acc, p) => acc + computeFlags(p).length, 0)
  const greenFlags = profiles.filter(p => computeFlags(p).length === 0).length
  console.log(`  Tools with zero flags: ${greenFlags}/${profiles.length}`)
  console.log(`  Total flags raised:    ${totalFlags}`)
  if (
    missingArchives.length === 0 &&
    unexpectedArchives.length === 0 &&
    totalFlags === 0
  ) {
    console.log('\n  GREEN — safe to apply.\n')
  } else {
    console.log('\n  RED — flags raised, review before apply.\n')
  }
}

// ── Dry-run snapshot printer ────────────────────────────────────────────────
function printSnapshot(p: FullProfile) {
  const line = (label: string, val: any) => {
    if (val === undefined || val === null) {
      console.log(`  ${label.padEnd(28)}: <unset>`)
      return
    }
    if (typeof val === 'object') {
      console.log(`  ${label.padEnd(28)}: ${JSON.stringify(val, null, 2).replace(/\n/g, '\n    ')}`)
    } else {
      const s = String(val)
      const truncated = s.length > 200 ? s.slice(0, 200) + '...' : s
      console.log(`  ${label.padEnd(28)}: ${truncated}`)
    }
  }
  console.log('\n' + '='.repeat(78))
  console.log(`TOOL: ${p.slug}    status=${p.status}    coverage=${JSON.stringify(p._coverage)}`)
  console.log('='.repeat(78))
  console.log('\n── R1 Identity ──')
  line('tagline', p.tagline)
  line('description', p.description)
  line('best_for', p.best_for)
  line('not_for', p.not_for)
  line('category', p.category)
  line('subcategories', p.subcategories?.join(', '))
  console.log('\n── R2 Pricing ──')
  line('pricing_model', p.pricing_model)
  line('pricing_min', p.pricing_min)
  line('pricing_max', p.pricing_max)
  line('pricing_notes', p.pricing_notes)
  line('pricing_source_url', p.pricing_source_url)
  console.log('\n── R3 Features ──')
  console.log(`  features[${p.features?.length ?? 0}]:`)
  p.features?.slice(0, 5).forEach((f, i) => {
    console.log(`    [${i}] ${f.name} (is_ai=${f.is_ai}${f.ai_kind ? ', ' + f.ai_kind : ''})`)
    console.log(`        plan: ${f.plan_availability.slice(0, 80)}`)
  })
  if ((p.features?.length ?? 0) > 5) console.log(`    ... ${(p.features!.length - 5)} more`)
  console.log('\n── R4 Integrations ──')
  line('shopify_native_notes', p.shopify_native_notes)
  line('integrates_with_tools', p.integrates_with_tools?.join(', ') || '<empty>')
  line('integrations (external)', p.integrations?.join(', ') || '<empty>')
  console.log('\n── R5 Reviews & Ratings ──')
  line('rating (derived avg)', p.rating)
  line('rating_breakdown', p.rating_breakdown)
  line('external_ratings', p.external_ratings)
  line('pros', p.pros?.join(' | '))
  line('cons', p.cons?.join(' | '))
  console.log(`  operator_quotes[${p.operator_quotes?.length ?? 0}]:`)
  p.operator_quotes?.slice(0, 2).forEach((q, i) => {
    console.log(`    [${i}] "${q.quote.slice(0, 100)}..."`)
    console.log(`        source: ${q.source}, date: ${q.date}`)
  })
  console.log('\n── R6 Monetization ──')
  line('affiliate_commission', p.affiliate_commission)
  line('affiliate_partner', p.affiliate_partner)
  line('affiliate_program_url', p.affiliate_program_url)
  line('affiliate_cookie_window', p.affiliate_cookie_window)
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry') || !args.includes('--apply')
  const toolsArg = args.find(a => a.startsWith('--tools='))
  const filterSlugs = toolsArg?.split('=')[1].split(',').map(s => s.trim()) ?? null

  console.log(`\nPhase 0 — Etap D parser`)
  console.log(`  mode: ${dryRun ? 'DRY RUN' : 'APPLY (writes to DB)'}`)
  console.log(`  filter: ${filterSlugs ? filterSlugs.join(', ') : 'all 34'}`)
  console.log('-'.repeat(78))

  const r1 = parseR1(resolve(RESEARCH_DIR, '2026-05-30-research-1-identity.md'))
  const r2 = parseR2(resolve(RESEARCH_DIR, '2026-05-30-research-02.md'))
  const r3 = parseR3(resolve(RESEARCH_DIR, '2026-05-30-research-03.md'))
  const r4 = parseR4(resolve(RESEARCH_DIR, '2026-05-30-research-04.md'))
  const r5 = parseR5(resolve(RESEARCH_DIR, '2026-05-30-research-05.md'))
  const r6 = parseR6(resolve(RESEARCH_DIR, '2026-05-30-research-06.md'))

  console.log(`Parsed sizes: R1=${r1.size}, R2=${r2.size}, R3=${r3.size}, R4=${r4.size}, R5=${r5.size}, R6=${r6.size}`)

  // Build union of all slugs across all 6 research files
  const allSlugs = new Set<string>()
  for (const m of [r1, r2, r3, r4, r5, r6]) for (const k of m.keys()) allSlugs.add(k)
  console.log(`Union slug count: ${allSlugs.size}`)

  // Build profiles
  const profiles: FullProfile[] = []
  for (const slug of allSlugs) {
    if (filterSlugs && !filterSlugs.includes(slug)) continue
    const p = buildProfile(slug, r1.get(slug), r2.get(slug), r3.get(slug), r4.get(slug), r5.get(slug), r6.get(slug))
    profiles.push(p)
  }

  const summaryMode = args.includes('--summary')

  if (dryRun && summaryMode) {
    printSummary(profiles)
    return
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Snapshots for ${profiles.length} tool(s):`)
    profiles.forEach(printSnapshot)
    console.log('\n' + '='.repeat(78))
    console.log('Coverage summary:')
    const coverage = profiles.reduce((acc, p) => {
      Object.entries(p._coverage).forEach(([k, v]) => {
        acc[k] = (acc[k] ?? 0) + (v ? 1 : 0)
      })
      return acc
    }, {} as Record<string, number>)
    Object.entries(coverage).forEach(([k, v]) => {
      console.log(`  ${k}: ${v}/${profiles.length}`)
    })
    const archives = profiles.filter(p => p.status === 'archived').map(p => p.slug)
    console.log(`\nArchived in this run: ${archives.length ? archives.join(', ') : '<none>'}`)
    console.log('\n[DRY RUN] No DB writes. Use --apply to write.\n')
    return
  }

  // APPLY mode — sequential per-tool UPDATEs. Idempotent: re-running rewrites
  // same data. Each row independent — partial failure does not corrupt others.
  console.log(`\n[APPLY] Writing to public.tools for ${profiles.length} tool(s)...`)
  console.log('-'.repeat(78))
  let ok = 0
  let fail = 0
  const sorted = [...profiles].sort((a, b) => a.slug.localeCompare(b.slug))
  for (const p of sorted) {
    const u = buildUpdates(p)
    const { error, data } = await sb
      .from('tools')
      .update(u)
      .eq('slug', p.slug)
      .select('slug, status')
    if (error) {
      console.error(`  ✗ ${p.slug}: ${error.message}`)
      fail++
    } else if (!data || data.length === 0) {
      console.error(`  ✗ ${p.slug}: no row matched (slug not in DB?)`)
      fail++
    } else {
      console.log(`  ✓ ${p.slug.padEnd(22)} status=${data[0].status}`)
      ok++
    }
  }
  console.log('-'.repeat(78))
  console.log(`\nDone. ${ok} updated, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

function buildUpdates(p: FullProfile): Record<string, unknown> {
  const u: Record<string, unknown> = { status: p.status }

  const set = <K extends keyof FullProfile>(k: K) => {
    if (p[k] !== undefined) u[k as string] = p[k] as unknown
  }
  // R1
  set('tagline')
  set('description')
  set('best_for')
  set('not_for')
  set('category')
  set('subcategories')
  // R2
  set('pricing_model')
  set('pricing_min')
  set('pricing_max')
  set('pricing_notes')
  set('pricing_source_url')
  // R3
  set('features')
  // R4
  set('shopify_native_notes')
  set('integrates_with_tools')
  set('integrations')
  // R5
  set('external_ratings')
  set('rating_breakdown')
  set('rating')
  set('pros')
  set('cons')
  set('operator_quotes')
  // R6
  set('affiliate_commission')
  set('affiliate_partner')
  set('affiliate_program_url')
  set('affiliate_cookie_window')

  return u
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
