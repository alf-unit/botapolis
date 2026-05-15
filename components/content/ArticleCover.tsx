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

   Why a gradient strip and not a real image:
     - The design mockup is purely gradient-driven. Real cover photos
       would require: a frontmatter field, an image pipeline (next/image,
       AVIF/WebP, blurhash placeholders), and someone to generate or
       license them. Big lift for ornamental chrome.
     - Frontmatter already supports `ogImage` for the social-share card
       (which is the high-value image — appears in X / LinkedIn previews).
       The in-page cover is decorative; the gradient handles it cleanly.
     - When/if real cover images become content priority, this component
       can grow an optional `imageUrl` prop that overrides the gradient.

   Pure server component — no client interactivity, no JS payload.
---------------------------------------------------------------------------- */

interface ArticleCoverProps {
  /** Article slug — drives the gradient variant via a deterministic hash. */
  slug: string
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

export function ArticleCover({ slug, className }: ArticleCoverProps) {
  const v = VARIANTS[hashSlug(slug) % VARIANTS.length]

  return (
    <div className="container-default mt-2 lg:mt-4">
      <div
        aria-hidden="true"
        className={cn(
          "relative w-full overflow-hidden",
          // 21:9 matches the design mockup. On phones (~375px) this comes
          // out to ~160px tall — compact enough not to push the article
          // body off the first screenful.
          "aspect-[21/9] rounded-2xl border border-[var(--border-base)]",
          className,
        )}
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
