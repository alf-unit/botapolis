-- Migration 017 — Etap F: alternatives_editorial jsonb on tools
-- ============================================================================
-- Adds a single optional jsonb column to public.tools that carries the
-- per-tool editorial copy rendered by /alternatives/[slug]:
--
--   {
--     intro:           string  // EN  — "why operators look for X alternatives"
--     intro_ru:        string  // RU mirror
--     perCardContext:  Array<{
--       slug:    string         // alt-tool slug
--       why:     string         // EN — "why this alt for this source tool"
--       why_ru:  string         // RU mirror
--     }>
--     verdict:         string  // EN  — "who picks which"
--     verdict_ru:      string  // RU mirror
--   }
--
-- The /alternatives/[slug] route reads this from the SOURCE tool's row
-- (i.e. /alternatives/gorgias reads tools.where(slug='gorgias').alternatives_editorial).
-- When the column is null, the page degrades gracefully to the current
-- generic hero + grid template — no UI break, just no editorial copy.
--
-- Schema is OPEN (no CHECK) so we can iterate the shape — wave 2 may add
-- per-source headlines or sectioned reasoning without a follow-up migration.
-- Render code defensively validates each field on read.
--
-- Per content-flags discipline: editorial copy is honest analyst voice —
-- no fake hands-on, content-flags applied per source tool (cons-must-surface
-- for adcreative-ai/triple-whale, catalog-no-affiliate for judge-me, etc.).
-- ============================================================================

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS alternatives_editorial jsonb;

COMMENT ON COLUMN public.tools.alternatives_editorial IS
  'Etap F editorial copy for /alternatives/[slug]. Shape: {intro, intro_ru, perCardContext: [{slug, why, why_ru}], verdict, verdict_ru}. Null = generic-template render.';

-- Sanity probe (no-op on prod, useful in CI):
-- SELECT slug FROM public.tools
-- WHERE alternatives_editorial IS NOT NULL
--   AND NOT (
--     alternatives_editorial ? 'intro'
--     AND alternatives_editorial ? 'verdict'
--   );
