-- ============================================================================
-- clean-pricing-notes.sql
-- ----------------------------------------------------------------------------
-- Сжатие `pricing_notes` + `pricing_notes_ru` для всех 30 published tools по
-- стандарту: tiers (текущие цены + scale), 1-2 structural-surprise gotchas,
-- free plan отдельной строкой, verified date. Всё остальное (механика,
-- multipliers, %-fees, $/seat, add-on enumerations, historic dates,
-- positive notes) вырезано.
--
-- Применять единым transaction'ом в Supabase Studio:
--   BEGIN;
--   <вставить весь файл>
--   COMMIT;
--
-- Dollar-quoted strings ($en$...$en$, $ru$...$ru$) обходят escaping
-- одинарных кавычек внутри текста.
-- ============================================================================


-- ============================================================================
-- adcreative-ai — AdCreative.ai
-- gotchas: credits per-download, video locked at $249 (sharp jump from Starter)
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Starter ~$20-39/mo (10 credits); Professional ~$249/mo (50 credits, video unlocked); Ultimate ~$599-$999/mo (100+ credits); Enterprise custom

Pricing gotchas: Credits are per-download, not per-generation; video/UGC features locked until Professional ($249/mo, sharp jump from Starter $39).

Free plan: No—7-day trial with 10 credits

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Starter ~$20-39/мес (10 credits); Professional ~$249/мес (50 credits, видео разблокировано); Ultimate ~$599-$999/мес (100+ credits); Enterprise custom

Подводные камни биллинга: credits — пер-download, не пер-generation; видео/UGC заблокированы до Professional ($249/мес, резкий скачок от Starter $39).

Free-план: нет — 7-дневный trial с 10 credits

Проверено 2026-05-30$ru$
WHERE slug = 'adcreative-ai';


-- ============================================================================
-- aftership — AfterShip
-- gotchas: Tracking + Returns are separate products billed independently
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: TRACKING: Free $0 (50 shipments/mo); Essentials $11/mo (100 shipments); Pro $119/mo (2,000 shipments); Premium $239/mo (2,000 shipments); Enterprise custom. RETURNS: Free; Essentials ~$23/mo; Pro ~$59/mo; Premium $239/mo; Enterprise custom (separate product line)

Pricing gotchas: Tracking and Returns are separate products billed independently.

Free plan: Yes—Free tier permanent with 50 shipments/mo

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: TRACKING: Free $0 (50 shipments/мес); Essentials $11/мес (100 shipments); Pro $119/мес (2,000 shipments); Premium $239/мес (2,000 shipments); Enterprise custom. RETURNS: Free; Essentials ~$23/мес; Pro ~$59/мес; Premium $239/мес; Enterprise custom (отдельная продуктовая линия)

Подводные камни биллинга: Tracking и Returns — отдельные продукты с независимым биллингом.

Free-план: да — Free-тир постоянный с 50 shipments/мес

Проверено 2026-05-30$ru$
WHERE slug = 'aftership';


-- ============================================================================
-- attentive — Attentive
-- gotchas: hidden behind demo, 6-12 month contracts $2K-$3K quarterly min
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: No public tiers; modular packages: SMS & MMS Messaging, Text + Email, Text + Email + Push

Pricing gotchas: Pricing hidden behind demo (no self-serve evaluation); contracts typically 6-12 months with $2K-$3K quarterly minimum spend.

Free plan: No

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: публичных тарифов нет; модульные пакеты: SMS & MMS Messaging, Text + Email, Text + Email + Push

Подводные камни биллинга: цена скрыта за демо (без self-serve оценки); контракты обычно 6-12 месяцев с минимумом $2K-$3K в квартал.

Free-план: нет

Проверено 2026-05-30$ru$
WHERE slug = 'attentive';


-- ============================================================================
-- flair-ai — Flair AI
-- gotchas: instant/ad gen consume 4x quota; API only Scale+
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (1 model, 5 images, 1 video); Pro $8-10/mo (2 videos); Pro+ $26-35/mo (8 models, 80 images, 3 videos); Scale $38-55/mo (15 models, 150 images, 5 videos, API); Enterprise custom

Pricing gotchas: 'Instant image generation' and 'ad generation' consume image quota at 4x normal rate; API access only on Scale/Enterprise.

