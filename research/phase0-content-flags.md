# Phase 0 — Content Generation Flags

**Status:** living document, read at Etap E/F/G page generation
**Source:** consolidated from Research 1-6 caveats and per-tool notes
**Purpose:** non-data guidance for the generator — what to surface, what to omit, what to frame carefully

This file is **NOT structured data** for `tools` rows. It captures contextual instructions that change how the page generator should describe tools without affecting the underlying data shape. The generator reads this file once at start of Etap E and applies flags as it builds reviews/comparisons/listings.

If a flag here contradicts data in `tools`, the flag wins for content framing (the data is still correct as snapshot; the flag explains how to present it).

Flags are organized by tool slug. Each flag has a `Type`, a `What` (the fact), and a `How to apply` (what the generator should do with it).

---

## adcreative-ai

### Billing controversy
- **Type**: cons-must-surface
- **What** (R5 operator_quotes): "There was no clear notification before the trial period expired, which led to an unexpected charge of €360.18" (G2, 2025-2026). Recurring complaints across G2 and Trustpilot about post-trial billing.
- **How to apply**: In `/reviews/adcreative-ai` cons section, surface billing-trial-conversion risk upfront, not buried at the bottom. Don't lead with "AI-creative scoring" praise without immediately pairing it with the operational caveat.

---

## aftership

### Trustpilot rating bias
- **Type**: external-rating-suppression
- **What** (R5 caveat): Trustpilot rating is 1.5/5 from 671 reviews — but the reviews are overwhelmingly end-consumers complaining about *carrier* delivery experiences (not the AfterShip SaaS itself). Merchant sentiment on G2 (4.6/5) and Shopify App Store (4.5/5) is much higher.
- **How to apply**: Do NOT surface Trustpilot rating for AfterShip in the external-ratings display block. OR, if shown, attach an explicit caveat sentence ("Trustpilot rating reflects end-consumer carrier-delivery complaints, not merchant satisfaction with the AfterShip platform").

---

## booth-ai

### Defunct — archive only
- **Type**: archive-flip
- **What** (R1+R2+R4+R5+R6): operationally dormant after August 2023, ceased service August 5, 2024 (startups.rip). Domain listed for sale May 2025. Crunchbase lists "permanently closed". No affiliate program found.
- **How to apply**: Do NOT generate `/reviews/booth-ai`. Do NOT include in any feature/category comparisons or listings. Keep entity row only (`status='archived'`) for potential historical migration content like Skio. If any prior reference exists in pre-Etap-E content, remove or rewrite.

---

## cogsy

### Conflicting entry prices
- **Type**: pricing-verify-flag
- **What** (R2): Cogsy's own pages cite **$49/mo** entry tier (blog) AND **$199/mo** entry (official pricing page). One has been removed or moved without page cleanup.
- **How to apply**: In `/reviews/cogsy` pricing section, surface both numbers + the discrepancy + "verify directly with vendor before committing." Don't pick one and hide the other.

### No affiliate program
- **Type**: archive-flip
- **What** (R6): no affiliate program found.
- **How to apply**: Flip `status='archived'`. Don't generate review page. Entity only.

---

## flair-ai

### Cookie window is platform default
- **Type**: source-uncertainty
- **What** (R6): 60-day cookie is Rewardful's platform default, not customized on Flair's page.
- **How to apply**: When describing affiliate program in Etap F (comparison content), don't claim "60-day cookie window" as Flair-specific — frame as "default Rewardful cookie window."

---

## klaviyo

### Commission rate disputed (do not propagate "20%")
- **Type**: commission-source-uncertainty
- **What** (R6 caveat): "20% recurring / 90-day cookie" is widely repeated by third-party affiliate directories (affiliateinfohub.com, sender.net) but does **not** appear on Klaviyo's official Partner Program page or in the Partner Terms PDF. Klaviyo officially describes a tiered BASIC→ELITE revenue share with quarterly payouts.
- **How to apply**: In `/reviews/klaviyo` and Klaviyo-vs-* comparisons, do NOT cite "20% commission" or "90-day cookie" as facts. Use "tiered partner program (BASIC→ELITE, quarterly payouts; specific rates application-gated)." If commission framing is needed at all, say "not publicly disclosed."

