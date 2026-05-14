import { ArrowUpRight } from "lucide-react"

import { ToolLogo } from "@/components/tools/ToolLogo"
import { TrackedAffiliateLink } from "@/components/content/TrackedAffiliateLink"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createServiceClient } from "@/lib/supabase/service"
import { localizeToolPartial } from "@/lib/content/tool-locale"
import type { ToolRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   <RecommendedTools>
   ----------------------------------------------------------------------------
   Section block surfaced under calculator pages — three affiliate cards with
   editorial "why we recommend" notes, optionally one marked "Our pick".

   Wave 2 audit alignment (Botapolis design v.026): mirrors the "Recommended
   for this use case" row from mockups/tool-email-roi.html. Lives next to the
   calculator widget so visitors who computed an estimate have a one-tap path
   to a real partner tool.

   Server Component on purpose:
     - The DB hydration is cached by Next's request memoization, so multiple
       <RecommendedTools/> on a single page hit Supabase once per unique slug.
     - The CTA element (TrackedAffiliateLink) is the only client island, kept
       small so we don't ship the section's chrome to the browser.

   Tool-slug → /go/<slug> routing matches AffiliateButton: the redirector
   handles UTM overlay + click logging + the "not in DB → /directory" graceful
   degradation. Slugs unknown to Supabase still render as label-only cards.
---------------------------------------------------------------------------- */

export interface RecommendedToolItem {
  /** Tool slug in the `tools` table — also drives the /go/[slug] href. */
  toolSlug: string
  /** Editorial "why we recommend this" line. Keep under ~140 chars. */
  note: string
  /** Highlights the card with an "Our pick" badge + mint border accent. */
  isPick?: boolean
  /** Override the default CTA copy (default: "Try {tool name}"). */
  cta?: string
}

interface RecommendedToolsProps {
  title: string
  subtitle?: string
  /** Localized label for the highlighted card's badge ("Our pick" / "Наш выбор"). */
  pickLabel: string
  items: RecommendedToolItem[]
  localePrefix: "" | "/ru"
  /** `utm_campaign` overlay on outbound /go links — defaults per item below. */
  campaign?: string
  className?: string
}

type ToolPick = Pick<
  ToolRow,
  | "slug" | "name" | "name_ru"
  | "tagline" | "tagline_ru"
  | "logo_url"
  | "pricing_min" | "pricing_max" | "pricing_model"
>

async function fetchToolsBySlugs(slugs: string[]): Promise<Map<string, ToolPick>> {
  const out = new Map<string, ToolPick>()
  if (slugs.length === 0) return out
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("tools")
      .select("slug, name, name_ru, tagline, tagline_ru, logo_url, pricing_min, pricing_max, pricing_model")
      .in("slug", slugs)
      .eq("status", "published")
    if (error) {
      console.error("[RecommendedTools] DB error:", error.message)
      return out
    }
    for (const t of data ?? []) out.set(t.slug, t)
    return out
  } catch (err) {
    console.error("[RecommendedTools] threw:", err)
    return out
  }
}

function priceHint(tool: Pick<ToolPick, "pricing_min" | "pricing_model">): string | null {
  if (tool.pricing_min == null) return null
  if (tool.pricing_model === "free") return "Free"
  const base = `from $${tool.pricing_min}/mo`
  return tool.pricing_model === "freemium" ? `Free · ${base}` : base
}

export async function RecommendedTools({
  title,
  subtitle,
  pickLabel,
  items,
  localePrefix,
  campaign,
  className,
}: RecommendedToolsProps) {
  const slugs = items.map((i) => i.toolSlug)
  const byslug = await fetchToolsBySlugs(slugs)
  const locale: "en" | "ru" = localePrefix === "/ru" ? "ru" : "en"

  return (
    <section className={cn("container-default pb-16 lg:pb-20", className)}>
      <div className="mb-8 lg:mb-10">
        <h2 className="text-h2 font-semibold tracking-[-0.02em]">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-[15px] text-[var(--text-secondary)] max-w-prose">
            {subtitle}
          </p>
        )}
      </div>

      <ul role="list" className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const raw = byslug.get(item.toolSlug)
          // Locale-resolved row (RU name/tagline fall back to EN if _ru is null).
          const tool = raw ? localizeToolPartial(raw, locale) : null
          const displayName = tool?.name ?? item.toolSlug
          const hint = tool ? priceHint(tool) : null

          const defaultCta = locale === "ru" ? `Открыть ${displayName}` : `Try ${displayName}`
          const cta = item.cta ?? defaultCta
          const campaignSlug = campaign ?? `recommended-${item.toolSlug}`
          const href = `${localePrefix}/go/${item.toolSlug}?utm_campaign=${encodeURIComponent(campaignSlug)}`

          return (
            <li
              key={item.toolSlug}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl bg-[var(--bg-surface)] p-5 lg:p-6",
                "shadow-[var(--shadow-sm)]",
                // Pick card gets a mint accent border + soft glow so the "Our
                // pick" badge has visual anchoring matching the design mockup.
                item.isPick
                  ? "border border-[color-mix(in_oklch,var(--brand)_38%,var(--border-base))]"
                  : "border border-[var(--border-base)]",
              )}
            >
              {item.isPick && (
                <span
                  className={cn(
                    "absolute -top-2.5 right-4 inline-flex items-center rounded-full px-2.5 py-0.5",
                    "text-[11px] font-semibold uppercase tracking-[0.06em]",
                    "text-white shadow-[var(--shadow-sm)]",
                  )}
                  style={{ background: "var(--gradient-cta)" }}
                >
                  {pickLabel}
                </span>
              )}

              {/* Logo + name + price */}
              <div className="flex items-center gap-3">
                <ToolLogo
                  src={tool?.logo_url ?? null}
                  name={displayName}
                  size={44}
                  className="shrink-0 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold tracking-[-0.005em] text-[var(--text-primary)]">
                    {displayName}
                  </p>
                  {hint && (
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                      {hint}
                    </p>
                  )}
                </div>
              </div>

              {/* Editorial "why" line */}
              <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)] flex-1">
                {item.note}
              </p>

              {/* CTA — pick uses the brand `cta` variant (shimmer gradient),
                  others use neutral outline to keep the visual hierarchy. */}
              <TrackedAffiliateLink
                href={href}
                toolSlug={item.toolSlug}
                source={campaignSlug}
                campaign={campaignSlug}
                locale={locale}
                className={cn(
                  buttonVariants({
                    variant: item.isPick ? "cta" : "outline",
                    size: "default",
                  }),
                  "h-10 w-full justify-center gap-1.5 text-[14px]",
                  !item.isPick && "border-[var(--border-base)]",
                )}
              >
                <span>{cta}</span>
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </TrackedAffiliateLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