Free plan: Yes—Free forever (1 model/5 images/1 video)

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (1 model, 5 изображений, 1 видео); Pro $8-10/мес (2 видео); Pro+ $26-35/мес (8 models, 80 изображений, 3 видео); Scale $38-55/мес (15 models, 150 изображений, 5 видео, API); Enterprise custom

Подводные камни биллинга: «instant image gen» и «ad gen» жгут квоту изображений в 4× нормальной скорости; API только на Scale/Enterprise.

Free-план: да — Free forever (1 model/5 images/1 video)

Проверено 2026-05-30$ru$
WHERE slug = 'flair-ai';


-- ============================================================================
-- gorgias — Gorgias
-- gotchas: AI Agent double-billed; ticket overage above plan
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Starter $10/mo (50 tickets, 3 seats); Basic $50-60/mo (300 tickets); Pro $300-360/mo (2,000 tickets); Advanced $750-900/mo (5,000 tickets); Enterprise custom

Pricing gotchas: AI Agent double-billed — each resolution costs $0.90-1.00 AND counts as a helpdesk ticket; overage $0.36-0.40 per extra ticket above plan.

Free plan: No—7-day trial only

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Starter $10/мес (50 тикетов, 3 места); Basic $50-60/мес (300 тикетов); Pro $300-360/мес (2,000 тикетов); Advanced $750-900/мес (5,000 тикетов); Enterprise custom

Подводные камни биллинга: AI Agent тарифицируется дважды — каждое разрешение стоит $0.90-1.00 И считается как тикет; overage $0.36-0.40 за каждый дополнительный тикет сверх плана.

Free-план: нет — только 7-дневный trial

Проверено 2026-05-30$ru$
WHERE slug = 'gorgias';


-- ============================================================================
-- inventory-planner — Inventory Planner
-- gotchas: hidden behind quote, annual contracts ($10K+/yr typical)
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: No public tiers; pricing scales by annual revenue + inventory volume; quote-only via form; third-party benchmark cites ~$245/mo floor

Pricing gotchas: Pricing hidden behind quote (revenue + company info required); annual contracts typical, brands report $10K+ annual cost.

Free plan: No—free trial only

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: публичных тарифов нет; цена масштабируется по годовой выручке + объёму инвентаря; quote-only через форму; сторонний benchmark — ~$245/мес floor

Подводные камни биллинга: цена скрыта за quote (нужны выручка и информация о компании); годовые контракты, бренды сообщают $10K+ годовых типично.

Free-план: нет — только free trial

Проверено 2026-05-30$ru$
WHERE slug = 'inventory-planner';


-- ============================================================================
-- judge-me — Judge.me
-- gotchas: $15/mo flat regardless of volume; Shopify-only
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Forever Free $0 (unlimited reviews, Judge.me branding); Awesome $15/mo flat (no branding, AI features, Q&A, integrations)

Pricing gotchas: $15/mo is flat regardless of order volume; Shopify-only (no BigCommerce/WooCommerce since late 2024).

Free plan: Yes—Forever Free with unlimited reviews + photo/video + rich snippets (with branding)

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Forever Free $0 (unlimited reviews, Judge.me брендинг); Awesome $15/мес плоско (без брендинга, AI, Q&A, интеграции)

Подводные камни биллинга: $15/мес — плоско, независимо от объёма заказов; только Shopify (без BigCommerce/WooCommerce с конца 2024).

Free-план: да — Forever Free с unlimited reviews + photo/video + rich snippets (с брендингом)

Проверено 2026-05-30$ru$
WHERE slug = 'judge-me';


-- ============================================================================
-- klaviyo — Klaviyo
-- gotchas: billed on active profiles (not emails sent); Klaviyo One mandatory above ~$10K/mo (+20%)
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (250 active profiles, 500 emails/mo, 150 SMS credits); Email from $20/mo for 251-500 active profiles; scales with active-profile count up to ~$2,300/mo at 250K profiles

Pricing gotchas: Billed on active profiles, not emails sent; Klaviyo One mandatory above ~$10K/mo (+20%).

