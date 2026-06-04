-- ============================================================================
-- Botapolis · 020_page_publications.sql
-- ----------------------------------------------------------------------------
-- Drip-publication gate (capельный механизм отложенной публикации).
--
-- WHY a separate table (Variant A, approved 2026-06-04):
--   CHIEF must publish AUTONOMOUSLY on a schedule, but it has NO write access
--   to /content/ (frontmatter is Claude Code's domain) — only Supabase. So
--   page VISIBILITY must be DB-backed, otherwise MDX pages could only be
--   published by the operator by hand. This table is the single visibility +
--   pool-ordering gate for EVERY drip-managed page, regardless of whether the
--   page is backed by MDX (pricing/guides/best) or DB rows (tools/comparisons)
--   or is computed (alternatives).
--
-- KEY = (content_type, slug), deliberately WITHOUT locale:
--   Visibility applies to the LOGICAL page (EN+RU together). This enforces the
--   Definition-of-Done invariant "no half-published locale" — you cannot ship
--   EN while RU stays hidden. RU-missing is handled by the EN fallback in
--   getMdxContent(). Comparisons (language in a column, shared slug) → one gate
--   row covers both languages.
--
-- RELATIONSHIP to other status fields (decided, NOT migrated):
--   - tools.status / comparisons.status keep meaning LIFECYCLE
--     (draft|published|archived). They are NOT touched here.
--     Public visibility of a DB page = status='published' AND gate.visible_at
--     IS NOT NULL (double-safe: archived rows are excluded by the existing
--     status filter AND have no visible gate row).
--   - semantic_core_entries.status stays a KEYWORD-funnel tracker, synced
--     best-effort on drip-flip but NOT the source of truth for page visibility
--     (it cannot represent computed/aggregate pages like best/alternatives).
--
-- DRIP MECHANICS:
--   Policy lives in DB (NOT in any agent), so it survives the planned OpenClaw
--   rebuild (OPS removed, CHIEF → publishing):
--     - rate   = system_config.publishing_rate_daily (existing key, default 4)
--     - order  = page_publications.pool_number  (Этап H sequential numbering)
--     - gate   = page_publications.visible_at   (NULL = hidden)
--   The executor is a Vercel cron (/api/cron/drip-publish) that flips the next
--   N hidden+numbered rows to visible_at=now() and revalidates their paths.
--   No OPS dependency, no CHIEF-specific call.
--
-- ROLLOUT SAFETY: an empty table + enabled filter = whole site 404s. The app
--   filter is therefore behind env flag DRIP_GATE_ENABLED; this migration only
--   creates the (empty) table. Backfill (scripts/backfill-page-publications.ts)
--   seeds every currently-live page with visible_at=now() BEFORE the flag is
--   flipped on.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.page_publications (
  content_type text NOT NULL,
  slug         text NOT NULL,
  -- Этап H сквозной номер пула. NULL до нумерации. Drip publishes ascending.
  -- Each URL-page is its own drip unit (e.g. /tools/klaviyo, /alternatives/
  -- klaviyo, /pricing/klaviyo are three rows, three numbers) because the
  -- Blueprint echelons publish in waves, not per-tool atomically.
  pool_number  integer,
  -- The gate. NULL = hidden. Set = publicly live since this instant. A
  -- timestamp (not a boolean) gives us "published since" for free.
  visible_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT page_publications_pkey PRIMARY KEY (content_type, slug),
  CONSTRAINT page_pub_type_chk CHECK (content_type IN (
    'pricing',
    'guides',
    'best',
    'tools',
    'comparisons',
    'alternatives'
  ))
);

-- Sequential pool number is unique when assigned (NULLs allowed/duplicated).
CREATE UNIQUE INDEX IF NOT EXISTS page_pub_pool_uq
  ON public.page_publications (pool_number)
  WHERE pool_number IS NOT NULL;

-- Hot path: "visible set for a content_type" (every route/hub/sitemap call).
CREATE INDEX IF NOT EXISTS page_pub_visible
  ON public.page_publications (content_type)
  WHERE visible_at IS NOT NULL;

-- Drip queue: hidden + numbered, ordered by number (the cron's SELECT … LIMIT N).
CREATE INDEX IF NOT EXISTS page_pub_queue
  ON public.page_publications (pool_number)
  WHERE visible_at IS NULL AND pool_number IS NOT NULL;

-- Reuse the shared updated_at trigger (defined in 001_initial_schema.sql).
DROP TRIGGER IF EXISTS page_publications_set_updated_at ON public.page_publications;
CREATE TRIGGER page_publications_set_updated_at
  BEFORE UPDATE ON public.page_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: this table is read/written only via the service-role key (sitemap,
-- routes, cron, backfill all use createServiceClient). No anon/public access.
-- Enable RLS with no public policy → service role bypasses RLS, anon is denied.
-- ----------------------------------------------------------------------------
ALTER TABLE public.page_publications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verify (run in Studio after apply — expect empty table, 3 indexes, trigger):
--   SELECT count(*) FROM public.page_publications;            -- 0
--   SELECT indexname FROM pg_indexes
--     WHERE tablename = 'page_publications';                  -- pkey + 3 above
--   SELECT tgname FROM pg_trigger
--     WHERE tgrelid = 'public.page_publications'::regclass
--       AND NOT tgisinternal;                                 -- set_updated_at
-- ============================================================================
