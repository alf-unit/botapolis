/**
 * pricing-bulk-db-sync.ts
 * ----------------------------------------------------------------------------
 * Per Resources/CONTENT-WRITING.md rule: when realtime web finds fresh official data
 * that differs from the base, update existing fields in tools row. No new
 * fields, no migrations.
 *
 * Wave-1 sync — accumulates per-tool deltas as articles are shipped.
 *
 * Run:
 *   npx tsx scripts/pricing-bulk-db-sync.ts          # dry-run
 *   npx tsx scripts/pricing-bulk-db-sync.ts --apply  # write
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const APPLY = process.argv.includes("--apply")

interface Update {
  slug: string
  delta: Record<string, unknown>
  reason: string
}

// Accumulate per-tool deltas here as articles are written and vendor pages
// verified against the Research 02 baseline.
const UPDATES: Update[] = [
  {
    slug: "postscript",
    delta: {
      pricing_min: 49,
      pricing_notes:
        "Tiers: Starter $0/mo + $49 minimum spend; Growth $100/mo; Professional $500/mo (most popular); Enterprise custom\r\n\r\n" +
        "SMS rates (descending by tier): Starter $0.015 → $0.009/msg, Growth $0.01 → $0.008/msg, Professional $0.007/msg; MMS Starter $0.045, Growth $0.03, Professional $0.024 + carrier fees.\r\n\r\n" +
        "Pricing gotchas: Shifted from pure usage-based to monthly platform fee + per-message in 2025-2026; Starter minimum raised from $25 to $49; free trial credit reduced from $1,000 to $100. Carrier fees passed through (US SMS avg $0.0040, MMS $0.0083). DSC $750/mo carrier passthrough.\r\n\r\n" +
        "Free plan: No—30-day trial with $100 usage credit\r\n\r\n" +
        "Verified 2026-06-03 against postscript.io/pricing",
    },
    reason:
      "postscript.io/pricing live verification 2026-06-03: Starter min spend 25→49, trial credit $1,000→$100",
  },
]

async function main() {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`)
  for (const u of UPDATES) {
    const { data: before, error: rdErr } = await sb
      .from("tools")
      .select("slug, pricing_min, pricing_notes")
      .eq("slug", u.slug)
      .maybeSingle()
    if (rdErr || !before) {
      console.error(`[${u.slug}] read failed:`, rdErr?.message ?? "no row")
      continue
    }
    console.log(`── ${u.slug} ──`)
    console.log(`  reason : ${u.reason}`)
    for (const [k, v] of Object.entries(u.delta)) {
      const cur = (before as Record<string, unknown>)[k]
      console.log(`  ${k.padEnd(18)} : ${JSON.stringify(cur)?.slice(0, 80)} → ${JSON.stringify(v)?.slice(0, 80)}`)
    }
    if (APPLY) {
      const { error: updErr } = await sb
        .from("tools")
        .update({ ...u.delta, updated_at: new Date().toISOString() })
        .eq("slug", u.slug)
      if (updErr) console.error(`  APPLY failed: ${updErr.message}`)
      else console.log(`  APPLY ok`)
    }
    console.log()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
