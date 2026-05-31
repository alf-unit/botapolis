-- ============================================================================
-- Botapolis · 015_phase0_etap_d_schema.sql
-- ----------------------------------------------------------------------------
-- Phase 0 (Data-First pSEO Blueprint) — Этап D schema preparation.
-- Consolidated schema changes accumulated across Research 1-6 reading,
-- as captured in memory project_phase-0-etap-d-plan.md. Applied ONCE
-- before parser writes data into tools.
--
-- Changes (10 total):
--   1. Extend tools.pricing_model CHECK with R2 values (tiered, usage-based,
--      flat, custom, bundled).
--   2. Extend tools.affiliate_partner CHECK with R6 platforms (tapfiliate,
--      lasso, partnerportal).
--   3. ADD COLUMN tools.integrates_with_tools text[] — cross-link queries.
--   4. ADD COLUMN tools.operator_quotes jsonb — array of {quote, source, date}.
--   5. ADD COLUMN tools.external_ratings jsonb — RAW per-platform rating
--      snapshots (G2/Trustpilot/Shopify App Store). STRICTLY separate from
--      existing rating + rating_breakdown which hold OUR derived 4-axis score.
--   6. ADD COLUMN tools.affiliate_commission text — internal reference.
--   7. ADD COLUMN tools.affiliate_cookie_window text — internal reference.
--   8. ADD COLUMN tools.affiliate_program_url text — partner application URL.
--   9. ADD COLUMN tools.pricing_source_url text — R2 source URL per tool.
--  10. ADD COLUMN tools.shopify_native_notes text — R4 rich-text depth description.
--
-- Content-generation flags (Yotpo sunset, Recharge×Skio, ManyChat free-plan
-- changes, Cogsy conflicting prices, Klaviyo commission disputed, etc.)
-- live in /research/phase0-content-flags.md — NOT in this schema. Those are
-- guidance for Etap E/F/G page generators, not tool data.
--
-- All idempotent (IF NOT EXISTS / drop+recreate CHECK pattern).
-- All backwards-compatible (nullable, defaults preserved).
-- No data movement here — parser at Etap D fills these.
-- ============================================================================


