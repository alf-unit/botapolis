import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"
import { i18n, type Locale } from "@/lib/i18n/config"
import { readLocale } from "@/lib/i18n/locale-store"
import { Callout } from "./Callout"
import { ProsConsList } from "./ProsConsList"
import { AffiliateButton } from "./AffiliateButton"

/* ----------------------------------------------------------------------------
   MDX component map
   ----------------------------------------------------------------------------
   The single source of truth for how editorial copy renders. Every heading,
   paragraph, list, table, and code block goes through here, plus the JSX
   primitives we want authors to reach for (Callout, ProsConsList,
   AffiliateButton).

   Why we DON'T use @tailwindcss/typography:
     - It ships ~40KB of generated CSS on the first /reviews load.
     - Its defaults bake in Inter / system-ui — fights the Geist body type
       set in the root layout.
     - We get exactly two long-form templates here (review + guide). Hand-
       styling the seven elements that actually matter is cheaper than
       overriding `prose-*` modifiers.

   The Tailwind v4 arbitrary-variant selectors (`[&>code]`) keep all of the
   styling co-located with the component. CSS variables come from
   `app/globals.css` so light/dark mode toggles propagate automatically.
---------------------------------------------------------------------------- */

type AnchorProps = ComponentPropsWithoutRef<"a">

/**
 * Domains where outbound links stay clickable (rel="nofollow noopener").
 * Owner rule 2026-06-01: rating platforms aren't vendors — they don't take
 * commission and they earn the user's trust by being verifiable, so they
 * survive the outbound-link sweep. Everything else external is rendered as
 * a non-clickable grey span so the only paid path off-site stays /go/[slug].
 */
const ALLOWED_EXTERNAL_DOMAINS = [
  "g2.com",
  "trustpilot.com",
  "capterra.com",
  "apps.shopify.com",
] as const

const OWN_DOMAIN = "botapolis.com"

function isOwnDomain(host: string): boolean {
  return host === OWN_DOMAIN || host.endsWith(`.${OWN_DOMAIN}`)
}

/**
 * Locale-prefix a root-relative internal href for the active locale.
 *
 * Why this exists: editorial MDX authors write internal links bare
 * (`/alternatives/loox`, `/compare/x-vs-y`) regardless of locale — the
 * RU article tree mirrors the EN body. Without prefixing, every internal
 * click from an RU page (`/ru/pricing/loox`) jumped to the EN destination,
 * dropping the reader out of the Russian surface (audit 2026-06-12: 371 of
 * 405 RU internal links leaked to EN). We rewrite at render time instead of
 * editing 76 MDX files, and the locale comes from the request-scoped store
 * (`readLocale`) which the page body pins via `pinLocale(params)` before the
 * MDX renders.
 *
 * Only root-relative paths (`/...`) for a NON-default locale are touched:
 *   - default locale (EN) → bare, untouched (don't break the EN surface)
 *   - `#anchor`, `mailto:`, `tel:`, relative paths (no leading `/`) → untouched
 *   - already-prefixed paths (`/ru`, `/ru/...`, `/en`, `/en/...`) → untouched
 *     (no double-prefix; an explicit `/en/...` author link stays as written)
 */
function localizeInternalHref(href: string, locale: Locale): string {
  if (locale === i18n.defaultLocale) return href
  if (!href.startsWith("/")) return href
  for (const loc of i18n.locales) {
    if (href === `/${loc}` || href.startsWith(`/${loc}/`)) return href
  }
  return `/${locale}${href}`
}

