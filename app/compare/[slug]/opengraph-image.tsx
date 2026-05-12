/**
 * /compare/[...slug]/opengraph-image — dynamic OG image (1200×630)
 * ----------------------------------------------------------------------------
 * Built with next/og / Satori. The image is statically optimized at build
 * time (one per comparison from generateStaticParams) and revalidated on the
 * same 24-hour cadence as the parent page.
 *
 * Layout: dark canvas with mint+violet atmospheric glow, "botapolis ·
 * comparison" eyebrow on top, then the duel block — Tool A logo · "VS" pill
 * · Tool B logo — with both names underneath. Bottom strip shows the
 * comparison slug in mono for quick visual ID when shared in chat.
 *
 * Logos:
 *   - If `logo_url` starts with "http", we let Satori fetch it directly.
 *   - If it's a local "/tools/foo.svg" path that may not be deployed yet, we
 *     fall back to an initial-letter tile so the OG never breaks on missing
 *     assets. (Same fallback strategy as <ToolLogo>.)
 */
import { ImageResponse } from "next/og"
import { createServiceClient } from "@/lib/supabase/service"
import type { ToolRow } from "@/lib/supabase/types"

export const alt = "Comparison · Botapolis"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"

// Match the parent page's revalidation window so OG cache and HTML cache
// don't drift after editorial edits.
export const revalidate = 86400

interface ImageProps {
  params: Promise<{ slug: string }>
}

type ToolSlice = Pick<ToolRow, "slug" | "name" | "logo_url">

// ---------------------------------------------------------------------------
// Inherit the parent's static params so each prebuilt comparison page also
// gets a matching prebuilt OG image. Same try/catch shape as the page so a
// missing migration doesn't blow up the whole build.
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("comparisons")
      .select("slug")
      .eq("status", "published")
      .eq("language", "en")
      .limit(1000)
    if (error || !data) return []
    return data.map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Data: comparison → both tools (slug, name, logo_url only — that's all
// Satori needs).
// ---------------------------------------------------------------------------
async function fetchTwo(slug: string):
  Promise<{ toolA: ToolSlice; toolB: ToolSlice } | null>
{
  try {
    const supabase = createServiceClient()
    const { data: cmp } = await supabase
      .from("comparisons")
      .select("tool_a_id, tool_b_id")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (!cmp) return null

    const [{ data: toolA }, { data: toolB }] = await Promise.all([
      supabase.from("tools").select("slug, name, logo_url").eq("id", cmp.tool_a_id).maybeSingle(),
      supabase.from("tools").select("slug, name, logo_url").eq("id", cmp.tool_b_id).maybeSingle(),
    ])
    if (!toolA || !toolB) return null

    return { toolA, toolB }
  } catch (err) {
    console.error(`[og /compare/${slug}] fetch threw:`, err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------
export default async function Image({ params }: ImageProps) {
  const { slug } = await params
  const pair = await fetchTwo(slug)

  // Fallback OG when the slug is bogus or DB is empty — still want a
  // valid 1200×630 image rather than a 500, so social previews don't break.
  const toolA = pair?.toolA ?? { slug: "tool-a", name: "Tool A", logo_url: null }
  const toolB = pair?.toolB ?? { slug: "tool-b", name: "Tool B", logo_url: null }
  const slugLabel = slug ?? "comparison"

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
          padding:       "64px 80px",
        }}
      >
        {/* Atmospheric mint glow — top-left */}
        <div
          style={{
            position: "absolute",
            top:      -200,
            left:     -160,
            width:    720,
            height:   720,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.40), rgba(16,185,129,0) 65%)",
            filter:   "blur(40px)",
          }}
        />
        {/* Atmospheric violet glow — top-right */}
        <div
          style={{
            position: "absolute",
            top:      -200,
            right:    -160,
            width:    720,
            height:   720,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.36), rgba(139,92,246,0) 65%)",
            filter:   "blur(40px)",
          }}
        />

        {/* Top strip: wordmark + eyebrow */}
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
              <linearGradient id="cmp-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#cmp-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#cmp-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#cmp-grad)" />
            <circle cx="46" cy="32" r="5"  fill="#0A0A0B" />
          </svg>
          <span
            style={{
              fontSize:      24,
              fontWeight:    600,
              letterSpacing: "-0.04em",
              color:         "#FAFAFA",
            }}
          >
            botapolis
          </span>
          <span style={{ opacity: 0.4, fontSize: 20 }}>·</span>
          <span
            style={{
              fontSize:       14,
              textTransform:  "uppercase",
              letterSpacing:  "0.12em",
              color:          "#A1A1AA",
            }}
          >
            comparison
          </span>
        </div>

        {/* Center: VS duel block */}
        <div
          style={{
            flex:           1,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
            paddingTop:     40,
          }}
        >
          <ToolSide tool={toolA} alignment="left" />

          {/* VS pill */}
          <div
            style={{
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           16,
            }}
          >
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          120,
                height:         120,
                borderRadius:   "9999px",
                background:     "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                color:          "#0A0A0B",
                fontFamily:     "Geist Mono, ui-monospace, monospace",
                fontWeight:     700,
                fontSize:       36,
                letterSpacing:  "0.14em",
                boxShadow:      "0 0 0 6px rgba(16,185,129,0.18), 0 0 40px rgba(16,185,129,0.4)",
              }}
            >
              VS
            </div>
          </div>

          <ToolSide tool={toolB} alignment="right" />
        </div>

        {/* Bottom strip: slug + domain */}
        <div
          style={{
            marginTop:      32,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
            fontSize:       18,
            color:          "#71717A",
            fontFamily:     "Geist Mono, ui-monospace, monospace",
          }}
        >
          <span>{slugLabel}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#10B981" }}>●</span>
            <span>botapolis.com / compare</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}

// ---------------------------------------------------------------------------
// Tool side — square logo card on top, big tool name underneath. If the
// logo URL is an external URL Satori can fetch, render <img>; otherwise we
// degrade to an initial-letter tile that mirrors <ToolLogo>'s fallback.
// ---------------------------------------------------------------------------
function ToolSide({
  tool,
  alignment,
}: {
  tool: ToolSlice
  alignment: "left" | "right"
}) {
  const showImage = tool.logo_url?.startsWith("http")

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     alignment === "left" ? "flex-start" : "flex-end",
        gap:            24,
        maxWidth:       360,
      }}
    >
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          140,
          height:         140,
          borderRadius:   28,
          background:     "#131316",
          border:         "1px solid #27272A",
          overflow:       "hidden",
        }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tool.logo_url!}
            alt=""
            width={112}
            height={112}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              width:          112,
              height:         112,
              borderRadius:   24,
              background:     "linear-gradient(135deg, rgba(16,185,129,0.30) 0%, rgba(139,92,246,0.30) 100%)",
              color:          "#FAFAFA",
              fontSize:       64,
              fontWeight:     700,
              letterSpacing:  "-0.04em",
            }}
          >
            {tool.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize:       56,
          fontWeight:     600,
          letterSpacing:  "-0.04em",
          color:          "#FAFAFA",
          textAlign:      alignment === "left" ? "left" : "right",
          lineHeight:     1.05,
        }}
      >
        {tool.name}
      </div>
    </div>
  )
}
