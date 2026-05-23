-- ============================================================================
-- Botapolis · Migration 010 — content_opportunities columns for SCOUT
-- ----------------------------------------------------------------------------
-- SCOUT's first live run (2026-05-22) found 4 valid opportunities (Gorgias AI
-- pricing, Gorgias guardrails, Recharge-Skio acquisition, Recharge AI agents)
-- but failed to insert any of them: it writes `tool_slug` (the slug it already
-- holds from /config/vendor-feeds.json) and `category` (its own classifier
-- output), neither of which existed on content_opportunities.
--
-- Migration 008 modelled tool linkage as `related_tools uuid[]` — fine for
-- normalised joins, but it forces SCOUT to do a slug→UUID lookup against
-- public.tools on every insert. Adding a denormalised `tool_slug` is cheaper
-- and matches how SCOUT actually thinks about vendors.
--
-- Both columns are nullable so existing rows (none yet — table is empty) and
-- legacy writers (none yet — only SCOUT writes here) are unaffected.
--
-- Category vocabulary follows SCOUT's AGENTS.md classifier:
--   'pricing-change' | 'feature-launch' | 'acquisition' | 'news' | 'unrelated'
-- Deliberately NOT enforced via CHECK at this stage — SCOUT's vocabulary may
-- evolve as new RSS categories appear, and a failed INSERT silently loses an
-- opportunity. We'll tighten to a CHECK once the vocab stabilises (~30 days
-- of live SCOUT runs).
--
-- Idempotent; safe to re-run.
-- ============================================================================

alter table public.content_opportunities
  add column if not exists tool_slug text,
  add column if not exists category  text;

comment on column public.content_opportunities.tool_slug is
  'Denormalised vendor slug matching /config/vendor-feeds.json (e.g. ''gorgias'', ''recharge''). SCOUT writes this directly; CHIEF can resolve to tools.id via the slug when needed.';

comment on column public.content_opportunities.category is
  'SCOUT''s classifier output: pricing-change | feature-launch | acquisition | news | unrelated. Free-text for now; promote to CHECK constraint once vocab stabilises.';

create index if not exists idx_opp_tool_slug on public.content_opportunities(tool_slug)
  where tool_slug is not null;
