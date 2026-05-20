-- ============================================================================
-- Botapolis · Migration 008 — multi-agent tables (CHIEF / SCOUT / OPS)
-- ----------------------------------------------------------------------------
-- Backs the FINAL-ARCHITECTURE-V4 multi-agent system. Five tables that act
-- as the runtime bridge between OpenClaw agents on the Mac Mini, Claude
-- Code on the operator's machine, and the Next.js site on Vercel.
--
--   semantic_core_entries  — every targeted keyword + its workflow state
--   content_opportunities  — discoveries from SCOUT awaiting CHIEF decision
--   agent_logs             — append-only audit trail across all 3 agents
--   performance_snapshots  — daily metrics roll-up written by OPS
--   system_config          — operator-tunable knobs (publishing rate, etc.)
--
-- All writes happen via service_role from OpenClaw / Claude Code / the
-- /api/agents/* routes. The anon role gets read-only access to
-- semantic_core_entries.status and system_config — the site uses neither
-- yet, but reads need to be cheap once the public roadmap page lands.
--
-- This migration is idempotent; safe to re-run.
-- ============================================================================

-- ── 1. semantic_core_entries ────────────────────────────────────────────────
-- Source of truth for what we're targeting and where each topic is in the
-- production pipeline. The CSV at /semantic-core/full-core.csv seeds this
-- table; status transitions thereafter happen via agents + git hooks.
-- ----------------------------------------------------------------------------
create table if not exists public.semantic_core_entries (
  id                          uuid primary key default gen_random_uuid(),

  -- From CSV
  cluster                     text not null,
  template                    text not null,
  keyword                     text not null unique,
  search_intent               text not null,
  volume_estimate             integer,
  difficulty                  integer,
  priority_score              integer,
  content_angle               text,
  content_gap                 text,
  competitors_top3            jsonb,
  notes                       text,
  language                    text not null default 'en',

  -- Workflow state — see Architecture Part 4 for the state machine.
  status                      text not null default 'queued',
  status_changed_at           timestamptz default now(),

  -- File linkages (repo-relative paths). Nullable because they fill in
  -- as the topic moves through research → packet → publish.
  research_file_path          text,
  writer_packet_path          text,
  published_article_path      text,

  -- Time tracking
  queued_at                   timestamptz default now(),
  research_requested_at       timestamptz,
  research_completed_at       timestamptz,
  publication_target_date     date,
  published_at                timestamptz,
  last_refreshed_at           timestamptz,

  -- Performance (populated by OPS post-publish)
  current_gsc_position        integer,
  current_monthly_impressions integer,
  current_monthly_clicks      integer,
  current_affiliate_clicks    integer,

  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),

  -- Defensive constraints so a typo in code can't poison the table.
  constraint semantic_core_status_chk check (status in (
    'queued',
    'researching',
    'research_ready',
    'in_writer_queue',
    'drafting',
    'ready_to_publish',
    'published',
    'refreshing',
    'archived',
    'excluded'
  )),
  constraint semantic_core_template_chk check (template in (
    'review',
    'vs-comparison',
    'alternatives',
    'how-to',
    'guide',
    'pricing',
    'best-for-segment',
    'news'
  )),
  constraint semantic_core_intent_chk check (search_intent in (
    'transactional',
    'commercial-investigation',
    'informational'
  )),
  constraint semantic_core_language_chk check (language in ('en', 'ru'))
);

create index if not exists idx_semantic_status   on public.semantic_core_entries(status);
create index if not exists idx_semantic_priority on public.semantic_core_entries(priority_score desc nulls last);
create index if not exists idx_semantic_cluster  on public.semantic_core_entries(cluster);
create index if not exists idx_semantic_published_at on public.semantic_core_entries(published_at desc nulls last);

-- Auto-bump status_changed_at whenever status flips. Saves every writer
-- from remembering to set it.
create or replace function public.semantic_core_touch_status_changed()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_semantic_core_status on public.semantic_core_entries;
create trigger trg_semantic_core_status
  before update on public.semantic_core_entries
  for each row execute function public.semantic_core_touch_status_changed();


-- ── 2. content_opportunities ────────────────────────────────────────────────
-- SCOUT writes here when it spots something potentially worth covering;
-- CHIEF reviews and either spawns a semantic_core_entries row (accepted)
-- or rejects with rationale.
-- ----------------------------------------------------------------------------
create table if not exists public.content_opportunities (
  id                       uuid primary key default gen_random_uuid(),
  source                   text not null,
  source_url               text,
  topic                    text not null,
  related_keywords         text[],
  related_tools            uuid[],

  opportunity_score        integer,
  urgency                  text,
  estimated_window_days    integer,

  description              text,
  recommended_action       text,
  evidence                 jsonb,

  status                   text not null default 'pending',
  chief_decision           text,
  chief_decided_at         timestamptz,
  spawned_semantic_entry_id uuid references public.semantic_core_entries(id) on delete set null,

  created_at               timestamptz default now(),

  constraint content_opp_status_chk check (status in (
    'pending', 'reviewed_by_chief', 'accepted', 'rejected', 'expired'
  )),
  constraint content_opp_urgency_chk check (
    urgency is null or urgency in ('hot', 'warm', 'evergreen')
  ),
  constraint content_opp_source_chk check (source in (
    'reddit', 'vendor_blog', 'producthunt', 'serp_change', 'rss', 'manual'
  ))
);

create index if not exists idx_opp_score  on public.content_opportunities(opportunity_score desc nulls last);
create index if not exists idx_opp_status on public.content_opportunities(status);


-- ── 3. agent_logs ───────────────────────────────────────────────────────────
-- Append-only event stream. CHIEF reads this for its morning briefing;
-- the operator can grep it when something looks off.
-- ----------------------------------------------------------------------------
create table if not exists public.agent_logs (
  id                  uuid primary key default gen_random_uuid(),
  agent_name          text not null,
  event_type          text not null,
  severity            text not null default 'info',
  message             text not null,
  context             jsonb,

  related_entity_type text,
  related_entity_id   uuid,

  duration_ms         integer,
  tokens_consumed     integer,
  cost_usd            numeric(8,4),

  created_at          timestamptz default now(),

  constraint agent_logs_agent_chk check (agent_name in ('CHIEF', 'SCOUT', 'OPS', 'CLAUDE_CODE', 'OPERATOR')),
  constraint agent_logs_severity_chk check (severity in ('debug', 'info', 'warning', 'error', 'critical'))
);

create index if not exists idx_logs_agent    on public.agent_logs(agent_name, created_at desc);
create index if not exists idx_logs_severity on public.agent_logs(severity)
  where severity in ('error', 'critical');
create index if not exists idx_logs_recent   on public.agent_logs(created_at desc);


-- ── 4. performance_snapshots ────────────────────────────────────────────────
-- One row per day (UTC). OPS writes ~06:00 UTC; CHIEF reads for briefings.
-- ----------------------------------------------------------------------------
create table if not exists public.performance_snapshots (
  id                            uuid primary key default gen_random_uuid(),
  snapshot_date                 date not null unique,

  total_sessions                integer,
  total_pageviews               integer,
  total_unique_visitors         integer,

  gsc_total_impressions         integer,
  gsc_total_clicks              integer,
  gsc_avg_position              numeric(5,2),
  gsc_keywords_top10            integer,
  gsc_keywords_top20            integer,
  gsc_keywords_top50            integer,

  affiliate_clicks              integer,
  affiliate_conversions         integer,
  affiliate_revenue_usd         numeric(10,2),

  new_subscribers               integer,
  total_subscribers             integer,
  newsletter_open_rate          numeric(5,2),
  newsletter_click_rate         numeric(5,2),

  top_pages                     jsonb,
  vercel_function_error_rate    numeric(5,2),

  created_at                    timestamptz default now()
);

create index if not exists idx_perf_snapshot_date on public.performance_snapshots(snapshot_date desc);


-- ── 5. system_config ────────────────────────────────────────────────────────
-- Operator-tunable knobs. Keep it small; if a value belongs in env vars,
-- it doesn't belong here.
-- ----------------------------------------------------------------------------
create table if not exists public.system_config (
  key          text primary key,
  value        jsonb not null,
  description  text,
  modified_by  text,
  modified_at  timestamptz default now(),

  constraint system_config_modified_by_chk check (
    modified_by is null or modified_by in ('operator', 'CHIEF')
  )
);

-- Seed defaults. Re-runs are safe — we only insert when the key is absent.
insert into public.system_config (key, value, description, modified_by) values
  ('publishing_rate_daily',          '4'::jsonb,                                                                    'Target articles per day',                              'operator'),
  ('publishing_rate_monthly_cap',    '100'::jsonb,                                                                  'Soft cap to avoid Google velocity flags',              'operator'),
  ('auto_approve_enabled',           'false'::jsonb,                                                                'Auto-approve articles by CHIEF',                       'operator'),
  ('auto_approve_threshold',         '8.5'::jsonb,                                                                  'Editor score threshold for auto-approve',              'operator'),
  ('current_focus_clusters',         '["klaviyo","gorgias","shopify-sidekick"]'::jsonb,                              'Active focus areas',                                    'operator'),
  ('refresh_lookback_days',          '90'::jsonb,                                                                   'Refresh candidate lookback window',                    'operator'),
  ('refresh_position_threshold',     '15'::jsonb,                                                                   'GSC position trigger for refresh',                     'operator'),
  ('telegram_chat_id',               '"REPLACE_WITH_OPERATOR_CHAT_ID"'::jsonb,                                       'Operator Telegram chat id',                            'operator'),
  ('site_health_check_endpoints',    '["/","/tools","/reviews","/directory"]'::jsonb,                                'URLs OPS pings hourly',                                'operator')
on conflict (key) do nothing;


-- ── Row Level Security ──────────────────────────────────────────────────────
-- service_role only for writes; anon gets a narrow read window where useful
-- (status pages, public roadmaps). authenticated currently == anon for this
-- project (no user accounts on the site).
-- ----------------------------------------------------------------------------
alter table public.semantic_core_entries enable row level security;
alter table public.content_opportunities enable row level security;
alter table public.agent_logs            enable row level security;
alter table public.performance_snapshots enable row level security;
alter table public.system_config         enable row level security;

drop policy if exists "service role full access" on public.semantic_core_entries;
drop policy if exists "service role full access" on public.content_opportunities;
drop policy if exists "service role full access" on public.agent_logs;
drop policy if exists "service role full access" on public.performance_snapshots;
drop policy if exists "service role full access" on public.system_config;

create policy "service role full access" on public.semantic_core_entries for all to service_role using (true) with check (true);
create policy "service role full access" on public.content_opportunities for all to service_role using (true) with check (true);
create policy "service role full access" on public.agent_logs            for all to service_role using (true) with check (true);
create policy "service role full access" on public.performance_snapshots for all to service_role using (true) with check (true);
create policy "service role full access" on public.system_config         for all to service_role using (true) with check (true);

-- Narrow anon reads: only published-state semantic entries (so a future
-- public roadmap page can render without exposing in-flight work) and the
-- system_config values that aren't sensitive. We deliberately do NOT
-- whitelist agent_logs or performance_snapshots — those stay private.
drop policy if exists "anon read published" on public.semantic_core_entries;
create policy "anon read published"
  on public.semantic_core_entries
  for select
  to anon
  using (status = 'published');

drop policy if exists "anon read public config" on public.system_config;
create policy "anon read public config"
  on public.system_config
  for select
  to anon
  using (key in (
    'publishing_rate_daily',
    'current_focus_clusters'
  ));
