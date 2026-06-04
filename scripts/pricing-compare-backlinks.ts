/**
 * scripts/pricing-compare-backlinks.ts
 * ----------------------------------------------------------------------------
 * Etap J-generate · /compare/ → /pricing/ programmatic backlink loader.
 *
 * For every tool slug in the BACKLINKS config below, walks all live
 * public.comparisons rows where this tool appears on either side
 * (tool_a_id OR tool_b_id), and appends a single satellite→money-page
 * link sentence to the EN and RU `verdict` fields — idempotent.
 *
 * Why this exists:
 *   /compare/[slug] is DB-driven (reads public.comparisons, not MDX).
 *   Editing the MDX (which feels natural) does NOT propagate to the live
 *   render — webhook bridge intentionally never overwrites existing rows.
 *   See [[comparison-page-db-driven]] in memory.
 *
 *   For the klaviyo control we applied this manually via scripts/fix-
 *   klaviyo-pricing-path.sql Block B. For the Etap J-generate bulk-50
 *   rollout we need this programmatic — every new /pricing/{tool} page
 *   needs every /compare/ row touching that tool backfilled in lockstep.
 *
 * Safety:
 *   - Dry-run by default. Pass --apply to write.
 *   - Idempotent: `position('/pricing/{slug}' in COALESCE(verdict,'')) = 0`
 *     guard so re-runs don't double-add.
 *   - EN + RU sentences are different — RU uses the /ru/pricing/{slug} URL
 *     so the link stays on the active locale, matching the comparison row's
 *     own language column.
 *   - Skips comparisons where the tool resolves to no DB row (defensive).
 *
 * Usage:
 *   npx tsx scripts/pricing-compare-backlinks.ts          # dry-run
 *   npx tsx scripts/pricing-compare-backlinks.ts --apply  # write
 *
 * Extending to bulk-50: add tool entries to BACKLINKS. Each tool needs its
 * tool name (used inside the EN/RU sentence) and the slug (used in URLs +
 * the position() idempotency guard).
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

// ============================================================================
// Config — every tool slug that has a /pricing/{slug} page that needs its
// /compare/ rows backfilled. Sample wave: mailchimp + attentive only.
// Extend to the full bulk-50 list when the rollout fans out.
// ============================================================================
interface BacklinkConfig {
  slug: string
  name: string
  /** Body for the appended sentence (EN). Surrounding format added by the loader. */
  enSentence: string
  /** Body for the appended sentence (RU). */
  ruSentence: string
}

