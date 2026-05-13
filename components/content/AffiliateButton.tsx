import { ArrowUpRight } from "lucide-react"

import { ToolLogo } from "@/components/tools/ToolLogo"
import { TrackedAffiliateLink } from "@/components/content/TrackedAffiliateLink"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createServiceClient } from "@/lib/supabase/service"
import { localizeToolPartial } from "@/lib/content/tool-locale"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   <AffiliateButton>
   ----------------------------------------------------------------------------
   The single legal way to ship an outbound partner link inside MDX. Always
   routes through `/go/[slug]` — the redirector handles UTM overlay, click
   logging, and rate-limit. We hydrate the tool's name + logo from Supabase
   so authors can write `<AffiliateButton tool="klaviyo" />` and forget about
   it; if the slug isn't in the DB we degrade to a label-only button rather
   than crashing the article.

   Server component on purpose:
     - It's the rendering path for every review/guide.
     - The DB lookup is cached by Next's request memoization for the duration
       of the page render, so multiple <AffiliateButton tool="klaviyo" /> in
       one article hit Supabase once.

   rel/target attributes match what `/compare/[slug]` ships — keeping the
   affiliate fingerprint consistent across the site simplifies any future
   audit ("does every outbound link have sponsored nofollow?").
---------------------------------------------------------------------------- */

interface AffiliateButtonProps {
  /** Slug of the tool in the `tools` table. */
  tool: string
  /** Override the CTA copy. Defaults to "Try {tool name}". */
  cta?: string
  /** Source path of the article — becomes the `utm_campaign` param. */
  campaign?: string
  /** Locale prefix to prepend, so RU pages stay on /ru/go/{slug}. */
  localePrefix?: "" | "/ru"
  /** Visual variant. `inline` is the default rich block; `link` is a plain
   *  underlined text link for cases where a card would interrupt the prose. */
  variant?: "inline" | "link"
  className?: string
}

type ToolPick = Pick<
  ToolRow,
  | "slug" | "name" | "name_ru" | "tagline" | "tagline_ru"
  | "logo_url" | "pricing_min" | "pricing_max" | "pricing_model"
>

async function fetchTool(slug: string): Promise<ToolPick | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("slug, name, name_ru, tagline, tagline_ru, logo_url, pricing_min, pricing_max, pricing_model")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
    if (error) {
      console.error(`[AffiliateButton] DB error for "${slug}":`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.error(`[AffiliateButton] threw for "${slug}":`, err)
    return null
  }
}

function priceHint(tool: ToolPick): string | null {
  if (tool.pricing_min == null) return null
  if (tool.pricing_model === "free") return "Free"
  const base = `from $${tool.pricing_min}/mo`
  return tool.pricing_model === "freemium" ? `Free · ${base}` : base
}

export async function AffiliateButton({
  tool: slug,
  cta,
  campaign,
  localePrefix = "",
  variant = "inline",
  className,
}: AffiliateButtonProps) {
  const rawTool = await fetchTool(slug)
  // Resolve RU copy when we're rendering inside a /ru/ route so the CTA's
  // brand name + tagline match the surrounding article. EN routes get the
  // English columns untouched.
  const locale: "en" | "ru" = localePrefix === "/ru" ? "ru" : "en"
  const tool = rawTool ? localizeToolPartial(rawTool, locale) : null
  const displayName = tool?.name ?? slug
  // Localize the default CTA verb too — "Open Klaviyo" reads more naturally
  // on a Russian page than mixing "Try Klaviyo" with the surrounding RU prose.
  const defaultCta = locale === "ru" ? `Открыть ${displayName}` : `Try ${displayName}`
  const label = cta ?? defaultCta
  const goHref = `${localePrefix}/go/${slug}${
    campaign ? `?utm_campaign=${encodeURIComponent(campaign)}` : ""
  }`

  // Block C — analytics dimensions. Source defaults to the campaign slug
  // when provided; that's the tightest funnel-attribution we have today
  // (`review-klaviyo-review-2026`, `compare-klaviyo-vs-mailchimp`, etc.).
  const eventLocale: "en" | "ru" = localePrefix === "/ru" ? "ru" : "en"
  const eventSource = campaign ?? `affiliate-button-${slug}`

  // ----- "link" variant — plain text, for inline mid-paragraph anchors -----
  if (variant === "link") {
    return (
      <TrackedAffiliateLink
        href={goHref}
        toolSlug={slug}
        source={eventSource}
        campaign={campaign}
        locale={eventLocale}
        className={cn(
          "inline-flex items-center gap-1",
          "text-[var(--brand)] underline underline-offset-[3px] decoration-[1.5px] decoration-[var(--accent-300)]",
          "hover:decoration-[var(--brand)] transition-colors",
          className,
        )}
      >
        {label}
        <ArrowUpRight className="size-[14px]" aria-hidden="true" />
      </TrackedAffiliateLink>
    )
  }

  // ----- "inline" — full call-to-action card -------------------------------
  const hint = tool ? priceHint(tool) : null
  return (
    <div
      className={cn(
        "not-prose my-8 flex items-center gap-4 rounded-2xl border border-[var(--border-base)]",
        "bg-[var(--bg-surface)] p-4 lg:p-5 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <ToolLogo
        src={tool?.logo_url ?? null}
        name={displayName}
        size={48}
        className="shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold tracking-[-0.005em] text-[var(--text-primary)]">
          {displayName}
        </p>
        {tool?.tagline && (
          <p className="mt-0.5 text-[13px] leading-[1.5] text-[var(--text-secondary)] line-clamp-1">
            {tool.tagline}
          </p>
        )}
        {hint && (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            {hint}
          </p>
        )}
      </div>
      <TrackedAffiliateLink
        href={goHref}
        toolSlug={slug}
        source={eventSource}
        campaign={campaign}
        locale={eventLocale}
        className={cn(
          // Switched May 2026 from inline gradient style → `cta` variant:
          // the variant carries mint gradient + glow + shimmer-on-hover +
          // press ripple. One source of truth in components/ui/button.tsx.
          buttonVariants({ variant: "cta", size: "lg" }),
          "h-11 shrink-0 px-4 text-[14px]",
        )}
      >
        <span>{label}</span>
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </TrackedAffiliateLink>
    </div>
  )
}
