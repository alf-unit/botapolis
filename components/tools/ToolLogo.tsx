"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   ToolLogo
   ----------------------------------------------------------------------------
   Renders a tool's logo via next/image; if the source 404s or errors out,
   falls back to an initial-letter chip with the brand mint→violet gradient
   on a tinted disc. Client component because we need an onError handler.

   Why a CONSTANT white plate (not `--bg-surface`):
     Third-party brand marks come in every flavour — full-colour (Klaviyo,
     Yotpo), mono-dark (Gorgias, Tidio), and full-bleed app tiles (Loox,
     Omnisend). A theme-following surface would swallow the mono-dark ones
     in dark mode. A fixed light plate keeps every official logo legible
     and on-brand-colour in BOTH themes — the same pattern G2/Capterra and
     every serious tool directory use. The themed border keeps the plate
     from floating on dark backgrounds. The fallback letter-chip keeps its
     own themed gradient (it has no white-plate problem).

   Sizing: square chip, rounded `--radius-md`. Pass `size` to scale (px).
   The image sits at ~80% so centred marks breathe and full-bleed tiles
   read as an app icon on a plate rather than edge-to-edge.
---------------------------------------------------------------------------- */

interface ToolLogoProps {
  src?: string | null
  name: string
  size?: number
  className?: string
  /** Hint next/image about the rendered size for sharper rasters. */
  sizes?: string
}

export function ToolLogo({
  src,
  name,
  size = 40,
  className,
  sizes,
}: ToolLogoProps) {
  const [failed, setFailed] = React.useState(false)
  const showImage = !!src && !failed

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden",
        "rounded-md border border-[var(--border-base)]",
        // Constant light plate ONLY behind a real logo; the fallback brings
        // its own themed gradient so it must NOT get the white plate.
        showImage ? "bg-white" : "bg-[var(--bg-surface)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {showImage ? (
        <Image
          src={src!}
          alt={`${name} logo`}
          width={size}
          height={size}
          sizes={sizes}
          // Width/height attrs feed next/image's intrinsic ratio; the 80%
          // box just insets the rendered mark so it doesn't kiss the edge.
          className="h-[80%] w-[80%] object-contain"
          onError={() => setFailed(true)}
          // Local public/ assets (svg/png/webp/jpg) — unoptimized keeps the
          // SSR markup stable and skips the optimiser for tiny brand marks.
          unoptimized={src!.startsWith("/")}
        />
      ) : (
        <Fallback name={name} size={size} />
      )}
    </span>
  )
}

function Fallback({ name, size }: { name: string; size: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  return (
    <span
      className="absolute inset-0 inline-flex items-center justify-center font-semibold tracking-[-0.04em]"
      style={{
        fontSize: Math.round(size * 0.46),
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--brand) 18%, transparent), color-mix(in oklch, var(--violet-500) 18%, transparent))",
        color: "var(--text-primary)",
      }}
    >
      {initial}
    </span>
  )
}
