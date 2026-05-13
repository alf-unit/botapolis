import "server-only"

import type { ToolRow } from "@/lib/supabase/types"
import { formatPrice } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   pSEO narrative generators
   ----------------------------------------------------------------------------
   Compare pages need a unique block of prose so Google sees them as a
   real page and not a template. We keep editorial fields (custom_intro,
   verdict, custom_methodology, comparison_data) in Supabase for the
   hand-tuned ones, and these helpers fill the gaps by stitching real
   pricing / rating / integration data into short paragraphs.

   Every helper here is **deterministic** — same inputs always yield the
   same string — so two pages with identical tools never produce
   different copy. Variation is driven entirely by the tools' fields,
   which keeps the output defensible ("we said that because the data
   says so") and avoids the LLM-slop trap.

   Localisation: helpers accept a `locale` arg. We only render in EN or
   RU; the RU output keeps acronyms / product names / metrics in English
   (MRR, AOV, ROI, SMS, AI) per the project translation convention
   documented in HANDOFF.md.
---------------------------------------------------------------------------- */

type Locale = "en" | "ru"

interface NumberLike {
  pricing_min?: number | null
  pricing_max?: number | null
  rating?:      number | null
}

function ratingDelta(a?: number | null, b?: number | null): number | null {
  if (a == null || b == null) return null
  return Math.round((a - b) * 10) / 10
}

/**
 * "At a glance" intro — three-sentence summary that names the two tools,
 * picks a price winner, a rating winner, and an integrations winner.
 * Used as a fallback when `comparisons.custom_intro` is empty.
 */
export function generateAtAGlance(a: ToolRow, b: ToolRow, locale: Locale = "en"): string {
  const aMin = a.pricing_min ?? 0
  const bMin = b.pricing_min ?? 0
  const priceWinner = aMin === bMin
    ? null
    : aMin < bMin ? a.name : b.name

  const aRating = a.rating ?? 0
  const bRating = b.rating ?? 0
  const ratingWinner = Math.abs(aRating - bRating) < 0.05
    ? null
    : aRating > bRating ? a.name : b.name

  const aInts = a.integrations?.length ?? 0
  const bInts = b.integrations?.length ?? 0
  const intWinner = aInts === bInts
    ? null
    : aInts > bInts ? a.name : b.name

  if (locale === "ru") {
    const parts: string[] = []
    parts.push(`${a.name} и ${b.name} оба ориентированы на Shopify-операторов, но трейд-оффы разные.`)
    if (priceWinner) {
      parts.push(`${priceWinner} дешевле на входе.`)
    }
    if (ratingWinner) {
      parts.push(`${ratingWinner} получает более высокую оценку редакции на Botapolis.`)
    }
    if (intWinner) {
      parts.push(`У ${intWinner} больше нативных интеграций из коробки.`)
    }
    parts.push("Ниже — разбор по пунктам.")
    return parts.join(" ")
  }

  const parts: string[] = []
  parts.push(`${a.name} and ${b.name} both target Shopify operators, but the trade-offs split cleanly.`)
  if (priceWinner) parts.push(`${priceWinner} is the cheaper entry point.`)
  if (ratingWinner) parts.push(`${ratingWinner} earns the higher operator rating on Botapolis.`)
  if (intWinner) parts.push(`${intWinner} ships with more named integrations out of the box.`)
  parts.push("Section breakdown below.")
  return parts.join(" ")
}

/**
 * Two-sentence pricing narrative under the pricing table — calls out
 * who's cheaper at entry, who's cheaper at scale, and whether the
 * pricing models differ structurally (subscription vs freemium etc.).
 */
export function generatePricingNarrative(a: ToolRow, b: ToolRow, locale: Locale = "en"): string {
  const aMin = a.pricing_min ?? 0
  const bMin = b.pricing_min ?? 0
  const aMax = a.pricing_max ?? 0
  const bMax = b.pricing_max ?? 0
  const sameModel = a.pricing_model === b.pricing_model

  const cheaperEntry = aMin === bMin ? null : (aMin < bMin ? a : b)
  const cheaperEntryOther = cheaperEntry?.slug === a.slug ? b : a
  const heavierMax  = aMax === bMax ? null : (aMax > bMax ? a : b)

  if (locale === "ru") {
    const out: string[] = []
    if (cheaperEntry && cheaperEntryOther) {
      out.push(
        `${cheaperEntry.name} начинает с ${formatPrice(cheaperEntry.pricing_min, { locale: "ru", maximumFractionDigits: 0 })}/мес против ${formatPrice(cheaperEntryOther.pricing_min, { locale: "ru", maximumFractionDigits: 0 })}/мес у ${cheaperEntryOther.name}.`,
      )
    }
    if (heavierMax) {
      out.push(
        `На верхнем тарифе ${heavierMax.name} доходит до ${formatPrice(heavierMax.pricing_max, { locale: "ru", maximumFractionDigits: 0 })}/мес.`,
      )
    }
    if (!sameModel) {
      out.push(`Модели разные: ${a.name} — ${a.pricing_model ?? "—"}, ${b.name} — ${b.pricing_model ?? "—"}.`)
    }
    return out.join(" ") || `${a.name} и ${b.name} играют в схожем ценовом диапазоне.`
  }

  const out: string[] = []
  if (cheaperEntry && cheaperEntryOther) {
    out.push(
      `${cheaperEntry.name} starts at ${formatPrice(cheaperEntry.pricing_min, { maximumFractionDigits: 0 })}/mo vs ${cheaperEntryOther.name}'s ${formatPrice(cheaperEntryOther.pricing_min, { maximumFractionDigits: 0 })}/mo.`,
    )
  }
  if (heavierMax) {
    out.push(
      `At the top tier ${heavierMax.name} climbs to ${formatPrice(heavierMax.pricing_max, { maximumFractionDigits: 0 })}/mo.`,
    )
  }
  if (!sameModel) {
    out.push(`Pricing models differ: ${a.name} is ${a.pricing_model ?? "n/a"}, ${b.name} is ${b.pricing_model ?? "n/a"}.`)
  }
  return out.join(" ") || `${a.name} and ${b.name} sit in a similar price band.`
}

/**
 * Verdict fallback when `comparisons.verdict` is empty. Picks a clear
 * winner if rating delta is meaningful, else acknowledges the tie and
 * leans on the `best_for` field.
 */
export function generateVerdictFallback(a: ToolRow, b: ToolRow, locale: Locale = "en"): string {
  const delta = ratingDelta(a.rating, b.rating)
  if (locale === "ru") {
    if (delta != null && Math.abs(delta) >= 0.5) {
      const winner = delta > 0 ? a : b
      const loser  = delta > 0 ? b : a
      return `${winner.name} получает более высокую оценку (${winner.rating}/10 против ${loser.rating}/10) для магазинов в своей нише. ${loser.name} остаётся в игре, когда ${loser.best_for ?? "решающую роль играет бюджет"}.`
    }
    return `Близко. ${a.name} выбирай, когда: ${a.best_for ?? "нужен его профиль"}. ${b.name} — когда: ${b.best_for ?? "нужен его профиль"}.`
  }

  if (delta != null && Math.abs(delta) >= 0.5) {
    const winner = delta > 0 ? a : b
    const loser  = delta > 0 ? b : a
    return `${winner.name} earns the higher rating (${winner.rating}/10 vs ${loser.rating}/10) for stores in its sweet spot. ${loser.name} stays relevant when ${loser.best_for ?? "budget is the deciding factor"}.`
  }
  return `Close call. Pick ${a.name} when: ${a.best_for ?? "you need its profile"}. Pick ${b.name} when: ${b.best_for ?? "you need its profile"}.`
}

/**
 * Categorise the integrations of two tools into "both", "only A",
 * "only B" sets. Used by IntegrationsSection to render a Venn-style
 * three-column layout without re-deriving the diff in JSX.
 */
export function diffIntegrations(a: ToolRow, b: ToolRow): {
  both:  string[]
  onlyA: string[]
  onlyB: string[]
} {
  const aSet = new Set(a.integrations ?? [])
  const bSet = new Set(b.integrations ?? [])
  const both:  string[] = []
  const onlyA: string[] = []
  const onlyB: string[] = []
  for (const i of aSet) {
    if (bSet.has(i)) both.push(i)
    else onlyA.push(i)
  }
  for (const i of bSet) {
    if (!aSet.has(i)) onlyB.push(i)
  }
  // Stable alphabetical order so the rendered list looks intentional.
  both.sort()
  onlyA.sort()
  onlyB.sort()
  return { both, onlyA, onlyB }
}
