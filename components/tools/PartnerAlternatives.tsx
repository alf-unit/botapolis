import "server-only"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { ToolLogo } from "@/components/tools/ToolLogo"
import { createServiceClient } from "@/lib/supabase/service"
import { localizeToolPartial } from "@/lib/content/tool-locale"
import { canonicalCompareSlug } from "@/lib/content/slug"
import { cn } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   <PartnerAlternatives>
   ----------------------------------------------------------------------------
   "Where else can a reader monetisably go" block. Surfaces 2–3 partner tools
   (affiliate_url IS NOT NULL) in the same category as the current tool, plus
   compare-page links where /compare/[current-vs-alt] already exists.

   Why: pages about non-affiliate tools (Judge.me carve-out, future
   catalog-no-affiliate entries) are otherwise dead ends — the reader has
   no monetised path forward from us. This block routes them to a
   partner-monetisable review without claiming the current tool is
   inferior. Title is intentionally neutral ("Similar tools worth
   comparing") — Judge.me is a legitimate 5.0 / 37k-review product, just
   not a paid one for our purposes.

   Behaviour summary:
     - Returns null when the category has zero partner alternatives.
     - Block A (cards) always renders when ≥1 alternative is found.
     - Block B (compare links) renders per-card only when the canonical
       /compare/[X-vs-Y] page actually exists in `comparisons`. No links
       to drafts or to URLs we haven't built yet.

   Modes:
     - `emphasized` — used on tools without affiliate_url. Block becomes
       a primary visual moment (gradient card, larger heading) because
       it's the page's only monetised exit path.
     - normal — used on tools WITH affiliate_url. Block is a bonus
       discovery surface; the main exit is the /go/[slug] Try CTA.

   Container ownership:
     - `bare=true` — caller already provides container-default (e.g. when
       embedded inside the `<article>` grid column of /reviews/[slug]).
     - `bare=false` (default) — component provides its own container.
       Used by /tools/[slug] and /compare/[slug] which insert between
       top-level sections.
---------------------------------------------------------------------------- */

type AlternativeCard = Pick<
  ToolRow,
  | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru" | "logo_url"
  | "rating" | "pricing_model" | "pricing_min"
>

interface PartnerAlternativesProps {
  currentSlug: string
  currentName: string
  currentCategory: string
  /**
   * Subcategories of the current tool (jsonb / text[] from tools.subcategories).
   * Used as a fallback pool when same-category partners are scarce — keeps
   * the block from coming up empty on single-member categories like
   * `support` (Gorgias only) or `inventory` (Inventory Planner with both
   * other entries archived). Overlap matching is honest by-relevance:
   * Gorgias.subcategories ⊃ "helpdesk" → matches Tidio (chat-category but
   * subcategories include "helpdesk"). Pass [] or undefined to skip the
   * fallback.
   */
  currentSubcategories?: string[]
  /** Additional slugs to exclude (e.g. both sides of a comparison page). */
  excludeSlugs?: string[]
  locale: "en" | "ru"
  localePrefix: "" | "/ru"
  /** True when current tool has no affiliate_url — visually elevate the block. */
  emphasized?: boolean
  maxCount?: number
  /** False on /compare/[slug] — the page IS a comparison, link is redundant. */
  showCompareLinks?: boolean
  /** True when caller already provides container-default. */
  bare?: boolean
}

// ============================================================================
// Data
// ============================================================================

const CARD_SELECT =
  "slug, name, name_ru, tagline, tagline_ru, logo_url, rating, pricing_model, pricing_min"

async function fetchPartnerAlternatives(
  category: string,
  subcategories: ReadonlyArray<string>,
  excludeSlugs: ReadonlyArray<string>,
  limit: number,
): Promise<AlternativeCard[]> {
  try {
    const sb = createServiceClient()
    const excludeSet = new Set(excludeSlugs)
    // Over-fetch by excludeSlugs.length so we still hit `limit` after filtering
    // out the current tool (and on /compare/[slug] also the other side).
    const fetchLimit = limit + excludeSlugs.length

    // Pass 1 — exact category match. Highest relevance, ranked by rating.
    const { data: same, error: sameErr } = await sb
      .from("tools")
      .select(CARD_SELECT)
      .eq("status", "published")
      .eq("category", category)
      .not("affiliate_url", "is", null)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(fetchLimit)
    if (sameErr) {
      console.error("[PartnerAlternatives] same-category fetch failed:", sameErr.message)
      return []
    }
    let pool: AlternativeCard[] = (same ?? []).filter((t) => !excludeSet.has(t.slug))
    if (pool.length >= limit) return pool.slice(0, limit)

    // Pass 2 — subcategory overlap fallback. Triggered when same-category
    // pool is thin (single-member categories like `support`, `inventory`,
    // `fraud`). Honest-by-relevance: a tool that shares at least one
    // subcategory is a reasonable alternative even when its primary
    // category differs. Example: Gorgias[support, subcat=helpdesk] →
    // Tidio[chat, subcat=helpdesk] surfaces as a credible alt.
    if (subcategories.length === 0) return pool

    const seenSlugs = new Set([...excludeSlugs, ...pool.map((t) => t.slug)])
    const { data: overlap, error: overlapErr } = await sb
      .from("tools")
      .select(CARD_SELECT)
      .eq("status", "published")
      .not("affiliate_url", "is", null)
      .neq("category", category)               // already covered by pass 1
      .overlaps("subcategories", subcategories as string[])
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(fetchLimit)
    if (overlapErr) {
      console.error("[PartnerAlternatives] subcategory fetch failed:", overlapErr.message)
      return pool.slice(0, limit)
    }
    const overlapFiltered = (overlap ?? []).filter((t) => !seenSlugs.has(t.slug))
    pool = [...pool, ...overlapFiltered]
    return pool.slice(0, limit)
  } catch (err) {
    console.error("[PartnerAlternatives] tools fetch threw:", err)
    return []
  }
}

async function fetchExistingCompareSlugs(
  candidatePairs: ReadonlyArray<string>,
  locale: "en" | "ru",
): Promise<Set<string>> {
  if (candidatePairs.length === 0) return new Set()
  try {
    const sb = createServiceClient()
    const { data, error } = await sb
      .from("comparisons")
      .select("slug")
      .eq("language", locale)
      .eq("status", "published")
      .in("slug", candidatePairs)
    if (error) {
      console.error("[PartnerAlternatives] comparisons fetch failed:", error.message)
      return new Set()
    }
    return new Set((data ?? []).map((r) => r.slug))
  } catch (err) {
    console.error("[PartnerAlternatives] comparisons fetch threw:", err)
    return new Set()
  }
}

// ============================================================================
// Component
// ============================================================================

export async function PartnerAlternatives({
  currentSlug,
  currentName,
  currentCategory,
  currentSubcategories = [],
  excludeSlugs = [],
  locale,
  localePrefix,
  emphasized = false,
  maxCount = 3,
  showCompareLinks = true,
  bare = false,
}: PartnerAlternativesProps) {
  const exclude = Array.from(new Set([currentSlug, ...excludeSlugs]))
  const rawAlternatives = await fetchPartnerAlternatives(
    currentCategory,
    currentSubcategories,
    exclude,
    maxCount,
  )
  if (rawAlternatives.length === 0) return null

  // Compute canonical compare-pair slugs and check which actually exist as
  // published comparison pages. Skipped entirely when showCompareLinks is false.
  let existingCompareSlugs = new Set<string>()
  if (showCompareLinks) {
    const candidatePairs = rawAlternatives.map((a) =>
      canonicalCompareSlug(`${currentSlug}-vs-${a.slug}`),
    )
    existingCompareSlugs = await fetchExistingCompareSlugs(candidatePairs, locale)
  }

  const alternatives = rawAlternatives.map((a) => localizeToolPartial(a, locale))

  // ────────────────────────────────────────────────────────────────────
  // i18n — inline. If a third surface picks this block up, migrate to dict.
  // ────────────────────────────────────────────────────────────────────
  const t =
    locale === "ru"
      ? {
          title: "Похожие инструменты",
          ratingLabel: "из 10",
          perMonth: "/мес",
          fromPrefix: "от",
          free: "Бесплатно",
          readReview: "Открыть обзор",
          compareLabel: (alt: string) => `Сравнить ${currentName} и ${alt}`,
        }
      : {
          title: "Similar tools worth comparing",
          ratingLabel: "/10",
          perMonth: "/mo",
          fromPrefix: "from",
          free: "Free",
          readReview: "Read review",
          compareLabel: (alt: string) => `Compare ${currentName} vs ${alt}`,
        }

  const cards = (
    <ul
      role="list"
      className={cn(
        "mt-6 grid gap-4",
        alternatives.length === 1
          ? "max-w-md"
          : alternatives.length === 2
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {alternatives.map((alt) => {
        const comparePairSlug = canonicalCompareSlug(`${currentSlug}-vs-${alt.slug}`)
        const compareExists = showCompareLinks && existingCompareSlugs.has(comparePairSlug)
        const priceText =
          alt.pricing_min == null
            ? null
            : alt.pricing_model === "free"
              ? t.free
              : alt.pricing_model === "freemium"
                ? `${t.free} · ${t.fromPrefix} $${alt.pricing_min}${t.perMonth}`
                : `${t.fromPrefix} $${alt.pricing_min}${t.perMonth}`
        return (
          <li key={alt.slug} className="flex flex-col gap-2">
            <Link
              href={`${localePrefix}/reviews/${alt.slug}`}
              className={cn(
                "group flex h-full flex-col gap-3 rounded-2xl border border-[var(--border-base)]",
                "bg-[var(--bg-surface)] p-5 transition-shadow",
                "hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
              )}
            >
              <div className="flex items-start gap-3">
                <ToolLogo
                  src={alt.logo_url}
                  name={alt.name ?? alt.slug}
                  size={44}
                  className="shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-h4 font-semibold tracking-[-0.015em] text-[var(--text-primary)] line-clamp-1">
                    {alt.name}
                  </p>
                  {alt.tagline && (
                    <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)] line-clamp-2">
                      {alt.tagline}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-[12px]">
                <div className="flex items-center gap-3">
                  {alt.rating != null && (
                    <span className="font-mono font-semibold text-[var(--brand)] tabular-nums">
                      {alt.rating.toFixed(1)}
                      <span className="text-[var(--text-tertiary)] font-normal">{t.ratingLabel}</span>
                    </span>
                  )}
                  {priceText && (
                    <span className="font-mono uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                      {priceText}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-[var(--brand)] transition-transform group-hover:translate-x-0.5">
                  {t.readReview}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
            {compareExists && (
              <Link
                href={`${localePrefix}/compare/${comparePairSlug}`}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] underline-offset-4 hover:text-[var(--text-secondary)] hover:underline"
              >
                {t.compareLabel(alt.name)}
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )

  const heading = (
    <h2
      className={cn(
        "font-semibold tracking-[-0.02em]",
        emphasized ? "text-h2" : "text-h3",
      )}
    >
      {t.title}
    </h2>
  )

  // ────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────
  if (emphasized) {
    const innerEmphasized = (
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 lg:p-10 shadow-[var(--shadow-md)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-1/2 h-[200%] opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(16,185,129,0.12), transparent 60%)",
          }}
        />
        <div className="relative">
          {heading}
          {cards}
        </div>
      </div>
    )

    if (bare) {
      return <div className="mt-10 lg:mt-12">{innerEmphasized}</div>
    }
    return (
      <section className="container-default py-12 lg:py-16">{innerEmphasized}</section>
    )
  }

  // Normal mode — plain section with top border for separation.
  const innerNormal = (
    <>
      {heading}
      {cards}
    </>
  )

  if (bare) {
    return (
      <div className="mt-10 lg:mt-12 border-t border-[var(--border-subtle)] pt-10 lg:pt-12">
        {innerNormal}
      </div>
    )
  }
  return (
    <section className="container-default py-12 lg:py-16 border-t border-[var(--border-subtle)]">
      {innerNormal}
    </section>
  )
}
