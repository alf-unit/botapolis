/**
 * GET /api/og — dynamic Open Graph image (1200×630)
 * ----------------------------------------------------------------------------
 * Built with `next/og` (the Next 16 wrapper over @vercel/og — same satori
 * under the hood). Read by external scrapers, so the image MUST be CDN-
 * cacheable for hours and never depend on a logged-in session.
 *
 *   ?title=Klaviyo+review+2026
 *   &description=The+90-day+field+report+from+a+real+%242M+store
 *   &logo=/tools/klaviyo.png          (optional, absolute or app-relative)
 *
 * Falls back to a hero card if no params are supplied — useful as a default
 * site OG and as a smoke-test from /api/og itself.
 *
 * `?variant=cover` switches to a logo-forward in-page cover composition
 * (used by <ArticleCover>): big brand plate + eyebrow + optional rating,
 * deliberately NO title/description so it never duplicates the H1 that
 * sits right next to it on the article page. Extra params:
 *   &eyebrow=Klaviyo+review   &rating=8.7
 */
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import { absoluteUrl, truncate } from "@/lib/utils"

// next/og can't run on the Edge cache in Turbopack when it shares the same
// route as the rest of our nodejs runtime; explicitly opt in to Edge here so
// Satori boots fast and stays out of the Node.js cold-start budget.
export const runtime = "edge"

const SIZE = { width: 1200, height: 630 } as const

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = truncate(
    searchParams.get("title") ?? "The AI operator's manual for Shopify",
    110,
  )
  const description = truncate(
    searchParams.get("description") ??
      "Calculators that show real ROI. Reviews tested on real stores. Comparisons that pick a winner — not a draw.",
    180,
  )
  const logo = searchParams.get("logo")
  const eyebrow = searchParams.get("eyebrow") ?? "botapolis"
  const variant = searchParams.get("variant")
  const rating = searchParams.get("rating")

  // satori-friendly absolute URL — bare paths fail when fetched server-side.
  const logoSrc = logo
    ? logo.startsWith("http")
      ? logo
      : absoluteUrl(logo)
    : null

  // --------------------------------------------------------------------------
  // variant=cover — the in-page article cover. Logo-forward, no headline
  // (the page's <h1> is right next to it). Composition is vertically
  // centred so the 21:9 crop <ArticleCover> applies never clips it.
  // --------------------------------------------------------------------------
  if (variant === "cover") {
    return new ImageResponse(
      (
        <div
          style={{
            width:          "100%",
            height:         "100%",
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            36,
            background:     "#0A0A0B",
            color:          "#FAFAFA",
            fontFamily:     "Geist, system-ui, sans-serif",
            position:       "relative",
          }}
        >
          {/* Same atmospheric mint + violet glows as the OG card so the
              cover and the social-share image feel like one system. */}
          <div
            style={{
              position: "absolute", top: -260, right: -180,
              width: 760, height: 760, borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(16,185,129,0.34), rgba(16,185,129,0) 64%)",
              filter: "blur(46px)",
            }}
          />
          <div
            style={{
              position: "absolute", bottom: -280, left: -160,
              width: 720, height: 720, borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(139,92,246,0.26), rgba(139,92,246,0) 60%)",
              filter: "blur(54px)",
            }}
          />

          {/* Brand plate — mirrors <ToolLogo>'s constant white plate so a
              mono-dark vendor mark stays legible on the dark canvas. */}
          {logoSrc && (
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          176,
                height:         176,
                borderRadius:   32,
                background:     "#FFFFFF",
                border:         "1px solid #27272A",
                position:       "relative",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                width={138}
                height={138}
                style={{ objectFit: "contain" }}
              />
            </div>
          )}

          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            18,
              position:       "relative",
            }}
          >
            <span
              style={{
                textTransform:  "uppercase",
                letterSpacing:  "0.14em",
                fontSize:       24,
                fontWeight:     600,
                color:          "#A1A1AA",
              }}
            >
              {eyebrow}
            </span>
            {rating && (
              <>
                <span style={{ color: "#3F3F46", fontSize: 24 }}>·</span>
                {/* Mint rating pill — the one warm signal on the cover. */}
                <span
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    gap:           8,
                    padding:       "8px 18px",
                    borderRadius:  "9999px",
                    fontSize:      24,
                    fontWeight:    600,
                    color:         "#10B981",
                    border:        "1px solid rgba(16,185,129,0.35)",
                    background:    "rgba(16,185,129,0.10)",
                  }}
                >
                  <span style={{ fontSize: 18 }}>●</span>
                  {rating}
                </span>
              </>
            )}
          </div>
        </div>
      ),
      {
        ...SIZE,
        headers: {
          "cache-control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    )
  }

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

        {/* Top strip: wordmark + eyebrow */}
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
          {/* Linked-nodes mark, simplified for satori */}
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
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 14 }}>
            {eyebrow}
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Logo + title block */}
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           24,
            position:      "relative",
            maxWidth:      980,
          }}
        >
          {logoSrc && (
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          80,
                height:         80,
                borderRadius:   16,
                background:     "#131316",
                border:         "1px solid #27272A",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                width={64}
                height={64}
                style={{ objectFit: "contain" }}
              />
            </div>
          )}
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
            {title}
          </h1>
          <p
            style={{
              margin:    0,
              fontSize:  28,
              lineHeight: 1.4,
              color:     "#A1A1AA",
            }}
          >
            {description}
          </p>
        </div>

        {/* Bottom strip: domain + mint accent rail */}
        <div
          style={{
            marginTop:      48,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
            fontSize:       18,
            color:          "#71717A",
            fontFamily:     "Geist Mono, ui-monospace, monospace",
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
    {
      ...SIZE,
      // Cache for an hour at the edge; the actual image rarely changes
      // because title/desc come from canonical static metadata.
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  )
}
