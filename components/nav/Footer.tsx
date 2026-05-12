import Link from "next/link"
import { Rss } from "lucide-react"

import { cn } from "@/lib/utils"
import { Logo } from "./Logo"

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
  columns: {
    tools: string
    compare: string
    guides: string
    legal: string
  }
  links: {
    emailRoi: string
    adSpend: string
    ltvCac: string
    allTools: string
    klaviyoMailchimp: string
    gorgiasZendesk: string
    omnisendKlaviyo: string
    looxJudgeme: string
    allGuides: string
    directory: string
    methodology: string
    about: string
    privacy: string
    terms: string
    affiliateDisclosure: string
    cookiePolicy: string
  }
  newsletter: {
    eyebrow: string
    title: string
    subtitle: string
    placeholder: string
    cta: string
    footnote: string
  }
}

interface FooterProps {
  strings: FooterStrings
  localePrefix?: "" | "/ru"
  className?: string
}

export function Footer({ strings, localePrefix = "", className }: FooterProps) {
  const { columns, links } = strings

  const columnDefs = [
    {
      title: columns.tools,
      items: [
        { label: links.emailRoi,  href: `${localePrefix}/tools/email-roi-calculator` },
        { label: links.adSpend,   href: `${localePrefix}/tools/ad-spend-breakeven` },
        { label: links.ltvCac,    href: `${localePrefix}/tools/ltv-cac` },
        { label: links.allTools,  href: `${localePrefix}/tools` },
      ],
    },
    {
      title: columns.compare,
      items: [
        { label: links.klaviyoMailchimp, href: `${localePrefix}/compare/klaviyo-vs-mailchimp` },
        { label: links.gorgiasZendesk,   href: `${localePrefix}/compare/gorgias-vs-zendesk` },
        { label: links.omnisendKlaviyo,  href: `${localePrefix}/compare/omnisend-vs-klaviyo` },
        { label: links.looxJudgeme,      href: `${localePrefix}/compare/loox-vs-judgeme` },
      ],
    },
    {
      title: columns.guides,
      items: [
        { label: links.allGuides,   href: `${localePrefix}/guides` },
        { label: links.directory,   href: `${localePrefix}/directory` },
        { label: links.methodology, href: `${localePrefix}/methodology` },
        { label: links.about,       href: `${localePrefix}/about` },
      ],
    },
    {
      title: columns.legal,
      items: [
        { label: links.privacy,             href: `${localePrefix}/legal/privacy` },
        { label: links.terms,               href: `${localePrefix}/legal/terms` },
        { label: links.affiliateDisclosure, href: `${localePrefix}/legal/affiliate-disclosure` },
        { label: links.cookiePolicy,        href: `${localePrefix}/legal/cookie-policy` },
      ],
    },
  ]

  return (
    <footer
      className={cn(
        "mt-20 lg:mt-24 bg-[var(--bg-base)] border-t border-[var(--border-base)]",
        className,
      )}
    >
      <div className="container-default py-14 lg:py-16">
        {/* Top: brand + link columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-10">
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

        {/* Newsletter strip */}
        <div
          id="newsletter"
          className="mt-12 pt-10 border-t border-[var(--border-base)]"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-10 md:px-10 md:py-12 shadow-[var(--shadow-md)]">
            <div
              aria-hidden="true"
              className="absolute inset-x-1/4 -top-1/3 h-[150%] pointer-events-none opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(16,185,129,0.14), transparent 60%)",
              }}
            />
            <div className="relative grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-end">
              <div className="max-w-md">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)] font-mono">
                  {strings.newsletter.eyebrow}
                </span>
                <h3 className="mt-2 text-h3 lg:text-h2 font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
                  {strings.newsletter.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                  {strings.newsletter.subtitle}
                </p>
              </div>
              <form
                className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:min-w-[420px]"
                action="/api/newsletter"
                method="post"
              >
                <input
                  type="email"
                  name="email"
                  required
                  placeholder={strings.newsletter.placeholder}
                  aria-label="Email address"
                  className={cn(
                    "h-11 flex-1 rounded-md border border-[var(--border-base)]",
                    "bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)]",
                    "placeholder:text-[var(--text-tertiary)]",
                    "outline-none transition-shadow focus:border-[var(--brand)]",
                    "focus:shadow-[0_0_0_3px_var(--focus-ring)]",
                  )}
                />
                <button
                  type="submit"
                  className="h-11 px-5 rounded-md bg-[var(--brand)] text-[var(--brand-fg)] text-sm font-medium hover:bg-[var(--brand-hover)] transition-colors"
                >
                  {strings.newsletter.cta}
                </button>
              </form>
            </div>
            <p className="relative mt-4 text-[12px] text-[var(--text-tertiary)]">
              {strings.newsletter.footnote}
            </p>
          </div>
        </div>

        {/* Bottom legal strip */}
        <div className="mt-10 pt-6 border-t border-[var(--border-base)] flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 text-[12px] text-[var(--text-tertiary)]">
          <span>{strings.copyright}</span>
          <div className="flex items-center gap-1">
            {[
              { Icon: TwitterMark,  href: "https://x.com",        label: "X / Twitter" },
              { Icon: LinkedinMark, href: "https://linkedin.com", label: "LinkedIn"    },
              { Icon: Rss,          href: "/rss.xml",             label: "RSS feed"    },
              { Icon: GithubMark,   href: "https://github.com",   label: "GitHub"      },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                rel="noopener noreferrer"
                target="_blank"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
