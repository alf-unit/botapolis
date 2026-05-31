-- ============================================================================
-- Botapolis · 013_phase0_new_tools_drafts.sql
-- ----------------------------------------------------------------------------
-- Phase 0 (Data-First pSEO Blueprint) — Этап B: добавить ~20 новых тулзов как
-- заготовки (drafts). Полные данные приходят после 6 Deep Research проходов
-- (см. PHASE-0-BLUEPRINT.md разделы 3-4).
--
-- Что вставляется:
--   • 9 HIGH-кандидатов (живая партнёрка подтверждается в Research 6)
--   • 11 MEDIUM-кандидатов (партнёрка verify в Research 6 — кто не пройдёт,
--     status='archived' после ресёрча, не удаляем чтобы slug остался для
--     migration-контента по аналогии со Skio/Returnly)
--
-- Поля заготовки:
--   • slug, name, website_url, category — обязательные (NOT NULL в схеме)
--   • status='draft' — RLS public read policy фильтрует drafts наружу,
--     поэтому /reviews/[slug] для них вернёт 404 пока не флипнем в 'published'
--   • affiliate_url, affiliate_partner, pricing_*, features, integrations,
--     rating, pros/cons, best_for/not_for — NULL/defaults, заполняются после
--     ресёрчей 1-5
--   • meta_title/meta_description — NULL, генерим на этапе E (генерация Эшелона 1)
--
-- Категория и website_url — best-guess preliminary значения. Research 1
-- (Identity) их verify'нет и при необходимости откорректирует. ENUM на
-- category нет (CHECK отсутствует — см. 001_initial_schema.sql:41),
-- поэтому любая строка валидна.
--
-- Идемпотентность: ON CONFLICT (slug) DO NOTHING. Re-run = no-op после
-- первого apply. UPDATE-семантика для последующих этапов идёт через
-- отдельные миграции / scripts, не через повторный прогон этой.
-- ============================================================================

insert into public.tools (
  slug, name, website_url, category, subcategories, status, featured
) values
-- ============================================================================
-- HIGH-кандидаты (Blueprint раздел 1.2)
-- ============================================================================

-- Returns automation, Shopify-native
('loop-returns',     'Loop Returns',     'https://www.loopreturns.com',     'returns',         '{}'::text[], 'draft', 0),

-- Subscriptions, Skio-migration alternative
('stay-ai',          'Stay AI',          'https://www.staycommerce.io',     'upsell',          '{}'::text[], 'draft', 0),

-- Attribution / multi-touch analytics
('triple-whale',     'Triple Whale',     'https://www.triplewhale.com',     'attribution',     '{}'::text[], 'draft', 0),

-- Cart upsell / cross-sell / personalization
('rebuy',            'Rebuy',            'https://www.rebuyengine.com',     'personalization', '{}'::text[], 'draft', 0),

-- SMS marketing (Postscript competitor)
('attentive',        'Attentive',        'https://www.attentive.com',       'sms',             '{}'::text[], 'draft', 0),

-- Loyalty / rewards (Smile.io competitor)
('loyaltylion',      'LoyaltyLion',      'https://www.loyaltylion.com',     'loyalty',         '{}'::text[], 'draft', 0),

-- Shipment tracking + returns
('aftership',        'AfterShip',        'https://www.aftership.com',       'returns',         '{}'::text[], 'draft', 0),

-- Fraud protection / chargeback guarantee
('signifyd',         'Signifyd',         'https://www.signifyd.com',        'fraud',           '{}'::text[], 'draft', 0),

-- Shopify-native AI assistant (Shopify Partner Program — см. Blueprint раздел 7)
('shopify-sidekick', 'Shopify Sidekick', 'https://www.shopify.com/magic',   'product-content', '{}'::text[], 'draft', 0),

-- ============================================================================
-- MEDIUM-кандидаты (Blueprint раздел 1.2 — партнёрка verify в Research 6)
-- ============================================================================

-- AI product photography (background generation)
('pebblely',         'Pebblely',         'https://pebblely.com',            'product-content', '{}'::text[], 'draft', 0),

-- AI ad creative generation
('adcreative-ai',    'AdCreative.ai',    'https://www.adcreative.ai',       'ads',             '{}'::text[], 'draft', 0),

-- AI product photography (scene composition)
('flair-ai',         'Flair AI',         'https://flair.ai',                'product-content', '{}'::text[], 'draft', 0),

-- AI product photography (studio-style shots)
('booth-ai',         'Booth AI',         'https://www.booth.ai',            'product-content', '{}'::text[], 'draft', 0),

-- Inventory forecasting (mid-market)
('inventory-planner','Inventory Planner','https://www.inventory-planner.com','inventory',      '{}'::text[], 'draft', 0),

-- Inventory forecasting (D2C-focused)
('prediko',          'Prediko',          'https://www.prediko.io',          'inventory',       '{}'::text[], 'draft', 0),

-- Multi-touch attribution / media-mix
('northbeam',        'Northbeam',        'https://www.northbeam.io',        'attribution',     '{}'::text[], 'draft', 0),

-- BI / analytics for Shopify
('polar-analytics',  'Polar Analytics',  'https://www.polaranalytics.com',  'attribution',     '{}'::text[], 'draft', 0),

-- Inventory + cash-flow planning
('cogsy',            'Cogsy',            'https://www.cogsy.com',           'inventory',       '{}'::text[], 'draft', 0),

-- On-site personalization / product recommendations
('limespot',         'LimeSpot',         'https://www.limespot.com',        'personalization', '{}'::text[], 'draft', 0),

-- AI video / ad creative
('pencil',           'Pencil',           'https://www.trypencil.com',       'ads',             '{}'::text[], 'draft', 0)

on conflict (slug) do nothing;


-- ============================================================================
-- Post-insert sanity check (не блокирует миграцию, просто log)
-- ----------------------------------------------------------------------------
-- Для applied миграции ожидаем 20 новых rows со status='draft'.
-- Запрос для verify:
--   select count(*) from public.tools where status = 'draft';
--   select slug, name, category, status from public.tools
--     where status = 'draft' order by slug;
-- ============================================================================