Free plan: Yes—250 profiles/500 emails/150 SMS credits

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (250 активных профилей, 500 писем/мес, 150 SMS-кредитов); Email от $20/мес за 251-500 активных профилей; масштабируется по числу активных профилей до ~$2,300/мес на 250K профилях

Подводные камни биллинга: тарифицируется по активным профилям, а не отправленным письмам; Klaviyo One обязателен выше ~$10K/мес (+20%).

Free-план: да — 250 профилей/500 писем/150 SMS-кредитов

Проверено 2026-05-30$ru$
WHERE slug = 'klaviyo';


-- ============================================================================
-- limespot — LimeSpot
-- gotchas: auto-tier-bumping mid-cycle; multi-product (Max/Personalizer/Turbo) confusion
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: LimeSpot Personalizer: Essentials ~$18/mo, Pay-as-you-grow $19/mo+, Premium custom. LimeSpot Max: $150/mo for up to $50K monthly online store revenue (50% lifetime promo running); higher revenue = higher tier. LimeSpot Turbo (older product): order-volume based

Pricing gotchas: Auto-tier-bumping if you exceed selected revenue threshold mid-cycle; multi-product line (Max / Personalizer / Turbo) creates tier-selection confusion.

Free plan: Yes—free Shopify app install + 15-day trial on paid

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: LimeSpot Personalizer: Essentials ~$18/мес, Pay-as-you-grow $19/мес+, Premium custom. LimeSpot Max: $150/мес за до $50K monthly revenue (промо 50% lifetime); выше revenue = выше тир. LimeSpot Turbo (старый): order-volume-based

Подводные камни биллинга: auto-tier-bumping если превышаешь выбранный revenue-порог в биллинг-цикл; multi-product линейка (Max / Personalizer / Turbo) создаёт путаницу с выбором тира.

Free-план: да — бесплатная установка Shopify-приложения + 15-дневный trial на платном

Проверено 2026-05-30$ru$
WHERE slug = 'limespot';


-- ============================================================================
-- loop-returns — Loop Returns
-- gotchas: Essential/Advanced annual contracts; order tracking separate $99/mo product
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Checkout+ Free (eligible at 10,000+ annual orders); Essential $155/mo; Advanced $272/mo annual ($340/mo monthly); Enterprise custom

Pricing gotchas: Essential/Advanced require annual contracts; order tracking is a separate $99/mo product.

Free plan: Yes—Checkout+ free for stores with 10K+ annual orders

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Checkout+ Free (eligible с 10,000+ annual orders); Essential $155/мес; Advanced $272/мес годовой ($340/мес помесячно); Enterprise custom

Подводные камни биллинга: Essential/Advanced требуют годовые контракты; order tracking — отдельный продукт от $99/мес.

Free-план: да — Checkout+ free для магазинов с 10K+ annual orders

Проверено 2026-05-30$ru$
WHERE slug = 'loop-returns';


-- ============================================================================
-- loop-subscriptions — Loop Subscriptions
-- gotchas: annual contracts required; transaction fee on subscription GMV
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Starter $99/mo + 1.00% transaction fee + $0/order (DTC); Pro $399/mo + 0.75% transaction fee + $0/order (established); Enterprise custom

Pricing gotchas: Annual contracts required on paid plans; transaction fee applies on subscription GMV (1.00% Starter / 0.75% Pro).

Free plan: 14-day free trial; no permanent free plan

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Starter $99/мес + 1.00% transaction-fee + $0/order (DTC); Pro $399/мес + 0.75% transaction-fee + $0/order (established); Enterprise custom

Подводные камни биллинга: требуются годовые контракты на платных тарифах; transaction-fee на subscription-GMV (1.00% Starter / 0.75% Pro).

Free-план: 14-дневный free trial; постоянного free-плана нет

Проверено 2026-05-30$ru$
WHERE slug = 'loop-subscriptions';


-- ============================================================================
-- loox — Loox
-- gotchas: Scale plan scales by order volume; Shopify-only
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Beginner $9.99/mo (100 review emails); Scale $39.99/mo (300 orders, video reviews); Convert $49.99/mo (AI sorting/translation); Unlimited $299.99/mo

Pricing gotchas: Scale plan scales by order volume — $35 per additional 300 orders beyond base 300; Shopify-only (no BigCommerce/WooCommerce).

