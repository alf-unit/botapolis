-- ============================================================================
-- Botapolis · Migration 002 — contact form inbox
-- ----------------------------------------------------------------------------
-- Backs the /contact page (TZ § 16, sprint 6 / block B).
--
-- Single table, service-role-only writes. We don't email out yet (Resend
-- isn't configured on prod); the table acts as a transactional inbox that
-- the editorial team checks via the Supabase dashboard until we wire up
-- a poll/digest job.
--
-- Apply this migration manually in Supabase SQL Editor or via
-- `supabase db push` against your local CLI link. The codebase is the
-- source of truth for the schema; this file is intentionally idempotent.
-- ============================================================================

create table if not exists public.contact_submissions (
  id           uuid primary key default gen_random_uuid(),
  -- Optional — many people send without filling the name field; we don't
  -- enforce it because the email is the only field that actually matters
  -- for a reply.
  name         text,
  email        text not null,
  subject      text,
  message      text not null,
  -- Where in the funnel they came from (the form lets us tag the source:
  -- "contact_page" vs "review_footer" vs "tool_widget"). Default
  -- 'contact_page' because that's where every legitimate submission lands
  -- until block D adds inline contact CTAs.
  source       text default 'contact_page',
  -- Salt-hashed IP for abuse correlation across submissions without
  -- storing raw PII. Same hashIp() helper as affiliate_clicks.
  ip_hash      text,
  user_agent   text,
  -- 'new' on insert; the editorial workflow flips to 'read' / 'replied' /
  -- 'spam'. Keeping it open-text rather than an enum so the workflow can
  -- evolve without a migration.
  status       text default 'new',
  created_at   timestamptz default now()
);

create index if not exists idx_contact_status     on public.contact_submissions(status, created_at desc);
create index if not exists idx_contact_email_seen on public.contact_submissions(email, created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security: service role only.
-- ----------------------------------------------------------------------------
-- Submissions arrive through /api/contact (server route, uses
-- service_role key). Nobody else should ever touch this table:
--   - anon role: not even SELECT — submissions are private inbox content.
--   - authenticated users: same; even logged-in users shouldn't read
--     each other's messages.
-- ----------------------------------------------------------------------------
alter table public.contact_submissions enable row level security;

-- Defensive: drop any prior policies before re-creating, so re-running the
-- migration doesn't leave stale policies attached.
drop policy if exists "service role full access" on public.contact_submissions;

create policy "service role full access"
  on public.contact_submissions
  for all
  to service_role
  using (true)
  with check (true);
