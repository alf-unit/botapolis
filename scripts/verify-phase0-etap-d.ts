/**
 * Phase 0 Etap D — post-apply verification. Probes public.tools for:
 *   - status distribution (30 published + 4 archived = 34)
 *   - new column population rates
 *   - spot-checks on 6 owner-specified tools
 *   - archive set = {booth-ai, pebblely, prediko, cogsy}
 *   - carve-out integrity (Judge.me no affiliate, Sidekick → Shopify)
 *
 * Read-only.
 *
 * Run: npx tsx scripts/verify-phase0-etap-d.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const SPOT_CHECK_SLUGS = [
  'klaviyo',
  'judge-me',
  'booth-ai',
  'recharge',
  'shopify-sidekick',
  'stay-ai',
]

function line(label: string, val: unknown) {
  const s = val === null || val === undefined
    ? '<null>'
    : Array.isArray(val)
      ? `[${val.length}] ${val.slice(0, 3).join(', ')}${val.length > 3 ? '...' : ''}`
      : typeof val === 'object'
        ? JSON.stringify(val).slice(0, 100) + (JSON.stringify(val).length > 100 ? '...' : '')
        : String(val).slice(0, 100) + (String(val).length > 100 ? '...' : '')
  console.log(`    ${label.padEnd(28)}: ${s}`)
}

async function main() {
  console.log('\nPhase 0 Etap D — post-apply verify')
  console.log('='.repeat(78))

  // ── Status distribution ────────────────────────────────────────────────
  const { data: all } = await sb.from('tools').select('slug, status').order('slug')
  if (!all) {
    console.error('Failed to fetch tools')
    process.exit(1)
  }
  const byStatus = all.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  console.log('\nStatus distribution:')
  for (const [s, n] of Object.entries(byStatus)) {
    console.log(`  ${s.padEnd(12)}: ${n}`)
  }
  console.log(`  TOTAL: ${all.length} (expected 34)`)

  // ── Archive set ─────────────────────────────────────────────────────────
  const expectedArchives = ['booth-ai', 'pebblely', 'prediko', 'cogsy']
  const actualArchives = all.filter(t => t.status === 'archived').map(t => t.slug).sort()
  console.log(`\nArchive set:`)
  console.log(`  expected: ${expectedArchives.join(', ')}`)
  console.log(`  actual:   ${actualArchives.join(', ')}`)
  const archiveMatch = JSON.stringify(actualArchives) === JSON.stringify(expectedArchives.sort())
  console.log(`  ${archiveMatch ? '✓' : '✗'} match`)

  // ── Column population rates ─────────────────────────────────────────────
  const { data: pop } = await sb
    .from('tools')
    .select(
      'slug, tagline, description, category, pricing_model, pricing_source_url, features, integrates_with_tools, shopify_native_notes, external_ratings, rating_breakdown, operator_quotes, affiliate_commission, affiliate_partner, affiliate_program_url',
    )

  if (!pop) {
    console.error('Failed to fetch pop data')
    process.exit(1)
  }

  const total = pop.length
  const populated = (key: keyof (typeof pop)[0]) =>
    pop.filter(t => {
      const v = t[key]
      if (v === null || v === undefined) return false
      if (Array.isArray(v) && v.length === 0) return false
      if (typeof v === 'object' && Object.keys(v as object).length === 0) return false
      return true
    }).length

  console.log(`\nColumn population (out of ${total}):`)
  const fields: (keyof (typeof pop)[0])[] = [
    'tagline',
    'description',
    'category',
    'pricing_model',
    'pricing_source_url',
    'features',
    'integrates_with_tools',
    'shopify_native_notes',
    'external_ratings',
    'rating_breakdown',
    'operator_quotes',
    'affiliate_commission',
    'affiliate_partner',
    'affiliate_program_url',
  ]
  for (const f of fields) {
    const n = populated(f)
    const flag = n < total - 4 ? ' ⚠ low' : '' // archives + judge-me/sidekick may have null affiliate
    console.log(`  ${(f as string).padEnd(28)}: ${n}/${total}${flag}`)
  }

  // ── Spot checks ─────────────────────────────────────────────────────────
  console.log('\nSpot checks (6 owner-specified tools):')
  for (const slug of SPOT_CHECK_SLUGS) {
    const { data: t } = await sb
      .from('tools')
      .select(
        'slug, status, tagline, category, pricing_model, affiliate_partner, affiliate_commission, rating, features, integrates_with_tools, external_ratings, rating_breakdown',
      )
      .eq('slug', slug)
      .single()
    if (!t) {
      console.log(`\n  ${slug}: NOT FOUND in DB`)
      continue
    }
    console.log(`\n  ── ${t.slug} (status=${t.status}) ──`)
    line('tagline', t.tagline)
    line('category', t.category)
    line('pricing_model', t.pricing_model)
    line('rating (derived)', t.rating)
    line('rating_breakdown', t.rating_breakdown)
    line('external_ratings', t.external_ratings)
    line('affiliate_partner', t.affiliate_partner)
    line('affiliate_commission', t.affiliate_commission)
    line('features[N]', (t.features as unknown[])?.length ?? 0)
    line('integrates_with_tools', t.integrates_with_tools)
  }

  // ── Carve-outs ─────────────────────────────────────────────────────────
  console.log('\nCarve-out integrity:')
  const { data: judge } = await sb
    .from('tools')
    .select('slug, status, affiliate_partner, affiliate_url, affiliate_commission')
    .eq('slug', 'judge-me')
    .single()
  if (judge) {
    const ok = judge.status === 'published' && judge.affiliate_partner === null
    console.log(`  judge-me: status=${judge.status}, affiliate_partner=${judge.affiliate_partner} ${ok ? '✓' : '✗'}`)
    console.log(`    affiliate_url retained: ${judge.affiliate_url ?? '<null>'}`)
    console.log(`    commission: ${judge.affiliate_commission ?? '<null>'}`)
  }
  const { data: sidekick } = await sb
    .from('tools')
    .select('slug, status, affiliate_partner, affiliate_program_url')
    .eq('slug', 'shopify-sidekick')
    .single()
  if (sidekick) {
    const ok =
      sidekick.status === 'published' &&
      sidekick.affiliate_partner === 'direct' &&
      sidekick.affiliate_program_url === 'https://www.shopify.com/affiliates'
    console.log(
      `  shopify-sidekick: status=${sidekick.status}, partner=${sidekick.affiliate_partner}, prog_url=${sidekick.affiliate_program_url} ${ok ? '✓' : '✗'}`,
    )
  }

  console.log('\n' + '='.repeat(78) + '\n')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