### Klaviyo One enterprise tier auto-triggers at $10K/mo
- **Type**: pricing-gotcha
- **What** (R2): Above ~$10K/mo spend, Klaviyo One becomes mandatory and adds 20% surcharge to total spend.
- **How to apply**: In `/reviews/klaviyo` pricing section, surface the $10K/mo threshold as a meaningful pricing inflection point — operators planning growth past this point need to budget +20% from that day. Klaviyo-vs-Omnisend comparison at $10K+/mo revenue should weight this heavily.

---

## limespot

### Commission rate unconfirmed
- **Type**: source-uncertainty
- **What** (R6): 10-20% commission range cited only in third-party affiliate directories. No first-party affiliate page locatable on LimeSpot.
- **How to apply**: When describing partnerships, frame as "10-20% per third-party reports (unverified)". Do not present as factual rate.

---

## loyaltylion

### Trustpilot rating solicited post-onboarding
- **Type**: external-rating-bias
- **What** (R5 caveat): Trustpilot 5.0/5 from 52-53 reviews appears largely post-onboarding solicited reviews. Less authoritative than G2.
- **How to apply**: When displaying external ratings, weight G2 (4.6/5, 500+ reviews) higher than Trustpilot. OR show Trustpilot with caveat "post-onboarding solicited; treat as confirmation bias-inclined."

---

## manychat

### Free plan slashed March 2026
- **Type**: pricing-volatility
- **What** (R2): Free plan reduced from 1,000 contacts to 25 active contacts on March 2, 2026. Significant entry-tier shift.
- **How to apply**: When discussing "free tier" or comparing ManyChat to competitors with free tiers, surface the March 2026 cut — historical recommendations that praised the "1000 contact free tier" are outdated. Pin "verified 2026-05-30" to free-tier claims.

---

## pebblely

### No affiliate program
- **Type**: archive-flip
- **What** (R6): no findable program.
- **How to apply**: Flip `status='archived'`. Don't generate review page. Entity only.

---

## pencil

### Shopify integration is API partnership, not native app
- **Type**: framing-correction
- **What** (R4 note 52): Pencil announced Shopify partnership April 29, 2022 but connection is via API account linking. There is no Pencil app on the Shopify App Store. Pencil is NOT Built-for-Shopify.
- **How to apply**: In `/reviews/pencil` and any Pencil-vs-* comparison, describe Shopify integration as "API partnership" or "account linking," never "native app" or "Built-for-Shopify." Don't render a Shopify App Store badge for Pencil.

---

## prediko

### No affiliate program
- **Type**: archive-flip
- **What** (R6): no findable program (surprising given strong R5 reputation).
- **How to apply**: Flip `status='archived'`. Don't generate review page. Entity only. If owner wants to keep Prediko visible for organic traffic later (similar to Judge.me pattern), explicitly re-flip — but default for Etap D is archive.

---

## recharge

### Skio acquisition (April 30, 2026)
- **Type**: ecosystem-event
- **What** (R1+R2+R5 verbatim, R4 outlier disregarded): Recharge acquired Skio for $105M cash on April 30, 2026 per TechCrunch + PR Newswire + founder Kennan Frost posts. "Together, Recharge and Skio power more than 20,000 merchants and process over $20B in GMV, annually" (PR Newswire). Skio was at $32M ARR at time of sale, raised only $8M total.
- **How to apply**: In `/reviews/recharge`, `/reviews/skio`, and `/compare/recharge-vs-skio`, surface acquisition with `verified 2026-04-30` timestamp. Schedule quarterly refresh — pricing/feature convergence expected within 12-24 months. In comparison verdicts, note the consolidation risk for Skio independence.

### Affiliate platform moved PartnerStack → Lasso (March 15, 2026)
- **Type**: affiliate-platform-change
- **What** (R6): "As of March 15th, 2026, we no longer use PartnerStack" — Recharge moved to in-house Lasso. Existing seed.sql `affiliate_partner='partnerstack'` is stale.
- **How to apply**: After migration 015 + parser apply at Etap D, Recharge `affiliate_partner` should be `lasso`. Programmer reference URL: getrecharge.com/agency-partner-program/. 90-day cookie window.

---

## skio

