import Image from "next/image"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   Article cover system
   ----------------------------------------------------------------------------
   One tiered cover (real photo → programmatic next/og → deterministic
   gradient) rendered at two aspect ratios from one shared <CoverFill>:
     • <ArticleCover>    — 21:9 strip on /reviews/[slug], /guides/[slug]
     • <ReviewCardCover> — 16:9 full-bleed on the homepage review cards
   plus helpers `coverGradient` / `COVER_STRIPE` / `reviewOgCoverHref`.

   Mirrors the `.cover-img` / `.review-cover` blocks from the New_Design
   mockups (review-klaviyo.html, guide.html, homepage.html) — same
   gradient-into-bg-muted tint + diagonal stripe texture.

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

/**
 * The deterministic brand→violet cover gradient for a slug, as a CSS
 * `background` string. Single source of truth shared by <ArticleCover>
 * (the 21:9 article strip) and the homepage "Latest deep reviews" card
 * thumbnails — so a review's cover colour is identical on the card, the
 * /reviews index and the article page (matches design-v.026 homepage.html
 * `.review-cover`, which is the same recipe at 16:9).
 */
export function coverGradient(slug: string): string {
  const v = VARIANTS[hashSlug(slug) % VARIANTS.length]
  return `linear-gradient(135deg, color-mix(in oklch, ${v.from} ${v.fromPct}%, var(--bg-muted)), color-mix(in oklch, ${v.to} ${v.toPct}%, var(--bg-muted)))`
}

/** Diagonal 12px stripe overlay — the texture both cover surfaces share. */
export const COVER_STRIPE =
  "repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px)"

/**
 * Builds the /api/og?variant=cover URL for a review. SINGLE source of
 * truth: the article page (the 21:9 strip) and the homepage "Latest
 * deep reviews" card both call this, so a review's cover is byte-for-byte
 * the same image in both places (same params → same OG cache key).
 *
 * `eyebrowWord` is the localised section label ("Review" / "Обзор"); the
 * cover shows "<Tool> review" when the tool is known, else just the word.
 */
export function reviewOgCoverHref(opts: {
  toolName?: string | null
  logoUrl?: string | null
  rating?: number | null
  eyebrowWord: string
}): string {
  const { toolName, logoUrl, rating, eyebrowWord } = opts
  return `/api/og?${new URLSearchParams({
    variant: "cover",
    eyebrow: toolName ? `${toolName} ${eyebrowWord.toLowerCase()}` : eyebrowWord,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(rating != null ? { rating: String(rating) } : {}),
  }).toString()}`
}

/**
 * The tiered cover content, absolutely filling its (relative) parent.
 * Shared by <ArticleCover> and <ReviewCardCover> so the 3-tier priority
 * — real photo → programmatic OG → gradient — lives in exactly one place
 * and never drifts between the article page and the homepage card.
 */
function CoverFill({
  slug,
  coverImage,
  ogCoverHref,
  sizes,
}: {
  slug: string
  coverImage?: string
  ogCoverHref?: string
  sizes: string
}) {
  // Tier 1 — a real produced/licensed photo. Theme-agnostic, single
  // optimised render (AVIF/WebP pipeline).
  if (coverImage) {
    return (
      <Image
        // Decorative: the article <h1> / card title already carry the
        // name, so an empty alt avoids a duplicate SR announcement.
        src={coverImage}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
    )
  }

  // Tier 2 — the programmatic OG cover. It's a static raster baked with
  // a fixed background, so a single image would sit on the page as a
  // foreign dark (or light) block in the opposite theme. Render BOTH
  // theme bakes and let CSS show the one matching the site theme — no
  // JS, no FOUC, no layout shift (both fill the same box, one is
  // display:none). Same OG cache key per theme; unoptimized (already
  // an edge-cached raster from our own route).
  if (ogCoverHref) {
    return (
      <>
        <Image
          src={`${ogCoverHref}&theme=light`}
          alt=""
          fill
          sizes={sizes}
          className="object-cover dark:hidden"
          unoptimized
        />
        <Image
          src={`${ogCoverHref}&theme=dark`}
          alt=""
          fill
          sizes={sizes}
          className="hidden object-cover dark:block"
          unoptimized
        />
      </>
    )
  }

  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: coverGradient(slug) }}
      />
      {/* Diagonal stripe — 12px transparent, 1px white-04. */}
      <div className="absolute inset-0" style={{ background: COVER_STRIPE }} />
    </>
  )
}

/**
 * The 21:9 cover strip between the hero and the article body on
 * /reviews/[slug] and /guides/[slug]. 21:9 on phones (~375px) is
 * ~160px tall — compact enough not to push the body off the first screen.
 */
export function ArticleCover({
  slug,
  coverImage,
  ogCoverHref,
  className,
}: ArticleCoverProps) {
  return (
    <div className="container-default mt-2 lg:mt-4">
      <div
        aria-hidden="true"
        className={cn(
          "relative w-full overflow-hidden",
          "aspect-[21/9] rounded-2xl border border-[var(--border-base)]",
          className,
        )}
      >
        <CoverFill
          slug={slug}
          coverImage={coverImage}
          ogCoverHref={ogCoverHref}
          // The strip never exceeds the article container (~960px) and
          // sits below the hero — not LCP-critical, lazy is correct.
          sizes="(min-width: 1024px) 960px, 100vw"
        />
      </div>
    </div>
  )
}

/**
 * Full-bleed 16:9 cover for the homepage "Latest deep reviews" cards —
 * design-v.026 homepage.html `.review-cover`. Same three tiers as
 * <ArticleCover>, so a review shows the SAME cover on its card and at
 * the top of its article. No container/rounding of its own: the card
 * owns `overflow-hidden rounded-2xl`, this just clips to the top edge
 * and draws the divider above the padded body.
 */
export function ReviewCardCover({
  slug,
  coverImage,
  ogCoverHref,
  className,
}: ArticleCoverProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden aspect-[16/9]",
        "border-b border-[var(--border-base)]",
        className,
      )}
    >
      <CoverFill
        slug={slug}
        coverImage={coverImage}
        ogCoverHref={ogCoverHref}
        // ~3-up grid on md+, full width below — a rough hint is enough
        // (the OG tier is unoptimized anyway, so no srcset is emitted).
        sizes="(min-width: 768px) 380px, 100vw"
      />
    </div>
  )
}