Free plan: No—14-day trial only

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Beginner $9.99/мес (100 review-emails); Scale $39.99/мес (300 заказов, видео-отзывы); Convert $49.99/мес (AI sorting/translation); Unlimited $299.99/мес

Подводные камни биллинга: Scale-тариф масштабируется по объёму заказов — $35 за каждые доп.300 заказов сверх базовых 300; только Shopify (без BigCommerce/WooCommerce).

Free-план: нет — только 14-дневный trial

Проверено 2026-05-30$ru$
WHERE slug = 'loox';


-- ============================================================================
-- loyaltylion — LoyaltyLion
-- gotchas: Advanced/Plus quote-only; tiered order caps with >25% upsell trigger
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Classic from $199/mo (up to ~500-800 monthly orders); Advanced custom; Plus custom (10,000+ orders); free Shopify-App tier exists (feature-limited)

Pricing gotchas: Only Classic shows a public price — Advanced/Plus require sales quote; order caps enforced (Classic 2,000, Advanced 4,000, Plus 10,000+) with upsell triggered if exceeded by >25% for 3 months.

Free plan: Yes—limited free tier via Shopify App; paid recommended

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Classic от $199/мес (до ~500-800 monthly orders); Advanced custom; Plus custom (10,000+ заказов); Free Shopify-App тир существует (feature-ограничен)

Подводные камни биллинга: только Classic показывает публичную цену — Advanced/Plus требуют sales-quote; order-caps жёсткие (Classic 2,000, Advanced 4,000, Plus 10,000+); превышение >25% в течение 3 месяцев триггерит upsell.

Free-план: да — ограниченный free через Shopify App; платный рекомендован

Проверено 2026-05-30$ru$
WHERE slug = 'loyaltylion';


-- ============================================================================
-- mailchimp — Mailchimp
-- gotchas: counts unsubscribed/non-subscribed (20-40% bloat); Premium 10K min
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (250 contacts, 500 emails/mo); Essentials from $13/mo (500 contacts); Standard from $20/mo (500 contacts); Premium from $350/mo (10,000 contacts minimum); Custom above 200K

Pricing gotchas: Counts unsubscribed + non-subscribed contacts toward limit unless manually archived (typically 20-40% bloat); Premium tier requires 10,000 contact minimum (sharp jump from Standard).

Free plan: Yes—250 contacts/500 emails/mo

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (250 контактов, 500 emails/мес); Essentials от $13/мес (500 контактов); Standard от $20/мес (500 контактов); Premium от $350/мес (минимум 10,000 контактов); Custom выше 200K

Подводные камни биллинга: считает отписавшихся и non-subscribed контактов к лимиту, если не архивированы вручную (обычно 20-40% bloat); Premium-тир требует минимум 10,000 контактов (резкий скачок от Standard).

Free-план: да — 250 контактов/500 emails/мес

Проверено 2026-05-30$ru$
WHERE slug = 'mailchimp';


-- ============================================================================
-- manychat — ManyChat
-- gotchas: WhatsApp Meta per-conversation passthrough; contacts stay "active" if dormant
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (25 active contacts, 4 automations, 2 channels); Essentials $14-15/mo; Pro $29/mo (2,500 contacts, 3 channels, AI); Business $69/mo (7,500 contacts, all channels, 5 seats); Advanced custom

Pricing gotchas: WhatsApp messaging uses Meta's per-conversation fee, passed through on top of plan; contacts stay 'active' (and billable) even if dormant — must manually remove.

Free plan: Yes—25 active contacts/4 automations/2 channels

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (25 активных контактов, 4 автоматизации, 2 канала); Essentials $14-15/мес; Pro $29/мес (2,500 контактов, 3 канала, AI); Business $69/мес (7,500 контактов, все каналы, 5 мест); Advanced custom

Подводные камни биллинга: WhatsApp использует per-conversation fee Meta, passed through сверх плана; контакты остаются «активными» (и тарифицируются) даже если неактивны — нужно вручную удалять.

Free-план: да — 25 активных контактов/4 автоматизации/2 канала

Проверено 2026-05-30$ru$
WHERE slug = 'manychat';


