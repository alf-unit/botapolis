-- ============================================================================
-- 004 · Canonical comparison slugs (alphabetical tool ordering)
-- ----------------------------------------------------------------------------
-- The May 2026 audit found pairs like `klaviyo-vs-omnisend` AND
-- `omnisend-vs-klaviyo` indexed as separate pages. Same content, two
-- canonical URLs — pure duplicate-content tax for SEO, and an editorial
-- nightmare (which row do you update when the rating changes?).
--
-- TZ-2 §5.1 already required `'tool-a-vs-tool-b'` to be in alphabetical
-- order. Nothing enforced it. This migration:
--
--   1. Defines `canonical_compare_slug(text)` — pure SQL function that
--      sorts the two tool segments lexicographically.
--   2. Merges any reverse-duplicate rows into the canonical one, picking
--      the non-empty field across (verdict, comparison_data, custom_*,
--      meta_*) — never silently drops content.
--   3. Deletes the now-merged non-canonical rows.
--   4. Renames any leftover non-canonical slugs (cases where a pair only
--      existed in reverse form with no canonical twin to merge into).
--   5. Adds a BEFORE INSERT/UPDATE trigger so future writes self-correct.
--   6. Adds a CHECK constraint as a belt-and-braces guard against trigger
--      bypass (Supabase migrations / SQL editor inserts skip triggers if
--      session_replication_role is set).
--
-- The Next 16 route handler also issues an HTTP 301 from non-canonical to
-- canonical URLs (see app/compare/[slug]/page.tsx); that's the user-facing
-- half. This migration is the data-layer half.
--
-- Idempotent: trigger is recreated, function is OR REPLACE, constraint
-- creation is wrapped in a DO block to skip if already present.
-- ============================================================================

-- 1. Canonical-slug function ------------------------------------------------
CREATE OR REPLACE FUNCTION public.canonical_compare_slug(s text)
RETURNS text AS $$
DECLARE
  parts text[];
BEGIN
  IF s IS NULL THEN RETURN NULL; END IF;
  parts := string_to_array(s, '-vs-');
  -- Only normalize the two-part case. Anything else (single segment,
  -- triple `a-vs-b-vs-c`, etc.) passes through untouched.
  IF array_length(parts, 1) <> 2 THEN
    RETURN s;
  END IF;
  IF parts[1] > parts[2] THEN
    RETURN parts[2] || '-vs-' || parts[1];
  END IF;
  RETURN s;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.canonical_compare_slug(text) IS
  'Normalize a comparison slug to alphabetical tool order. See migration 004.';

-- 2. Merge reverse-duplicates into the canonical row ------------------------
-- We pick the non-empty value for each editorial column. `comparison_data`
-- is jsonb — we prefer the canonical row's value when present, else the
-- reverse row's, never an empty `{}`.
WITH duplicates AS (
  SELECT
    c1.id                              AS canonical_id,
    c2.id                              AS reverse_id,
    c2.verdict                         AS reverse_verdict,
    c2.comparison_data                 AS reverse_comparison_data,
    c2.custom_intro                    AS reverse_intro,
    c2.custom_methodology              AS reverse_methodology,
    c2.meta_title                      AS reverse_meta_title,
    c2.meta_description                AS reverse_meta_description,
    c2.tool_a_id                       AS reverse_tool_a_id,
    c2.tool_b_id                       AS reverse_tool_b_id
  FROM public.comparisons c1
  JOIN public.comparisons c2
    ON public.canonical_compare_slug(c2.slug) = c1.slug
   AND c1.id <> c2.id
   AND c1.slug = public.canonical_compare_slug(c1.slug)
)
UPDATE public.comparisons c
SET
  verdict            = COALESCE(NULLIF(c.verdict, ''),            d.reverse_verdict),
  comparison_data    = COALESCE(
                         CASE WHEN c.comparison_data IS NULL OR c.comparison_data = '{}'::jsonb
                              THEN d.reverse_comparison_data
                              ELSE c.comparison_data
                         END,
                         d.reverse_comparison_data
                       ),
  custom_intro       = COALESCE(NULLIF(c.custom_intro, ''),       d.reverse_intro),
  custom_methodology = COALESCE(NULLIF(c.custom_methodology, ''), d.reverse_methodology),
  meta_title         = COALESCE(NULLIF(c.meta_title, ''),         d.reverse_meta_title),
  meta_description   = COALESCE(NULLIF(c.meta_description, ''),   d.reverse_meta_description),
  updated_at         = NOW()
FROM duplicates d
WHERE c.id = d.canonical_id;

-- 3. Delete the now-merged non-canonical rows -------------------------------
DELETE FROM public.comparisons
WHERE id IN (
  SELECT c2.id
  FROM public.comparisons c1
  JOIN public.comparisons c2
    ON public.canonical_compare_slug(c2.slug) = c1.slug
   AND c1.id <> c2.id
   AND c1.slug = public.canonical_compare_slug(c1.slug)
);

-- 4. Rename leftover non-canonical rows (no canonical twin existed) ---------
-- Now safe to do because (a) any conflicting canonical row was just
-- merged + deleted, and (b) we also need to flip tool_a_id <-> tool_b_id
-- so the rendered "A vs B" matches the slug. We only flip when the rename
-- is actually changing the slug — leaving the canonical rows untouched.
UPDATE public.comparisons
SET
  slug      = public.canonical_compare_slug(slug),
  -- When the slug flips (reverse order), the tool_a/tool_b columns must
  -- flip too — otherwise the page would still render "B vs A" under the
  -- new "A vs B" URL.
  tool_a_id = tool_b_id,
  tool_b_id = tool_a_id,
  updated_at = NOW()
WHERE slug <> public.canonical_compare_slug(slug);

-- 5. BEFORE INSERT/UPDATE trigger -------------------------------------------
-- Uses a temp variable to swap tool_a_id <-> tool_b_id so the page renders
-- correctly under the canonical URL even when callers insert "B-vs-A".
CREATE OR REPLACE FUNCTION public.enforce_canonical_compare_slug()
RETURNS TRIGGER AS $$
DECLARE
  parts    text[];
  swap_tmp uuid;
BEGIN
  IF NEW.slug IS NULL THEN RETURN NEW; END IF;
  parts := string_to_array(NEW.slug, '-vs-');
  IF array_length(parts, 1) = 2 AND parts[1] > parts[2] THEN
    NEW.slug      := parts[2] || '-vs-' || parts[1];
    swap_tmp      := NEW.tool_a_id;
    NEW.tool_a_id := NEW.tool_b_id;
    NEW.tool_b_id := swap_tmp;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comparisons_canonical_slug_trigger ON public.comparisons;
CREATE TRIGGER comparisons_canonical_slug_trigger
BEFORE INSERT OR UPDATE OF slug ON public.comparisons
FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_compare_slug();

-- 6. CHECK constraint -------------------------------------------------------
-- Belt-and-braces: even when the trigger is bypassed (session_replication_role
-- = 'replica', logical-replication slots, raw COPY), a non-canonical slug
-- still raises an error rather than landing silently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comparisons_slug_canonical'
      AND conrelid = 'public.comparisons'::regclass
  ) THEN
    ALTER TABLE public.comparisons
      ADD CONSTRAINT comparisons_slug_canonical
      CHECK (slug = public.canonical_compare_slug(slug));
  END IF;
END $$;