### Acquired by Recharge — entity-only catalog
- **Type**: ecosystem-event + status
- **What** (R1+R2+R5): Acquired by Recharge April 30, 2026. Still operates as distinct product as of mid-2026, but roadmap consolidation expected.
- **How to apply**: `/reviews/skio` page kept as catalog entry. Verdict-style framing should acknowledge the acquisition uncertainty: existing Skio merchants face a stay-or-migrate decision. Don't recommend Skio for new subscription deployments without flagging the parent-company question.

---

## stay-ai

### OLIPOP case study (high-credibility content material)
- **Type**: content-asset
- **What** (R5): Per Stay AI case study (verifiable): OLIPOP reduced active churn by 26% and grew subscription revenue 35% after leaving Recharge.
- **How to apply**: Use as concrete proof point in `/reviews/stay-ai` and in any Recharge-vs-Stay-AI or "subscription retention" comparison/listing. Cite the case study, not aggregated platitudes.

---

## tidio

### Lyro AI deflection rate range (64-67%)
- **Type**: numerical-reconciliation
- **What**: R3 cites "around 67%" from tidio.com/ai-agent ("our 67% rate is the highest in the industry"). R5 cites Tidio press release at "64% on average, peaking at 90%". Both first-party, different framings.
- **How to apply**: Cite as range "64-67%" with both source attribution OR pick the most-current source. Don't quote a single number as if uncontested. When Tidio Lyro is compared to Gorgias AI Agent on deflection rate, anchor on the lower bound (64%) for conservative framing.

---

## triple-whale

### Data accuracy + billing complaints
- **Type**: cons-must-surface
- **What** (R5 operator_quotes): "The attribution system is consistently buggy and unreliable, causing more harm than good" (G2 2025). "Despite paying over $600 each month, we still do not receive any customer support" (G2 2025).
- **How to apply**: In `/reviews/triple-whale`, pair every feature praise (Triple Pixel, Moby AI, MTA models) with reliability caveat in the cons section. Don't lead the page with "best-in-class first-party tracking" without an immediate "but G2 reviews flag attribution inconsistency."

### Dual programs (Affiliate + Agency)
- **Type**: affiliate-dual-program
- **What** (R6 caveat): Triple Whale runs two parallel programs — Affiliate (10-20% for 6 months, tiered Blue/Silver/Gold) and Agency PartnerStack (Bronze→Platinum, requires $1k+ MRR referred to qualify).
- **How to apply**: When describing Triple Whale affiliate in Etap F (comparisons), pick the relevant program for the audience. Content-creator audience → Affiliate. Agency audience → Agency. Don't merge both into a single description.

---

## yotpo

### SMS/Email products sunset December 31, 2025
- **Type**: product-discontinuation
- **What** (R1+R2+R3+R5 all cite): Yotpo sunset native SMS (Dec 31, 2025) and Email (Dec 31, 2025) per CEO Tomer Tagrin open letter Aug 5, 2025. Subscriptions sunset May 31, 2025. ~34% staff cut (≈200 employees) followed announcement. Remaining products: Reviews + Loyalty.
- **How to apply**: In `/reviews/yotpo`, frame Yotpo as a Reviews + Loyalty platform — DO NOT mention SMS or Email products as live features. In Yotpo-vs-Klaviyo or Yotpo-vs-Postscript comparisons, explicitly note Yotpo no longer competes in those categories. Yotpo affiliate program covers Reviews-only (per R6).

---

## judge-me