const BACKLINKS: BacklinkConfig[] = [
  {
    slug: "mailchimp",
    name: "Mailchimp",
    enSentence:
      "For the full Mailchimp pricing breakdown (unsubscribed-bloat tax + April 13 hike), see /pricing/mailchimp.",
    ruSentence:
      "Полный разбор цен Mailchimp (налог на неотписавшихся + апрельское повышение) — /ru/pricing/mailchimp.",
  },
  {
    slug: "attentive",
    name: "Attentive",
    enSentence:
      "For the full Attentive pricing breakdown ($2-3K quarterly minimum, contract structure), see /pricing/attentive.",
    ruSentence:
      "Полный разбор цен Attentive ($2-3K минимум в квартал, структура контракта) — /ru/pricing/attentive.",
  },
  {
    slug: "manychat",
    name: "ManyChat",
    enSentence:
      "For the full ManyChat pricing breakdown (March 2 2026 free-tier cut + AI add-on math), see /pricing/manychat.",
    ruSentence:
      "Полный разбор цен ManyChat (срез Free-тарифа 2 марта 2026 + математика AI-аддона) — /ru/pricing/manychat.",
  },
  {
    slug: "omnisend",
    name: "Omnisend",
    enSentence:
      "For the full Omnisend pricing breakdown (billable-contacts denominator + MCP on Free), see /pricing/omnisend.",
    ruSentence:
      "Полный разбор цен Omnisend (биллинг по всем contacts + MCP на Free) — /ru/pricing/omnisend.",
  },
  {
    slug: "yotpo",
    name: "Yotpo",
    enSentence:
      "For the full Yotpo pricing breakdown (post-sunset Reviews + Loyalty only, $278 bundle floor), see /pricing/yotpo.",
    ruSentence:
      "Полный разбор цен Yotpo (после sunset только Reviews + Loyalty, $278 минимум за bundle) — /ru/pricing/yotpo.",
  },
  {
    slug: "postscript",
    name: "Postscript",
    enSentence:
      "For the full Postscript pricing breakdown ($49 Starter minimum + platform-fee shift), see /pricing/postscript.",
    ruSentence:
      "Полный разбор цен Postscript ($49 минимум на Starter + переход на platform fee) — /ru/pricing/postscript.",
  },
  {
    slug: "tidio",
    name: "Tidio",
    enSentence:
      "For the full Tidio pricing breakdown (Growth→Plus 12x cliff + three-quota meter), see /pricing/tidio.",
    ruSentence:
      "Полный разбор цен Tidio (12x скачок Growth→Plus + три параллельных квоты) — /ru/pricing/tidio.",
  },
  {
    slug: "inventory-planner",
    name: "Inventory Planner",
    enSentence:
      "For the full Inventory Planner pricing breakdown (post-Sage 3x renewal increases + sync risk), see /pricing/inventory-planner.",
    ruSentence:
      "Полный разбор цен Inventory Planner (3x повышения после Sage + риски синхронизации) — /ru/pricing/inventory-planner.",
  },
  {
    slug: "triple-whale",
    name: "Triple Whale",
    enSentence:
      "For the full Triple Whale pricing breakdown (Free tier usable + GMV-scaled paid tiers), see /pricing/triple-whale.",
    ruSentence:
      "Полный разбор цен Triple Whale (Free тариф рабочий + платные масштабируются по GMV) — /ru/pricing/triple-whale.",
  },
  {
    slug: "signifyd",
    name: "Signifyd",
    enSentence:
      "For the full Signifyd pricing breakdown (% of approved-orders model + chargeback math), see /pricing/signifyd.",
    ruSentence:
      "Полный разбор цен Signifyd (% от одобренных заказов + математика chargeback'ов) — /ru/pricing/signifyd.",
  },
  {
    slug: "aftership",
    name: "AfterShip",
    enSentence:
      "For the full AfterShip pricing breakdown ($11→$119 Tracking cliff + Tracking/Returns split), see /pricing/aftership.",
    ruSentence:
      "Полный разбор цен AfterShip (скачок $11→$119 + раздельные Tracking и Returns) — /ru/pricing/aftership.",
  },
  {
    slug: "rebuy",
    name: "Rebuy",
    enSentence:
      "For the full Rebuy pricing breakdown (package-based math + RGR scaling above $40K), see /pricing/rebuy.",
    ruSentence:
      "Полный разбор цен Rebuy (модульная цена + RGR-масштабирование выше $40K) — /ru/pricing/rebuy.",
  },
  {
    slug: "northbeam",
    name: "Northbeam",
    enSentence:
      "For the full Northbeam pricing breakdown ($1,500/mo Starter floor + MMM+ enterprise math), see /pricing/northbeam.",
    ruSentence:
      "Полный разбор цен Northbeam ($1,500/мес минимум + математика MMM+ для enterprise) — /ru/pricing/northbeam.",
  },
  {
    slug: "gorgias",
    name: "Gorgias",
    enSentence:
      "For the full Gorgias pricing breakdown (ticket caps + AI Agent double-billing + cap-creep math), see /pricing/gorgias.",
    ruSentence:
      "Полный разбор цен Gorgias (кэп тикетов + double-billing AI Agent + математика кэп-крипа) — /ru/pricing/gorgias.",
  },
  {
    slug: "klaviyo",
    name: "Klaviyo",
    enSentence:
      "For the full Klaviyo pricing breakdown (active-profiles billing trap + Customer Agent $200/mo), see /pricing/klaviyo.",
    ruSentence:
      "Полный разбор цен Klaviyo (ловушка active profiles + Customer Agent $200/мес) — /ru/pricing/klaviyo.",
  },
  {
    slug: "recharge",
    name: "Recharge",
    enSentence:
      "For the full Recharge pricing breakdown (hidden $25 tier + 1.49% rate hike + Skio outlook), see /pricing/recharge.",
    ruSentence:
      "Полный разбор цен Recharge (скрытый $25 тариф + рост ставки до 1.49% + outlook после Skio) — /ru/pricing/recharge.",
  },
]

const APPLY = process.argv.includes("--apply")

interface BacklinkPlan {
  slug: string
  language: "en" | "ru"
  current_len: number
  action: "skip-already-linked" | "skip-no-verdict" | "append"
  appended_chars?: number
}

