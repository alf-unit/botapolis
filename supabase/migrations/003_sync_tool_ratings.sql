-- ============================================================================
-- 003 · Sync tools.rating with MDX frontmatter as source of truth
-- ----------------------------------------------------------------------------
-- The May 2026 audit caught /tools/<slug> and /reviews/<slug> showing
-- different rating values for the same product:
--
--   • omnisend:   8.1 (DB) vs 8.5 (MDX)
--   • tidio:      7.4 (DB) vs 8.2 (MDX)
--   • postscript: 8.2 (DB) vs 8.6 (MDX)
--
-- The split happened because the seed-data INSERTs froze the rating at the
-- moment the tool was first ingested, while editorial kept refining the
-- score in the MDX review's `rating:` frontmatter.
--
-- Architectural decision: MDX wins. Reasoning:
--   - The review is the long-form editorial artifact; its rating is the
--     considered, defensible number.
--   - The DB rating is a denormalised cache used in the catalog / detail
--     header. Cache should follow source.
--   - scripts/sync-ratings.ts + scripts/content-validator.ts (pre-commit
--     hook) enforce this going forward.
--
-- klaviyo (8.7), gorgias (8.4), mailchimp (6.3) already agreed.
-- manychat (7.6) has no MDX review — leave the DB rating alone.
--
-- Idempotent: re-applying the migration produces no diff because every
-- UPDATE is to a fixed literal. Safe to ship in a Supabase migration
-- pipeline that may replay history.
-- ============================================================================

UPDATE public.tools SET rating = 8.5, updated_at = NOW() WHERE slug = 'omnisend'   AND rating IS DISTINCT FROM 8.5;
UPDATE public.tools SET rating = 8.2, updated_at = NOW() WHERE slug = 'tidio'      AND rating IS DISTINCT FROM 8.2;
UPDATE public.tools SET rating = 8.6, updated_at = NOW() WHERE slug = 'postscript' AND rating IS DISTINCT FROM 8.6;
