-- Migration 019 — Etap J: extend status + template CHECK constraints
-- ============================================================================
-- Initial Etap J load (scripts/load-etap-j.ts --apply) hit two unexpected
-- CHECK violations: schema doc had said OPEN, but semantic_core_entries
-- carries semantic_core_status_chk + semantic_core_template_chk from
-- migration 008. The 2nd-wave load adds three new values not in the
-- original lists:
--
--   - status='second_wave' — Blueprint section 6 convention for the entire
--     220-key 2nd-wave batch.
--   - template='discount' — 44 offer-type CSV keys (X discount code,
--     X coupon, X free trial). Pages deferred until active partner promo
--     codes are signed; the keys live in semantic_core for tracking.
--   - template='other' — 2 sidekick micro-queries excluded at load time
--     (vol≤20, content would rot). Marked as status='excluded' with notes.
--
-- DROP + ADD CONSTRAINT is the safe Postgres pattern (no IF NOT EXISTS for
-- ALTER CONSTRAINT). Existing rows are re-validated against the new
-- constraint at COMMIT time — all current values already conform.
-- ============================================================================

ALTER TABLE public.semantic_core_entries
  DROP CONSTRAINT semantic_core_status_chk;

ALTER TABLE public.semantic_core_entries
  ADD CONSTRAINT semantic_core_status_chk CHECK (status IN (
    'queued',
    'researching',
    'research_ready',
    'in_writer_queue',
    'drafting',
    'ready_to_publish',
    'published',
    'refreshing',
    'archived',
    'excluded',
    'second_wave'
  ));

ALTER TABLE public.semantic_core_entries
  DROP CONSTRAINT semantic_core_template_chk;

ALTER TABLE public.semantic_core_entries
  ADD CONSTRAINT semantic_core_template_chk CHECK (template IN (
    'review',
    'vs-comparison',
    'alternatives',
    'how-to',
    'guide',
    'pricing',
    'best-for-segment',
    'news',
    'discount',
    'other'
  ));

-- Sanity probe (no-op on prod, useful in CI):
-- SELECT status, count(*) FROM public.semantic_core_entries GROUP BY status;
-- SELECT template, count(*) FROM public.semantic_core_entries GROUP BY template;
