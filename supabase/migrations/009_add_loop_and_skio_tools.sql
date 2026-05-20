-- ============================================================================
-- Botapolis · 009_add_loop_and_skio_tools.sql
-- ----------------------------------------------------------------------------
-- Adds Loop Subscriptions and Skio to public.tools so the
-- recharge-skio-acquisition content cluster (anchored by
-- writer-queue/pending/001-skio-to-loop-migration) can use entity refs and
-- the /go/[slug] redirector consistently.
--
-- Constraints honored:
--   • tools.status CHECK in ('draft','published','archived') — no enum change.
--     Loop:  status='published' so /go/loop-subscriptions falls back to
--            website_url until the Loop Partner Program approves botapolis.
--     Skio:  status='archived' (acquired by Recharge 2026-04-30; record
--            exists as an entity reference. /go/skio intentionally routes
--            to /tools per app/go/[slug]/route.ts — we don't send traffic
--            to a sunsetting platform).
--   • affiliate_partner CHECK in ('impact','partnerstack','rewardful','direct')
--     or NULL. Both rows: NULL (no signed program at insertion time).
--   • Convention: category='upsell' with 'subscriptions' in subcategories,
--     matching the existing Recharge row (see seed.sql §8).
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — re-running is a no-op once
-- the rows exist. seed.sql carries the same two rows for fresh-environment
-- setup. The live DB reads from these rows (not from seed.sql), hence the
-- separate migration.
-- ============================================================================

insert into public.tools (
  slug, name, tagline, description, logo_url, website_url, affiliate_url,
  affiliate_partner, category, subcategories, pricing_model, pricing_min,
  pricing_max, pricing_notes, features, integrations, rating, rating_breakdown,
  pros, cons, best_for, not_for, featured, status, meta_title, meta_description
) values
-- ---------------------------------------------------------------------------
-- Loop Subscriptions — Skio-migration destination, retention-focused
-- ---------------------------------------------------------------------------
(
  'loop-subscriptions',
  'Loop Subscriptions',
  'Subscriptions for Shopify with a retention-first focus.',
  'Loop Subscriptions is a Shopify-native subscription platform that grew rapidly during 2025-2026 (reported ARR tripled to $33M+ over twelve months, per ARR Club). Loop differentiates on retention tooling — cancellation flows, swap-instead-of-cancel offers, and a subscriber portal designed to reduce involuntary churn. Following Recharge''s acquisition of Skio (April 30, 2026), Loop became the most common destination for merchants migrating off Skio.',
  null,
  'https://www.loopwork.co',
  null,
  null,
  'upsell',
  array['subscriptions','recurring','retention','shopify','skio-alternative'],
  'subscription',
  null,
  null,
  null,
  '[]'::jsonb,
  array['shopify','shopify-plus','klaviyo'],
  null,
  null,
  '{}'::text[],
  '{}'::text[],
  null,
  null,
  0,
  'published',
  'Loop Subscriptions · Shopify subscription platform 2026',
  'Loop Subscriptions for Shopify operators migrating from Skio after the Recharge acquisition. Retention-focused subscriber portal, cancellation flows, swap offers.'
),
-- ---------------------------------------------------------------------------
-- Skio — acquired by Recharge 2026-04-30, entity reference only
-- ---------------------------------------------------------------------------
(
  'skio',
  'Skio',
  'Shopify subscriptions platform acquired by Recharge (April 30, 2026).',
  'Skio was a Shopify-native subscription platform that competed with Recharge and Loop Subscriptions through 2025. On April 30, 2026, Recharge announced the acquisition of Skio for $105 million. As of mid-2026 Skio remains operational, but new sign-ups and the long-term product roadmap are being consolidated into the Recharge ecosystem. Existing Skio merchants face a platform decision: stay through the Recharge consolidation, or migrate to an independent competitor such as Loop Subscriptions or Stay AI.',
  null,
  'https://www.skio.com',
  null,
  null,
  'upsell',
  array['subscriptions','acquired','shopify','recharge-acquisition'],
  'subscription',
  null,
  null,
  null,
  '[]'::jsonb,
  array['shopify','shopify-plus'],
  null,
  null,
  '{}'::text[],
  '{}'::text[],
  null,
  null,
  0,
  'archived',
  'Skio · acquired by Recharge in 2026',
  'Skio overview and acquisition context for Shopify operators evaluating subscription platform migrations to Loop or Recharge.'
)
on conflict (slug) do nothing;
