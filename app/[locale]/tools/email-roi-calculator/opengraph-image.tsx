/**
 * /tools/email-roi-calculator/opengraph-image — 1200×630 social card
 * ----------------------------------------------------------------------------
 * Static at build time; revalidates on the same daily cadence as the page.
 * Layout mirrors the compare-route OG visual language so social previews
 * look like a family of cards rather than three unrelated ones.
 */
import { ImageResponse } from "next/og"

export const alt = "Email ROI Calculator · Botapolis"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"
export const revalidate = 86400

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width:    "100%",
          height:   "100%",
          display:  "flex",
          flexDirection: "column",
          background:    "#0A0A0B",
          color:         "#FAFAFA",
          fontFamily:    "Geist, system-ui, sans-serif",
          position:      "relative",
          padding:       "72px 80px",
        }}
      >
        {/* Mint glow — anchors brand */}
        <div
          style={{
            position: "absolute",
            top:      -200,
            right:    -160,
            width:    760,
            height:   760,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.40), rgba(16,185,129,0) 65%)",
            filter:   "blur(40px)",
          }}
        />
        {/* Wordmark + eyebrow */}
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        16,
            position:   "relative",
            color:      "#A1A1AA",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="og-eroi-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#og-eroi-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#og-eroi-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#og-eroi-grad)" />
            <circle cx="46" cy="32" r="5"  fill="#0A0A0B" />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.04em", color: "#FAFAFA" }}>
            botapolis
          </span>
          <span style={{ opacity: 0.4, fontSize: 20 }}>·</span>
          <span style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            calculator
          </span>
        </div>

        {/* Title + sample stat */}
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            gap:            32,
            position:       "relative",
            maxWidth:       980,
          }}
        >
          <h1
            style={{
              margin:        0,
              fontSize:      88,
              lineHeight:    1.0,
              fontWeight:    600,
              letterSpacing: "-0.04em",
              color:         "#FAFAFA",
            }}
          >
            Email ROI<br />Calculator
          </h1>
          <div
            style={{
              display:    "flex",
              alignItems: "flex-end",
              gap:        24,
            }}
          >
            <div
              style={{
                fontFamily:    "Geist Mono, ui-monospace, monospace",
                fontSize:      120,
                lineHeight:    1,
                fontWeight:    500,
                letterSpacing: "-0.04em",
                background:    "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                backgroundClip: "text",
                color:         "transparent",
                display:       "flex",
              }}
            >
              $18,420
            </div>
            <span
              style={{
                fontSize:   28,
                color:      "#A1A1AA",
                paddingBottom: 16,
              }}
            >
              /mo · sample
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 26, lineHeight: 1.4, color: "#A1A1AA", maxWidth: 820 }}>
            Live revenue from subscribers · open rate · CTR · AOV. Compare Klaviyo, Mailchimp, Omnisend cost.
          </p>
        </div>

        {/* Bottom rail */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
            fontSize:       18,
            color:          "#71717A",
            fontFamily:     "Geist Mono, ui-monospace, monospace",
          }}
        >
          <span>botapolis.com / tools / email-roi-calculator</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#10B981" }}>●</span>
            <span>operator's manual</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
