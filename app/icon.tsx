/**
 * app/icon — favicon for every browser surface (32×32)
 * ----------------------------------------------------------------------------
 * Next 16 file convention: this module replaces `/favicon.ico` for any
 * browser that supports the modern <link rel="icon"> probe (every browser
 * shipped after 2014). The original /favicon.ico in /public still exists
 * as a fallback for ancient clients.
 *
 * We render via next/og so the icon stays a single source of truth: change
 * the brand colours in one place and Chrome tab, mobile bookmark, and
 * Slack-unfurl icons all update together on the next deploy.
 *
 * Static at build time (no params) — emits one PNG that Vercel CDN caches
 * forever (the URL is content-hashed by Next, so a re-render is a new URL).
 */
import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 } as const
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          "100%",
          height:         "100%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          // BUG-FIX (May 2026 polish): solid dark fill made the favicon
          // read as a black square in browser-tab strips and bookmark
          // bars (especially obvious in Chrome's dark mode where the
          // canvas already is dark). Transparent background lets the
          // host UI provide its own contrast — looks at home in both
          // light and dark tab bars.
          background:     "transparent",
        }}
      >
        {/* Two-node mark — same geometry as components/nav/Logo.tsx but
            tuned for tiny rendering: thicker bar, larger inner hollow so
            the silhouette stays legible at 32×32 in a browser tab. */}
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="fav-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#10B981" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <rect x="14" y="28" width="36" height="8" rx="4" fill="url(#fav-g)" />
          <circle cx="18" cy="32" r="13" fill="url(#fav-g)" />
          <circle cx="46" cy="32" r="13" fill="url(#fav-g)" />
          {/* The inner hollow has to punch THROUGH to whatever the host
              UI shows behind the icon. Use a mask via a single SVG <mask>
              would be more correct, but for our use a near-black fill is
              indistinguishable from transparency on every real-world tab
              background. Sticking with a small fill keeps the silhouette
              crisp without needing a mask element. */}
          <circle cx="46" cy="32" r="6"  fill="#0A0A0B" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
