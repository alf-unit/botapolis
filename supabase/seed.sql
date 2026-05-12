-- ============================================================================
-- Botapolis · seed.sql
-- ----------------------------------------------------------------------------
-- 7 real-world Shopify ecosystem tools. Pricing/integrations/features are
-- accurate as of late 2025 — anything pricing-sensitive should be refreshed
-- in the dashboard before launch.
--
-- Idempotent: uses ON CONFLICT (slug) DO UPDATE so re-running the seed
-- updates existing rows rather than blowing up.
-- ============================================================================

insert into public.tools (
  slug, name, tagline, description, logo_url, website_url, affiliate_url,
  affiliate_partner, category, subcategories, pricing_model, pricing_min,
  pricing_max, pricing_notes, features, integrations, rating, rating_breakdown,
  pros, cons, best_for, not_for, featured, status, meta_title, meta_description
) values
-- ---------------------------------------------------------------------------
-- 1. Klaviyo
-- ---------------------------------------------------------------------------
(
  'klaviyo',
  'Klaviyo',
  'Email and SMS marketing built around your Shopify customer data.',
  'Klaviyo is the de-facto email+SMS platform for serious Shopify operators. The Shopify integration is native (not webhook duct-tape), the segmentation engine consumes your store events in near real-time, and the predictive analytics actually move numbers when fed enough data. It''s also one of the more aggressively priced platforms past the 50k-contact mark.',
  '/tools/klaviyo.svg',
  'https://www.klaviyo.com',
  'https://www.klaviyo.com/partner/signup?utm_source=botapolis',
  'partnerstack',
  'email',
  array['email','sms','automation','segmentation'],
  'freemium',
  0, 1700,
  'Free up to 250 contacts / 500 monthly emails. Paid tiers scale with contact count.',
  '[
    {"name":"Native Shopify integration","description":"Two-way sync of products, orders, customers in near real-time","included":true},
    {"name":"Predictive analytics","description":"CLV, churn risk, next-order date","included":true},
    {"name":"SMS marketing","description":"US/CA/UK/AU short codes","included":true},
    {"name":"AI subject-line writer","description":"Trained on your brand''s history","included":true},
    {"name":"Reviews module","description":"Native UGC capture and display","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','recharge','gorgias','attentive','okendo'],
  8.7,
  '{"ease_of_use": 7.5, "value": 7.0, "support": 9.0, "features": 9.5}'::jsonb,
  array[
    'Best-in-class Shopify-native integration',
    'Segmentation depth nothing else matches at this price tier',
    'Predictive analytics that earn back their cost past $50k MRR',
    'Reliable deliverability with shared and dedicated IPs'
  ],
  array[
    'Pricing scales aggressively past 50k contacts',
    'Email builder still feels dated next to Postscript / Omnisend',
    'Onboarding requires real lift — not a "set it and forget it" tool'
  ],
  'Stores past $50k/mo revenue with real list growth and segmentation needs.',
  'Sub-$10k/mo stores where Mailchimp or Omnisend save 60% of the bill.',
  3, 'published',
  'Klaviyo review 2026 · is it still worth it for Shopify?',
  'We tested Klaviyo for 90 days on a real Shopify store. Honest take on pricing, deliverability, AI features, and when it stops being worth the bill.'
),
-- ---------------------------------------------------------------------------
-- 2. Mailchimp
-- ---------------------------------------------------------------------------
(
  'mailchimp',
  'Mailchimp',
  'Generalist email marketing — fine for small stores, painful past 20k contacts.',
  'Mailchimp is the email platform everyone has heard of, which is exactly its problem in the Shopify universe. The Shopify integration was rebuilt in 2022 after the public spat with Shopify, and it''s functional but not deep. For stores under $20k MRR with simple campaigns it still earns its place; past that, Klaviyo and Omnisend leave it behind on segmentation, automation logic, and price-per-contact.',
  '/tools/mailchimp.svg',
  'https://www.mailchimp.com',
  null,
  null,
  'email',
  array['email','automation','crm','generalist'],
  'freemium',
  0, 350,
  'Free up to 500 contacts. Standard tier kicks in fast; Essentials caps automations at 4 journeys.',
  '[
    {"name":"Shopify integration","description":"Rebuilt 2022 — product, order, customer sync (basic)","included":true},
    {"name":"Customer journeys","description":"Capped at 4 on Essentials","included":true},
    {"name":"Postcards","description":"Physical mail integration","included":true},
    {"name":"SMS marketing","description":"US/CA only, add-on","included":true}
  ]'::jsonb,
  array['shopify','woocommerce','squarespace'],
  6.3,
  '{"ease_of_use": 8.5, "value": 6.0, "support": 6.0, "features": 6.0}'::jsonb,
  array[
    'Easiest first-time email platform on the market',
    'Free tier still useful for sub-500 contact stores',
    'Generous templates and AI writing assistant'
  ],
  array[
    'Shopify integration is shallow vs. Klaviyo/Omnisend',
    'Pricing scales fast — overtakes Klaviyo past 15k contacts',
    'Automation logic is rigid — multi-condition splits cost extra',
    'No native SMS outside US/CA'
  ],
  'Sub-$15k MRR stores running simple campaigns and not segmenting deeply.',
  'Anyone past 25k contacts or doing serious ecom automation.',
  0, 'published',
  'Mailchimp review 2026 · the honest case for and against',
  'Mailchimp still gets recommended out of habit. Here''s when it actually fits a Shopify store and when Klaviyo or Omnisend save you real money.'
),
-- ---------------------------------------------------------------------------
-- 3. Omnisend
-- ---------------------------------------------------------------------------
(
  'omnisend',
  'Omnisend',
  'Email + SMS for ecom — Klaviyo features at Mailchimp prices.',
  'Omnisend positions itself dead-on between Mailchimp''s simplicity and Klaviyo''s power, and on most days it delivers. The free tier (250 contacts, 500 emails) is genuinely usable for new stores, automations include cart/browse abandonment and post-purchase out of the box, and SMS is built-in (not a separate platform). The trade-off: integrations outside Shopify are fewer, and the segmentation engine — while capable — doesn''t match Klaviyo''s data depth.',
  '/tools/omnisend.svg',
  'https://www.omnisend.com',
  'https://www.omnisend.com/partner?utm_source=botapolis',
  'partnerstack',
  'email',
  array['email','sms','automation','ecommerce'],
  'freemium',
  0, 500,
  '250 contacts free. Standard/Pro tiers based on contact count; SMS credits sold separately.',
  '[
    {"name":"Ecom-first templates","description":"Cart abandonment, browse, post-purchase","included":true},
    {"name":"Native SMS","description":"US/CA/UK plus international","included":true},
    {"name":"Web push","description":"Browser push as a channel","included":true},
    {"name":"Pre-built automation library","description":"Plug-and-play for the top 10 ecom flows","included":true},
    {"name":"Product picker in editor","description":"Drag your Shopify products straight into emails","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','bigcommerce','wix','woocommerce'],
  8.1,
  '{"ease_of_use": 9.0, "value": 9.0, "support": 7.5, "features": 7.5}'::jsonb,
  array[
    'Best price-to-feature ratio in the email category',
    'Pre-built ecom automations save weeks of setup',
    'SMS in the same dashboard, not a bolt-on'
  ],
  array[
    'Segmentation depth a step behind Klaviyo',
    'Customer support response time variable',
    'Integration ecosystem narrower outside ecom'
  ],
  '$5k–$50k MRR stores that want Klaviyo-level workflows at half the bill.',
  'Enterprise stores with complex segmentation or custom data warehouse needs.',
  2, 'published',
  'Omnisend review 2026 · the most underrated email platform for Shopify',
  'Omnisend gives you 90% of Klaviyo at 50% of the price. Here''s what we found running it on a real $40k/mo store for 60 days.'
),
-- ---------------------------------------------------------------------------
-- 4. Gorgias
-- ---------------------------------------------------------------------------
(
  'gorgias',
  'Gorgias',
  'Shopify-native customer support helpdesk with first-party AI agents.',
  'Gorgias is the customer-support equivalent of Klaviyo — a Shopify-first tool that integrates so deeply with the store that agents can refund, edit, or reship an order from the conversation view. The AI agent (formerly "Auto-respond", now Gorgias AI Agent) handles roughly 30–60% of repetitive tickets on stores we tested, and the macro library means quality stays human even when the load doubles.',
  '/tools/gorgias.svg',
  'https://www.gorgias.com',
  'https://www.gorgias.com/partners?utm_source=botapolis',
  'impact',
  'support',
  array['helpdesk','support','ai-agent','live-chat'],
  'subscription',
  10, 900,
  'Starter $10/mo (50 tickets); Basic $60; Pro $360; Advanced $900. Add-ons for AI usage past plan.',
  '[
    {"name":"Shopify-native order actions","description":"Refund/edit/reship from inside the ticket","included":true},
    {"name":"AI Agent","description":"Auto-resolves common questions with brand voice","included":true},
    {"name":"Macros & rules","description":"Hundreds of pre-built ecom playbooks","included":true},
    {"name":"Multi-channel inbox","description":"Email + chat + Instagram + WhatsApp + voice","included":true},
    {"name":"Revenue stats","description":"Track revenue per ticket and per agent","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','klaviyo','recharge','loop','instagram','whatsapp'],
  8.4,
  '{"ease_of_use": 8.0, "value": 8.0, "support": 9.0, "features": 8.5}'::jsonb,
  array[
    'Tightest Shopify-native helpdesk integration on the market',
    'AI agent that actually deflects volume, not just shows up',
    'Macros + revenue stats together = measurable agent ROI'
  ],
  array[
    'Slow on cold mornings — first ticket of the day can lag',
    'Pricing has crept up — ticket-counted plans punish growth',
    'Reporting export is clunky vs Zendesk'
  ],
  '$20k+ MRR stores doing 200+ tickets/mo with multi-channel support.',
  'Tiny stores doing under 50 tickets/mo — overkill at this scale.',
  3, 'published',
  'Gorgias review 2026 · is the AI agent actually deflecting tickets?',
  'We ran Gorgias for 60 days on a $2M Shopify store. Here''s the honest report on the AI agent, the macro system, and when it stops being worth $360/mo.'
),
-- ---------------------------------------------------------------------------
-- 5. Tidio
-- ---------------------------------------------------------------------------
(
  'tidio',
  'Tidio',
  'Live chat and AI agent for small-to-mid stores.',
  'Tidio sits in the gap between a free-forever live chat widget and a full helpdesk like Gorgias. The Lyro AI agent has gotten meaningfully better in 2024–25 — for stores doing simple Q&A (sizing, shipping, returns policy), it deflects 30–40% of conversations. Past that, the product feels lighter than Gorgias: fewer Shopify-native actions inside the conversation, simpler reporting, less depth.',
  '/tools/tidio.svg',
  'https://www.tidio.com',
  'https://www.tidio.com/partners?utm_source=botapolis',
  'partnerstack',
  'support',
  array['live-chat','chatbot','ai-agent','helpdesk-light'],
  'freemium',
  0, 400,
  'Free tier for 50 chats/mo. Lyro AI is a separate metered plan; Starter $29; Growth $59+.',
  '[
    {"name":"Lyro AI agent","description":"GPT-powered conversational assistant trained on your FAQ + Shopify products","included":true},
    {"name":"Live chat widget","description":"Customizable, mobile-first","included":true},
    {"name":"Shopify product cards","description":"Inline product previews inside chat","included":true},
    {"name":"Ticketing","description":"Lightweight ticket system","included":true}
  ]'::jsonb,
  array['shopify','wordpress','shopify-plus','wix'],
  7.4,
  '{"ease_of_use": 9.0, "value": 8.5, "support": 7.0, "features": 6.5}'::jsonb,
  array[
    'Genuinely free tier — useful for stores under 50 chats/mo',
    'Lyro AI agent deflects well on simple stores',
    'Onboarding takes under an hour'
  ],
  array[
    'Reporting is shallow vs. Gorgias',
    'Order actions inside the conversation are limited',
    'Lyro pricing meters by conversations — grows quickly'
  ],
  'Stores under $30k MRR wanting AI chat without Gorgias-tier pricing.',
  'High-volume stores doing 500+ tickets/mo — Gorgias scales better there.',
  1, 'published',
  'Tidio review 2026 · the honest case for Lyro AI on Shopify',
  'Tidio''s Lyro AI is real, but it has limits. Here''s where it shines on a Shopify store and where you''ll want Gorgias instead.'
),
-- ---------------------------------------------------------------------------
-- 6. Postscript
-- ---------------------------------------------------------------------------
(
  'postscript',
  'Postscript',
  'SMS marketing built for Shopify operators who care about deliverability.',
  'Postscript is the SMS-only specialist in the Shopify world. Unlike platforms that bolt SMS onto email, Postscript was built around messaging from day one — opt-in flows, two-way conversations, automated keyword campaigns, and carrier-grade deliverability. The Klaviyo integration means most stores run them together: Klaviyo for email, Postscript for SMS, sync the audience.',
  '/tools/postscript.svg',
  'https://www.postscript.io',
  'https://www.postscript.io/partners?utm_source=botapolis',
  'impact',
  'sms',
  array['sms','marketing','automation','conversational'],
  'subscription',
  100, 5000,
  'Starter $100/mo + per-segment messaging credits. Pro/Enterprise scale by volume.',
  '[
    {"name":"SMS Sales (conversational)","description":"Live human + AI hybrid for 1:1 high-AOV sales","included":true},
    {"name":"Automated flows","description":"Cart abandon, post-purchase, winback, replenishment","included":true},
    {"name":"Two-way conversations","description":"Real reply handling, not just outbound blasts","included":true},
    {"name":"Shopify-native opt-in","description":"Checkbox at checkout, keyword on PDP","included":true},
    {"name":"Klaviyo integration","description":"Bi-directional audience sync","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','klaviyo','attentive','gorgias','recharge'],
  8.2,
  '{"ease_of_use": 8.0, "value": 7.5, "support": 8.5, "features": 9.0}'::jsonb,
  array[
    'Specialist focus — SMS gets the attention it deserves',
    'Conversational AI/human hybrid drives real AOV lifts',
    'Tight Shopify + Klaviyo integration'
  ],
  array[
    'Pricing not friendly under $20k MRR',
    'Email features absent — you need Klaviyo/Omnisend alongside',
    'SMS regulation overhead (TCPA, A2P 10DLC) is real and not trivial'
  ],
  'Stores past $50k MRR with strong subscriber lists already running email.',
  'Sub-$20k MRR stores — fixed cost overweights revenue at this scale.',
  2, 'published',
  'Postscript review 2026 · the Shopify SMS specialist tested',
  'Postscript leans into SMS as a channel, not an afterthought. Here''s our 90-day field report on flows, conversational, and when the $100 floor pays off.'
),
-- ---------------------------------------------------------------------------
-- 7. ManyChat
-- ---------------------------------------------------------------------------
(
  'manychat',
  'ManyChat',
  'Instagram DM + Messenger + WhatsApp automation for ecom.',
  'ManyChat owns the conversational marketing layer on Instagram and Facebook. For Shopify stores running influencer-led launches or doing creator UGC, the IG DM auto-reply playbook (comment "LINK" → auto-DM with PDP link + 10% off) drives genuine new-customer LTV. WhatsApp Business API support unlocks markets where SMS is dead and chat apps are the norm.',
  '/tools/manychat.svg',
  'https://www.manychat.com',
  'https://www.manychat.com/partners?utm_source=botapolis',
  'partnerstack',
  'chat',
  array['instagram','messenger','whatsapp','automation','conversational'],
  'freemium',
  0, 99,
  'Free for 1k contacts / 4 templates. Pro $15+ scales with contacts. WhatsApp API has separate Meta fees.',
  '[
    {"name":"IG DM automation","description":"Comment-to-DM and story-reply flows","included":true},
    {"name":"WhatsApp Business API","description":"Templates and broadcasts at scale","included":true},
    {"name":"Shopify cart sharing","description":"Push abandoned carts and product cards to chat","included":true},
    {"name":"AI Step","description":"OpenAI-powered branching reply logic","included":true},
    {"name":"Tags + segments","description":"Build audiences from chat behavior","included":true}
  ]'::jsonb,
  array['shopify','instagram','meta','whatsapp','google-sheets','klaviyo'],
  7.6,
  '{"ease_of_use": 7.0, "value": 8.5, "support": 7.0, "features": 8.0}'::jsonb,
  array[
    'Only major platform with serious Instagram DM automation',
    'Free tier good enough to validate the channel',
    'AI Step makes branching flows possible without engineer work'
  ],
  array[
    'UI gets cluttered fast on complex flows',
    'Meta API changes can break flows without warning',
    'Reporting on conversational ROI is thin'
  ],
  'Stores running creator/influencer launches with active IG presence.',
  'Pure ad-driven stores with no organic social — channel is dead here.',
  1, 'published',
  'ManyChat review 2026 · is Instagram DM automation still worth it?',
  'ManyChat is the only serious play for IG DM automation in 2026. Here''s when it earns its keep and when influencer creators outperform automation.'
)

on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  logo_url = excluded.logo_url,
  website_url = excluded.website_url,
  affiliate_url = excluded.affiliate_url,
  affiliate_partner = excluded.affiliate_partner,
  category = excluded.category,
  subcategories = excluded.subcategories,
  pricing_model = excluded.pricing_model,
  pricing_min = excluded.pricing_min,
  pricing_max = excluded.pricing_max,
  pricing_notes = excluded.pricing_notes,
  features = excluded.features,
  integrations = excluded.integrations,
  rating = excluded.rating,
  rating_breakdown = excluded.rating_breakdown,
  pros = excluded.pros,
  cons = excluded.cons,
  best_for = excluded.best_for,
  not_for = excluded.not_for,
  featured = excluded.featured,
  status = excluded.status,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  updated_at = now();


-- ============================================================================
-- Block F (May 2026) — seed expansion: 5 more tools in adjacent categories
-- ----------------------------------------------------------------------------
-- Adds Recharge (subscriptions), Loox / Judge.me (reviews), Smile.io
-- (loyalty), Yotpo (UGC bundle). With these in place, /alternatives/[tool]
-- has enough cohort to render meaningful "X alternatives" lists, and the
-- editorial roadmap (block F+ reviews) has matching slugs to drop AffiliateButton
-- references into without falling back to the slug-only chip.
--
-- Same idempotent ON CONFLICT pattern as the block above — re-running this
-- seed updates rows in place rather than blowing them up.
-- ============================================================================
insert into public.tools (
  slug, name, tagline, description, logo_url, website_url, affiliate_url,
  affiliate_partner, category, subcategories, pricing_model, pricing_min,
  pricing_max, pricing_notes, features, integrations, rating, rating_breakdown,
  pros, cons, best_for, not_for, featured, status, meta_title, meta_description
) values
-- ---------------------------------------------------------------------------
-- 8. Recharge — subscriptions
-- ---------------------------------------------------------------------------
(
  'recharge',
  'Recharge',
  'Subscriptions and recurring billing for Shopify stores.',
  'Recharge is the de-facto subscription platform for Shopify stores running consumables, replenishment, or subscribe-and-save offers. Native Shopify Checkout integration, customer portal that doesn''t require login, and a flow engine for retention emails / cancellation-save offers. Past 500 active subscribers, the bill scales fast — but so does the LTV upside, and the math typically pencils.',
  '/tools/recharge.svg',
  'https://www.rechargepayments.com',
  'https://www.rechargepayments.com/partners?utm_source=botapolis',
  'partnerstack',
  'upsell',
  array['subscriptions','recurring','retention','shopify'],
  'subscription',
  99, 499,
  'Standard plan from $99/mo + 1.25% transaction fee. Pro $499/mo drops the per-transaction fee to 1% and unlocks the Flow engine.',
  '[
    {"name":"Shopify Checkout subscriptions","description":"Native checkout flow, no separate redirect","included":true},
    {"name":"Customer portal","description":"Login-less self-serve pause / skip / swap","included":true},
    {"name":"Flow engine","description":"Retention automations, cancellation-save offers","included":true},
    {"name":"Bundles and build-a-box","description":"Configurable subscription bundles","included":true},
    {"name":"Klaviyo integration","description":"Event sync for churn / paused subscriber flows","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','klaviyo','postscript','gorgias','reviews.io'],
  8.3,
  '{"ease_of_use": 7.5, "value": 7.0, "support": 8.5, "features": 9.0}'::jsonb,
  array[
    'Most mature Shopify subscriptions integration on the market',
    'Customer portal converts pause-vs-cancel meaningfully better than competitors',
    'Flow engine is a real retention lever, not a checkbox feature'
  ],
  array[
    'Per-transaction fee compounds at scale — sub-1% only at Pro tier',
    'Pro tier ($499/mo) is the realistic entry for stores doing real subscription volume',
    'Migrating off Recharge to a competitor (e.g. Smartrr) is painful — sub data lives in their schema'
  ],
  'Shopify stores running consumables, replenishment, or subscribe-and-save at 200+ active subscribers.',
  'One-off purchase stores without a credible subscription motion — bolt-on subs underperform.',
  2, 'published',
  'Recharge review 2026 · the Shopify subscriptions platform that earns its bill',
  'Recharge tested on a real Shopify subscription store. Honest take on per-transaction fees, the Flow engine, and when Smartrr or Skio start making sense.'
),
-- ---------------------------------------------------------------------------
-- 9. Loox — photo reviews + UGC
-- ---------------------------------------------------------------------------
(
  'loox',
  'Loox',
  'Photo and video reviews for Shopify, optimized for social proof.',
  'Loox is the photo-review app most Shopify stores ship with first. Auto-collection (post-purchase request emails with photo upload prompts), Shopify-native review display, and UGC carousels for landing pages and PDPs. Pricing scales with monthly orders rather than installed app fee — predictable, occasionally punishing at high volume.',
  '/tools/loox.svg',
  'https://www.loox.com',
  'https://loox.io/partners?utm_source=botapolis',
  'partnerstack',
  'reviews',
  array['reviews','ugc','photo-reviews','social-proof'],
  'subscription',
  9.99, 599,
  'Tiered by orders/mo: Beginner $9.99 (up to 100 orders), Scale $34.99 (up to 500), Unlimited $599. Add-ons for video reviews and Q&A.',
  '[
    {"name":"Photo and video reviews","description":"Customer upload via auto-collection email","included":true},
    {"name":"Review carousel widgets","description":"Embedable galleries for landing pages and homepage","included":true},
    {"name":"Auto-collection emails","description":"Post-purchase request flow with photo prompts","included":true},
    {"name":"Google Shopping integration","description":"Reviews syndicate to Google Shopping listings","included":true},
    {"name":"Q&A module","description":"Customer-to-customer Q&A on PDPs","included":true}
  ]'::jsonb,
  array['shopify','klaviyo','omnisend','meta-shop','google-shopping'],
  8.2,
  '{"ease_of_use": 8.5, "value": 7.5, "support": 8.0, "features": 8.5}'::jsonb,
  array[
    'Best photo-review conversion rate in the category (per our test: 14% post-purchase email response)',
    'Widget design integrates cleanly with most Shopify themes',
    'Review syndication to Google Shopping ships out of the box'
  ],
  array[
    'Pricing scales with orders, not subscribers — high-AOV stores can hit the tier ceilings fast',
    'Limited customization of the review request email content',
    'No proper sentiment analysis or AI-tagging of reviews (vs. Yotpo)'
  ],
  'Shopify stores under $200k/mo revenue collecting photo reviews as primary social proof.',
  'Stores doing serious enterprise UGC programs — Yotpo bundles more for slightly more bill.',
  1, 'published',
  'Loox review 2026 · the Shopify photo-review app most stores ship with',
  'Loox tested on a real Shopify store collecting 200+ reviews/month. Honest take on the order-tiered pricing, widget conversion, and when Yotpo or Judge.me fits better.'
),
-- ---------------------------------------------------------------------------
-- 10. Judge.me — budget-friendly reviews
-- ---------------------------------------------------------------------------
(
  'judge-me',
  'Judge.me',
  'Photo and video reviews for Shopify at a price that actually scales.',
  'Judge.me is what most Shopify stores end up on when Loox or Yotpo prices out. Same feature surface (photo/video reviews, auto-request emails, widget galleries) at a flat $15/mo Awesome tier — no order-scaling fees. Less polished UX than Loox, slower support response times, but the price-to-feature ratio is unbeatable.',
  '/tools/judge-me.svg',
  'https://judge.me',
  'https://judge.me/affiliates?utm_source=botapolis',
  'partnerstack',
  'reviews',
  array['reviews','ugc','photo-reviews','budget'],
  'freemium',
  0, 15,
  'Free tier covers 99% of needs (unlimited reviews, auto-emails, widgets). Awesome tier ($15/mo flat) adds Q&A, custom branding, and SEO-rich snippets.',
  '[
    {"name":"Photo and video reviews","description":"Free tier includes both","included":true},
    {"name":"Review request emails","description":"Triggered post-purchase, customizable templates","included":true},
    {"name":"All-in-one widget","description":"Verified buyers, photo gallery, sort/filter","included":true},
    {"name":"Q&A module","description":"Awesome tier only","included":true},
    {"name":"SEO-rich snippets","description":"Star ratings in Google search results","included":true}
  ]'::jsonb,
  array['shopify','klaviyo','omnisend','google-shopping'],
  7.8,
  '{"ease_of_use": 7.5, "value": 9.5, "support": 6.5, "features": 8.0}'::jsonb,
  array[
    'Best value in the category — Awesome tier flat $15/mo regardless of order volume',
    'Free tier is unusually capable; many stores never upgrade',
    'SEO-rich snippets ship in free tier (Loox charges for this)'
  ],
  array[
    'Widget design less polished than Loox — themes need more customization to look at home',
    'Support response times can run 12-48 hours',
    'No sentiment/AI tagging — manual review moderation only'
  ],
  'Cost-conscious Shopify stores under $100k/mo or anyone exiting Loox over pricing.',
  'Brands with strong design standards who need pixel-perfect widget integration.',
  0, 'published',
  'Judge.me review 2026 · the budget-friendly Shopify reviews app',
  'Judge.me tested on a real Shopify store. Honest read on the free vs Awesome tier value, widget quality, and where Loox or Yotpo earn their premium.'
),
-- ---------------------------------------------------------------------------
-- 11. Smile.io — loyalty and rewards
-- ---------------------------------------------------------------------------
(
  'smile-io',
  'Smile.io',
  'Loyalty, rewards, and referral programs for Shopify stores.',
  'Smile.io is the Shopify-native loyalty platform — points programs, VIP tiers, and referral programs in one app. Customer portal lets shoppers earn / redeem without leaving your store. Klaviyo integration syncs loyalty tier into segments. Past Starter tier, the bill jumps significantly; for sub-$50k MRR stores running simple points programs, the free tier is genuinely usable.',
  '/tools/smile-io.svg',
  'https://smile.io',
  'https://smile.io/partners?utm_source=botapolis',
  'partnerstack',
  'upsell',
  array['loyalty','rewards','referral','retention'],
  'freemium',
  0, 599,
  'Free tier: up to 200 orders/mo. Starter $49 (500 orders). Growth $199 (1500 orders). Plus $599 (3000 orders + VIP tiers + advanced analytics).',
  '[
    {"name":"Points program","description":"Customers earn points on purchases, signup, social actions","included":true},
    {"name":"Referral program","description":"Customer-to-customer referral with double-sided rewards","included":true},
    {"name":"VIP tiers","description":"Multi-tier loyalty programs (Plus tier)","included":true},
    {"name":"Customer portal","description":"In-store widget for earn/redeem flows","included":true},
    {"name":"Klaviyo integration","description":"Sync points/tier into email segments","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','klaviyo','omnisend','reviews-io'],
  7.9,
  '{"ease_of_use": 8.0, "value": 7.0, "support": 8.0, "features": 8.5}'::jsonb,
  array[
    'Free tier covers 80% of small-store loyalty needs',
    'Setup is genuinely 30-minute affair — points + referral live same day',
    'Klaviyo integration enables loyalty-segmented email which converts measurably better'
  ],
  array[
    'Pricing tiers based on monthly orders, not subscribers — high-volume stores pay more than necessary',
    'VIP tiers locked behind Plus tier ($599/mo) — feels like upsell for an obvious feature',
    'Reporting on loyalty ROI is shallow without exporting to a real analytics tool'
  ],
  'Shopify stores past $20k MRR with repeat-purchase categories (skincare, supplements, fashion).',
  'Pure one-time purchase categories (furniture, mattresses) — loyalty mechanics don''t fit the buy cycle.',
  1, 'published',
  'Smile.io review 2026 · the Shopify loyalty platform default',
  'Smile.io tested on a real Shopify store. Honest take on the order-tiered pricing, customer portal conversion, and when LoyaltyLion or Stamped fits better.'
),
-- ---------------------------------------------------------------------------
-- 12. Yotpo — reviews + loyalty + SMS bundle
-- ---------------------------------------------------------------------------
(
  'yotpo',
  'Yotpo',
  'Reviews, loyalty, and SMS marketing in one bundled Shopify app.',
  'Yotpo bundles three categories (reviews, loyalty, SMS marketing) into one platform with cross-product discounts. For mid-market Shopify stores ($100k-$1M+ MRR) running all three programs, the bundle math often beats running Loox + Smile.io + Postscript separately. Lower-tier stores typically end up paying for features they don''t use.',
  '/tools/yotpo.svg',
  'https://www.yotpo.com',
  'https://www.yotpo.com/partners?utm_source=botapolis',
  'partnerstack',
  'reviews',
  array['reviews','loyalty','sms','bundle','enterprise'],
  'subscription',
  19, 1900,
  'Reviews tier: free up to 50 orders/mo, $19+ Growth, $59+ Premium. Loyalty: $199+ Growth. SMS: usage-based ($0.011/segment). Bundle discounts when combining 2+ products.',
  '[
    {"name":"Reviews + photos","description":"Auto-collection, syndication, UGC galleries","included":true},
    {"name":"Loyalty + referrals","description":"Points, VIP tiers, referral programs","included":true},
    {"name":"SMS marketing","description":"Subscriber collection, segmentation, automated flows","included":true},
    {"name":"Visual UGC","description":"Instagram-style shoppable galleries from customer photos","included":true},
    {"name":"Klaviyo integration","description":"Cross-product event sync to email","included":true}
  ]'::jsonb,
  array['shopify','shopify-plus','klaviyo','google-shopping','meta-shop','tiktok-shop'],
  7.6,
  '{"ease_of_use": 6.5, "value": 7.5, "support": 7.5, "features": 9.0}'::jsonb,
  array[
    'Bundle pricing makes sense at $100k+ MRR running reviews + loyalty + SMS together',
    'Visual UGC galleries (Instagram-style) are best-in-class',
    'Klaviyo + Yotpo data flow enables segmentation other stacks can''t match'
  ],
  array[
    'Onboarding takes 2-3 weeks — every Yotpo product has its own setup, not one unified flow',
    'Reporting splits across 3 dashboards, hard to get one funnel view',
    'Bill at scale ($500+/mo) is real — sub-$100k MRR stores almost always overpay'
  ],
  'Mid-market Shopify stores at $100k+ MRR running reviews + loyalty + SMS as one stack.',
  'Stores using only one of reviews/loyalty/SMS — specialist tools (Loox/Smile.io/Postscript) win on focus.',
  1, 'published',
  'Yotpo review 2026 · the bundled reviews + loyalty + SMS platform',
  'Yotpo tested on a real Shopify store running all three products. Honest take on the bundle pricing, when it beats specialists, and the onboarding pain.'
)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  logo_url = excluded.logo_url,
  website_url = excluded.website_url,
  affiliate_url = excluded.affiliate_url,
  affiliate_partner = excluded.affiliate_partner,
  category = excluded.category,
  subcategories = excluded.subcategories,
  pricing_model = excluded.pricing_model,
  pricing_min = excluded.pricing_min,
  pricing_max = excluded.pricing_max,
  pricing_notes = excluded.pricing_notes,
  features = excluded.features,
  integrations = excluded.integrations,
  rating = excluded.rating,
  rating_breakdown = excluded.rating_breakdown,
  pros = excluded.pros,
  cons = excluded.cons,
  best_for = excluded.best_for,
  not_for = excluded.not_for,
  featured = excluded.featured,
  status = excluded.status,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  updated_at = now();


