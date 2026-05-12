import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   RatingStars
   ----------------------------------------------------------------------------
   Renders our internal 0–10 score as 5 mint-coloured stars (half-step
   precision) plus an optional mono numeric badge.

   Half-stars are drawn with a clipped overlay, not two SVGs — keeps the
   accessible-name short and the markup light. The full row is exposed to
   assistive tech as a single `<span aria-label="8.5 out of 10">`.
---------------------------------------------------------------------------- */

interface RatingStarsProps {
  /** 0–10 scale (our editorial rating). */
  rating: number | null | undefined
  /** Tailwind size — `sm` for inline use, `md` for cards, `lg` for hero. */
  size?: "sm" | "md" | "lg"
  /** Show the numeric value next to the stars. Default: true. */
  showValue?: boolean
  className?: string
}

const SIZES = {
  sm: { star: 14, text: "text-[12px]" },
  md: { star: 16, text: "text-[13px]" },
  lg: { star: 22, text: "text-[16px]" },
} as const

export function RatingStars({
  rating,
  size = "md",
  showValue = true,
  className,
}: RatingStarsProps) {
  if (rating == null || Number.isNaN(rating)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[var(--text-tertiary)]",
          SIZES[size].text,
          className,
        )}
      >
        <span className="font-mono">—</span>
        <span className="sr-only">no rating yet</span>
      </span>
    )
  }

  const clamped = Math.max(0, Math.min(10, rating))
  // 5 stars represent the 0–10 scale, so each star is worth 2 points.
  const filled = clamped / 2
  const px = SIZES[size].star

  return (
    <span
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 10`}
      className={cn(
        "inline-flex items-center gap-1.5",
        SIZES[size].text,
        className,
      )}
    >
      <span className="inline-flex items-center" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => {
          const fillPct = Math.max(0, Math.min(1, filled - i)) * 100
          return <Star key={i} px={px} fillPct={fillPct} />
        })}
      </span>
      {showValue && (
        <span className="font-mono font-medium text-[var(--text-primary)]">
          {clamped.toFixed(1)}
        </span>
      )}
    </span>
  )
}

function Star({ px, fillPct }: { px: number; fillPct: number }) {
  // One SVG per slot: an outline behind a clipped foreground. The width of
  // the foreground is `fillPct%` so half-stars look crisp at any size.
  return (
    <span
      style={{ width: px, height: px }}
      className="relative inline-block"
    >
      {/* Outline (empty) */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        className="absolute inset-0 text-[var(--border-strong)]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      >
        <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.77 6.1 20.68l1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
      </svg>
      {/* Filled, clipped to fillPct */}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${fillPct}%` }}
      >
        <svg
          width={px}
          height={px}
          viewBox="0 0 24 24"
          className="text-[var(--brand)]"
          fill="currentColor"
        >
          <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.77 6.1 20.68l1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />
        </svg>
      </span>
    </span>
  )
}
