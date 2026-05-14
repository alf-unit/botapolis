import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { getAllMdxFrontmatter } from "@/lib/content/mdx"

/* ----------------------------------------------------------------------------
   <RelatedArticles>
   ----------------------------------------------------------------------------
   Server component that surfaces the three newest *other* MDX entries of
   the same type (reviews ↔ reviews, guides ↔ guides) under the current
   article. Mirrors the "Related reviews" / "Related guides" 3-card row
   from the New_Design mockups.

   Wave 3 audit alignment (Botapolis design v.026). Sits beneath the article
   body and above the footer so readers who finished one piece have an
   obvious next jump.

   Selection logic:
     - load all published frontmatter for the active locale
     - drop the slug of the article currently being rendered
     - take the three with the newest publishedAt
     - if RU has nothing (or only the current slug), no section is shown —
       the loader returns [] silently, which is the right degraded behaviour
       for a brand-new locale before translations land.

   Card style follows /reviews and homepage Latest-reviews so the visual
   thread stays continuous across surfaces.
---------------------------------------------------------------------------- */

type SupportedType = "reviews" | "guides"

interface RelatedArticlesProps {
  type: SupportedType
  /** Slug of the current article — excluded from the result list. */
  currentSlug: string
  locale: "en" | "ru"
  localePrefix: "" | "/ru"
  /** How many cards to render. Defaults to 3 (design spec). */
  limit?: number
  className?: string
}

export async function RelatedArticles({
  type,
  currentSlug,
  locale,
  localePrefix,
  limit = 3,
  className,
}: RelatedArticlesProps) {
  const all = await getAllMdxFrontmatter(type, locale).catch(() => [])
  const others = all.filter((a) => a.slug !== currentSlug).slice(0, limit)
  if (others.length === 0) return null

  // Localized chrome. Kept inline — strings would have to be passed through
  // two layers of page components otherwise, and the labels are short.
  const ru = locale === "ru"
  const heading =
    type === "reviews"
      ? ru ? "Похожие обзоры"
            : "Related reviews"
      : ru ? "Похожие гайды"
            : "Related guides"

  const readMore = ru
    ? type === "reviews" ? "Читать обзор" : "Открыть гайд"
    : type === "reviews" ? "Read review" : "Read guide"

  const minRead = ru ? "мин чтения" : "min read"
  // Reading-time isn't on the lightweight frontmatter, so we only show
  // the rating chip (reviews) / publishedAt (both). Reading-time lives in
  // the per-article loader and would require fetching every file's body
  // here just for a meta-row — not worth the I/O cost.

  return (
    <section
      className={cn("container-default py-12 lg:py-16 border-t border-[var(--border-base)]", className)}
    >
      <h2 className="text-h3 lg:text-h2 font-semibold tracking-[-0.02em] mb-6 lg:mb-8">
        {heading}
      </h2>

      <ul role="list" className="grid gap-4 md:grid-cols-3">
        {others.map(({ slug, frontmatter }) => {
          // Reviews carry rating, guides carry difficulty (optional). Render
          // whichever is meaningful so the meta row stays compact.
          const rating =
            type === "reviews" && "rating" in frontmatter
              ? (frontmatter as { rating?: number | null }).rating
              : null

          return (
            <li key={slug}>
              <Link
                href={`${localePrefix}/${type}/${slug}`}
                className={cn(
                  "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl",
                  "border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 lg:p-6",
                  "shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-expo)]",
                  "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                )}
              >
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  <span>{frontmatter.publishedAt}</span>
                  {rating != null && (
                    <>
                      <span className="opacity-50">·</span>
                      <span className="text-[var(--brand)]">
                        {rating.toFixed(1)}/10
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-[16px] lg:text-[17px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] leading-snug">
                  {frontmatter.title}
                </h3>

                <p className="text-[13px] leading-[1.55] text-[var(--text-secondary)] line-clamp-3 flex-1">
                  {frontmatter.description}
                </p>

                <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--brand)]">
                  {readMore}
                  <ArrowUpRight
                    className="size-[14px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
