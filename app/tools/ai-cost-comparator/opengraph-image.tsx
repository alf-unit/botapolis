/**
 * /tools/ai-cost-comparator/opengraph-image — 1200×630 social card
 */
import { ImageResponse } from "next/og"

export const alt = "AI Cost Comparator · Botapolis"
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
        {/* Violet glow — AI semantic per design system */}
        <div
          style={{
            position: "absolute",
            top:      -200,
            right:    -160,
            width:    780,
            height:   780,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.42), rgba(139,92,246,0) 65%)",
            filter:   "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom:   -240,
            left:     -120,
            width:    680,
            height:   680,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.30), rgba(16,185,129,0) 60%)",
            filter:   "blur(50px)",
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
              <linearGradient id="og-aicc-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#og-aicc-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#og-aicc-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#og-aicc-grad)" />
            <circle cx="46" cy="32" r="5"  fill="#0A0A0B" />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.04em", color: "#FAFAFA" }}>
            botapolis
          </span>
          <span style={{ opacity: 0.4, fontSize: 20 }}>·</span>
          <span style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            ai cost
          </span>
        </div>

        {/* Title + mock bar chart */}
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
            AI Cost<br />Comparator
          </h1>

          {/* Mini bar chart preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 820 }}>
            {[
              { name: "Claude Haiku 4.5", cost: "$28", w: 22 },
              { name: "GPT-4o mini",      cost: "$11", w: 10 },
              { name: "Gemini 2.5 Pro",   cost: "$58", w: 42 },
              { name: "Claude Sonnet 4.6", cost: "$76", w: 60 },
            ].map((row) => (
              <div key={row.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: "#FAFAFA" }}>
                  <span>{row.name}</span>
                  <span style={{ fontFamily: "Geist Mono, ui-monospace, monospace", color: "#A1A1AA" }}>
                    {row.cost}/mo
                  </span>
                </div>
                <div
                  style={{
                    height:       10,
                    width:        "100%",
                    background:   "#27272A",
                    borderRadius: 9999,
                    display:      "flex",
                  }}
                >
                  <div
                    style={{
                      width:        `${row.w}%`,
                      height:       10,
                      borderRadius: 9999,
                      background:   "linear-gradient(90deg, #34D399, #8B5CF6)",
                    }}
                  />
                </div>
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
          <span>botapolis.com / tools / ai-cost-comparator</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#8B5CF6" }}>●</span>
            <span>AI · live</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
