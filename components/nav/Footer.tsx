import Link from "next/link"

import { cn } from "@/lib/utils"
import { Logo } from "./Logo"
import {
  NewsletterForm,
  type NewsletterFormStrings,
} from "@/components/marketing/NewsletterForm"

/* Inline brand glyphs — lucide-react 1.x removed third-party brand marks,
   and using their official trademarks here keeps things faithful. */
function TwitterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

function LinkedinMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .78 0 1.74v20.51C0 23.22.79 24 1.77 24h20.46c.97 0 1.77-.78 1.77-1.75V1.74C24 .78 23.2 0 22.23 0Z" />
    </svg>
  )
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12.03c0 5.1 3.3 9.43 7.88 10.96.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.74 1.27 3.41.97.1-.75.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.94 10.94 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.39-5.27 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

/* ----------------------------------------------------------------------------
   Footer
   ----------------------------------------------------------------------------
   Desktop:  [brand]  [Tools] [Compare] [Guides] [Legal]
                                  [Newsletter CTA strip]
                                  [© · social · lang]
   Mobile:   stacked, 2-col link grid.

   This is a Server Component — all interactivity (newsletter form) lives in
   a child island. Strings come in as props so we render in the request locale.
---------------------------------------------------------------------------- */

export interface FooterStrings {
  tagline: string
  copyright: string
  // Column titles. Sprint 2 (May 2026) re-introduced a "Library" column for
  // the editorial routes (/reviews, /guides) now that the MDX pipeline ships.
  // The earlier audit had dropped them because the pages didn't exist; that
  // constraint no longer applies.
  columns: {
    tools: string
    compare: string
    library: string
    site: string
    legal: string
  }
  // Link labels. Every key here MUST map to a route that returns 200; the
  // shape mirrors what the dead-link audit (May 2026) + Sprint 2 + Block B
  // verified is live.
  links: {
    emailRoi:            string
    aiCostComparator:    string
    productDescription:  string
    allTools:            string
    klaviyoMailchimp:    string
    omnisendKlaviyo:     string
    gorgiasTidio:        string
    allComparisons:      string
    klaviyoReview:       string
    productDescGuide:    string
    allReviews:          string
    allGuides:           string
    about:               string
    catalog:             string
    methodology:         string
    contact:             string
    privacy:             string
    terms:               string
    cookiePolicy:        string
    disclaimer:          string
    affiliateDisclosure: string
  }
  // `eyebrow / title / subtitle / footnote` live in the footer chrome; the
  // remaining slots are forwarded straight to <NewsletterForm>, so we pin
  // them to its actual prop type to keep the two in sync.
  newsletter: {
    eyebrow:  string
    title:    string
    subtitle: string
    footnote: string
  } & NewsletterFormStrings
}

interface FooterProps {
  strings: FooterStrings
  localePrefix?: "" | "/ru"
  className?: string
}

