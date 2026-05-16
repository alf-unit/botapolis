import Image from "next/image"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <ArticleCover>
   ----------------------------------------------------------------------------
   Decorative 21:9 gradient strip rendered between ArticleHero and the
   article body on /reviews/[slug] and /guides/[slug]. Mirrors the
   `.cover-img` block from the New_Design mockups (review-klaviyo.html,
   guide.html) — same aspect, same gradient-into-bg-muted tint, plus a
   diagonal stripe overlay for visual texture.

   The gradient variant is picked deterministically by hashing the article
   slug, so every article keeps its OWN colour identity across deploys
   without any per-article configuration. Six variants — enough variety
   that adjacent cards on /reviews don't accidentally double up, but few
   enough to stay on-brand (every variant pulls from --accent-* or
   --violet-* with --warning as the single warm accent).

   Three render tiers, highest priority first:
     1. `coverImage` — a real, produced/licensed photo set in frontmatter.
        Rendered through next/image (AVIF/WebP, lazy) at object-cover.
     2. `ogCoverHref` — a programmatic next/og brand cover (/api/og?
        variant=cover): the tool's official logo on the mint→violet
        atmosphere. On-brand, zero asset pipeline, generated + edge-cached
        by the OG route itself. This is the default for tool reviews.
     3. The deterministic gradient strip (original behaviour) — the pure
        fallback when neither image source is available, so removing a
        cover never regresses to a broken box.

   Pure server component — no client interactivity, no JS payload.
---------------------------------------------------------------------------- */

interface ArticleCoverProps {
  /** Article slug — drives the gradient variant via a deterministic hash. */
  slug: string
  /** Real produced/licensed photo (frontmatter `coverImage`). Tier 1. */
  coverImage?: string
  /**
   * Programmatic /api/og?variant=cover URL built by the page. Tier 2.
   * Same-origin dynamic route — rendered unoptimized (it's already a
   * generated, edge-cached raster; re-optimising it is wasted work).
   */
  ogCoverHref?: string
  className?: string
}

// 6 colour variants. Each entry: two CSS-var stops + their mix percentages
// against --bg-muted. `color-mix(in oklch, …)` keeps the result tonally
// consistent across light/dark mode without us hand-tuning per theme.
const VARIANTS = [
  { from: "var(--accent-500)", to: "var(--violet-500)", fromPct: 18, toPct: 14 },
  { from: "var(--violet-500)", to: "var(--accent-500)", fromPct: 14, toPct: 18 },
  { from: "var(--accent-400)", to: "var(--warning)",    fromPct: 16, toPct: 12 },
  { from: "var(--violet-600)", to: "var(--accent-300)", fromPct: 18, toPct: 12 },
  { from: "var(--accent-300)", to: "var(--accent-700)", fromPct: 16, toPct: 18 },
  { from: "var(--violet-300)", to: "var(--violet-700)", fromPct: 14, toPct: 18 },
] as const

/**
 * Deterministic small-positive-int hash of the slug. djb2-style — short,
 * branchless, collision-tolerant for the 6-bucket use case here. Don't
 * use this for crypto / security — it's pickedly cheap.
 */
function hashSlug(slug: string): number {
  let h = 5381
  for (let i = 0; i < slug.length; i++) {
    // (h << 5) + h === h * 33; XOR with charCode gives reasonable spread.
    h = ((h << 5) + h) ^ slug.charCodeAt(i)
  }
  return Math.abs(h)
}

export function ArticleCover({
  slug,
  coverImage,
  ogCoverHref,
  className,
}: ArticleCoverProps) {
  const v = VARIANTS[hashSlug(slug) % VARIANTS.length]

  // Tier 1 wins over tier 2; tier 3 (gradient) only when both are absent.
  const imageSrc = coverImage ?? ogCoverHref ?? null
  const isOg = !coverImage && !!ogCoverHref

  // Shared box — same 21:9, radius and border across all three tiers so
  // the page rhythm never shifts based on which cover is available.
  // 21:9 on phones (~375px) is ~160px tall: compact enough not to push
  // the article body off the first screenful.
  const boxClass = cn(
    "relative w-full overflow-hidden",
    "aspect-[21/9] rounded-2xl border border-[var(--border-base)]",
    className,
  )

  if (imageSrc) {
    return (
      <div className="container-default mt-2 lg:mt-4">
        <div className={boxClass}>
          <Image
            // Decorative: the article <h1> already carries the title, so
            // an empty alt keeps screen readers from announcing it twice.
            src={imageSrc}
            alt=""
            fill
            // The cover never exceeds the article container (~960px) and
            // is one-per-page below the hero — not LCP-critical, lazy is
            // correct and keeps it off the initial paint budget.
            sizes="(min-width: 1024px) 960px, 100vw"
            className="object-cover"
            // The OG cover is an already-generated, edge-cached raster
            // from our own route; re-running the image optimiser on it is
            // pure waste. Real photos still get the AVIF/WebP pipeline.
            unoptimized={isOg}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container-default mt-2 lg:mt-4">
      <div
        aria-hidden="true"
        className={boxClass}
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, ${v.from} ${v.fromPct}%, var(--bg-muted)), color-mix(in oklch, ${v.to} ${v.toPct}%, var(--bg-muted)))`,
        }}
      >
        {/* Diagonal stripe overlay — 12px transparent, 1px white-04. Same
            repeating-linear-gradient recipe as the home-page review-card
            covers so the two surfaces feel related. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px)",
          }}
        />
      </div>
    </div>
  )
}
