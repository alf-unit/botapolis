-- ============================================================================
-- Botapolis · 016_phase0_reviews_runtime.sql
-- ----------------------------------------------------------------------------
-- Phase 0 (Data-First pSEO Blueprint) — Этап E preparation.
-- Schema changes that unblock the flip of /reviews/[slug] from legacy
-- MDX-first hybrid to honest runtime DB-driven generation (Option A locked
-- 2026-05-31). Single-pass apply before:
--   1. /reviews/[slug] route flip to DB-driven runtime
--   2. localizeTool helper extension
--   3. Reference Klaviyo end-to-end (en + ru) generation
--
-- Changes (8 total):
--   1. ADD COLUMN tools.not_for_ru text — RU twin for not_for (already EN).
--   2. ADD COLUMN tools.pricing_notes_ru text — RU twin for pricing_notes.
--   3. ADD COLUMN tools.features_ru jsonb — RU twin for features (same shape
--      as features: array of {name, description, is_ai, ai_kind?,
--      plan_availability}). Nullable; fallback to features when NULL.
--   4. ADD COLUMN tools.shopify_native_notes_ru text — RU twin for the
--      migration 015 shopify_native_notes rich-text column.
--   5. ADD COLUMN tools.meta_title_ru text — RU twin for meta_title; used
--      by /ru/reviews/[slug] generateMetadata after runtime flip.
--   6. ADD COLUMN tools.meta_description_ru text — RU twin for
--      meta_description; same metadata path.
--   7. ADD COLUMN tools.verdict text — editorial analytic verdict (EN).
--      NEW field, no prior twin. Honest analyst conclusion derived from
--      aggregated data + verified operator quotes; NOT fabricated hands-on
--      narrative ("we ran it 90 days" is forbidden — Experience-signal
--      fabrication = ban risk). Populated by Opus at first review build,
--      one-shot. Never touched by SCOUT (SCOUT does not write to tools).
--   8. ADD COLUMN tools.verdict_ru text — RU twin for verdict.
--
-- Locked decisions baked into this migration:
--   - NO narrative-data fields (pricing_thesis, switching_triggers, etc.).
--     Switching logic derives from not_for / not_for_ru. Owner decision
--     2026-05-31: keep data-first philosophy strict, do not bolt on
--     editorial-shaped columns just to enrich pages.
--   - NO SCOUT-write columns (pricing_verified_at, affiliate_health_checked_at,
--     pricing_data jsonb). SCOUT does NOT write to tools — its data is mistrusted
--     per owner. SCOUT-track from prior infra-log follow-ups is cancelled.
--   - All *_ru columns follow the migration 005 pattern: nullable, no index,
--     no backfill here. Read-side falls back to the EN column via
--     localizeTool. Initial RU population is owner-authored via Opus at
--     reference-build time, NOT automated.
--   - verdict + verdict_ru are nullable to keep the migration backwards-
--     compatible (existing 30 published rows have no verdict yet). The
--     /reviews/[slug] runtime renders the Verdict section only when the
--     locale-resolved verdict field is populated; missing verdict = hidden
--     section, not an empty block.
--
-- All idempotent (ADD COLUMN IF NOT EXISTS).
-- All backwards-compatible (nullable, no DEFAULT changes to existing data).
-- No data movement here — owner populates verdict + *_ru via Opus per tool.
-- ============================================================================