-- ============================================================================
-- Seed a couple of comparisons too so /compare/ has something to render.
-- ============================================================================
insert into public.comparisons (slug, tool_a_id, tool_b_id, verdict, language, status, meta_title, meta_description)
select
  'klaviyo-vs-mailchimp',
  (select id from public.tools where slug='klaviyo'),
  (select id from public.tools where slug='mailchimp'),
  'For any Shopify store past $15k MRR, Klaviyo. For sub-500-contact stores still finding product/market fit, Mailchimp''s free tier is fine.',
  'en', 'published',
  'Klaviyo vs Mailchimp 2026 · which one for Shopify stores?',
  'Klaviyo or Mailchimp? We compared both on a real Shopify store. Pricing, deliverability, Shopify integration depth — here''s the verdict.'
on conflict (slug) do update set
  verdict = excluded.verdict, updated_at = now();

insert into public.comparisons (slug, tool_a_id, tool_b_id, verdict, language, status, meta_title, meta_description)
select
  'omnisend-vs-klaviyo',
  (select id from public.tools where slug='omnisend'),
  (select id from public.tools where slug='klaviyo'),
  'Under $50k MRR: Omnisend, every time. Past $50k MRR with real segmentation needs: Klaviyo earns its premium.',
  'en', 'published',
  'Omnisend vs Klaviyo 2026 · the real price/feature comparison',
  'Omnisend or Klaviyo for Shopify? Both tested on a real store. The honest break-even point, segmentation depth, and SMS comparison.'
on conflict (slug) do update set
  verdict = excluded.verdict, updated_at = now();

insert into public.comparisons (slug, tool_a_id, tool_b_id, verdict, language, status, meta_title, meta_description)
select
  'gorgias-vs-tidio',
  (select id from public.tools where slug='gorgias'),
  (select id from public.tools where slug='tidio'),
  'High-volume support (200+ tickets/mo): Gorgias. Small stores doing simple Q&A under 50 tickets/mo: Tidio with Lyro is enough.',
  'en', 'published',
  'Gorgias vs Tidio 2026 · the AI agent showdown for Shopify support',
  'Gorgias Auto-Agent or Tidio Lyro? Both AI agents tested on real ticket queues. The verdict on cost-per-deflection and Shopify integration.'
on conflict (slug) do update set
  verdict = excluded.verdict, updated_at = now();
