#!/usr/bin/env node
/* ----------------------------------------------------------------------------
   sync-ratings — keep tools.rating in lockstep with MDX frontmatter
   ----------------------------------------------------------------------------
   Walks content/reviews/en/*.mdx, reads each frontmatter (toolSlug +
   rating), and compares to the matching row in public.tools. By default
   we *report* mismatches and exit non-zero; pass --apply to actually
   write the MDX values back into the DB.

   Two ways to use it:

     npm run sync:ratings           # dry run; exits 1 on any drift
     npm run sync:ratings:apply     # writes MDX → DB for any drift

   Reads from .env.local via Node 20+'s `--env-file` (see package.json).
   Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; the
   service-role key is needed because RLS would otherwise block the
   UPDATE. The known-bad-env case (vercel env pull returning empty
   strings on this account — see HANDOFF.md) surfaces as a clear "no key"
   error rather than a silent no-op.
---------------------------------------------------------------------------- */

import fs from "node:fs/promises"
import path from "node:path"

import matter from "gray-matter"
import { createClient } from "@supabase/supabase-js"

const REVIEWS_DIR = path.join(process.cwd(), "content", "reviews", "en")

interface MdxRecord {
  file:      string
  toolSlug:  string
  rating:    number
}

interface Mismatch {
  toolSlug: string
  mdx:      number
  db:       number | null
  file:     string
}

async function loadMdxRatings(): Promise<MdxRecord[]> {
  const files = await fs.readdir(REVIEWS_DIR).catch(() => [] as string[])
  const records: MdxRecord[] = []
  for (const file of files) {
    if (!file.endsWith(".mdx")) continue
    const full = path.join(REVIEWS_DIR, file)
    const src = await fs.readFile(full, "utf-8")
    const { data } = matter(src)
    const toolSlug = typeof data.toolSlug === "string" ? data.toolSlug : null
    const rating   = typeof data.rating   === "number" ? data.rating   : null
    if (!toolSlug) {
      console.warn(`[sync] SKIP ${file}: no \`toolSlug\` in frontmatter`)
      continue
    }
    if (rating == null) {
      console.warn(`[sync] SKIP ${file}: no \`rating\` in frontmatter`)
      continue
    }
    records.push({ file, toolSlug, rating })
  }
  return records
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[sync] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Inline them (OPENROUTER-style) or fix .env.local; vercel env pull " +
        "returns empty strings on this account — see HANDOFF.md.",
    )
    process.exit(2)
  }

  const apply = process.argv.includes("--apply")
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const records = await loadMdxRatings()
  if (records.length === 0) {
    console.log("[sync] no reviews with both toolSlug + rating — nothing to do.")
    process.exit(0)
  }

  const mismatches: Mismatch[] = []
  let inSync = 0
  let updated = 0
  let missing = 0

  for (const r of records) {
    const { data: tool, error } = await supabase
      .from("tools")
      .select("slug, rating")
      .eq("slug", r.toolSlug)
      .maybeSingle()

    if (error) {
      console.error(`[sync] DB read failed for ${r.toolSlug}:`, error.message)
      continue
    }
    if (!tool) {
      console.warn(`[sync] ${r.toolSlug}: no matching row in public.tools — skipping`)
      missing++
      continue
    }

    if (tool.rating != null && Math.abs(tool.rating - r.rating) < 0.001) {
      inSync++
      continue
    }

    mismatches.push({ toolSlug: r.toolSlug, mdx: r.rating, db: tool.rating, file: r.file })

    if (apply) {
      const { error: upErr } = await supabase
        .from("tools")
        .update({ rating: r.rating, updated_at: new Date().toISOString() })
        .eq("slug", r.toolSlug)
      if (upErr) {
        console.error(`[sync] UPDATE failed for ${r.toolSlug}:`, upErr.message)
      } else {
        console.log(`[sync] UPDATED ${r.toolSlug}: ${tool.rating ?? "NULL"} → ${r.rating}`)
        updated++
      }
    }
  }

  console.log("")
  console.log(`[sync] checked   : ${records.length}`)
  console.log(`[sync] in sync   : ${inSync}`)
  console.log(`[sync] missing DB: ${missing}`)
  console.log(`[sync] mismatched: ${mismatches.length}`)
  if (apply) console.log(`[sync] updated   : ${updated}`)

  if (mismatches.length === 0) {
    console.log("\n✓ All MDX ratings match public.tools.rating.")
    process.exit(0)
  }

  console.log("\nMismatches:")
  for (const m of mismatches) {
    console.log(`  ${m.toolSlug.padEnd(14)} MDX=${m.mdx}  DB=${m.db ?? "NULL"}  (${m.file})`)
  }

  if (!apply) {
    console.log("\nRun `npm run sync:ratings:apply` to write MDX → DB, or fix the MDX frontmatter to match.")
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error("[sync] fatal:", err)
  process.exit(1)
})
