import "server-only"

import { cache } from "react"

import { createServiceClient } from "@/lib/supabase/service"
import type { PagePublicationRow } from "@/lib/supabase/types"

/* ----------------------------------------------------------------------------
   Drip-publication visibility gate (migration 020 · page_publications)
   ----------------------------------------------------------------------------
   Single source of truth for "is this page publicly visible right now?" across
   every drip-managed content type — MDX (pricing/guides/best), DB-backed
   (tools/comparisons), and computed (alternatives). Visibility lives in the
   `page_publications` table (key = content_type + slug, locale-agnostic so a
   page is EN+RU-atomic per the Definition-of-Done invariant).

   ── Rollout safety ─────────────────────────────────────────────────────────
   The whole gate is behind env flag DRIP_GATE_ENABLED. When it is anything but
   the string "true", every helper here is a NO-OP pass-through (treats all
   pages as visible). This lets the gate code deploy WITHOUT changing prod
   behavior — the flag is flipped to "true" only AFTER the backfill has seeded
   `visible_at=now()` for every currently-live page. An empty/partial table
   with the flag on would 404 the site, so the flag is the kill-switch.

   ── Fail-open ──────────────────────────────────────────────────────────────
   On any Supabase error the helpers fail OPEN (return "all visible"), never
   closed. A transient DB hiccup must not blank the site. Hiding a not-yet-
   ready page late is recoverable; 404-ing the whole catalog is not.

   ── Perf ───────────────────────────────────────────────────────────────────
   `getVisibleSet` is wrapped in React `cache()` so a single render pass issues
   at most one query per content_type, regardless of how many components ask.
   Routes/hubs/sitemap are all ISR-cached, so the query amortizes across the
   revalidation window rather than firing per request (the documented Vercel
   Active-CPU concern with per-request Supabase calls).
---------------------------------------------------------------------------- */

/** Content types managed by the drip gate. Anything outside this set (e.g.
 *  `news`, defunct `reviews`) is never gated — those routes keep their
 *  existing always-visible behavior. */
const GATED_TYPES = new Set([
  "pricing",
  "guides",
  "best",
  "tools",
  "comparisons",
  "alternatives",
])

export function isDripGateEnabled(): boolean {
  return process.env.DRIP_GATE_ENABLED === "true"
}

/**
 * The set of currently-visible slugs for a content type, or `null` when the
 * gate is inactive for this call (flag off, or type not drip-managed, or a
 * DB error → fail open). `null` means "do not filter — everything is visible".
 */
export const getVisibleSet = cache(
  async (contentType: string): Promise<Set<string> | null> => {
    if (!isDripGateEnabled()) return null
    if (!GATED_TYPES.has(contentType)) return null
    try {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from("page_publications")
        .select("slug")
        .eq("content_type", contentType as PagePublicationRow["content_type"])
        .not("visible_at", "is", null)
      if (error) {
        console.error(
          `[visibility] ${contentType} fetch failed — failing OPEN:`,
          error.message,
        )
        return null
      }
      return new Set((data ?? []).map((r) => r.slug as string))
    } catch (err) {
      console.error(`[visibility] ${contentType} threw — failing OPEN:`, err)
      return null
    }
  },
)

/** Filter a `string[]` of slugs down to the visible ones (no-op when gate off). */
export async function filterVisibleSlugs(
  contentType: string,
  slugs: string[],
): Promise<string[]> {
  const vis = await getVisibleSet(contentType)
  return vis ? slugs.filter((s) => vis.has(s)) : slugs
}

/** Filter an array of `{ slug }` rows down to the visible ones (no-op when off). */
export async function filterVisibleRows<T extends { slug: string }>(
  contentType: string,
  rows: T[],
): Promise<T[]> {
  const vis = await getVisibleSet(contentType)
  return vis ? rows.filter((r) => vis.has(r.slug)) : rows
}

/** Single-slug visibility check (true when gate off — fail open). */
export async function isSlugVisible(
  contentType: string,
  slug: string,
): Promise<boolean> {
  const vis = await getVisibleSet(contentType)
  return vis ? vis.has(slug) : true
}
