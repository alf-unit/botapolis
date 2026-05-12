import Link from "next/link"
import { CalendarDays, Clock4 } from "lucide-react"

import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <ArticleHero>
   ----------------------------------------------------------------------------
   The opening fold for /reviews/[slug] and /guides/[slug]. Visually mirrors
   /compare/[slug]'s hero so editorial pages feel like a family — same
   gradient blob aesthetic, same breadcrumb/eyebrow rhythm.

   Each surface (review vs guide) passes its own eyebrow string, breadcrumb
   crumbs, and an optional `aside` node — reviews use the aside for a rating
   stamp, guides for a step-count chip.

   Includes an affiliate-disclosure micro-line whenever the article contains
   partner links (default: yes for reviews, opt-in for guides). FTC requires
   the disclosure to be visible without scroll on review pages.
---------------------------------------------------------------------------- */

interface BreadcrumbCrumb {
  name: string
  href: string
}

interface ArticleHeroProps {
  eyebrow:       string
  title:         string
  lede:          string
  publishedAt:   string
  updatedAt?:    string
  /** Pre-formatted reading-time string from `getReadingTime`. */
  readingTime:   string
  /** Author display name. */
  author?:       string
  breadcrumbs:   BreadcrumbCrumb[]
  /** Optional right-column slot (rating badge, step counter, etc.). */
  aside?:        React.ReactNode
  /** Render the FTC disclosure line. Default true. */
  showAffiliateNotice?: boolean
  localePrefix:  "" | "/ru"
  locale:        "en" | "ru"
  /** When the article was machine-translated or shown in EN fallback, this
   *  banner appears above the hero. Optional — pages decide when to show. */
  notice?:       React.ReactNode
}

export function ArticleHero({
  eyebrow,
  title,
  lede,
  publishedAt,
  updatedAt,
  readingTime,
  author = "Botapolis editorial",
  breadcrumbs,
  aside,
  showAffiliateNotice = true,
  localePrefix,
  locale,
  notice,
}: ArticleHeroProps) {
  const t = {
    home:        locale === "ru" ? "Главная" : "Home",
    by:          locale === "ru" ? "Автор"    : "By",
    updated:     locale === "ru" ? "Обновлено" : "Updated",
    affiliateNotice: locale === "ru"
      ? "Эта статья содержит партнёрские ссылки. Цены и условия определяет вендор."
      : "This article contains affiliate links. Pricing and terms are set by the vendor.",
    affiliateDetails: locale === "ru" ? "подробнее" : "details",
  }

  return (
    <section className="relative overflow-hidden border-b border-[var(--border-base)]">
      {/* Mint + violet glow — same recipe as /compare/[slug] hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-45 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.20), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-40 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)",
        }}
      />

      <div className="container-default relative pt-10 pb-12 lg:pt-14 lg:pb-16">
        {notice && <div className="mb-6">{notice}</div>}

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
        >
          <Link
            href={`${localePrefix}/`}
            className="hover:text-[var(--text-secondary)]"
          >
            {t.home}
          </Link>
          {breadcrumbs.map((c, i) => {
            const last = i === breadcrumbs.length - 1
            return (
              <span key={c.href} className="flex items-center gap-1.5">
                <span className="opacity-60">/</span>
                {last ? (
                  <span className="text-[var(--text-secondary)] line-clamp-1">
                    {c.name}
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    className="hover:text-[var(--text-secondary)]"
                  >
                    {c.name}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>

        <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
          {eyebrow}
        </p>

        <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-h1 font-semibold tracking-[-0.03em] max-w-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-[16px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {lede}
            </p>

            {/* Meta row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--text-tertiary)] font-mono">
              <span>{t.by} <span className="text-[var(--text-secondary)]">{author}</span></span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {updatedAt && updatedAt !== publishedAt
                  ? `${t.updated} ${updatedAt}`
                  : publishedAt}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock4 className="size-3.5" aria-hidden="true" />
                {readingTime}
              </span>
            </div>
          </div>

          {/* Right column — rating stamp, step count, anything page-specific */}
          {aside && (
            <div className="lg:justify-self-end">{aside}</div>
          )}
        </div>

        {showAffiliateNotice && (
          <p className="mt-6 text-[12px] text-[var(--text-tertiary)] leading-[1.5]">
            {t.affiliateNotice}{" "}
            <Link
              href={`${localePrefix}/legal/affiliate-disclosure`}
              className={cn(
                "underline-offset-4 hover:underline",
              )}
            >
              {t.affiliateDetails}
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