async function planForTool(cfg: BacklinkConfig): Promise<BacklinkPlan[]> {
  const { data: tool, error: toolErr } = await sb
    .from("tools")
    .select("id")
    .eq("slug", cfg.slug)
    .single()
  if (toolErr || !tool) {
    console.error(`[${cfg.slug}] tool row not found — skipping`)
    return []
  }

  const { data: rows, error: rowsErr } = await sb
    .from("comparisons")
    .select("slug, language, verdict")
    .eq("status", "published")
    .or(`tool_a_id.eq.${tool.id},tool_b_id.eq.${tool.id}`)
    .order("slug")
    .order("language")
  if (rowsErr || !rows) {
    console.error(`[${cfg.slug}] comparisons fetch failed:`, rowsErr?.message)
    return []
  }

  const plans: BacklinkPlan[] = []
  for (const r of rows) {
    const language = r.language as "en" | "ru"
    const verdict = r.verdict ?? ""
    // Idempotency guard: same string we'd check server-side with
    // `position('/pricing/{slug}' in verdict) = 0`.
    const linkProbe = language === "ru" ? `/ru/pricing/${cfg.slug}` : `/pricing/${cfg.slug}`
    if (verdict.includes(linkProbe)) {
      plans.push({
        slug: r.slug,
        language,
        current_len: verdict.length,
        action: "skip-already-linked",
      })
      continue
    }
    if (verdict.length === 0) {
      plans.push({
        slug: r.slug,
        language,
        current_len: 0,
        action: "skip-no-verdict",
      })
      continue
    }
    const appendStr = "\n\n" + (language === "ru" ? cfg.ruSentence : cfg.enSentence)
    plans.push({
      slug: r.slug,
      language,
      current_len: verdict.length,
      action: "append",
      appended_chars: appendStr.length,
    })
  }
  return plans
}

async function applyForTool(cfg: BacklinkConfig, plans: BacklinkPlan[]) {
  const linkProbeEn = `/pricing/${cfg.slug}`
  const linkProbeRu = `/ru/pricing/${cfg.slug}`

  for (const p of plans) {
    if (p.action !== "append") continue
    const sentence = p.language === "ru" ? cfg.ruSentence : cfg.enSentence
    const probe = p.language === "ru" ? linkProbeRu : linkProbeEn

    // Re-check via SQL-side position(...) to keep the apply pass safe even if
    // a row was touched between plan and apply by another process. Append
    // uses the SQL || operator; updated_at touched so ISR + sitemap pick up
    // the change.
    const { data: cur, error: curErr } = await sb
      .from("comparisons")
      .select("verdict")
      .eq("slug", p.slug)
      .eq("language", p.language)
      .single()
    if (curErr || !cur) {
      console.error(`  apply ${p.slug} (${p.language}): re-read failed`)
      continue
    }
    if ((cur.verdict ?? "").includes(probe)) {
      console.log(`  apply ${p.slug} (${p.language}): already linked between plan and apply — skipped`)
      continue
    }
    const newVerdict = (cur.verdict ?? "") + "\n\n" + sentence
    const { error: updErr } = await sb
      .from("comparisons")
      .update({ verdict: newVerdict, updated_at: new Date().toISOString() })
      .eq("slug", p.slug)
      .eq("language", p.language)
    if (updErr) {
      console.error(`  apply ${p.slug} (${p.language}): update failed:`, updErr.message)
    } else {
      console.log(`  apply ${p.slug} (${p.language}): OK (+${"\n\n".length + sentence.length} chars)`)
    }
  }
}

async function main() {
  console.log(`\n══ /compare/ → /pricing/ backlink loader ══`)
  console.log(`mode: ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"}`)
  console.log(`tools: ${BACKLINKS.map((b) => b.slug).join(", ")}\n`)

  let total = { tools: 0, appends: 0, alreadyLinked: 0, noVerdict: 0 }

  for (const cfg of BACKLINKS) {
    const plans = await planForTool(cfg)
    if (plans.length === 0) continue

    console.log(`─── ${cfg.slug} (${cfg.name}) ───`)
    for (const p of plans) {
      const action =
        p.action === "append"
          ? `APPEND +${p.appended_chars}c (current ${p.current_len}c)`
          : p.action === "skip-already-linked"
            ? `SKIP (already linked, ${p.current_len}c)`
            : `SKIP (no verdict)`
      console.log(`  ${p.slug.padEnd(34)} ${p.language}  ${action}`)
    }
    total.tools += 1
    total.appends += plans.filter((p) => p.action === "append").length
    total.alreadyLinked += plans.filter((p) => p.action === "skip-already-linked").length
    total.noVerdict += plans.filter((p) => p.action === "skip-no-verdict").length

    if (APPLY) await applyForTool(cfg, plans)
    console.log()
  }

  console.log(`══ summary ══`)
  console.log(`  tools processed:        ${total.tools}`)
  console.log(`  rows appended:          ${total.appends}`)
  console.log(`  rows already linked:    ${total.alreadyLinked}`)
  console.log(`  rows with no verdict:   ${total.noVerdict}`)
  if (!APPLY) console.log(`\n(dry-run — re-run with --apply to write)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