function isAllowedExternal(host: string): boolean {
  return ALLOWED_EXTERNAL_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`),
  )
}

function MdxLink({ href = "", children, className, ...rest }: AnchorProps) {
  const isExternal = /^https?:\/\//.test(href)
  // Active locale for this render — pinned by the page body's pinLocale(params)
  // before the MDX tree renders (RU-race fix, 2026-06-07). Used to prefix bare
  // internal links so RU pages keep the reader on the /ru/* surface.
  const locale = readLocale()

  // Internal path (`/...`, `#anchor`, relative) → Next Link, no special policy.
  if (!isExternal) {
    return (
      <Link
        href={localizeInternalHref(href, locale)}
        className={cn(
          "text-[var(--brand)] underline underline-offset-[3px] decoration-[1.5px] decoration-[var(--accent-300)]",
          "hover:decoration-[var(--brand)] transition-colors",
          className,
        )}
      >
        {children}
      </Link>
    )
  }

  // External URL — gate by domain whitelist.
  let host = ""
  try {
    host = new URL(href).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    // Malformed URL → fall through to the grey-span branch below.
  }

  // Our own absolute URL (e.g. `https://botapolis.com/...`) — treat as
  // internal navigation through Next Link. No nofollow on our own pages.
  if (host && isOwnDomain(host)) {
    return (
      <Link
        href={href}
        className={cn(
          "text-[var(--brand)] underline underline-offset-[3px] decoration-[1.5px] decoration-[var(--accent-300)]",
          "hover:decoration-[var(--brand)] transition-colors",
          className,
        )}
      >
        {children}
      </Link>
    )
  }

  // Whitelisted rating platforms — keep clickable, mark nofollow because
  // these aren't paid placements but they're outbound.
  if (host && isAllowedExternal(host)) {
    return (
      <a
        {...rest}
        href={href}
        target="_blank"
        rel="nofollow noopener"
        className={cn(
          "text-[var(--brand)] underline underline-offset-[3px] decoration-[1.5px] decoration-[var(--accent-300)]",
          "hover:decoration-[var(--brand)] transition-colors",
          className,
        )}
      >
        {children}
      </a>
    )
  }

  // Everything else (vendor URLs, miscellaneous external sites, malformed
  // hrefs) → non-clickable grey text. Owner rule: the only monetised exit
  // is /go/[slug]; raw vendor anchors in MDX would silently bypass it.
  return (
    <span
      className={cn(
        "text-[var(--text-tertiary)]",
        className,
      )}
    >
      {children}
    </span>
  )
}