-- ── 1. not_for_ru text ─────────────────────────────────────────────────────
-- Existing tools.not_for is the EN editorial "skip if" line, surfaced in
-- /reviews/[slug] FitChips and synthesised into /compare/[slug] support
-- narrative. The RU mirror has been falling back to EN on /ru/reviews/* —
-- this column closes the last EN-bleed gap in the FitChips block.

alter table public.tools
  add column if not exists not_for_ru text;

comment on column public.tools.not_for_ru is
  'Russian "skip if" line; falls back to .not_for when NULL. Used in /ru/reviews/[slug] FitChips after Etap E runtime flip.';


-- ── 2. pricing_notes_ru text ───────────────────────────────────────────────
-- pricing_notes carries the verbose tier breakdown + gotchas (e.g. Klaviyo's
-- 8-clause active-profile billing list, Cogsy's conflicting-prices flag).
-- Already rendered in /compare/[slug] PriceTierCard and will be central to
-- the Etap E review pricing section. RU twin closes the EN-bleed.

alter table public.tools
  add column if not exists pricing_notes_ru text;

comment on column public.tools.pricing_notes_ru is
  'Russian pricing-tier breakdown + gotchas; falls back to .pricing_notes when NULL. Long-form text — same shape as EN.';


-- ── 3. features_ru jsonb ───────────────────────────────────────────────────
-- features is the central feature table (Etap E runtime renders 9 rows for
-- Klaviyo, ~8-12 per tool). Shape: array of {name, description, is_ai,
-- ai_kind?, plan_availability}. The RU twin uses the same shape — name,
-- description, ai_kind, plan_availability are translatable; is_ai is
-- boolean and shared. localizeToolPartial merges the row at render time.
-- Nullable; NULL = fall back to features (EN) wholesale.

alter table public.tools
  add column if not exists features_ru jsonb;

comment on column public.tools.features_ru is
  'Russian features array; same shape as .features (name/description/is_ai/ai_kind/plan_availability). NULL = fall back to .features. Wholesale fallback only — partial merge not supported (a row exists in RU or it does not).';


-- ── 4. shopify_native_notes_ru text ───────────────────────────────────────
-- Migration 015 added shopify_native_notes (R4 rich-text on Shopify
-- integration depth — Built-for-Shopify badge, near-real-time sync notes,
-- etc.). Etap E review pages render this as its own "Shopify integration"
-- section. RU twin closes the EN-bleed for /ru/reviews/.

alter table public.tools
  add column if not exists shopify_native_notes_ru text;

comment on column public.tools.shopify_native_notes_ru is
  'Russian rich-text Shopify integration depth; falls back to .shopify_native_notes when NULL.';


-- ── 5. meta_title_ru text ─────────────────────────────────────────────────
-- After /reviews/[slug] runtime flip, generateMetadata reads tools.meta_title
-- for OpenGraph + <title>. /ru/reviews/[slug] needs the RU twin so RU pages
-- don't ship EN <title> tags (SEO + share-card hygiene).

alter table public.tools
  add column if not exists meta_title_ru text;

comment on column public.tools.meta_title_ru is
  'Russian SEO title for /ru/reviews/[slug]; falls back to .meta_title when NULL.';


-- ── 6. meta_description_ru text ───────────────────────────────────────────
-- Same path as meta_title_ru: generateMetadata description for OG card +
-- meta description tag. Falls back to .meta_description.

alter table public.tools
  add column if not exists meta_description_ru text;

comment on column public.tools.meta_description_ru is
  'Russian SEO description for /ru/reviews/[slug]; falls back to .meta_description when NULL.';


-- ── 7. verdict text (NEW — no prior twin) ─────────────────────────────────
-- Editorial analytic verdict. THE load-bearing closer block of every
-- /reviews/[slug] runtime page. Honest analyst framing derived from
-- aggregated R1-R6 data + verified operator quotes from external_ratings
-- and operator_quotes columns. STRICT framing rules (owner-locked
-- 2026-05-31):
--   - NO fabricated hands-on narrative ("we ran it 90 days", "we tested
--     deliverability with Litmus", "our store doing $48k/mo")
--   - NO invented case data (drift tables, before/after cost projections
--     not sourced from a verifiable external case study)
--   - YES: "for stores matching X profile this is the right pick because
--     [data]; for Y profile not because [data]; pricing inflection at
--     [verifiable threshold] matters because [calc from real numbers]"
-- Why this matters: fabricating Experience-signal (E in EEAT) is a
-- demonstrable Google quality-rater-guideline violation and a sitewide
-- penalty risk. The honest-analyst tone preserves usefulness without
-- claiming first-person ownership of tests we did not run.
--
-- Populated by Opus at reference-build time per tool. Never touched by
-- SCOUT. Quarterly review by operator on pricing-volatility flagged tools
-- (Recharge, ManyChat, Yotpo, Klaviyo per content-flags.md).

alter table public.tools
  add column if not exists verdict text;

comment on column public.tools.verdict is
  'Editorial analytic verdict (EN). Honest aggregate-data conclusion, NOT fabricated hands-on narrative. Populated by Opus at reference build; never written by SCOUT. NULL = Verdict section hidden in runtime render.';


-- ── 8. verdict_ru text ────────────────────────────────────────────────────
-- RU twin for verdict. Same content rules apply: honest analyst voice,
-- aggregated data, no first-person fake-experience claims.

alter table public.tools
  add column if not exists verdict_ru text;

comment on column public.tools.verdict_ru is
  'Russian editorial analytic verdict; falls back to .verdict when NULL.';


-- ============================================================================
-- Verification (after apply):
-- ============================================================================
--
-- -- 1. All 8 columns present:
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema='public' and table_name='tools'
--    and column_name in (
--      'not_for_ru', 'pricing_notes_ru', 'features_ru',
--      'shopify_native_notes_ru', 'meta_title_ru', 'meta_description_ru',
--      'verdict', 'verdict_ru'
--    )
--  order by column_name;
--
-- -- 2. Existing data preserved (no rows touched):
-- select count(*) as tools_count,
--        count(*) filter (where status='published') as published_count,
--        count(*) filter (where status='archived')  as archived_count
--   from public.tools;
--
-- -- 3. All new columns NULL on existing rows (no accidental backfill):
-- select
--   count(*) filter (where not_for_ru              is not null) as not_for_ru_filled,
--   count(*) filter (where pricing_notes_ru        is not null) as pricing_notes_ru_filled,
--   count(*) filter (where features_ru             is not null) as features_ru_filled,
--   count(*) filter (where shopify_native_notes_ru is not null) as shopify_native_notes_ru_filled,
--   count(*) filter (where meta_title_ru           is not null) as meta_title_ru_filled,
--   count(*) filter (where meta_description_ru     is not null) as meta_description_ru_filled,
--   count(*) filter (where verdict                 is not null) as verdict_filled,
--   count(*) filter (where verdict_ru              is not null) as verdict_ru_filled
--   from public.tools;
-- -- expect: all zeros until Klaviyo reference build populates Klaviyo row.
-- ============================================================================