export function Footer({ strings, localePrefix = "", className }: FooterProps) {
  const { columns, links } = strings

  // Footer column definitions — every href below was verified to render a
  // 200 against the deployed `next build` route table on 2026-05-12. If a
  // new page lands later (e.g. /methodology, /guides), add the link here
  // AND in the locale dictionary AND in app/sitemap.ts together.
  const columnDefs = [
    {
      title: columns.tools,
      items: [
        { label: links.emailRoi,            href: `${localePrefix}/tools/email-roi-calculator` },
        { label: links.aiCostComparator,    href: `${localePrefix}/tools/ai-cost-comparator` },
        { label: links.productDescription,  href: `${localePrefix}/tools/product-description` },
        { label: links.allTools,            href: `${localePrefix}/tools` },
      ],
    },
    {
      title: columns.compare,
      items: [
        { label: links.klaviyoMailchimp, href: `${localePrefix}/compare/klaviyo-vs-mailchimp` },
        { label: links.omnisendKlaviyo,  href: `${localePrefix}/compare/omnisend-vs-klaviyo` },
        { label: links.gorgiasTidio,     href: `${localePrefix}/compare/gorgias-vs-tidio` },
        { label: links.allComparisons,   href: `${localePrefix}/compare` },
      ],
    },
    {
      // Sprint 2 — reviews + guides are linked from a single "Library"
      // column. The featured entries are hand-picked (one of each); the
      // "all" link sends people to the indexes. We avoid auto-generating
      // the featured rows from MDX frontmatter to keep the footer stable
      // — link-rot here cascades into a worse perceived navigation.
      title: columns.library,
      items: [
        { label: links.klaviyoReview,    href: `${localePrefix}/reviews/klaviyo-review-2026` },
        { label: links.allReviews,       href: `${localePrefix}/reviews` },
        { label: links.productDescGuide, href: `${localePrefix}/guides/how-to-use-ai-for-shopify-product-descriptions` },
        { label: links.allGuides,        href: `${localePrefix}/guides` },
      ],
    },
    {
      title: columns.site,
      items: [
        { label: links.about,       href: `${localePrefix}/about` },
        { label: links.catalog,     href: `${localePrefix}/tools` },
        // Block B (May 2026): methodology + contact land here. They're
        // editorial chrome rather than tools/comparisons/library, so the
        // "Site" column collects them.
        { label: links.methodology, href: `${localePrefix}/methodology` },
        { label: links.contact,     href: `${localePrefix}/contact` },
      ],
    },
    {
      title: columns.legal,
      items: [
        { label: links.privacy,             href: `${localePrefix}/legal/privacy` },
        { label: links.terms,               href: `${localePrefix}/legal/terms` },
        { label: links.cookiePolicy,        href: `${localePrefix}/legal/cookie-policy` },
        { label: links.disclaimer,          href: `${localePrefix}/legal/disclaimer` },
        { label: links.affiliateDisclosure, href: `${localePrefix}/legal/affiliate-disclosure` },
      ],
    },
  ]

  return (
    <>
      {/* Newsletter — design-v.026 ships this as its OWN <section> on the
          page surface ABOVE <footer>, not inside it. #newsletter stays
          the scroll-to anchor the mobile NewsletterDialog falls back to. */}
      {/* `scroll-reveal` joins this CTA to the same fade-in rhythm as the
          page's content sections. The footer chrome below stays static —
          a site-chrome footer shouldn't animate in. Spacing: only a
          bottom gap before the footer — the preceding section already
          carries `pb-16 lg:pb-20`, so a top margin here would DOUBLE the
          gap above the card vs every other section boundary. */}
      <section
        id="newsletter"
        className="scroll-reveal container-default mb-20 lg:mb-24"
      >
        {/* design-v.026 `.nl`: a centred card (max 720px) with everything
            stacked and centre-aligned — eyebrow → title → subtitle →
            form → footnote. Only the visual layout changed here; the
            <NewsletterForm> component (Safari-tuned focus / Turnstile
            token / dialog behaviour) is untouched — we just hand it a
            centred, width-capped wrapper class. */}
        <div className="relative mx-auto max-w-[720px] overflow-hidden rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-12 md:px-10 md:py-14 text-center shadow-[var(--shadow-md)]">
          <div
            aria-hidden="true"
            className="absolute inset-x-1/4 -top-1/3 h-[150%] pointer-events-none opacity-60"
            style={{
              background:
                "radial-gradient(ellipse, rgba(16,185,129,0.14), transparent 60%)",
            }}
          />
          <div className="relative flex flex-col items-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)] font-mono">
              {strings.newsletter.eyebrow}
            </span>
            <h3 className="mt-2 text-h3 lg:text-h2 font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
              {strings.newsletter.title}
            </h3>
            <p className="mt-2 max-w-xl text-[15px] leading-[1.6] text-[var(--text-secondary)]">
              {strings.newsletter.subtitle}
            </p>
            <NewsletterForm
              strings={strings.newsletter}
              source="footer"
              language={localePrefix === "/ru" ? "ru" : "en"}
              className="mt-6 w-full max-w-[480px]"
              // design-v.026 newsletter geometry, copied verbatim from
              // New_Design/mockups/styles.css `.input` + `.btn` (both
              // height:40px, radius-md). ROOT CAUSE of the "thin strip"
              // bug: NewsletterForm's base input carries `flex-1`
              // (flex-basis:0%). On mobile the form is `flex-col`, so on
              // the COLUMN main axis flex-basis:0% overrode every height
              // the previous fixes set (h-11 → h-14 all swallowed) and
              // the input collapsed to ~content height while the button
              // (no flex-1) kept its height → thin input + fat button.
              // Mockup applies `flex:1` to the input only in the desktop
              // ROW (`.nl-form .input`); on mobile it's a plain `.input`.
              // So: `flex-none` on mobile (height now actually applies),
              // `sm:flex-1` in the row. Font kept at 16px (text-base) —
              // mockup ships 14px but <16px triggers iOS Safari auto-zoom
              // (HANDOFF hard rule); 16px fits a 40px field fine.
              inputClassName="block w-full h-10 flex-none sm:flex-1 px-3 text-base"
              buttonClassName="h-10 px-4 text-base"
            />
            <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">
              {strings.newsletter.footnote}
            </p>
          </div>
        </div>
      </section>

      <footer
        className={cn(
          "bg-[var(--bg-base)] border-t border-[var(--border-base)]",
          className,
        )}
      >
        <div className="container-default py-14 lg:py-16">
        {/* Top: brand + link columns. Five link columns since Sprint 2 added
            a Library column for /reviews + /guides — keep the brand cell
            slightly wider so the link grid breathes on desktop. */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.2fr_repeat(5,1fr)] gap-10">
          <div className="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col gap-4">
            <Logo href={`${localePrefix}/`} idSuffix="footer" />
            <p className="text-sm leading-[1.6] text-[var(--text-secondary)] max-w-[32ch]">
              {strings.tagline}
            </p>
          </div>

          {columnDefs.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] font-mono">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {col.items.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom legal strip */}
        <div className="mt-10 pt-6 border-t border-[var(--border-base)] flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 text-[12px] text-[var(--text-tertiary)]">
          <span>{strings.copyright}</span>

          {/*
            Wave 1 audit alignment (Botapolis design v.026): the homepage
            mockup ships visible social icons in the footer strip, so we
            show them now as placeholders ("#") until real @botapolis URLs
            exist (HANDOFF TODO #4). The visual presence is the point — a
            faceless footer reads as half-finished next to the rest of the
            chrome. When real URLs arrive, swap `href="#"` with the actual
            handles (or wire env vars per the recipe in git history).
          */}
          <div className="flex items-center gap-1">
            {[
              { Mark: TwitterMark,  href: "#", label: "X / Twitter" },
              { Mark: LinkedinMark, href: "#", label: "LinkedIn"    },
              { Mark: GithubMark,   href: "#", label: "GitHub"      },
            ].map(({ Mark, href, label }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className={cn(
                  "h-9 w-9 inline-flex items-center justify-center rounded-md",
                  "text-[var(--text-tertiary)]",
                  "transition-colors duration-150",
                  "hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                )}
              >
                <Mark className="h-[16px] w-[16px]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
    </>
  )
}
