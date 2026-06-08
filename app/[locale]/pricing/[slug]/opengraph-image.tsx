/**
 * /pricing/[slug]/opengraph-image — dynamic OG image (1200×630)
 * ----------------------------------------------------------------------------
 * Same recipe as the guides OG card with the eyebrow swapped to "pricing".
 * Frontmatter is read directly to avoid recompiling MDX just for the OG
 * payload. The price chip in the bottom-right is rendered when the tool's
 * pricing_min is non-null — pulled from Supabase to keep OG copy aligned
 * with the live PriceCard on the page.
 */
import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { notFound } from "next/navigation"
import { ImageResponse } from "next/og"

import { getAllMdxSlugs } from "@/lib/content/mdx"
import { isSlugVisible } from "@/lib/content/visibility"
import { createServiceClient } from "@/lib/supabase/service"

export const alt = "Pricing · Botapolis"
export const size = { width: 1200, height: 630 } as const
export const contentType = "image/png"
export const revalidate = 86400

interface ImageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllMdxSlugs("pricing", "en")
  return slugs.map((slug) => ({ slug }))
}

interface OgFrontmatter {
  title:        string
  toolSlug:     string
  author?:      string
  publishedAt?: string
}

async function readFrontmatter(slug: string): Promise<OgFrontmatter | null> {
  const filePath = path.join(process.cwd(), "content", "pricing", "en", `${slug}.mdx`)
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const { data } = matter(raw) as { data: Record<string, unknown> }
    return {
      title:       typeof data.title === "string" ? data.title : "Pricing",
      toolSlug:    typeof data.toolSlug === "string" ? data.toolSlug : "",
      author:      typeof data.author === "string" ? data.author : undefined,
      publishedAt: typeof data.publishedAt === "string" ? data.publishedAt : undefined,
    }
  } catch {
    return null
  }
}

async function fetchToolPrice(toolSlug: string): Promise<{ priceMin: number | null; model: string | null }> {
  if (!toolSlug) return { priceMin: null, model: null }
  try {
    const sb = createServiceClient()
    const { data } = await sb
      .from("tools")
      .select("pricing_min, pricing_model")
      .eq("slug", toolSlug)
      .maybeSingle()
    return {
      priceMin: data?.pricing_min ?? null,
      model:    data?.pricing_model ?? null,
    }
  } catch {
    return { priceMin: null, model: null }
  }
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params
  // Drip gate — a hidden pricing page must be invisible EVERYWHERE, including
  // its OG sub-resource. generateStaticParams (gated) already excludes hidden
  // slugs from the prerendered set, but dynamicParams defaults to true so an
  // on-demand request to /pricing/{hidden}/opengraph-image would otherwise
  // render from the on-disk frontmatter and 200. Gate it at runtime so the OG
  // image dynamically follows the gate: 404 while hidden, renders once the
  // drip flip makes the page visible (no rebuild needed). EN + RU share this
  // default export, so both locales inherit the gate.
  if (!(await isSlugVisible("pricing", slug))) notFound()
  const fm = (await readFrontmatter(slug)) ?? { title: "Pricing", toolSlug: "" }
  const { priceMin, model } = await fetchToolPrice(fm.toolSlug)

  const priceChip =
    model === "free" || (priceMin === 0 && model == null)
      ? "Free"
      : priceMin != null
      ? `from $${priceMin}/mo`
      : null

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
        {/* Glow — emerald-forward to distinguish pricing from playbook
            (violet) and review (mixed). */}
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
        <div
          style={{
            position: "absolute",
            top:      -200,
            right:    -160,
            width:    720,
            height:   720,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.30), rgba(139,92,246,0) 65%)",
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
          }}
        >
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="pr-grad" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%"   stopColor="#10B981" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="29" width="36" height="6" rx="3" fill="url(#pr-grad)" />
            <circle cx="18" cy="32" r="12" fill="url(#pr-grad)" />
            <circle cx="46" cy="32" r="12" fill="url(#pr-grad)" />
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
            pricing
          </span>
        </div>

        {/* Title */}
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

        {/* Bottom strip */}
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
            {fm.author && <span>by {fm.author}</span>}
            {fm.author && fm.publishedAt && <span style={{ opacity: 0.4 }}>·</span>}
            {fm.publishedAt && <span>{fm.publishedAt}</span>}
          </div>

          {priceChip && (
            <div
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            10,
                padding:        "12px 20px",
                borderRadius:   9999,
                background:     "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                color:          "#0A0A0B",
                fontWeight:     700,
                fontSize:       22,
                boxShadow:      "0 0 0 6px rgba(16,185,129,0.18), 0 0 40px rgba(16,185,129,0.4)",
              }}
            >
              <span>{priceChip}</span>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  )
}
