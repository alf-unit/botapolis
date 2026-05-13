-- ============================================================================
-- Botapolis · 006_comparisons_language_unique.sql
-- ----------------------------------------------------------------------------
-- Lets the `comparisons` table hold the same slug twice — once per language.
-- Without this, an INSERT for the RU twin of "klaviyo-vs-mailchimp" fails
-- with a unique-constraint violation because slug alone is unique.
--
-- The /ru/compare/[slug] route needs the same slug as /compare/[slug] so
-- URLs match across the language switch (juser stays on the same compare-
-- page when they flip EN ↔ RU in the navbar). The natural way to model
-- this is two rows sharing slug + differing by language, joined to /ru/
-- via the same path segment.
--
-- This migration:
--   1. Drops the legacy UNIQUE on slug alone (the constraint Postgres
--      auto-named at table creation — `comparisons_slug_key`).
--   2. Adds a composite UNIQUE on (slug, language). Existing rows all
--      have language='en' so the constraint accepts them as-is.
--   3. Keeps the canonical-slug trigger from migration 004 untouched —
--      it operates on the slug column, not on the constraint shape.
--   4. Keeps the CHECK constraint `comparisons_slug_is_canonical`
--      from migration 004 untouched.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS + the ADD CONSTRAINT is wrapped
-- in a DO block that skips when the composite constraint already exists.
-- ============================================================================

-- 1. Drop the old single-column unique (auto-named at table creation).
alter table public.comparisons
  drop constraint if exists comparisons_slug_key;

-- 2. Add composite unique. Existing rows all carry language='en' so this
-- doesn't break anything; future RU twins coexist with the same slug.
do $$
begin
  if not exists (
    select 1
    from   pg_constraint
    where  conrelid = 'public.comparisons'::regclass
    and    conname  = 'comparisons_slug_language_key'
  ) then
    alter table public.comparisons
      add constraint comparisons_slug_language_key unique (slug, language);
  end if;
end$$;

-- 3. Composite index is implicit in the unique constraint, but explicit
-- index for the language-scoped slug lookup the route handlers do
-- (`SELECT * WHERE slug = ? AND language = ?`) helps the planner pick it
-- when status filter is also present.
create index if not exists idx_comparisons_slug_lang
  on public.comparisons (slug, language)
  where status = 'published';

comment on constraint comparisons_slug_language_key on public.comparisons is
  'A given slug may exist once per language. See migration 006.';
