-- ============================================================================
-- fix-klaviyo-pricing-path.sql
-- ----------------------------------------------------------------------------
-- Etap J-generate · /pricing/ route migration · 2026-06-03
--
-- Fixes a zombie `published_article_path` in `semantic_core_entries` for the
-- `klaviyo pricing` keyword. Phase 3 of the 2026-06-03 structural rebuild
-- ran a global REPLACE('/reviews/', '/tools/') which collided with this row
-- — the actual MDX moved to /content/guides/, not /content/tools/, and the
-- DB never caught up. Today's Etap J-generate migrates the MDX again, this
-- time to its canonical home /content/pricing/, so the path needs to point
-- there.
--
-- Before:
--   published_article_path = '/content/tools/ru/klaviyo-pricing.mdx'
--   (zombie path — Phase 3 REPLACE artefact; no file at that location)
--
-- After:
--   published_article_path = '/content/pricing/en/klaviyo.mdx'
--   (canonical EN path post Etap J-generate migration; the URL surface is
--    /pricing/klaviyo — file renamed from klaviyo-pricing.mdx because under
--    /pricing/ the "-pricing" suffix duplicates semantics that the path
--    segment already conveys. `semantic_core_entries.published_article_path`
--    tracks the source-of-truth EN file, post-commit webhook fills RU
--    separately when the RU translation is committed)
--
-- Idempotent: re-running keeps the value unchanged.
--
-- Block B (optional but recommended for the klaviyo control) wires the
-- satellite→money-page backlink from /compare/klaviyo-vs-omnisend.{en,ru}
-- live DB row to /pricing/klaviyo — the MDX-side edit in
-- content/comparisons/en/klaviyo-vs-omnisend.mdx doesn't reach the live
-- /compare/[slug] surface because that route is DB-driven (reads
-- public.comparisons, not MDX). Idempotent via a position(...) guard.
-- ----------------------------------------------------------------------------

BEGIN;

-- ----------------------------------------------------------------------------
-- Block A — required path fix.
-- ----------------------------------------------------------------------------
UPDATE public.semantic_core_entries
SET
  published_article_path = '/content/pricing/en/klaviyo.mdx',
  status_changed_at = now()
WHERE keyword = 'klaviyo pricing'
  AND template = 'pricing';

-- ----------------------------------------------------------------------------
-- Block B — optional satellite→money-page backlink for /compare/klaviyo-vs-
-- omnisend (live page is DB-driven, NOT MDX, so the MDX-side edit in
-- content/comparisons/en/klaviyo-vs-omnisend.mdx doesn't reach the live
-- render). This appends one sentence with the /pricing/klaviyo link to
-- the live `verdict` field for both EN and RU rows. Idempotent:
-- `position('/pricing/klaviyo' in verdict) = 0` guards against re-running
-- adding the sentence twice.
--
-- NOTE for Step 4 (Etap J-generate bulk-50): this fix is manual for the
-- klaviyo control. When the other 50 pricing pages roll out, the same
-- satellite→money-page link wiring needs to land programmatically — a
-- single migration/loader pass that, for each newly-published /pricing/
-- page, finds the /compare/{X-vs-Y} rows whose tool_a or tool_b matches
-- the pricing tool slug and appends the analogous sentence to the live
-- DB row. Otherwise the cross-link gap that exists here for klaviyo-vs-
-- omnisend repeats for every comparison touching a tool that has a
-- pricing page.
-- ----------------------------------------------------------------------------
UPDATE public.comparisons
SET
  verdict = verdict || E'\n\nFor the full Klaviyo pricing breakdown, see /pricing/klaviyo.',
  updated_at = now()
WHERE slug = 'klaviyo-vs-omnisend'
  AND language = 'en'
  AND position('/pricing/klaviyo' in COALESCE(verdict, '')) = 0;

UPDATE public.comparisons
SET
  verdict = verdict || E'\n\nПолный разбор цен Klaviyo — /ru/pricing/klaviyo.',
  updated_at = now()
WHERE slug = 'klaviyo-vs-omnisend'
  AND language = 'ru'
  AND position('/pricing/klaviyo' in COALESCE(verdict, '')) = 0;

-- ----------------------------------------------------------------------------
-- Sanity check — should return 1 row for the semantic core entry and
-- 2 rows for the comparisons (EN + RU) with the backlink sentence in
-- their verdict.
-- ----------------------------------------------------------------------------
SELECT keyword, status, template, published_article_path
FROM public.semantic_core_entries
WHERE keyword = 'klaviyo pricing';

SELECT slug, language,
       position('/pricing/klaviyo' in COALESCE(verdict, '')) AS link_at_pos,
       length(verdict) AS verdict_len
FROM public.comparisons
WHERE slug = 'klaviyo-vs-omnisend'
ORDER BY language;

COMMIT;
