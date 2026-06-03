/**
 * pricing-bulk-status-flip.ts
 * ----------------------------------------------------------------------------
 * Wave-1 keyword status flip: postscript (queued → published) +
 * 10 second_wave keywords mapped to the new /pricing/ pages we just shipped.
 *
 * Belt-and-suspenders with the post-commit webhook (which also flips status
 * based on primaryKeyword match). Run after push; idempotent — re-runs
 * skip rows already published.
 *
 * Run:
 *   npx tsx scripts/pricing-bulk-status-flip.ts          # dry-run
 *   npx tsx scripts/pricing-bulk-status-flip.ts --apply  # write
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

// Each wave-1 primary keyword → new /pricing/{slug} page on disk.
const FLIPS: Array<{ keyword: string; slug: string }> = [
  { keyword: "manychat pricing", slug: "manychat" },
  { keyword: "omnisend pricing", slug: "omnisend" },
  { keyword: "yotpo pricing", slug: "yotpo" },
  { keyword: "postscript pricing", slug: "postscript" },
  { keyword: "tidio pricing", slug: "tidio" },
  { keyword: "inventory planner pricing", slug: "inventory-planner" },
  { keyword: "triple whale pricing", slug: "triple-whale" },
  { keyword: "signifyd pricing", slug: "signifyd" },
  { keyword: "aftership pricing", slug: "aftership" },
  { keyword: "rebuy pricing", slug: "rebuy" },
  { keyword: "northbeam pricing", slug: "northbeam" },
]

async function main() {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`)
  const nowIso = new Date().toISOString()
  for (const f of FLIPS) {
    const { data: row, error: rdErr } = await sb
      .from("semantic_core_entries")
      .select("id, keyword, status, published_at, published_article_path")
      .ilike("keyword", f.keyword)
      .maybeSingle()
    if (rdErr || !row) {
      console.log(`  ${f.keyword.padEnd(34)} : MISSING`)
      continue
    }
    if (row.status === "published") {
      console.log(`  ${f.keyword.padEnd(34)} : already published — skip`)
      continue
    }
    const newPath = `/pricing/${f.slug}`
    console.log(
      `  ${f.keyword.padEnd(34)} : ${row.status} → published, path=${newPath}`,
    )
    if (APPLY) {
      const { error: updErr } = await sb
        .from("semantic_core_entries")
        .update({
          status: "published",
          published_at: nowIso,
          published_article_path: newPath,
          status_changed_at: nowIso,
        })
        .eq("id", row.id)
      if (updErr) console.log(`    APPLY failed: ${updErr.message}`)
      else console.log(`    APPLY ok`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