-- ============================================================================
-- northbeam — Northbeam
-- gotchas: hidden behind quote; scales by data volume not revenue
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: No published tiers; third-party sources cite Starter MTA from $999-$1,500/mo (under $250K monthly ad spend); Professional/Enterprise + MMM+ add-on — all custom-quoted

Pricing gotchas: Pricing hidden behind quote — effective floor is brands spending $50K+/mo on paid media; scales by data volume / pageviews, not by tracked revenue.

Free plan: No

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: публичных тарифов нет; сторонние источники упоминают Starter MTA от $999-$1,500/мес (под $250K monthly ad spend); Professional/Enterprise + MMM+ — все custom-quoted

Подводные камни биллинга: цена скрыта за quote — фактический floor для брендов с $50K+/мес расходом на paid media; масштабируется по объёму данных / pageviews, не по tracked-выручке.

Free-план: нет

Проверено 2026-05-30$ru$
WHERE slug = 'northbeam';


-- ============================================================================
-- omnisend — Omnisend
-- gotchas: billed on total billable contacts (incl abandoned-cart + imported); auto-upgrades
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (250 contact reach, 500 emails/mo, 60 SMS credits trial); Standard from $16/mo for 500 contacts (scales to ~$132 at 10K); Pro from $59/mo for 2,500 contacts (unlimited emails); Custom for 150K+

Pricing gotchas: Billed on total billable contacts (subscribers + abandoned-cart + imported); auto-upgrades tier as list grows.

Free plan: Yes—250 contacts/500 emails/60 SMS trial credits

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (250 contact reach, 500 emails/мес, 60 SMS-credits trial); Standard от $16/мес за 500 контактов (масштаб до ~$132 на 10K); Pro от $59/мес за 2,500 контактов (unlimited emails); Custom для 150K+

Подводные камни биллинга: тарифицируется по общим billable-контактам (подписчики + abandoned-cart + imported); авто-апгрейдит тир по росту списка.

Free-план: да — 250 контактов/500 emails/60 SMS trial-credits

Проверено 2026-05-30$ru$
WHERE slug = 'omnisend';


-- ============================================================================
-- pencil — Pencil
-- gotchas: credits vary by AI model; self-serve capped at monthly quota
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Core $11-14/mo (50 generations/mo, 1 workspace); Growth $44-55/mo (250 generations/mo, unlimited workspaces); Pro custom (unlimited generations, enterprise ToS, dedicated CSM)

Pricing gotchas: Generation credits vary by AI model used (e.g., Google Veo 3 burns more); self-serve plans capped at monthly quota — exceeding requires upgrade.

Free plan: Yes—6 free ads on signup; no permanent free tier

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Core $11-14/мес (50 generations/мес, 1 workspace); Growth $44-55/мес (250 generations/мес, unlimited workspaces); Pro custom (unlimited generations, enterprise ToS, dedicated CSM)

Подводные камни биллинга: credit-списания варьируются по AI-модели (Google Veo 3 жжёт больше); self-serve тарифы capped по месячной квоте — превышение требует upgrade.

Free-план: да — 6 free ads при регистрации; постоянного free-tier нет

Проверено 2026-05-30$ru$
WHERE slug = 'pencil';


-- ============================================================================
-- polar-analytics — Polar Analytics
-- gotchas: scales with MTO; $20M+ GMV = Enterprise quote
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Analyze ~$300-350/mo (base); Analyze + Enrich ~$400/mo (Polar Pixel, CAPI Enhancer, Klaviyo Flow Enricher, forecasts); Enterprise custom (intraday refresh, Snowflake DB, automation, SLA; for brands >$20M GMV)

Pricing gotchas: Scales with Monthly Tracked Orders (MTO) — $6M GMV brands typically pay ~$1,020/mo with attribution; $20M+ GMV requires Enterprise quote.

Free plan: No—free trial available

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Analyze ~$300-350/мес (base); Analyze + Enrich ~$400/мес (Polar Pixel, CAPI Enhancer, Klaviyo Flow Enricher, forecasts); Enterprise custom (intraday refresh, Snowflake DB, automation, SLA; для брендов >$20M GMV)

Подводные камни биллинга: масштабируется с Monthly Tracked Orders (MTO) — бренды с $6M GMV обычно платят ~$1,020/мес с атрибуцией; $20M+ GMV требует Enterprise quote.

