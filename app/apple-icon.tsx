/**
 * app/apple-icon — iOS / iPadOS home-screen icon (180×180)
 * ----------------------------------------------------------------------------
 * Next 16 file convention. Renders the same brand mark as `app/icon.tsx`
 * scaled for iOS's chunky icon canvas. iOS bakes a square mask onto whatever
 * we ship, so we deliberately fill the whole frame with the dark canvas —
 * the rounded-corner clip happens at the OS layer.
 */
import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 } as const
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          "100%",
          height:         "100%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     "#0A0A0B",
        }}
      >
        {/* Subtle atmospheric glow — gives the icon depth on the iOS home
            screen without making it look busy at the spotlight-grid size. */}
        <div
          style={{
            position: "absolute",
            inset:    0,
            background:
              "radial-gradient(circle at 30% 30%, rgba(16,185,129,0.25), transparent 60%)," +
              "radial-gradient(circle at 70% 70%, rgba(139,92,246,0.22), transparent 60%)",
          }}
        />
        <svg width="120" height="120" viewBox="0 0 64 64" fill="none" style={{ position: "relative" }}>
          <defs>
            <linearGradient id="ai-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#34D399" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#ai-g)" />
          <circle cx="18" cy="32" r="12" fill="url(#ai-g)" />
          <circle cx="46" cy="32" r="12" fill="url(#ai-g)" />
          <circle cx="46" cy="32" r="5"  fill="#0A0A0B" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
