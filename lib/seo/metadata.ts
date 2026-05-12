import type { Metadata } from "next"
import { absoluteUrl, truncate } from "@/lib/utils"
import type { LanguageCode } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   buildMetadata — single source of truth for page metadata.
   ----------------------------------------------------------------------------
   Every page that wants SEO should compose its `generateMetadata` output
   from this helper rather than handrolling `<title>`, OG, Twitter, canonical,
   and hreflang. That way one bug fix lands everywhere.

   Sensible defaults:
     - Title template applied at the root layout (`%s · Botapolis`)
     - OG type defaults to "website", switch to "article" for editorial pages
     - hreflang `x-default` always points to the EN path
     - robots: index by default; pass `noIndex` for drafts and dashboards
---------------------------------------------------------------------------- */

interface BuildMetadataOptions {
  title: string
  description: string
  /** Path WITHOUT locale prefix, e.g. "/tools/klaviyo". */
  path: string
  locale?: LanguageCode
  /** Override the OG image. Path or absolute URL. */
  ogImage?: string
  /** "website" | "article". Defaults to "website". */
  type?: "website" | "article"
  /** Article-specific fields, when type === "article". */
  article?: {
    publishedTime?: string
    modifiedTime?: string
    author?: string
    tags?: string[]
    section?: string
  }
  /** Hide from search engines (drafts, dashboards). */
  noIndex?: boolean
  /** Additional keywords. */
  keywords?: string[]
}

const DEFAULT_OG_IMAGE = "/og-default.png"
const SITE_NAME = "Botapolis"

function localePath(path: string, locale: LanguageCode): string {
  const clean = path.startsWith("/") ? path : `/${path}`
  if (locale === "ru") {
    return clean === "/" ? "/ru" : `/ru${clean}`
  }
  return clean
}

export function buildMetadata({
  title,
  description,
  path,
  locale = "en",
  ogImage,
  type = "website",
  article,
  noIndex = false,
  keywords,
}: BuildMetadataOptions): Metadata {
  const enPath = localePath(path, "en")
  const ruPath = localePath(path, "ru")
  const currentPath = locale === "ru" ? ruPath : enPath

  const canonical = absoluteUrl(currentPath)
  const ogUrl     = absoluteUrl(currentPath)
  const image     = absoluteUrl(ogImage ?? DEFAULT_OG_IMAGE)

  // Twitter card text caps are tight — trim aggressively on long descriptions.
  const shortDescription = truncate(description, 200)

  const metadata: Metadata = {
    title,
    description: shortDescription,
    keywords,
    alternates: {
      canonical,
      languages: {
        en:          absoluteUrl(enPath),
        ru:          absoluteUrl(ruPath),
        "x-default": absoluteUrl(enPath),
      },
    },
    openGraph: {
      title,
      description: shortDescription,
      url:         ogUrl,
      siteName:    SITE_NAME,
      type,
      locale:      locale === "ru" ? "ru_RU" : "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      ...(type === "article" && article
        ? {
            publishedTime: article.publishedTime,
            modifiedTime:  article.modifiedTime,
            authors:       article.author ? [article.author] : undefined,
            tags:          article.tags,
            section:       article.section,
          }
        : {}),
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description: shortDescription,
      images:      [image],
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  }

  return metadata
}
