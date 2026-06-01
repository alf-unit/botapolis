/**
 * lib/content/tool-locale.ts
 * ----------------------------------------------------------------------------
 * Single source of truth for "give me the right-language copy off a tool row".
 *
 * The `tools` table carries each translatable field in two columns. Migration
 * 005 introduced the first six (`name`/`name_ru`, `tagline`/`tagline_ru`,
 * `description`/`description_ru`, `pros`/`pros_ru`, `cons`/`cons_ru`,
 * `best_for`/`best_for_ru`). Migration 016 added the rest needed for the
 * Etap E runtime review pages: `not_for`/`not_for_ru`,
 * `pricing_notes`/`pricing_notes_ru`, `features`/`features_ru` (wholesale —
 * either RU array exists or it doesn't; no partial row-level merge),
 * `shopify_native_notes`/`shopify_native_notes_ru`,
 * `meta_title`/`meta_title_ru`, `meta_description`/`meta_description_ru`,
 * and the new editorial `verdict`/`verdict_ru` pair.
 *
 * When a page renders for a Russian visitor we want the _ru columns; when
 * one is null we silently fall back to the English column so a not-yet-
 * translated row still shows up usefully on /ru/* rather than as an empty
 * section.
 *
 * Why a helper instead of inlining `tool.name_ru ?? tool.name` everywhere:
 *   • dozens of render sites would each implement the same fallbacks and
 *     forgetting one — say, .pros stays English when .pros_ru exists —
 *     produces the half-translated UI the May 2026 audit flagged.
 *   • the helper returns a fully-typed ToolRow whose fields are the
 *     locale-resolved values, so downstream code keeps reading `tool.name`
 *     and doesn't have to know there's a translation layer beneath.
 *   • adding a third language later means one switch here, not 50 edits.
 *
 * Keep this pure (no I/O, no async): every caller is in a server component
 * or a synchronous render path. The `_ru` columns are passed in already.
 */
import type { ToolFeature, ToolRow } from "@/lib/supabase/types"

/**
 * Return a copy of `tool` whose translatable fields reflect the requested
 * locale. For `en` this is a no-op — we return the row untouched so callers
 * don't pay a needless object spread.
 *
 * Fields that aren't translatable (slug, logo_url, pricing_*, rating,
 * rating_breakdown JSONB, integrations, integrates_with_tools,
 * operator_quotes (verbatim — never localised by policy),
 * external_ratings (numeric snapshot), affiliate_*, alternatives_to,
 * status, dates) are unchanged regardless of locale.
 */
export function localizeTool(tool: ToolRow, locale: "en" | "ru"): ToolRow {
  if (locale === "en") return tool

  return {
    ...tool,
    name:                 tool.name_ru                 ?? tool.name,
    tagline:              tool.tagline_ru              ?? tool.tagline,
    description:          tool.description_ru          ?? tool.description,
    pros:                 tool.pros_ru                 ?? tool.pros,
    cons:                 tool.cons_ru                 ?? tool.cons,
    best_for:             tool.best_for_ru             ?? tool.best_for,
    not_for:              tool.not_for_ru              ?? tool.not_for,
    pricing_notes:        tool.pricing_notes_ru        ?? tool.pricing_notes,
    features:             tool.features_ru             ?? tool.features,
    shopify_native_notes: tool.shopify_native_notes_ru ?? tool.shopify_native_notes,
    meta_title:           tool.meta_title_ru           ?? tool.meta_title,
    meta_description:     tool.meta_description_ru     ?? tool.meta_description,
    verdict:              tool.verdict_ru              ?? tool.verdict,
  }
}

/**
 * `Pick`-friendly variant: when a query selected only a subset of columns
 * (e.g. catalog listing pulls slug/name/tagline/logo_url/category/rating
 * to keep the bundle small), call this overload with the picked type so
 * the return is also a subset.
 *
 * The runtime behaviour is identical — we just gracefully read whatever
 * `_ru` columns are present on the input and ignore the rest.
 */
export function localizeToolPartial<
  T extends Partial<ToolRow> & {
    name?: string
    name_ru?: string | null
    tagline?: string | null
    tagline_ru?: string | null
    description?: string | null
    description_ru?: string | null
    pros?: string[]
    pros_ru?: string[] | null
    cons?: string[]
    cons_ru?: string[] | null
    best_for?: string | null
    best_for_ru?: string | null
    not_for?: string | null
    not_for_ru?: string | null
    pricing_notes?: string | null
    pricing_notes_ru?: string | null
    features?: ToolFeature[]
    features_ru?: ToolFeature[] | null
    shopify_native_notes?: string | null
    shopify_native_notes_ru?: string | null
    meta_title?: string | null
    meta_title_ru?: string | null
    meta_description?: string | null
    meta_description_ru?: string | null
    verdict?: string | null
    verdict_ru?: string | null
  },
>(tool: T, locale: "en" | "ru"): T {
  if (locale === "en") return tool

  return {
    ...tool,
    ...(tool.name_ru != null                 && { name:                 tool.name_ru                 }),
    ...(tool.tagline_ru != null              && { tagline:              tool.tagline_ru              }),
    ...(tool.description_ru != null          && { description:          tool.description_ru          }),
    ...(tool.pros_ru != null                 && { pros:                 tool.pros_ru                 }),
    ...(tool.cons_ru != null                 && { cons:                 tool.cons_ru                 }),
    ...(tool.best_for_ru != null             && { best_for:             tool.best_for_ru             }),
    ...(tool.not_for_ru != null              && { not_for:              tool.not_for_ru              }),
    ...(tool.pricing_notes_ru != null        && { pricing_notes:        tool.pricing_notes_ru        }),
    ...(tool.features_ru != null             && { features:             tool.features_ru             }),
    ...(tool.shopify_native_notes_ru != null && { shopify_native_notes: tool.shopify_native_notes_ru }),
    ...(tool.meta_title_ru != null           && { meta_title:           tool.meta_title_ru           }),
    ...(tool.meta_description_ru != null     && { meta_description:     tool.meta_description_ru     }),
    ...(tool.verdict_ru != null              && { verdict:              tool.verdict_ru              }),
  }
}
