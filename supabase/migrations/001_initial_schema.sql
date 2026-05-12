-- ============================================================================
-- Botapolis · 001_initial_schema.sql
-- ----------------------------------------------------------------------------
-- Bootstraps every table the MVP needs (TZ-2 § 4). Idempotent: re-running it
-- on a fresh project should produce the same end state. RLS is on by default
-- for everything; reads are public for published catalog rows, writes go
-- through the service role.
-- ============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive email

-- ----------------------------------------------------------------------------
-- 0. Shared trigger: bump updated_at on UPDATE
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. tools — каталог AI-инструментов
-- ============================================================================
create table if not exists public.tools (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  tagline            text,
  description        text,
  logo_url           text,
  website_url        text not null,
  affiliate_url      text,
  affiliate_partner  text check (
    affiliate_partner in ('impact','partnerstack','rewardful','direct') or affiliate_partner is null
  ),
  category           text not null,
  subcategories      text[] not null default '{}',
  pricing_model      text check (
    pricing_model in ('free','freemium','subscription','one_time','enterprise') or pricing_model is null
  ),
  pricing_min        numeric,
  pricing_max        numeric,
  pricing_notes      text,
  features           jsonb not null default '[]'::jsonb,
  integrations       text[] not null default '{}',
  rating             numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  rating_breakdown   jsonb,
  pros               text[] not null default '{}',
  cons               text[] not null default '{}',
  best_for           text,
  not_for            text,
  alternatives_to    uuid[] not null default '{}',
  featured           integer not null default 0,
  status             text not null default 'published'
                       check (status in ('draft','published','archived')),
  meta_title         text,
  meta_description   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_tools_category on public.tools (category);
create index if not exists idx_tools_status   on public.tools (status);
create index if not exists idx_tools_featured on public.tools (featured desc);
create index if not exists idx_tools_slug     on public.tools (slug);

drop trigger if exists tools_set_updated_at on public.tools;
create trigger tools_set_updated_at
  before update on public.tools
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 2. comparisons — pSEO X-vs-Y страницы
-- ============================================================================
create table if not exists public.comparisons (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  tool_a_id          uuid not null references public.tools(id) on delete cascade,
  tool_b_id          uuid not null references public.tools(id) on delete cascade,
  verdict            text,
  winner_for         jsonb,
  comparison_data    jsonb,
  custom_intro       text,
  custom_methodology text,
  language           text not null default 'en' check (language in ('en','ru')),
  status             text not null default 'published'
                       check (status in ('draft','published','archived')),
  meta_title         text,
  meta_description   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint comparisons_different_tools check (tool_a_id <> tool_b_id)
);

create index if not exists idx_comparisons_slug  on public.comparisons (slug);
create index if not exists idx_comparisons_tools on public.comparisons (tool_a_id, tool_b_id);
create index if not exists idx_comparisons_lang  on public.comparisons (language, status);

drop trigger if exists comparisons_set_updated_at on public.comparisons;
create trigger comparisons_set_updated_at
  before update on public.comparisons
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 3. affiliate_clicks — log of /go/[slug] hits (insert-only)
-- ============================================================================
create table if not exists public.affiliate_clicks (
  id           uuid primary key default gen_random_uuid(),
  tool_id      uuid references public.tools(id) on delete set null,
  source_path  text,
  source_slug  text,
  user_id      uuid references auth.users(id) on delete set null,
  ip_hash      text,
  user_agent   text,
  referer      text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_clicks_tool   on public.affiliate_clicks (tool_id, created_at desc);
create index if not exists idx_clicks_source on public.affiliate_clicks (source_slug, created_at desc);


-- ============================================================================
-- 4. subscribers — newsletter mirror (Beehiiv is source of truth, this is for
--    analytics, source-attribution and unsub on our side).
-- ============================================================================
create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       citext unique not null,
  source      text,
  source_path text,
  language    text not null default 'en' check (language in ('en','ru')),
  beehiiv_id  text,
  status      text not null default 'active'
                check (status in ('active','unsubscribed','bounced','pending')),
  ip_hash     text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_subscribers_email  on public.subscribers (email);
create index if not exists idx_subscribers_status on public.subscribers (status);


-- ============================================================================
-- 5. saved_calculations — залогиненные могут сохранять прогон калькулятора
-- ============================================================================
create table if not exists public.saved_calculations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tool_slug  text not null,
  inputs     jsonb not null,
  results    jsonb,
  name       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_saved_user on public.saved_calculations (user_id, created_at desc);


-- ============================================================================
-- 6. content_likes — лайки/save на статьи (review/guide/tool)
-- ============================================================================
create table if not exists public.content_likes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  ip_hash      text,
  content_type text not null check (content_type in ('review','guide','tool','blog','best','comparison')),
  content_slug text not null,
  created_at   timestamptz not null default now()
);

-- Two partial-unique indexes: one for authed (user_id present), one for guests
-- (ip_hash present). Avoids the NULL-equality trap of plain UNIQUE constraints.
create unique index if not exists uniq_likes_user
  on public.content_likes (user_id, content_type, content_slug)
  where user_id is not null;

create unique index if not exists uniq_likes_ip
  on public.content_likes (ip_hash, content_type, content_slug)
  where user_id is null and ip_hash is not null;

create index if not exists idx_likes_content
  on public.content_likes (content_type, content_slug);


-- ============================================================================
-- 7. featured_listings — оплаченные premium-слоты (sprint 9+, schema готова)
-- ============================================================================
create table if not exists public.featured_listings (
  id            uuid primary key default gen_random_uuid(),
  tool_id       uuid not null references public.tools(id) on delete cascade,
  tier          text not null check (tier in ('basic','premium','sponsor')),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  amount_paid   numeric,
  contact_email text,
  notes         text,
  created_at    timestamptz not null default now(),
  constraint featured_listings_range check (ends_at > starts_at)
);

create index if not exists idx_featured_active
  on public.featured_listings (ends_at)
  where ends_at > now();


-- ============================================================================
-- 8. RLS — Row Level Security
-- ----------------------------------------------------------------------------
-- Pattern:
--   - Catalog tables (tools, comparisons): public read for status='published',
--     all writes via service_role.
--   - PII/log tables (affiliate_clicks, subscribers): service_role only;
--     anon never reads them.
--   - User data (saved_calculations, content_likes): users see only their own.
-- service_role bypasses RLS automatically, so we don't write its policies.
-- ============================================================================

alter table public.tools              enable row level security;
alter table public.comparisons        enable row level security;
alter table public.affiliate_clicks   enable row level security;
alter table public.subscribers        enable row level security;
alter table public.saved_calculations enable row level security;
alter table public.content_likes      enable row level security;
alter table public.featured_listings  enable row level security;

-- ----- tools ----------------------------------------------------------------
drop policy if exists "tools: public read published" on public.tools;
create policy "tools: public read published" on public.tools
  for select to anon, authenticated
  using (status = 'published');

-- ----- comparisons ----------------------------------------------------------
drop policy if exists "comparisons: public read published" on public.comparisons;
create policy "comparisons: public read published" on public.comparisons
  for select to anon, authenticated
  using (status = 'published');

-- ----- affiliate_clicks · no anon access ------------------------------------
-- (service_role bypasses RLS; nothing to declare for anon.)

-- ----- subscribers · no anon access -----------------------------------------
-- (server-side insert via service role; the unsub UI runs through API too.)

-- ----- saved_calculations ---------------------------------------------------
drop policy if exists "saved: owner select" on public.saved_calculations;
create policy "saved: owner select" on public.saved_calculations
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "saved: owner insert" on public.saved_calculations;
create policy "saved: owner insert" on public.saved_calculations
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "saved: owner update" on public.saved_calculations;
create policy "saved: owner update" on public.saved_calculations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "saved: owner delete" on public.saved_calculations;
create policy "saved: owner delete" on public.saved_calculations
  for delete to authenticated
  using (user_id = auth.uid());

-- ----- content_likes --------------------------------------------------------
-- Public read of aggregate counts is exposed through a view (below), so we
-- only allow authenticated users to read their own row-level likes here.
drop policy if exists "likes: owner select" on public.content_likes;
create policy "likes: owner select" on public.content_likes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "likes: authed insert" on public.content_likes;
create policy "likes: authed insert" on public.content_likes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "likes: owner delete" on public.content_likes;
create policy "likes: owner delete" on public.content_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- ----- featured_listings · no anon access -----------------------------------


-- ============================================================================
-- 9. content_like_counts — публичный view aggregate (security_invoker so the
--    view inherits the caller's permissions but the underlying SELECT is on
--    grouped data, no PII).
-- ============================================================================
create or replace view public.content_like_counts
  with (security_invoker = true) as
select
  content_type,
  content_slug,
  count(*)::bigint as likes
from public.content_likes
group by content_type, content_slug;

grant select on public.content_like_counts to anon, authenticated;


-- ============================================================================
-- 10. Optional: webhook helper — used by the Supabase Database Webhook that
--     pings /api/revalidate when a published tool/comparison row changes.
--     (Configured in the Supabase dashboard; nothing to do here.)
-- ============================================================================
