-- ============================================================================
-- Botapolis · 005_tools_ru_columns.sql
-- ----------------------------------------------------------------------------
-- Adds Russian-locale columns to `public.tools` so the same row can carry
-- both English and Russian copy. Read-side pattern in code:
--
--   tool.name_ru ?? tool.name      // RU page  → RU if filled, else EN
--   tool.name                      // EN page  → always EN
--
-- This mirrors how `comparisons` already handles language via duplicate rows
-- (one per language), but for tools we picked separate columns because:
--   • the catalog query is 1 row per tool — duplicating rows would force
--     every other join (alternatives_to UUID[], affiliate_clicks FK, etc.)
--     to know which language-copy to pick
--   • a single `tools` row keeps slug, logo_url, pricing_min / pricing_max,
--     features JSONB (mostly structural), integrations, rating — none of
--     which need translation. Splitting tools by language would have meant
--     duplicating ~80% of the data per row.
--
-- Idempotent — re-running the migration is safe (ADD COLUMN IF NOT EXISTS).
--
-- We intentionally do NOT populate the new columns here. That's the job of
-- `scripts/translate-tools.ts` (npm run translate:tools), which calls
-- OpenRouter for each EN row and fills the matching _ru fields. Reading a
-- not-yet-translated row gracefully falls back to EN at the React layer.
-- ============================================================================

alter table public.tools
  add column if not exists name_ru        text,
  add column if not exists tagline_ru     text,
  add column if not exists description_ru text,
  add column if not exists pros_ru        text[],
  add column if not exists cons_ru        text[],
  add column if not exists best_for_ru    text;

-- No new indexes — RU columns are payload, not search keys. The catalog
-- still filters / orders by `category`, `status`, `featured` (all EN side).
-- Pagefind builds its own RU-only index from MDX; tool catalog search is
-- a client-side fuzzy filter that runs on whatever copy got rendered.

comment on column public.tools.name_ru        is 'Russian display name; falls back to .name when null';
comment on column public.tools.tagline_ru     is 'Russian one-liner; falls back to .tagline when null';
comment on column public.tools.description_ru is 'Russian long-form description; falls back to .description when null';
comment on column public.tools.pros_ru        is 'Russian pros array; falls back to .pros when null';
comment on column public.tools.cons_ru        is 'Russian cons array; falls back to .cons when null';
comment on column public.tools.best_for_ru    is 'Russian "best for" tagline; falls back to .best_for when null';