-- ── 1. pricing_model CHECK extension (R2) ───────────────────────────────────
-- Current enum: ('free','freemium','subscription','one_time','enterprise').
-- Research 2 introduced values: tiered, usage-based, flat, custom, bundled.
-- Drop+recreate CHECK (Postgres can't ALTER CHECK in place).

alter table public.tools drop constraint if exists tools_pricing_model_check;

alter table public.tools
  add constraint tools_pricing_model_check check (
    pricing_model in (
      'free',
      'freemium',
      'subscription',
      'one_time',
      'enterprise',
      'tiered',
      'usage-based',
      'flat',
      'custom',
      'bundled'
    ) or pricing_model is null
  );


-- ── 2. affiliate_partner CHECK extension (R6) ───────────────────────────────
-- Current enum: ('impact','partnerstack','rewardful','direct').
-- Research 6 introduced: tapfiliate (Pencil), lasso (Recharge moved Mar 2026),
-- partnerportal (Skio uses PartnerPortal.io).

alter table public.tools drop constraint if exists tools_affiliate_partner_check;

alter table public.tools
  add constraint tools_affiliate_partner_check check (
    affiliate_partner in (
      'impact',
      'partnerstack',
      'rewardful',
      'direct',
      'tapfiliate',
      'lasso',
      'partnerportal'
    ) or affiliate_partner is null
  );


-- ── 3. integrates_with_tools text[] (R4) ────────────────────────────────────
-- Internal cross-link column — array of slugs from public.tools that this
-- tool integrates with (per R4 integrates_with column, restricted to
-- documented integrations between the 34-tool set).
-- Existing tools.integrations text[] kept for EXTERNAL systems (Shopify,
-- Meta, Google, etc.) — split allows targeted "WHERE integrates_with_tools
-- @> ARRAY['klaviyo']" queries at Etap E generation.

alter table public.tools
  add column if not exists integrates_with_tools text[];

comment on column public.tools.integrates_with_tools is
  'Slugs из public.tools, с которыми этот тулз нативно интегрируется. Заполняется на Этапе D из Research 4. Отдельно от integrations (внешние системы — Shopify/Meta/Google).';

create index if not exists idx_tools_integrates_with_tools
  on public.tools using gin (integrates_with_tools);


-- ── 4. operator_quotes jsonb (R5) ───────────────────────────────────────────
-- Array of {quote: string, source: string, date: string} per tool, from
-- Research 5. Used at Etap E review-page generation for "what users say"
-- block.

alter table public.tools
  add column if not exists operator_quotes jsonb not null default '[]'::jsonb;

comment on column public.tools.operator_quotes is
  'Verbatim user quotes per tool from Research 5. Array of {quote, source, date}. Used at Etap E for review-page social proof block.';


-- ── 5. external_ratings jsonb (R5) ──────────────────────────────────────────
-- RAW per-platform rating snapshots: g2, trustpilot, shopify_store. Each is
-- {score: numeric, reviews: integer, note: string?}. NULL fields when
-- source = NOT FOUND.
--
-- STRICT SEPARATION from existing tools.rating + tools.rating_breakdown:
--   - tools.rating + tools.rating_breakdown    = OUR derived 4-axis score
--     (from R5 ratings_4axis column — ease/value/support/features 0-10 with
--     [H]/[I] source tags). This is what we display as botapolis's editorial
--     rating on /reviews/[slug] pages.
--   - tools.external_ratings (this column)     = RAW vendor-platform numbers
--     for separate "External ratings" display block ("G2: 4.6/5 from 1352
--     reviews; Shopify App Store: 4.8/5 from 3000+ reviews"). Source data,
--     not editorial judgment.
-- Do not write the same values to both. Parser at Etap D writes ratings_4axis
-- → rating_breakdown; writes g2/trustpilot/shopify_store → external_ratings.

alter table public.tools
  add column if not exists external_ratings jsonb;

comment on column public.tools.external_ratings is
  'RAW vendor-platform rating snapshots from Research 5. Shape: {g2: {score, reviews}, trustpilot: {score, reviews, note?}, shopify_store: {score, reviews}}. NULL fields when source = NOT FOUND. STRICTLY separate from rating + rating_breakdown which hold OUR derived 4-axis editorial score — never duplicate values between the two.';


-- ── 6. affiliate_commission text (R6) ───────────────────────────────────────
-- Internal reference field — stores commission description per tool ("20%
-- recurring 12mo", "10-50% tiered (Gold/Sapphire/VIP)", "Not publicly
-- disclosed"). NOT for public display on /reviews/ pages — owner/CHIEF
-- reference only.

alter table public.tools
  add column if not exists affiliate_commission text;

comment on column public.tools.affiliate_commission is
  'Internal reference: commission description per Research 6. Format varies — "20% recurring 12mo", "tiered", "Not publicly disclosed". NOT for public display.';


-- ── 7. affiliate_cookie_window text (R6) ────────────────────────────────────
-- Internal reference: "30 days", "60 days", "Not stated", "n/a".

alter table public.tools
  add column if not exists affiliate_cookie_window text;

comment on column public.tools.affiliate_cookie_window is
  'Internal reference: affiliate cookie attribution window per Research 6. NOT for public display.';


-- ── 8. affiliate_program_url text (R6) ──────────────────────────────────────
-- Vendor's partner application page (separate from tools.affiliate_url
-- which is the /go/[slug] redirect target). For owner/CHIEF reference when
-- applying to new programs or re-verifying terms.

alter table public.tools
  add column if not exists affiliate_program_url text;

comment on column public.tools.affiliate_program_url is
  'Vendor partner application page URL per Research 6. Separate from affiliate_url (redirect target). For owner/CHIEF re-verification only.';


-- ── 9. pricing_source_url text (R2) ─────────────────────────────────────────
-- Vendor's official pricing page where Research 2 data was verified. Useful
-- for periodic re-verification (Research 2 notes pricing in this category
-- changes frequently — recommends quarterly refresh).

alter table public.tools
  add column if not exists pricing_source_url text;

comment on column public.tools.pricing_source_url is
  'Vendor official pricing page URL where Research 2 data was verified. For periodic re-verification (quarterly cadence recommended per R2 caveats).';


-- ── 10. shopify_native_notes text (R4) ─────────────────────────────────────
-- Research 4 shopify_native column is rich text describing depth of Shopify
-- integration ("Yes — deep native Shopify integration; Shopify App Store;
-- Built-for-Shopify badge; near real-time sync of customers, products,
-- orders and events; native Customer Hub..."). Storing as text preserves
-- nuance for Etap E generation; boolean would lose detail.
--
-- Parser at Etap D can additionally derive a boolean shopify_native by
-- matching "Yes" prefix, but the raw text stays here for the page generator.

alter table public.tools
  add column if not exists shopify_native_notes text;

comment on column public.tools.shopify_native_notes is
  'Rich-text description of Shopify integration depth per Research 4. Preserves nuance (Built-for-Shopify badge status, native checkout extensions, etc.) for Etap E generation. Derived boolean shopify_native can be parsed from this if needed.';


-- ============================================================================
-- Verification (after apply):
-- ============================================================================
--
-- -- 1. CHECK constraints accept new values:
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.tools'::regclass
--    and conname in ('tools_pricing_model_check', 'tools_affiliate_partner_check');
--
-- -- 2. All 8 new columns present + indexed where needed:
-- select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--  where table_schema='public' and table_name='tools'
--    and column_name in (
--      'integrates_with_tools', 'operator_quotes', 'external_ratings',
--      'affiliate_commission', 'affiliate_cookie_window', 'affiliate_program_url',
--      'pricing_source_url', 'shopify_native_notes'
--    )
--  order by column_name;
--
-- -- 3. GIN index on integrates_with_tools:
-- select indexname from pg_indexes
--  where schemaname='public' and tablename='tools'
--    and indexname = 'idx_tools_integrates_with_tools';
--
-- -- 4. Existing data preserved (no rows touched by this migration):
-- select count(*) as tools_count,
--        count(*) filter (where status='draft') as drafts_count,
--        count(*) filter (where status='published') as published_count
--   from public.tools;
-- ============================================================================