### No affiliate program but published — internal links to partner competitors
- **Type**: catalog-no-affiliate
- **What** (R6 + owner decision 2026-05-30): Judge.me explicitly does not run an affiliate program per founder (confirmed publicly on company's feedback portal). Tech-partner program only. Despite this, owner keeps Judge.me as a published catalog entry because of dominant category position (5.0/37k+ Shopify reviews, drives organic traffic).
- **How to apply**: Generate `/reviews/judge-me` as a normal review page WITHOUT `/go/judge-me` affiliate CTA. Internal-link out to Loox (`/reviews/loox`) and Yotpo (`/reviews/yotpo`) where contextually appropriate (alternatives section, "if you're outgrowing Judge.me" framing). Do NOT redirect at vendor-brand level (would violate honest framing).

---

## shopify-sidekick

### Monetized via Shopify Partner Program, not standalone affiliate
- **Type**: special-monetization
- **What** (R6 + Blueprint section 7): Shopify Sidekick is a Shopify feature, not a separate vendor. No standalone affiliate program. Monetization is via the broader Shopify Affiliate & Partner Program. Blueprint section 7 explicitly designs Shopify-platform cluster around this.
- **How to apply**: `/go/shopify-sidekick` redirects to Shopify Affiliate Program signup, not to a Sidekick-specific landing page (none exists). `affiliate_partner='direct'` with note. In `/reviews/shopify-sidekick` and any platform-tier comparison, link out to the Shopify Plus tier discussion pages (when the Shopify-platform cluster is generated per Blueprint section 7).

---

## inventory-planner

### Post-Sage acquisition price hikes + sync issues
- **Type**: cons-must-surface
- **What** (R5 operator_quotes): "After the acquisition, our subscription cost was increased threefold" (Shopify App Store 2025). "Something broke with the connection at the end of September 2025 and it has basically rendered IP useless to us" (Shopify App Store 2025).
- **How to apply**: In `/reviews/inventory-planner` cons section, surface both the post-Sage price hikes AND the late-2025 Shopify sync outage. Compare upward against Prediko (which has cleaner pricing model and modern UI) as a recommended alternative even though Inventory Planner has deeper feature set.

---

## loop-subscriptions

### Pricing climbed from $49 to $99 entry
- **Type**: pricing-volatility
- **What** (R5 operator quote): "Expensive for a starter brand. They should revert to their old plans of $49 for early stage brands" (G2). Loop Subscriptions raised entry from $49 to $99/mo.
- **How to apply**: In `/reviews/loop-subscriptions` pricing section, note the entry-tier increase. Loop-vs-Recharge comparison at sub-100-subscriber range should weigh this carefully.

---

## omnisend

### Best-in-category support response time
- **Type**: pro-amplify
- **What** (R5): 24/7 live chat support with ~4 min average response. Significantly higher ease-of-use score (9.1 G2) vs Klaviyo (8.7 G2) and Mailchimp (8.7 G2).
- **How to apply**: In `/reviews/omnisend` and Omnisend-vs-Klaviyo comparison, surface support response speed and onboarding ease as differentiators when targeting smaller / time-constrained operators.

---

## Glossary

- **archive-flip**: at Etap D, set `tools.status='archived'`. Entity row remains in DB for entity references and potential historical migration content, but no `/reviews/[slug]` page is generated. Patterns from Skio (acquired), Returnly (closed).
- **cons-must-surface**: not allowed to bury this con at the bottom of cons section. Must appear in first paragraph, in TL;DR, or in pricing/billing section where applicable.
- **commission-source-uncertainty**: do not propagate the third-party-cited rate as fact; frame as "not publicly disclosed" or attribute to specific third-party source.
- **external-rating-suppression**: don't surface the external rating at all on the page.
- **external-rating-bias**: show with explicit caveat about review source bias.
- **pricing-gotcha**: surface as an inflection point in pricing narrative, not buried in fine print.
- **pricing-volatility**: pin "verified [date]" to time-sensitive pricing claims; schedule refresh.
- **product-discontinuation**: do not describe sunset modules as live features.
- **special-monetization**: explicit override of default `/go/[slug]` → vendor pattern.
- **catalog-no-affiliate**: keep page, no `/go/` CTA, internal-link to partner alternatives where contextually appropriate.
- **content-asset**: high-credibility specific stat ready to cite.
- **numerical-reconciliation**: multiple first-party sources cite different numbers; use range or pick most-current.
- **affiliate-platform-change**: vendor's affiliate platform changed mid-2026; update accordingly.
- **affiliate-dual-program**: vendor runs two parallel affiliate programs for different audiences.
- **framing-correction**: don't describe integration depth in a way that overstates it.
- **ecosystem-event**: market consolidation or acquisition affecting comparison context.

---

**Last updated:** 2026-05-30 (Phase 0 Research 1-6 collected, pre-Etap-D)
**Next update trigger:** Etap E generation discovers a content-flag pattern not yet captured, OR quarterly refresh of dated facts (acquisitions, pricing volatility, dynamic taglines).
