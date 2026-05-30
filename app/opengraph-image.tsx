/**
 * /opengraph-image — site-wide default OG card
 * ----------------------------------------------------------------------------
 * Catch-all OG image used by any page that doesn't ship its own
 * `opengraph-image.tsx` (home, about, methodology, contact, /tools index,
 * /reviews index, /guides index, /compare index, search, legal pages, etc.).
 *
 * Static-at-build: no `dynamic`/`revalidate` exports, no per-request params.
 * Next.js bakes this into the static output during `next build`, so the
 * runtime cost on Vercel is zero — bots and social-preview crawlers fetch
 * a plain PNG from the CDN. Added 2026-05-30 after the Vercel Active CPU
 * audit showed dynamic OG generation was a meaningful contributor.
 *
 * Per-slug pages (reviews/[slug], guides/[slug], compare/[slug], etc.)
 * keep their own `opengraph-image.tsx` so each article gets a unique card
 * with its title + logo. Those are dynamic but cached per-slug at the
 * edge for a day — small total volume vs. this default.
 */
import { ImageResponse } from "next/og"

export const alt = "Botapolis — The AI operator's manual for Shopify"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:         "100%",
          height:        "100%",
          display:       "flex",
          flexDirection: "column",
          background:    "#0A0A0B",
          color:         "#FAFAFA",
          fontFamily:    "system-ui, sans-serif",
          position:      "relative",
          padding:       "72px 80px",
        }}
      >
        {/* Atmospheric mint glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.35), rgba(16,185,129,0) 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* Violet glow */}
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: -120,
            width: 680,
            height: 680,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.28), rgba(139,92,246,0) 60%)",
            filter: "blur(50px)",
          }}
        />

        {/* Top strip: wordmark */}
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         16,
            fontSize:    20,
            fontWeight:  500,
            color:       "#A1A1AA",
            position:    "relative",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="og-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#og-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#og-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#og-grad)" />
            <circle cx="46" cy="32" r="5"  fill="#0A0A0B" />
          </svg>
          <span
            style={{
              fontWeight:    600,
              letterSpacing: "-0.04em",
              color:         "#FAFAFA",
              fontSize:      24,
            }}
          >
            botapolis
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Title + tagline */}
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           24,
            position:      "relative",
            maxWidth:      980,
          }}
        >
          <h1
            style={{
              margin:         0,
              fontSize:       72,
              lineHeight:     1.05,
              fontWeight:     600,
              letterSpacing:  "-0.04em",
              color:          "#FAFAFA",
            }}
          >
            The AI operator&apos;s manual for Shopify
          </h1>
          <p
            style={{
              margin:    0,
              fontSize:  28,
              lineHeight: 1.4,
              color:     "#A1A1AA",
            }}
          >
            Calculators that show real ROI. Reviews tested on real stores. Comparisons that pick a winner — not a draw.
          </p>
        </div>

        {/* Bottom strip: domain */}
        <div
          style={{
            marginTop:      48,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
            fontSize:       18,
            color:          "#71717A",
            fontFamily:     "ui-monospace, monospace",
          }}
        >
          <span>botapolis.com</span>
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          12,
            }}
          >
            <span style={{ color: "#10B981" }}>●</span>
            <span>operator&apos;s manual</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