Free-план: нет — free trial доступен

Проверено 2026-05-30$ru$
WHERE slug = 'polar-analytics';


-- ============================================================================
-- postscript — Postscript
-- gotchas: platform fee + per-message usage; carrier fees passthrough
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Starter from $25/mo (includes minimum spend); Growth from $100/mo; Professional ~$500/mo; Enterprise custom

Pricing gotchas: Pricing is platform fee plus per-message usage; carrier fees passed through on top of plan.

Free plan: No—30-day trial with $1,000 usage credit

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Starter от $25/мес (включает minimum spend); Growth от $100/мес; Professional ~$500/мес; Enterprise custom

Подводные камни биллинга: цена = платформа-fee + per-message usage; carrier-fees passthrough сверх плана.

Free-план: нет — 30-дневный trial с $1,000 usage-credit

Проверено 2026-05-30$ru$
WHERE slug = 'postscript';


-- ============================================================================
-- rebuy — Rebuy
-- gotchas: scales by RGR + orders; Enterprise $999 covers $40K RGR then +$249/$10K
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free (basic); Build Your Plan from $25/mo (package-based); Starter $99/mo; Grow $749/mo; Platform One $538-$584/mo+; Enterprise $999/mo+

Pricing gotchas: Scales by Rebuy-Generated Revenue (RGR) + monthly orders; Enterprise $999 covers up to $40K RGR — then +$249 per additional $10K (steep marginal cost).

Free plan: Yes—limited free + Rebuy Ads free

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free (базовый); Build Your Plan от $25/мес (package-based); Starter $99/мес; Grow $749/мес; Platform One $538-$584/мес+; Enterprise $999/мес+

Подводные камни биллинга: масштабируется по Rebuy-Generated Revenue (RGR) + monthly orders; Enterprise $999 покрывает до $40K RGR — потом +$249 за каждые доп.$10K (крутая маржинальная стоимость).

Free-план: да — ограниченный free + Rebuy Ads free

Проверено 2026-05-30$ru$
WHERE slug = 'rebuy';


-- ============================================================================
-- recharge — Recharge
-- gotchas: transaction fees on every order; Plus/Custom annual contracts
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Starter $25/mo (first 50 lifetime subscribers, new merchants only, no transaction fees); Standard $99/mo + 1.49% + $0.19 per subscription transaction; Plus $499/mo + 1.34% + $0.19 per transaction (annual contract); Custom for high volume

Pricing gotchas: Transaction fees apply on every subscription order (1.49% Standard / 1.34% Plus + $0.19/order); Plus and Custom require annual contracts.

Free plan: 60-day free trial on Starter plan only

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Starter $25/мес (первые 50 lifetime подписчиков, только новые мерчанты, без transaction-fees); Standard $99/мес + 1.49% + $0.19 за subscription-transaction; Plus $499/мес + 1.34% + $0.19 за transaction (годовой контракт); Custom для high-volume

Подводные камни биллинга: transaction-fees на каждый subscription-order (1.49% Standard / 1.34% Plus + $0.19/order); Plus и Custom требуют годовых контрактов.

Free-план: 60-дневный free trial только на Starter

Проверено 2026-05-30$ru$
WHERE slug = 'recharge';


-- ============================================================================
-- shopify-sidekick — Shopify Sidekick
-- gotchas: not standalone (cost = Shopify subscription); Plus pricing varies by contract term
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Bundled FREE with all Shopify plans: Basic $39/mo, Shopify $105/mo, Advanced $399/mo, Plus from $2,300/mo (3-year) or $2,500/mo (1-year)

Pricing gotchas: Sidekick is not standalone — cost equals your Shopify subscription; Plus pricing depends on contract term ($2,300/mo at 3-year vs $2,500/mo at 1-year).

Free plan: Yes—included with any active Shopify subscription

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Bundled бесплатно со всеми Shopify-планами: Basic $39/мес, Shopify $105/мес, Advanced $399/мес, Plus от $2,300/мес (3-летний) или $2,500/мес (1-летний)

Подводные камни биллинга: Sidekick не standalone — стоимость = твоя Shopify-подписка; Plus-цена зависит от срока контракта ($2,300/мес 3-летний vs $2,500/мес 1-летний).

