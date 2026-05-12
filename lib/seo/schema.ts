/**
 * JSON-LD schema generators
 * ----------------------------------------------------------------------------
 * Each function returns a plain object — caller embeds it via
 *   <script type="application/ld+json">{JSON.stringify(schema)}</script>
 * in the page's Server Component.
 *
 * We type loosely (the official schema.org typings are huge and noisy);
 * what matters is that the validator at https://validator.schema.org green-
 * lights the output. Every helper here has been spot-tested in that tool.
 */
import { absoluteUrl } from "@/lib/utils"
import type { ToolRow } from "@/lib/supabase/types"

const SITE_NAME = "Botapolis"
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://botapolis.com"
const ORG_LOGO  = absoluteUrl("/logo.svg")

// ----------------------------------------------------------------------------
// Generic node helper
// ----------------------------------------------------------------------------
type JsonLd = Record<string, unknown>

const withContext = <T extends JsonLd>(node: T): T & { "@context": string } => ({
  "@context": "https://schema.org",
  ...node,
})

// ============================================================================
// Organization — emit once, in root layout
// ============================================================================
export function generateOrganizationSchema(opts: {
  sameAs?: string[]
} = {}) {
  return withContext({
    "@type":   "Organization",
    "@id":     `${SITE_URL}/#organization`,
    name:      SITE_NAME,
    url:       SITE_URL,
    logo:      ORG_LOGO,
    sameAs:    opts.sameAs ?? [
      "https://x.com/botapolis",
      "https://github.com/botapolis",
    ],
  })
}

// ============================================================================
// WebSite — emit on homepage; includes a SearchAction so Google can show
// the in-result sitelinks search box.
// ============================================================================
export function generateWebSiteSchema(opts: {
  searchUrl?: string
} = {}) {
  const search = opts.searchUrl ?? `${SITE_URL}/search?q={search_term_string}`
  return withContext({
    "@type":   "WebSite",
    "@id":     `${SITE_URL}/#website`,
    name:      SITE_NAME,
    url:       SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type":         "SearchAction",
      target:          { "@type": "EntryPoint", urlTemplate: search },
      "query-input":   "required name=search_term_string",
    },
  })
}

// ============================================================================
// SoftwareApplication + Review — for /reviews/[slug] and /directory/[slug]
// ============================================================================
interface ReviewSchemaInput {
  tool: Pick<
    ToolRow,
    | "name" | "slug" | "description" | "tagline"
    | "category" | "logo_url" | "website_url"
    | "pricing_min" | "pricing_model"
    | "rating" | "pros" | "cons"
  >
  /** Author of the editorial review. */
  authorName?: string
  /** ISO date of publication. */
  publishedAt?: string
  /** ISO date last touched. */
  updatedAt?: string
  /** Path of the review page (used as URL anchor). */
  reviewPath?: string
}

export function generateReviewSchema({
  tool,
  authorName = "Botapolis editorial",
  publishedAt,
  updatedAt,
  reviewPath,
}: ReviewSchemaInput) {
  const application: JsonLd = {
    "@type":             "SoftwareApplication",
    "@id":               `${SITE_URL}/directory/${tool.slug}#software`,
    name:                tool.name,
    description:         tool.description ?? tool.tagline ?? undefined,
    applicationCategory: humanCategory(tool.category),
    operatingSystem:     "Web",
    url:                 tool.website_url,
    image:               tool.logo_url ? absoluteUrl(tool.logo_url) : undefined,
  }

  if (tool.pricing_min != null) {
    application.offers = {
      "@type":        "Offer",
      price:          tool.pricing_min,
      priceCurrency:  "USD",
      availability:   "https://schema.org/InStock",
      category:       tool.pricing_model ?? "subscription",
    }
  }

  if (tool.rating != null) {
    application.aggregateRating = {
      "@type":     "AggregateRating",
      ratingValue: tool.rating.toFixed(1),
      bestRating:  10,
      worstRating: 0,
      reviewCount: 1,
    }
  }

  const review = withContext({
    "@type":      "Review",
    "@id":        `${SITE_URL}${reviewPath ?? `/reviews/${tool.slug}`}#review`,
    itemReviewed: application,
    author:       { "@type": "Organization", name: authorName },
    reviewBody:   tool.description ?? "",
    datePublished: publishedAt,
    dateModified:  updatedAt ?? publishedAt,
    positiveNotes: tool.pros.length
      ? { "@type": "ItemList", itemListElement: tool.pros.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p })) }
      : undefined,
    negativeNotes: tool.cons.length
      ? { "@type": "ItemList", itemListElement: tool.cons.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c })) }
      : undefined,
    reviewRating: tool.rating != null
      ? { "@type": "Rating", ratingValue: tool.rating.toFixed(1), bestRating: 10, worstRating: 0 }
      : undefined,
  })

  return review
}

