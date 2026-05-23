-- ============================================================================
-- Botapolis · Migration 012 — Vercel deployment tracking config
-- ----------------------------------------------------------------------------
-- Adds two system_config keys backing OPS's Vercel health check — the
-- `last_deployed_sha` open follow-up flagged in /sessions/infra-log.md
-- session 1 (2026-05-20):
--
--   "Vercel deploy status not visible in validate:infra — only the endpoint
--   reach test runs against prod. Add a `last_deployed_sha` query to catch
--   silent build failures earlier."
--
-- The pattern that motivated this: three git pushes on 2026-05-20 silently
-- failed to deploy on Vercel (strict-TS error from a stray @ts-expect-error).
-- `git push` returned success, no agent flagged it, the prod endpoint kept
-- responding with the pre-failure revision. We need a way to surface
-- "what SHA is actually live on prod" vs "what SHA is at HEAD on main".
--
-- This migration just adds the storage; the Vercel API poll (OPS hourly
-- health check, per AGENTS.md) and the validate:infra check are downstream
-- code work, separate from this migration.
--
-- Idempotent; safe to re-run.
-- ============================================================================

insert into public.system_config (key, value, description) values
  ('last_deployed_sha',
   '""'::jsonb,
   'Short SHA of the commit currently live on production Vercel. Populated by OPS via Vercel API poll (hourly). Compare against ` HEAD` to detect silent deploy failures.'),
  ('last_deployed_at',
   '""'::jsonb,
   'ISO timestamp when last_deployed_sha was observed live by OPS. Stale value (>2h old without a HEAD match) implies deploy hung or failed.')
on conflict (key) do nothing;
