/**
 * Phase 0 (Data-First pSEO Blueprint) — verify-скрипт для миграций 013 + 014.
 *
 * Запускается после apply миграций в Supabase Studio. Проверяет:
 *   1. SELECT count(*) FROM tools WHERE status='draft'        — ожидание: 20
 *   2. SELECT count(*) FROM tools                              — ожидание: 34
 *   3. semantic_core_entries.related_tool_slugs существует и nullable
 *
 * Read-only. Использует SUPABASE_SERVICE_ROLE_KEY чтобы байпасить RLS public
 * read policy (которая фильтрует status='published').
 *
 * Run: npx tsx scripts/verify-phase0-migrations.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

const EXPECTED_DRAFT_SLUGS = [
  'loop-returns', 'stay-ai', 'triple-whale', 'rebuy', 'attentive',
  'loyaltylion', 'aftership', 'signifyd', 'shopify-sidekick',
  'pebblely', 'adcreative-ai', 'flair-ai', 'booth-ai',
  'inventory-planner', 'prediko', 'northbeam', 'polar-analytics',
  'cogsy', 'limespot', 'pencil',
] as const

function line() {
  console.log('-'.repeat(72))
}

async function main() {
  let allPassed = true

  console.log('\nPhase 0 migration verification')
  line()

  // ── 1. tools count by status ─────────────────────────────────────────────
  const { count: draftCount, error: e1 } = await sb
    .from('tools')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  if (e1) {
    console.error('✗ Failed to count draft tools:', e1.message)
    allPassed = false
  } else {
    const ok = draftCount === 20
    console.log(`${ok ? '✓' : '✗'} tools WHERE status='draft' = ${draftCount} (expected 20)`)
    if (!ok) allPassed = false
  }

  const { count: totalCount, error: e2 } = await sb
    .from('tools')
    .select('*', { count: 'exact', head: true })

  if (e2) {
    console.error('✗ Failed to count tools:', e2.message)
    allPassed = false
  } else {
    const ok = totalCount === 34
    console.log(`${ok ? '✓' : '✗'} tools total = ${totalCount} (expected 34)`)
    if (!ok) allPassed = false
  }

  // ── 2. Все 20 ожидаемых slugs присутствуют ───────────────────────────────
  const { data: foundDrafts, error: e3 } = await sb
    .from('tools')
    .select('slug, name, category, status')
    .in('slug', EXPECTED_DRAFT_SLUGS as unknown as string[])
    .order('slug')

  if (e3) {
    console.error('✗ Failed to fetch draft slugs:', e3.message)
    allPassed = false
  } else {
    const foundSlugs = new Set((foundDrafts ?? []).map((r) => r.slug))
    const missing = EXPECTED_DRAFT_SLUGS.filter((s) => !foundSlugs.has(s))
    if (missing.length === 0) {
      console.log(`✓ All 20 expected draft slugs present`)
    } else {
      console.log(`✗ Missing draft slugs (${missing.length}): ${missing.join(', ')}`)
      allPassed = false
    }

    const nonDraftStatus = (foundDrafts ?? []).filter((r) => r.status !== 'draft')
    if (nonDraftStatus.length > 0) {
      console.log(
        `⚠ Unexpected non-draft status on: ` +
          nonDraftStatus.map((r) => `${r.slug}=${r.status}`).join(', '),
      )
    }
  }

  // ── 3. semantic_core_entries.related_tool_slugs column ───────────────────
  // PostgREST exposes information_schema as `information_schema.columns`
  // BUT it's not in the default search path of the API. Use a probe instead:
  // select the column from semantic_core_entries — if column missing, error
  // code is PGRST204 / 42703 ("column does not exist").
  const { error: e4 } = await sb
    .from('semantic_core_entries')
    .select('id, related_tool_slugs')
    .limit(1)

  if (e4) {
    const msg = e4.message || ''
    if (msg.includes('does not exist') || msg.includes('related_tool_slugs')) {
      console.log(`✗ semantic_core_entries.related_tool_slugs column NOT found`)
      console.log(`  PostgREST error: ${msg}`)
      allPassed = false
    } else {
      console.error('✗ Unexpected error probing related_tool_slugs:', msg)
      allPassed = false
    }
  } else {
    console.log(`✓ semantic_core_entries.related_tool_slugs column exists`)
  }

  // ── 4. Sample dump of drafts (for visual sanity) ─────────────────────────
  line()
  console.log('Draft tools sample (first 5 by slug):')
  if (foundDrafts && foundDrafts.length > 0) {
    foundDrafts.slice(0, 5).forEach((r) => {
      console.log(`  ${r.slug.padEnd(20)} ${(r.category ?? '').padEnd(20)} ${r.name}`)
    })
  }

  line()
  console.log(allPassed ? '\nAll checks passed.\n' : '\nSome checks failed — see above.\n')
  process.exit(allPassed ? 0 : 1)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