Free-план: да — включено в любую активную Shopify-подписку

Проверено 2026-05-30$ru$
WHERE slug = 'shopify-sidekick';


-- ============================================================================
-- signifyd — Signifyd
-- gotchas: % of approved order value; only billed when orders are approved
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: No published tiers; products: Guaranteed Fraud Protection, Account Protection, Payment Optimization, Abuse Prevention, Intelligent Returns Protection

Pricing gotchas: Pricing = % of approved order value (varies by vertical, AOV, volume); only billed when orders are approved — declined-as-fraud orders cost nothing.

Free plan: No

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: публичных тарифов нет; продукты: Guaranteed Fraud Protection, Account Protection, Payment Optimization, Abuse Prevention, Intelligent Returns Protection

Подводные камни биллинга: цена = % от стоимости одобренных заказов (варьируется по вертикали, AOV, объёму); тарифицируется только когда заказы одобрены — declined-as-fraud не списываются.

Free-план: нет

Проверено 2026-05-30$ru$
WHERE slug = 'signifyd';


-- ============================================================================
-- skio — Skio
-- gotchas: per-order $0.20 adds up; 1% transaction fee stacks on platform fee
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Monthly Plan $599/mo (or $499/mo annual) + 1% transaction fee + $0.20 per subscription order; Enterprise custom

Pricing gotchas: Per-order fee $0.20 adds up fast (10K orders/mo = $2,000 extra); transaction fee 1% on subscription GMV stacks on top of platform fee.

Free plan: No—14-day free trial

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Monthly Plan $599/мес (или $499/мес годовой) + 1% transaction-fee + $0.20 за subscription-order; Enterprise custom

Подводные камни биллинга: per-order fee $0.20 накапливается быстро (10K заказов/мес = $2,000 extra); transaction-fee 1% на subscription-GMV стакается поверх платформа-fee.

Free-план: нет — 14-дневный free trial

Проверено 2026-05-30$ru$
WHERE slug = 'skio';


-- ============================================================================
-- smile-io — Smile.io
-- gotchas: order count includes refunded/unpaid (silent inflation); API gated to $999 Plus
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (up to 200 monthly orders); Starter $49/mo (up to 500 orders, branding, 2 integrations); Growth $199/mo (VIP, unlimited integrations); Plus $999/mo (up to 7,500 orders, +$5 per 100 orders beyond, API)

Pricing gotchas: Order count includes refunded + unpaid orders (silent inflation); API and high-volume support gated to $999 Plus tier.

Free plan: Yes—Free plan for stores under 200 monthly orders

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (до 200 monthly orders); Starter $49/мес (до 500 заказов, брендинг, 2 интеграции); Growth $199/мес (VIP, unlimited integrations); Plus $999/мес (до 7,500 заказов, +$5 за каждые 100 заказов сверх, API)

Подводные камни биллинга: order-count включает возвраты и неоплаченные заказы (тихая инфляция); API и high-volume support заперты за $999 Plus.

Free-план: да — для магазинов с менее 200 monthly orders

Проверено 2026-05-30$ru$
WHERE slug = 'smile-io';


-- ============================================================================
-- stay-ai — Stay AI
-- gotchas: single published paid tier — $499/mo minimum regardless of volume
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Monthly Plan $499/mo + 1% transaction fee + $0.19 per subscription order (single published tier); custom for higher volume

Pricing gotchas: Single published paid tier — $499/mo minimum applies regardless of order volume.

Free plan: No—30-day free trial

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Monthly Plan $499/мес + 1% transaction-fee + $0.19 за subscription-order (единственный публичный тир); custom для higher volume

Подводные камни биллинга: единственный опубликованный платный тир — $499/мес минимум независимо от объёма заказов.

Free-план: нет — 30-дневный free trial

Проверено 2026-05-30$ru$
WHERE slug = 'stay-ai';


-- ============================================================================
-- tidio — Tidio
-- gotchas: 12x cliff Growth $59 -> Plus $749; three separate quotas
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (50 conversations/mo, 50 lifetime Lyro); Starter $29/mo (100 conversations); Growth $59/mo (250-2,000 conversations); Plus from $749/mo (custom limits, white-label); Premium custom

