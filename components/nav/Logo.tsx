import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Botapolis logo · "Linked nodes" mark + wordmark
 * ----------------------------------------------------------------------------
 * Two circular nodes joined by a horizontal bar, painted with the brand
 * mint→violet gradient. The right node is hollow — operator + AI motif.
 *
 * Gradient `id`s are scoped per-instance so multiple logos on a page don't
 * clash (Navbar + Footer rendered together).
 */
interface LogoProps {
  variant?: "default" | "icon"
  className?: string
  href?: string
  idSuffix?: string
}

export function Logo({
  variant = "default",
  className,
  href = "/",
  idSuffix = "nav",
}: LogoProps) {
  const gradId = `botapolis-grad-${idSuffix}`

  return (
    <Link
      href={href}
      aria-label="Botapolis — home"
      className={cn(
        "inline-flex items-center gap-2 group/logo",
        "text-[var(--text-primary)] no-underline",
        "transition-opacity duration-150 hover:opacity-90",
        className,
      )}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#10B981" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {/* Connector bar */}
        <rect x="14" y="29" width="36" height="6" rx="3" fill={`url(#${gradId})`} />
        {/* Left node — solid */}
        <circle cx="18" cy="32" r="12" fill={`url(#${gradId})`} />
        {/* Right node — hollow (operator + AI) */}
        <circle cx="46" cy="32" r="12" fill={`url(#${gradId})`} />
        <circle cx="46" cy="32" r="5" fill="var(--bg-surface)" />
      </svg>
      {variant === "default" && (
        <span className="font-semibold tracking-[-0.04em] text-[17px] leading-none">
          botapolis
        </span>
      )}
    </Link>
  )
}