export const mdxComponents = {
  // ----- Headings ----------------------------------------------------------
  // h1 is reserved for the page hero — MDX h1 is intentionally restyled to
  // not visually outrank the hero. (The schema validator yells if an article
  // has two h1s in the visible body.)
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1
      {...props}
      className={cn(
        "scroll-mt-24 mt-12 mb-4 text-h2 font-semibold tracking-[-0.02em] text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      {...props}
      className={cn(
        "scroll-mt-24 mt-12 mb-4 text-h2 font-semibold tracking-[-0.02em] text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3
      {...props}
      className={cn(
        "scroll-mt-24 mt-9 mb-3 text-h3 font-semibold tracking-[-0.015em] text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4
      {...props}
      className={cn(
        "scroll-mt-24 mt-6 mb-2 text-h4 font-semibold tracking-[-0.01em] text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),

  // ----- Body --------------------------------------------------------------
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p
      {...props}
      className={cn(
        "my-5 text-[17px] leading-[1.75] text-[var(--text-secondary)]",
        "[&>strong]:text-[var(--text-primary)] [&>strong]:font-semibold",
        "[&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:bg-[var(--bg-muted)]",
        "[&>code]:text-[0.92em] [&>code]:font-mono [&>code]:text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),
  a: MdxLink,
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong {...props} className={cn("font-semibold text-[var(--text-primary)]", props.className)} />
  ),
  em: (props: ComponentPropsWithoutRef<"em">) => (
    <em {...props} className={cn("italic", props.className)} />
  ),

  // ----- Lists -------------------------------------------------------------
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul
      {...props}
      className={cn(
        "my-5 ml-1 flex flex-col gap-2 text-[17px] leading-[1.7] text-[var(--text-secondary)]",
        "[&>li]:relative [&>li]:pl-6",
        "[&>li]:before:absolute [&>li]:before:left-1 [&>li]:before:top-[0.7em]",
        "[&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rounded-full",
        "[&>li]:before:bg-[var(--brand)]",
        props.className,
      )}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol
      {...props}
      className={cn(
        "my-5 ml-1 flex flex-col gap-2 text-[17px] leading-[1.7] text-[var(--text-secondary)]",
        "[counter-reset:mdx-step] [&>li]:relative [&>li]:pl-8",
        "[&>li]:[counter-increment:mdx-step]",
        "[&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.05em]",
        "[&>li]:before:content-[counter(mdx-step)]",
        "[&>li]:before:flex [&>li]:before:size-6 [&>li]:before:items-center [&>li]:before:justify-center",
        "[&>li]:before:rounded-full [&>li]:before:bg-[var(--bg-muted)]",
        "[&>li]:before:font-mono [&>li]:before:text-[12px] [&>li]:before:font-semibold",
        "[&>li]:before:text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} />,

  // ----- Blockquote --------------------------------------------------------
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      {...props}
      className={cn(
        "relative my-6 pl-6 py-1",
        "border-l-2 border-[var(--brand)]",
        "text-[18px] leading-[1.65] italic text-[var(--text-primary)]",
        "[&>p]:my-2 [&>p]:text-inherit",
        props.className,
      )}
    />
  ),

  // ----- Tables ------------------------------------------------------------
  // Wrap tables in a scroll container so editorial tables work on phones
  // without horizontal page scroll.
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-[var(--border-base)]">
      <table
        {...props}
        className={cn(
          "w-full border-collapse text-[14px] text-[var(--text-secondary)]",
          props.className,
        )}
      />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead
      {...props}
      className={cn(
        "bg-[var(--bg-muted)] text-[12px] uppercase tracking-[0.06em] font-mono",
        "text-[var(--text-tertiary)]",
        props.className,
      )}
    />
  ),
  tbody: (props: ComponentPropsWithoutRef<"tbody">) => <tbody {...props} />,
  tr: (props: ComponentPropsWithoutRef<"tr">) => (
    <tr {...props} className={cn("border-t border-[var(--border-subtle)]", props.className)} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th {...props} className={cn("px-4 py-3 text-left font-semibold", props.className)} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td {...props} className={cn("px-4 py-3 align-top", props.className)} />
  ),

  // ----- Code --------------------------------------------------------------
  // `inline` code is styled via the `p > code` selector above. `pre` blocks
  // here are pre-syntax-highlighted by rehype-pretty-code (Shiki under the
  // hood); we just give them a frame and let the theme's inline styles win.
  //
  // Fallback text colour (#E5E7EB) for code blocks WITHOUT a language tag
  // (```text → no Shiki tokenisation → no inline colours → text inherits
  // the page's default near-black, which is invisible on the dark pre
  // background). Shiki's per-token inline styles still override this when
  // a language is set, so syntax-highlighted blocks render unchanged.
  // Bug surfaced 2026-05-30 on /guides/support-automation-for-shopify-stores
  // where a no-language code block showed as a black-on-black void.
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      {...props}
      className={cn(
        "my-6 overflow-x-auto rounded-xl border border-[var(--border-base)]",
        "bg-[#0F1115] p-5 text-[13px] leading-[1.6] font-mono text-[#E5E7EB]",
        "[&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit",
        props.className,
      )}
    />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    // The `p > code` rule handles inline code; this catches code outside
    // paragraphs (e.g. table cells, blockquotes).
    <code
      {...props}
      className={cn(
        "px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[0.92em] font-mono text-[var(--text-primary)]",
        props.className,
      )}
    />
  ),

  // ----- Misc --------------------------------------------------------------
  hr: (props: ComponentPropsWithoutRef<"hr">) => (
    <hr {...props} className={cn("my-10 border-t border-[var(--border-base)]", props.className)} />
  ),
  img: (props: ComponentPropsWithoutRef<"img">) => (
    // Authors can drop raw <img> in MDX. We don't substitute next/image here
    // because remote/optimization decisions are content-specific; we just
    // ensure the image is responsive and doesn't push CLS budget.
    <img
      {...props}
      alt={props.alt ?? ""}
      loading="lazy"
      className={cn(
        "my-6 w-full rounded-xl border border-[var(--border-base)]",
        props.className,
      )}
    />
  ),

  // ----- Custom shortcodes (available inside MDX) --------------------------
  Callout,
  ProsConsList,
  AffiliateButton,
}
