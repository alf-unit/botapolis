-- ============================================================================
-- Botapolis · 014_phase0_related_tool_slugs.sql
-- ----------------------------------------------------------------------------
-- Phase 0 (Data-First pSEO Blueprint) — раздел 5.1: добавить связь
-- keyword ↔ tool в semantic_core_entries через text[]-колонку.
--
-- Зачем: текущая схема ловит тулзы только через текст keyword ("klaviyo vs
-- mailchimp"). Для column-wise генерации (Этапы D-G Blueprint) нужна явная
-- связь — "у каких ключей фигурирует tool X?", "какие тулзы покрывает
-- этот ключ?".
--
-- Junction-таблицу не делаем — для наших объёмов (427 ключей × ≤4 тулзов
-- на ключ) text[] проще, GIN-индекс ловит фильтры эффективно.
--
-- Заполнение делается на этапе D (наполнение базы) скриптом, не через
-- эту миграцию. Колонка по умолчанию NULL.
--
-- Примеры контента:
--   semantic_core_entries.keyword               related_tool_slugs
--   ---------------------------------------    -----------------------
--   "klaviyo vs mailchimp"                      ['klaviyo','mailchimp']
--   "gorgias alternatives"                      ['gorgias']
--   "best email marketing for shopify"          ['klaviyo','omnisend',...]
--   "shopify customer service software"         NULL (не привязан к тулзу)
--
-- Идемпотентность: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- ============================================================================

alter table public.semantic_core_entries
  add column if not exists related_tool_slugs text[];

comment on column public.semantic_core_entries.related_tool_slugs is
  'Slugs из public.tools, фигурирующие в keyword. Заполняется на этапе D Blueprint. NULL = ключ не привязан к конкретным тулзам.';

-- GIN-индекс для эффективного поиска "WHERE related_tool_slugs @> ARRAY['klaviyo']"
-- — нужно для column-wise queries: "все ключи с упоминанием тулза X".
create index if not exists idx_semantic_related_tool_slugs
  on public.semantic_core_entries using gin (related_tool_slugs);


-- ============================================================================
-- Verification queries (after apply):
--   -- 1. Column присутствует:
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema='public'
--      and table_name='semantic_core_entries'
--      and column_name='related_tool_slugs';
--
--   -- 2. Index присутствует:
--   select indexname from pg_indexes
--    where schemaname='public'
--      and tablename='semantic_core_entries'
--      and indexname='idx_semantic_related_tool_slugs';
--
--   -- 3. NULL для всех существующих rows (ожидаемо до этапа D):
--   select count(*) filter (where related_tool_slugs is null) as nulls,
--          count(*) filter (where related_tool_slugs is not null) as filled
--     from public.semantic_core_entries;
-- ============================================================================
