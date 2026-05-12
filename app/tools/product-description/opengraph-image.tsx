/**
 * /tools/product-description/opengraph-image — 1200×630 social card
 */
import { ImageResponse } from "next/og"

export const alt = "AI Product Description Generator · Botapolis"
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
        {/* Atmospheric glow — violet→mint, leans into AI */}
        <div
          style={{
            position: "absolute",
            top:      -200,
            right:    -160,
            width:    760,
            height:   760,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.45), rgba(139,92,246,0) 65%)",
            filter:   "blur(40px)",
          }}
        />

        {/* Top strip */}
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
              <linearGradient id="og-pdg-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#og-pdg-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#og-pdg-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#og-pdg-grad)" />
            <circle cx="46" cy="32" r="5"  fill="#0A0A0B" />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.04em", color: "#FAFAFA" }}>
            botapolis
          </span>
          <span style={{ opacity: 0.4, fontSize: 20 }}>·</span>
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              fontSize:       14,
              textTransform:  "uppercase",
              letterSpacing:  "0.12em",
              gap:            8,
              padding:        "4px 10px",
              borderRadius:   9999,
              background:     "linear-gradient(135deg, #10B981, #8B5CF6)",
              color:          "#FFFFFF",
              fontWeight:     600,
            }}
          >
            AI · live
          </div>
        </div>

        {/* Title + 3 variation tiles */}
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            gap:            36,
            position:       "relative",
            maxWidth:       1040,
          }}
        >
          <h1
            style={{
              margin:        0,
              fontSize:      80,
              lineHeight:    1.0,
              fontWeight:    600,
              letterSpacing: "-0.04em",
              color:         "#FAFAFA",
            }}
          >
            Product copy<br />in 5 seconds.
          </h1>

          <div style={{ display: "flex", gap: 16, width: "100%" }}>
            {[
              { label: "VARIATION 1", text: "Light. Fast. Built for the way you actually carry water." },
              { label: "VARIATION 2", text: "An 800ml bottle that doesn't sweat in your bag — or on your desk." },
              { label: "VARIATION 3", text: "Hydration kit you'll forget you packed until you reach for it." },
            ].map((v) => (
              <div
                key={v.label}
                style={{
                  flex:         1,
                  padding:      "18px 18px 20px",
                  borderRadius: 18,
                  background:   "#131316",
                  border:       "1px solid #27272A",
                  display:      "flex",
                  flexDirection: "column",
                  gap:          10,
                }}
              >
                <span
                  style={{
                    fontFamily:    "Geist Mono, ui-monospace, monospace",
                    fontSize:      11,
                    color:         "#71717A",
                    letterSpacing: "0.08em",
                  }}
                >
                  {v.label}
                </span>
                <span style={{ fontSize: 18, lineHeight: 1.45, color: "#FAFAFA" }}>
                  {v.text}
                </span>
              </div>
            ))}
          </div>
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
          <span>botapolis.com / tools / product-description</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#8B5CF6" }}>●</span>
            <span>powered by Claude Haiku 4.5</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
