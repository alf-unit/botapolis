-- Migration 018 — Etap J: SEMrush metric columns + CSV provenance for 2nd-wave keys
-- ============================================================================
-- Six new optional columns on public.semantic_core_entries to carry the SEMrush
-- metrics and CSV provenance bundled with the 2nd-wave keyword load (220 keys
-- in botapolis_core_REMAINING.csv, dedup-narrowed to ~212 inserts plus 6
-- metric refreshes on existing 1st-wave rows).
--
-- intent reuses the existing search_intent column (CSV value mapped:
-- commercial → commercial-investigation, transactional → transactional,
-- informational → informational).
--
-- Two new vocabulary additions follow OPEN-schema convention (no CHECK):
--   - template='discount' for offer-type keys (44 rows; pages deferred until
--     active partner promo codes are signed).
--   - status='second_wave' for the entire load batch per Blueprint section 6.
-- Both are documented but not constrained — the next migration can tighten
-- after the vocab stabilises across one or two follow-up waves.
-- ============================================================================

ALTER TABLE public.semantic_core_entries
  ADD COLUMN IF NOT EXISTS semrush_volume INTEGER,
  ADD COLUMN IF NOT EXISTS semrush_kd INTEGER,
  ADD COLUMN IF NOT EXISTS semrush_cpc NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS source_count INTEGER,
  ADD COLUMN IF NOT EXISTS affiliate_strength TEXT,
  ADD COLUMN IF NOT EXISTS tool_label TEXT;

COMMENT ON COLUMN public.semantic_core_entries.semrush_volume IS
  'SEMrush monthly search volume (Etap J 2nd-wave load). Nullable when source-not-found.';

COMMENT ON COLUMN public.semantic_core_entries.semrush_kd IS
  'SEMrush keyword difficulty (0-100). Nullable when no data — CSV had empty cells for long-tail keys.';

COMMENT ON COLUMN public.semantic_core_entries.semrush_cpc IS
  'SEMrush CPC in USD. 0.00 when no advertiser bidding observed (transactional intent often = 0 in CSV).';

COMMENT ON COLUMN public.semantic_core_entries.source_count IS
  'CSV provenance: how many independent third-party sources flagged this keyword. Higher = more validated.';

COMMENT ON COLUMN public.semantic_core_entries.affiliate_strength IS
  'strong|weak|none — vendor affiliate-program strength snapshot at load time. Drives CHIEF prioritisation when picking pool order.';

COMMENT ON COLUMN public.semantic_core_entries.tool_label IS
  'CSV tool column verbatim (display name; e.g. "AdCreative.ai" with dot). related_tool_slugs remains the structural reference for cross-table joins.';

-- Sanity probe (no-op on prod, useful in CI):
-- SELECT count(*) FROM public.semantic_core_entries WHERE semrush_volume IS NOT NULL;
-- (Should equal ~212 after Etap J load.)
