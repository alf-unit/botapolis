-- ============================================================================
-- Botapolis · Migration 011 — SCOUT sitemap diff monitoring
-- ----------------------------------------------------------------------------
-- After the 2026-05-22 (session 2) RSS audit established that 20 of 39 target
-- vendors don't publish RSS at all (Klaviyo, Postscript, Loop, Triple Whale,
-- et al — Webflow/Framer/Next.js marketing stacks), sitemap.xml diff became
-- the only universal alternative signal channel. Every site with SEO has a
-- sitemap; SCOUT can diff weekly to detect new pricing pages, new blog posts,
-- new feature pages — even when the vendor publishes no RSS.
--
-- See /sessions/infra-log.md '2026-05-22 (session 2) — RSS pivot' for the
-- broader signal-taxonomy reweight that motivates this table (RSS demoted to
-- supplementary; sitemap-diff added as a third signal tier alongside Reddit
-- and the roadmapped newsletter ingestion).
--
-- Schema decisions worth flagging:
--
--   1. `urls` stores ONLY the diff vs the previous snapshot, NOT the full
--      URL set. Shape (enforced at write time by SCOUT, not by CHECK):
--        { "added":   ["https://...", "https://..."],
--          "removed": ["https://..."] }
--      Crawling Shopify or TechCrunch produces 10k+ URLs per sitemap; storing
--      the full list × 50 vendors × 52 weeks/year ≈ 2GB/year, exceeding the
--      Supabase free tier in ~3 months. Diff-only keeps individual rows in
--      the kilobyte range. If a full URL set is ever needed, reconstruct
--      from the history of diffs (rare operation).
--
--   2. `vendor_slug` is plain TEXT, NOT a foreign key on tools(slug). Reason:
--      sitemap monitoring is also useful for news sources that live in
--      /config/vendor-feeds.json but not in tools — techcrunch-ecommerce,
--      modern-retail, retail-dive. A FK constraint would block their inserts.
--
--   3. No batch-populate of tools.sitemap_url here. Path varies per vendor
--      (e.g. shopify.dev/changelog/sitemap.xml vs shopify.com/sitemap.xml),
--      so SCOUT discovers it via path-probe on first cycle (/sitemap.xml,
--      /sitemap_index.xml, /sitemap.xml.gz) and writes back what works.
--
--   4. No retention policy migration. Diffs are small; the table grows
--      linearly but slowly. If/when retention is needed, ship as a separate
--      migration with a scheduled cleanup function (~90-day rolling window).
--
-- Idempotent; safe to re-run.
-- ============================================================================

-- ── 1. Add sitemap_url column to public.tools ───────────────────────────────
-- Nullable. SCOUT fills it in on first sitemap-diff cycle for each vendor it
-- can find a working sitemap for. Vendors without a discoverable sitemap stay
-- NULL forever — SCOUT skips them. NOT batch-populated here on purpose
-- (see note 3 above).
-- ----------------------------------------------------------------------------
alter table public.tools
  add column if not exists sitemap_url text;

comment on column public.tools.sitemap_url is
  'Verified sitemap URL for SCOUT sitemap-diff monitoring. Filled in by SCOUT on first cycle via path-probe (/sitemap.xml, /sitemap_index.xml, /sitemap.xml.gz); NULL means SCOUT either has not crawled yet or vendor has no discoverable sitemap.';

-- ── 2. scout_sitemap_snapshots ──────────────────────────────────────────────
-- One row per (vendor, week) capturing the URL-set DIFF since the prior
-- snapshot. SCOUT writes; CHIEF reads when classifying opportunities.
-- ----------------------------------------------------------------------------
create table if not exists public.scout_sitemap_snapshots (
  id                  uuid primary key default gen_random_uuid(),

  -- Vendor identifier. Matches /config/vendor-feeds.json vendor slugs OR
  -- tools.slug (overlapping sets). Deliberately NOT a FK — covers news
  -- sources (techcrunch-ecommerce, modern-retail, retail-dive) that exist
  -- in vendor-feeds.json but not in tools.
  vendor_slug         text not null,

  -- Date of the snapshot run (typically the SCOUT weekly cycle day).
  -- UNIQUE(vendor_slug, snapshot_date) below ensures one row per vendor/day.
  snapshot_date       date not null,

  -- URL-set DIFF vs the previous snapshot for this vendor.
  -- Expected shape (SCOUT enforces at write time, no CHECK constraint here):
  --   { "added": ["https://...", ...], "removed": ["https://...", ...] }
  -- First snapshot for a vendor: `added` lists all URLs seen, `removed` is [].
  urls                jsonb not null,

  -- Total count of URLs in the FULL sitemap at snapshot time (not in the
  -- diff). Lets CHIEF gauge whether a "5 added" diff is meaningful (vendor
  -- with 100 total URLs) or background noise (vendor with 50k total).
  url_count           integer,

  -- SCOUT's classifier annotations on the diff — which added URLs look like
  -- pricing-change, feature-launch, etc, based on URL pattern. Expected shape:
  --   { "pricing-change":   ["https://...new-tier..."],
  --     "feature-launch":   ["https://...releases..."],
  --     "news":             ["https://...blog..."] }
  -- Free-form to allow SCOUT's classifier to evolve.
  changes_detected    jsonb,

  created_at          timestamptz default now(),

  unique (vendor_slug, snapshot_date)
);

comment on table public.scout_sitemap_snapshots is
  'SCOUT sitemap-diff monitoring snapshots. Each row = one vendor''s URL-set diff for one snapshot date. `urls` field is DIFF only (added/removed), not the full URL set — keeps row sizes small at vendor scale. See migration 011 header for rationale.';

comment on column public.scout_sitemap_snapshots.vendor_slug is
  'Vendor identifier matching /config/vendor-feeds.json or tools.slug. NOT a FK — also covers news sources outside the tools table.';

comment on column public.scout_sitemap_snapshots.urls is
  'URL-set diff vs previous snapshot. Shape: { added: string[], removed: string[] }. First snapshot for a vendor: added=all URLs, removed=[].';

comment on column public.scout_sitemap_snapshots.url_count is
  'Total URL count in the FULL sitemap at snapshot time (not in the diff). Context for CHIEF when judging diff significance.';

comment on column public.scout_sitemap_snapshots.changes_detected is
  'SCOUT classifier annotations on the diff. Shape: { "<category>": string[] } where category is pricing-change | feature-launch | news | etc, mapped per SCOUT AGENTS.md URL-pattern rules.';

-- Index for the common access pattern: "show me the latest N snapshots for
-- vendor X" — used by SCOUT when computing the next diff (needs previous
-- snapshot's URL set) and by CHIEF when reviewing recent vendor activity.
create index if not exists idx_sitemap_vendor_date
  on public.scout_sitemap_snapshots(vendor_slug, snapshot_date desc);

-- ── 3. Row Level Security ───────────────────────────────────────────────────
-- Matches the convention from migration 008 for sibling multi-agent tables.
-- SCOUT writes via the service_role key → bypasses RLS regardless. No anon
-- or authenticated policy = those roles cannot read or write (this is
-- internal SCOUT data, the site does not surface it). Idempotent — re-runs
-- of the migration on a fresh environment land in the same final state as
-- prod (where RLS was enabled via Studio's "Run and enable RLS" prompt on
-- first apply 2026-05-22).
-- ----------------------------------------------------------------------------
alter table public.scout_sitemap_snapshots enable row level security;