// ============================================================================
// SoftwareApplication — standalone (no Review wrapper)
// ----------------------------------------------------------------------------
// Use on pages that list or compare tools without acting as the primary
// editorial review (e.g. /compare/[slug] emits one per tool). The shape is
// the same as the `itemReviewed` object inside `generateReviewSchema`, just
// callable on its own.
// ============================================================================
type SoftwareApplicationTool = Pick<
  ToolRow,
  | "name" | "slug" | "description" | "tagline"
  | "category" | "logo_url" | "website_url"
  | "pricing_min" | "pricing_model" | "rating"
>

export function generateSoftwareApplicationSchema(tool: SoftwareApplicationTool) {
  const node: JsonLd = {
    "@type":             "SoftwareApplication",
    "@id":               `${SITE_URL}/directory/${tool.slug}#software`,
    name:                tool.name,
    description:         tool.description ?? tool.tagline ?? undefined,
    applicationCategory: humanCategory(tool.category),
    operatingSystem:     "Web",
    url:                 tool.website_url,
    image:               tool.logo_url ? absoluteUrl(tool.logo_url) : undefined,
  }

  if (tool.pricing_min != null) {
    node.offers = {
      "@type":       "Offer",
      price:         tool.pricing_min,
      priceCurrency: "USD",
      availability:  "https://schema.org/InStock",
      category:      tool.pricing_model ?? "subscription",
    }
  }

  if (tool.rating != null) {
    node.aggregateRating = {
      "@type":     "AggregateRating",
      ratingValue: tool.rating.toFixed(1),
      bestRating:  10,
      worstRating: 0,
      reviewCount: 1,
    }
  }

  return withContext(node)
}

