import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, ExternalLink, Layers, Tag } from "lucide-react"
import type { Metadata } from "next"

import { cn, absoluteUrl } from "@/lib/utils"
import { createServiceClient } from "@/lib/supabase/service"
import { buildMetadata } from "@/lib/seo/metadata"
import { generateReviewSchema, generateBreadcrumbSchema } from "@/lib/seo/schema"
import { buttonVariants } from "@/components/ui/button"
import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { ToolLogo } from "@/components/tools/ToolLogo"
import { RatingStars } from "@/components/tools/RatingStars"
import { PricingBadge } from "@/components/tools/PricingBadge"
import { ProsConsList } from "@/components/tools/ProsConsList"
import { FeaturesList } from "@/components/tools/FeaturesList"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   /tools/[slug] — single tool detail
   ----------------------------------------------------------------------------
   SSG via generateStaticParams + ISR 24 h. Unknown slugs render dynamically
   (`dynamicParams = true`) and trigger `notFound()` if no row matches.

   The Supabase migration may not exist in the DB the build is reading from
   (preview env, fresh clone, etc.), so generateStaticParams degrades to an
   empty list and we fall back to on-demand rendering.
---------------------------------------------------------------------------- */

export const revalidate = 86400
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

// --------------------------------------------------------------------------
// Data
// --------------------------------------------------------------------------
async function fetchTool(slug: string): Promise<ToolRow | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (error) {
      console.error(`[/tools/${slug}] fetch failed:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.error(`[/tools/${slug}] fetch threw:`, err)
    return null
  }
}

// --------------------------------------------------------------------------
// generateStaticParams — pre-render every published tool at build time
// --------------------------------------------------------------------------
export async function generateStaticParams() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("slug")
      .eq("status", "published")
      .limit(1000)
    if (error || !data) return []
    return data.map((t) => ({ slug: t.slug }))
  } catch {
    // Migration not applied to this DB yet; let dynamicParams handle it.
    return []
  }
}

// --------------------------------------------------------------------------
// Metadata
// --------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tool = await fetchTool(slug)
  const locale = await getLocale()

  if (!tool) {
    return buildMetadata({
      title:       "Tool not found",
      description: "We couldn't find this tool in the catalog.",
      path:        `/tools/${slug}`,
      locale,
      noIndex:     true,
    })
  }

  const title = tool.meta_title ?? `${tool.name} review · ${tool.tagline ?? "Shopify tool review"}`
  const description =
    tool.meta_description ??
    tool.tagline ??
    (tool.description ?? "").slice(0, 180)

  const ogPath =
    "/api/og?title=" +
    encodeURIComponent(tool.name) +
    "&description=" +
    encodeURIComponent(tool.tagline ?? description.slice(0, 140)) +
    "&eyebrow=review" +
    (tool.logo_url ? `&logo=${encodeURIComponent(tool.logo_url)}` : "")

  return buildMetadata({
    title,
    description,
    path:    `/tools/${tool.slug}`,
    locale,
    ogImage: ogPath,
    type:    "article",
    article: {
      publishedTime: tool.created_at,
      modifiedTime:  tool.updated_at,
      author:        "Botapolis editorial",
      section:       tool.category,
      tags:          tool.subcategories,
    },
    keywords: [tool.name, ...tool.subcategories, "shopify", "review", "comparison"],
  })
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------
export default async function ToolDetailPage({ params }: PageProps) {
  const { slug } = await params
  const tool = await fetchTool(slug)
  if (!tool) notFound()

  const locale = await getLocale()
  const dict   = await getDictionary(locale)
  const localePrefix = locale === "ru" ? "/ru" : ""

  // i18n strings — kept inline here so we don't blow up the locale JSON
  // with every section heading. Move to dictionaries once RU is real.
  const t = {
    tryTool:        locale === "ru" ? `Открыть ${tool.name}` : `Try ${tool.name}`,
    visitWebsite:   locale === "ru" ? "Сайт"              : "Website",
    overview:       locale === "ru" ? "О продукте"         : "Overview",
    pros:           locale === "ru" ? "Плюсы"              : "Pros",
    cons:           locale === "ru" ? "Минусы"             : "Cons",
    features:       locale === "ru" ? "Возможности"        : "Features",
    pricing:        locale === "ru" ? "Цены"               : "Pricing",
    integrations:   locale === "ru" ? "Интеграции"         : "Integrations",
    bestFor:        locale === "ru" ? "Кому подойдёт"     : "Best for",
    notFor:         locale === "ru" ? "Кому не подойдёт"  : "Not for",
    affiliateNote:  locale === "ru"
      ? "Партнёрская ссылка. Цены и условия определяет вендор."
      : "Affiliate link. Pricing and terms are set by the vendor.",
    breadcrumbHome:  locale === "ru" ? "Главная" : "Home",
  }

  // JSON-LD
  const reviewSchema = generateReviewSchema({
    tool,
    authorName:  "Botapolis editorial",
    publishedAt: tool.created_at,
    updatedAt:   tool.updated_at,
    reviewPath:  `/tools/${tool.slug}`,
  })
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: t.breadcrumbHome, path: `${localePrefix}/` },
    { name: dict.nav.tools,   path: `${localePrefix}/tools` },
    { name: tool.name,        path: `${localePrefix}/tools/${tool.slug}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix as "" | "/ru"} />

      <main>
        {/* =========================================================
            HERO
           ========================================================= */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-20 size-[640px] rounded-full opacity-50 blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)",
            }}
          />

          <div className="container-default relative pt-10 pb-12 lg:pt-14 lg:pb-16">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
            >
              <Link
                href={`${localePrefix}/`}
                className="hover:text-[var(--text-secondary)]"
              >
                {t.breadcrumbHome}
              </Link>
              <span className="opacity-60">/</span>
              <Link
                href={`${localePrefix}/tools`}
                className="hover:text-[var(--text-secondary)]"
              >
                {dict.nav.tools}
              </Link>
              <span className="opacity-60">/</span>
              <span className="text-[var(--text-secondary)]">{tool.name}</span>
            </nav>

            <div className="mt-6 grid gap-8 lg:gap-12 lg:grid-cols-[auto_1fr_auto] lg:items-start">
              <ToolLogo
                src={tool.logo_url}
                name={tool.name}
                size={88}
                className="rounded-2xl"
              />

              <div className="min-w-0 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border-base)] px-2.5 py-0.5 text-[12px] font-mono uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    <Tag className="size-3" />
                    {tool.category}
                  </span>
                  {tool.featured > 0 && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-mono uppercase tracking-[0.06em] text-white"
                      style={{ background: "var(--gradient-hero)" }}
                    >
                      Featured
                    </span>
                  )}
                  <PricingBadge
                    model={tool.pricing_model}
                    min={tool.pricing_min}
                    max={tool.pricing_max}
                    notes={tool.pricing_notes}
                  />
                </div>

                <h1 className="text-h1 font-semibold tracking-[-0.03em]">
                  {tool.name}
                </h1>

                {tool.tagline && (
                  <p className="text-lg leading-[1.55] text-[var(--text-secondary)] max-w-2xl">
                    {tool.tagline}
                  </p>
                )}

                <div className="mt-1 flex items-center gap-4">
                  <RatingStars rating={tool.rating} size="lg" />
                  {tool.rating != null && (
                    <span className="text-[13px] text-[var(--text-tertiary)] font-mono">
                      {locale === "ru" ? "из 10" : "out of 10"}
                    </span>
                  )}
                </div>
              </div>

              {/* CTA column */}
              <div className="flex flex-col gap-3 lg:min-w-[220px]">
                <Link
                  href={`${localePrefix}/go/${tool.slug}`}
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 px-5 text-base text-white",
                  )}
                  style={{
                    background:
                      "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                  }}
                >
                  {t.tryTool}
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href={tool.website_url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 px-5 text-base",
                  )}
                >
                  {t.visitWebsite}
                  <ExternalLink className="size-4" />
                </Link>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-[1.5]">
                  {t.affiliateNote}{" "}
                  <Link
                    href={`${localePrefix}/legal/affiliate-disclosure`}
                    className="underline-offset-4 hover:underline"
                  >
                    {locale === "ru" ? "подробнее" : "details"}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            OVERVIEW
           ========================================================= */}
        {tool.description && (
          <Section title={t.overview} eyebrow="01">
            <p className="text-[17px] leading-[1.7] text-[var(--text-secondary)] max-w-3xl">
              {tool.description}
            </p>
          </Section>
        )}

        {/* =========================================================
            PROS / CONS
           ========================================================= */}
        {(tool.pros.length > 0 || tool.cons.length > 0) && (
          <Section title={`${t.pros} & ${t.cons}`} eyebrow="02">
            <ProsConsList
              pros={tool.pros}
              cons={tool.cons}
              prosLabel={t.pros}
              consLabel={t.cons}
            />
          </Section>
        )}

        {/* =========================================================
            FEATURES
           ========================================================= */}
        {tool.features?.length > 0 && (
          <Section title={t.features} eyebrow="03">
            <FeaturesList features={tool.features} />
          </Section>
        )}

        {/* =========================================================
            PRICING
           ========================================================= */}
        <Section title={t.pricing} eyebrow="04">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="max-w-2xl text-[15px] leading-[1.7] text-[var(--text-secondary)]">
              {tool.pricing_notes ?? (
                <span className="text-[var(--text-tertiary)] italic">
                  {locale === "ru"
                    ? "Цены актуальны на момент публикации. Вендор может менять без предупреждения."
                    : "Pricing accurate at publication. Vendor may change without notice."}
                </span>
              )}
            </div>
            <PricingBadge
              model={tool.pricing_model}
              min={tool.pricing_min}
              max={tool.pricing_max}
              size="md"
            />
          </div>
        </Section>

        {/* =========================================================
            INTEGRATIONS
           ========================================================= */}
        {tool.integrations?.length > 0 && (
          <Section title={t.integrations} eyebrow="05">
            <div className="flex flex-wrap gap-2">
              {tool.integrations.map((slug) => (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-base)] bg-[var(--bg-surface)] px-3 py-1 text-[13px] text-[var(--text-secondary)]"
                >
                  <Layers className="size-3.5 text-[var(--text-tertiary)]" />
                  {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* =========================================================
            BEST FOR / NOT FOR
           ========================================================= */}
        {(tool.best_for || tool.not_for) && (
          <Section title={`${t.bestFor} / ${t.notFor}`} eyebrow="06">
            <div className="grid gap-4 md:grid-cols-2">
              {tool.best_for && (
                <FitCard
                  variant="good"
                  label={t.bestFor}
                  body={tool.best_for}
                />
              )}
              {tool.not_for && (
                <FitCard
                  variant="bad"
                  label={t.notFor}
                  body={tool.not_for}
                />
              )}
            </div>
          </Section>
        )}

        {/* =========================================================
            CTA tail
           ========================================================= */}
        <section className="container-default pb-20">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
              "p-8 lg:p-10 shadow-[var(--shadow-md)]",
            )}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 -top-1/2 h-[200%] pointer-events-none opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(16,185,129,0.12), transparent 60%)",
              }}
            />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {locale === "ru" ? "Готовы начать?" : "Ready to try it?"}
                </p>
                <h3 className="mt-2 text-h3 font-semibold tracking-[-0.02em]">
                  {locale === "ru"
                    ? `Откройте ${tool.name} и проверьте на своём магазине.`
                    : `Open ${tool.name} and try it on your own store.`}
                </h3>
              </div>
              <Link
                href={`${localePrefix}/go/${tool.slug}`}
                rel="sponsored nofollow noopener"
                target="_blank"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 px-6 text-base text-white",
                )}
                style={{
                  background:
                    "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                }}
              >
                {t.tryTool}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer
        strings={{
          tagline:    dict.footer.tagline,
          copyright:  dict.footer.copyright,
          columns:    dict.footer.columns,
          links:      dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix as "" | "/ru"}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}/tools/${tool.slug}`)} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Reusable section primitive — eyebrow + heading + slot
// ---------------------------------------------------------------------------
function Section({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section className="container-default py-10 lg:py-14 border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-3">
        {eyebrow && (
          <span className="inline-flex h-6 items-center rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 text-[11px] font-mono text-[var(--text-tertiary)]">
            {eyebrow}
          </span>
        )}
        <h2 className="text-h2 font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function FitCard({
  variant,
  label,
  body,
}: {
  variant: "good" | "bad"
  label: string
  body: string
}) {
  const accent = variant === "good" ? "var(--success)" : "var(--danger)"
  return (
    <div
      className="rounded-2xl border p-5 lg:p-6"
      style={{
        borderColor: `color-mix(in oklch, ${accent} 24%, transparent)`,
        background:  `color-mix(in oklch, ${accent} 5%, transparent)`,
      }}
    >
      <p
        className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: accent }}
      >
        {label}
      </p>
      <p className="mt-2 text-[15px] leading-[1.6] text-[var(--text-primary)]">
        {body}
      </p>
    </div>
  )
}
