/**
 * /reviews/[slug]/opengraph-image — dynamic OG image (1200×630)
 * ----------------------------------------------------------------------------
 * Etap E flip 2026-06-01: now reads the `tools` row in Supabase (was MDX
 * frontmatter). One PNG per published tool, generated at build time via
 * generateStaticParams; revalidates on the same 24-hour cadence as the
 * review page so cache and HTML stay in lockstep.
 *
 * Visual: dark canvas mirroring /compare/[slug] — mint+violet glow, wordmark
 * top-left, review headline mid, "{date} · {rating}/10" bottom. Keeps the
 * social card looking like one family.
 */
import { ImageResponse } from "next/og"

import { createServiceClient } from "@/lib/supabase/service"

export const alt = "Review · Botapolis"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"
export const revalidate = 86400

interface ImageProps {
  params: Promise<{ slug: string }>
}

interface OgTool {
  title:       string
  rating?:     number
  publishedAt?: string
}

export async function generateStaticParams() {
  try {
    const sb = createServiceClient()
    const { data, error } = await sb
      .from("tools")
      .select("slug")
      .eq("status", "published")
      .limit(500)
    if (error || !data) return []
    return data.map((t) => ({ slug: t.slug }))
  } catch {
    return []
  }
}

async function fetchTool(slug: string): Promise<OgTool | null> {
  try {
    const sb = createServiceClient()
    const { data, error } = await sb
      .from("tools")
      .select("name, meta_title, rating, created_at, updated_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (error || !data) return null
    const title = data.meta_title ?? `${data.name} review 2026`
    const date = (data.updated_at ?? data.created_at)?.slice(0, 10)
    return {
      title,
      rating: data.rating ?? undefined,
      publishedAt: date,
    }
  } catch {
    return null
  }
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params
  const fm = (await fetchTool(slug)) ?? { title: "Review" }

  return new ImageResponse(
    (
      <div
        style={{
          width:          "100%",
          height:         "100%",
          display:        "flex",
          flexDirection:  "column",
          background:     "#0A0A0B",
          color:          "#FAFAFA",
          fontFamily:     "Geist, system-ui, sans-serif",
          position:       "relative",
          padding:        "72px 80px",
        }}
      >
        {/* Atmospheric mint glow */}
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
        {/* Atmospheric violet glow */}
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

        {/* Top strip: logo + eyebrow */}
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        16,
            position:   "relative",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="rv-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#rv-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#rv-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#rv-grad)" />
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
            review
          </span>
        </div>

        {/* Center: review title */}
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            position:       "relative",
            paddingTop:     20,
          }}
        >
          <div
            style={{
              fontSize:      fm.title.length > 60 ? 52 : 60,
              fontWeight:    600,
              letterSpacing: "-0.035em",
              color:         "#FAFAFA",
              lineHeight:    1.1,
              maxWidth:      980,
            }}
          >
            {fm.title}
          </div>
        </div>

        {/* Bottom strip: date + rating chip */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            position:       "relative",
            fontSize:       18,
            color:          "#A1A1AA",
            fontFamily:     "Geist Mono, ui-monospace, monospace",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {fm.publishedAt && <span>{fm.publishedAt}</span>}
          </div>

          {fm.rating != null && (
            <div
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           10,
                padding:       "12px 20px",
                borderRadius:  9999,
                background:    "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                color:         "#0A0A0B",
                fontWeight:    700,
                fontSize:      22,
                letterSpacing: "0.02em",
                boxShadow:     "0 0 0 6px rgba(16,185,129,0.18), 0 0 40px rgba(16,185,129,0.4)",
              }}
            >
              <span>{fm.rating.toFixed(1)}/10</span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
