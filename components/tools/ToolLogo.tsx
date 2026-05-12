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

   Sizing: square chip, rounded `--radius-md`. Pass `size` to scale (px).
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
        "bg-[var(--bg-surface)]",
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
          className="object-contain"
          onError={() => setFailed(true)}
          // Local SVGs in public/ — unoptimized keeps the SSR markup stable.
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