// ============================================================================
// SoftwareApplication — for our own first-party tools (sprint 4 calculators)
// ----------------------------------------------------------------------------
// Used by the three /tools/* calculator pages. Unlike the partner-tool helper
// above, this one takes a hand-typed shape — there's no DB row, we're
// describing our own pages.
// ============================================================================
export function generateOwnedToolSchema(opts: {
  name:        string
  description: string
  /** Path including locale prefix, e.g. "/tools/email-roi-calculator". */
  path:        string
  /** schema.org applicationCategory. Defaults to "BusinessApplication". */
  category?:   string
  /** ISO date — optional, lets us surface "updated" in rich results. */
  updatedAt?:  string
}) {
  const url = absoluteUrl(opts.path)
  return withContext({
    "@type":             "SoftwareApplication",
    "@id":               `${url}#app`,
    name:                opts.name,
    description:         opts.description,
    applicationCategory: opts.category ?? "BusinessApplication",
    operatingSystem:     "Web",
    url,
    dateModified:        opts.updatedAt,
    offers: {
      "@type":         "Offer",
      price:           0,
      priceCurrency:   "USD",
      availability:    "https://schema.org/InStock",
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  })
}

// ============================================================================
// FAQPage — for any page that ships a FAQ accordion
// ============================================================================
export function generateFAQSchema(faqs: Array<{ q: string; a: string }>) {
  if (!faqs.length) return null
  return withContext({
    "@type":      "FAQPage",
    mainEntity:   faqs.map((f) => ({
      "@type": "Question",
      name:    f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  })
}

// ============================================================================
// BreadcrumbList — emit on every non-homepage route
// ============================================================================
export function generateBreadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  return withContext({
    "@type":           "BreadcrumbList",
    itemListElement:   items.map((item, i) => ({
      "@type":  "ListItem",
      position: i + 1,
      name:     item.name,
      item:     absoluteUrl(item.path),
    })),
  })
}

// ============================================================================
// ItemList — /best/[slug] and /directory listing pages
// ============================================================================
export function generateItemListSchema(opts: {
  name:  string
  items: Array<{ name: string; url: string; position?: number }>
}) {
  return withContext({
    "@type":         "ItemList",
    name:            opts.name,
    itemListElement: opts.items.map((it, i) => ({
      "@type":  "ListItem",
      position: it.position ?? i + 1,
      url:      absoluteUrl(it.url),
      name:     it.name,
    })),
  })
}

// ============================================================================
// Article — generic schema for /guides/[slug] and /reviews/[slug]
// ----------------------------------------------------------------------------
// For reviews we additionally emit `generateReviewSchema` (Review wraps a
// SoftwareApplication). The Article node is the editorial frame around it —
// Google likes seeing both nodes on the same page.
// ============================================================================
export function generateArticleSchema(opts: {
  /** Article headline (frontmatter.title). */
  headline:      string
  description:   string
  /** Path including locale prefix, e.g. "/reviews/klaviyo-review-2026". */
  path:          string
  /** ISO date of first publish. */
  publishedAt:   string
  /** ISO date of last edit, defaults to publishedAt. */
  updatedAt?:    string
  /** Hero image, falls back to the dynamic OG endpoint when omitted. */
  image?:        string
  /** Author display name. */
  authorName?:   string
  /** Editorial section ("review" | "guide" | "blog"). */
  section?:      string
  /** Subject tags. */
  tags?:         string[]
}) {
  const url = absoluteUrl(opts.path)
  const image = opts.image
    ? absoluteUrl(opts.image)
    : absoluteUrl(`${opts.path}/opengraph-image`)

  return withContext({
    "@type":         "Article",
    "@id":           `${url}#article`,
    headline:        opts.headline,
    description:     opts.description,
    image,
    datePublished:   opts.publishedAt,
    dateModified:    opts.updatedAt ?? opts.publishedAt,
    author: {
      "@type": "Organization",
      name:    opts.authorName ?? "Botapolis editorial",
      url:     SITE_URL,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id":   url,
    },
    articleSection: opts.section,
    keywords:       opts.tags?.join(", "),
  })
}

// ============================================================================
// HowTo — for step-by-step guides
// ============================================================================
export function generateHowToSchema(opts: {
  name:        string
  description: string
  steps:       Array<{ name: string; text: string; image?: string }>
  totalTime?:  string  // ISO-8601 duration (e.g. "PT15M")
}) {
  return withContext({
    "@type":     "HowTo",
    name:        opts.name,
    description: opts.description,
    totalTime:   opts.totalTime,
    step:        opts.steps.map((s, i) => ({
      "@type":   "HowToStep",
      position:  i + 1,
      name:      s.name,
      text:      s.text,
      image:     s.image ? absoluteUrl(s.image) : undefined,
    })),
  })
}

// ----------------------------------------------------------------------------
// Helper: map our internal tool categories to schema.org-friendly labels.
// ----------------------------------------------------------------------------
function humanCategory(c: string): string {
  switch (c) {
    case "email":     return "BusinessApplication"
    case "sms":       return "BusinessApplication"
    case "support":   return "BusinessApplication"
    case "chat":      return "CommunicationApplication"
    case "ads":       return "BusinessApplication"
    case "analytics": return "BusinessApplication"
    case "content":   return "BusinessApplication"
    case "reviews":   return "BusinessApplication"
    case "inventory": return "BusinessApplication"
    case "upsell":    return "BusinessApplication"
    default:          return "WebApplication"
  }
}