Pricing gotchas: 12x price cliff from Growth $59 to Plus $749 (no mid-tier); three separate quotas — billable conversations + Lyro AI conversations + Flow triggers.

Free plan: Yes—50 conversations/mo + 50 lifetime Lyro

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (50 conversations/мес, 50 lifetime Lyro); Starter $29/мес (100 conversations); Growth $59/мес (250-2,000 conversations); Plus от $749/мес (custom limits, white-label); Premium custom

Подводные камни биллинга: 12× скачок цены от Growth $59 к Plus $749 (без mid-tier); три отдельные квоты — billable conversations + Lyro AI conversations + Flow triggers.

Free-план: да — 50 conversations/мес + 50 lifetime Lyro

Проверено 2026-05-30$ru$
WHERE slug = 'tidio';


-- ============================================================================
-- triple-whale — Triple Whale
-- gotchas: priced by annual GMV tier (scales steeply above $250K); 12-month commitment
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Free $0 (Triple Pixel, first/last-click attribution, 12-month lookback); Starter $149/mo (3,000 credits, multi-touch attribution); Advanced $219/mo (6,000 credits, BI/SQL, Sonar Optimize); Compass custom (Marketing Mix Modeling, GeoLift)

Pricing gotchas: Paid plans priced by annual GMV tier — shown prices are for <$250K GMV (typical $6M GMV brand pays $11K+/year); Starter/Advanced require 12-month commitment.

Free plan: Yes—Free plan with Triple Pixel, 10 users, 12-month lookback

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Free $0 (Triple Pixel, first/last-click attribution, 12-месячный lookback); Starter $149/мес (3,000 credits, multi-touch attribution); Advanced $219/мес (6,000 credits, BI/SQL, Sonar Optimize); Compass custom (Marketing Mix Modeling, GeoLift)

Подводные камни биллинга: платные тарифы цены зависят от тира годовой GMV — показанные цены для <$250K GMV (типичный бренд с $6M GMV платит $11K+/год); Starter/Advanced требуют 12-месячного коммитмента.

Free-план: да — Free-план с Triple Pixel, 10 users, 12-месячным lookback

Проверено 2026-05-30$ru$
WHERE slug = 'triple-whale';


-- ============================================================================
-- yotpo — Yotpo
-- gotchas: each module billed separately; SMS+Email discontinued (Reviews/Loyalty only)
-- ============================================================================
UPDATE public.tools
SET
  pricing_notes = $en$Tiers: Reviews: Free (50 orders), Starter $79/mo (500 orders), Pro $169/mo, Premium custom; Loyalty: Free, Pro $199/mo, Premium custom; Bundle Pro $368/mo for both; Premium tier $799-$1,202/mo at 3K orders

Pricing gotchas: Each module billed separately (Reviews + Loyalty stacked = $278+/mo minimum); SMS and Email products discontinued — Reviews and Loyalty only.

Free plan: Yes—Free Reviews (50 orders/mo) and Free Loyalty (basic tier)

Verified 2026-05-30$en$,
  pricing_notes_ru = $ru$Тарифы: Reviews: Free (50 заказов), Starter $79/мес (500 заказов), Pro $169/мес, Premium custom; Loyalty: Free, Pro $199/мес, Premium custom; Bundle Pro $368/мес за оба; Premium tier $799-$1,202/мес на 3K заказов

Подводные камни биллинга: каждый модуль тарифицируется отдельно (Reviews + Loyalty stacked = $278+/мес минимум); SMS и Email продукты сняты — только Reviews и Loyalty.

Free-план: да — Free Reviews (50 заказов/мес) и Free Loyalty (базовый тир)

Проверено 2026-05-30$ru$
WHERE slug = 'yotpo';


-- ============================================================================
-- Post-apply sanity (optional — run as separate query in Studio):
-- ============================================================================
-- SELECT slug,
--        char_length(pricing_notes) AS en_len,
--        char_length(pricing_notes_ru) AS ru_len
-- FROM public.tools
-- WHERE status = 'published'
-- ORDER BY en_len DESC;
--
-- Expected: every published tool's pricing_notes shrinks dramatically
-- (typical from 600-1200 chars down to 250-500). Tools with no gotchas (none
-- in this set) would show only tiers + free plan lines.
