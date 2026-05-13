/* ----------------------------------------------------------------------------
   Comparison slug normalisation
   ----------------------------------------------------------------------------
   Source of truth: TZ-2 §5.1 says comparison slugs are `tool-a-vs-tool-b`
   with tools in alphabetical order. Until migration 004, nothing enforced
   that — so /compare/klaviyo-vs-omnisend AND /compare/omnisend-vs-klaviyo
   could both index, killing each other in search and giving editorial two
   rows to maintain.

   This module is the user-facing half of the fix. The DB-side half (a
   trigger + CHECK constraint + merge migration) lives in
   supabase/migrations/004_canonical_compare_slugs.sql.

   No `server-only` import: this is pure string logic used both in route
   handlers (server) and unit tests.
---------------------------------------------------------------------------- */

/**
 * Normalize a comparison slug to alphabetical tool order.
 *
 *   canonicalCompareSlug("omnisend-vs-klaviyo")  → "klaviyo-vs-omnisend"
 *   canonicalCompareSlug("klaviyo-vs-omnisend")  → "klaviyo-vs-omnisend"
 *   canonicalCompareSlug("klaviyo")              → "klaviyo"             (passthrough)
 *   canonicalCompareSlug("a-vs-b-vs-c")          → "a-vs-b-vs-c"         (passthrough)
 *
 * The split uses the literal `-vs-` token, which means tool slugs that
 * include "vs" as a substring (e.g. fictional "advs-by-acme") still split
 * cleanly *as long as* the separator isn't itself bracketed by hyphens
 * inside a tool name. None of our published tools hit this edge case;
 * if one ever does, switch this implementation to a regex anchored on
 * `^([a-z0-9-]+?)-vs-([a-z0-9-]+)$` and pick the longest match.
 */
export function canonicalCompareSlug(slug: string): string {
  const parts = slug.split("-vs-")
  if (parts.length !== 2) return slug
  const [a, b] = parts
  // Empty segments (e.g. "-vs-foo") are degenerate; leave them alone so
  // the calling page can 404 cleanly rather than redirecting to a slug
  // that doesn't exist either.
  if (a === "" || b === "") return slug
  return a < b ? `${a}-vs-${b}` : `${b}-vs-${a}`
}

/**
 * True iff the slug is already canonical. Equivalent to
 * `canonicalCompareSlug(slug) === slug`, named for legibility at call sites.
 */
export function isCanonicalCompareSlug(slug: string): boolean {
  return canonicalCompareSlug(slug) === slug
}
