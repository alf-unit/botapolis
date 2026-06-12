# OPS priorities — 2026-W24

generated_at: 2026-06-12T07:44:11.226851-07:00
la_window_for_metrics: 2026-06-05..2026-06-11
publishing_rate_daily: 4
weekly_target: 28
focus_clusters: ai-inventory-forecasting, ai-product-descriptions, email-automation-shopify, klaviyo, recharge-skio-acquisition
system_config.current_focus_clusters: failed: HTTP Error 400: Bad Request

## selected queued entries
1. [attribution-ai] triple whale review | template=review | priority=340 | research=research_blocked
2. [omnisend] omnisend review | template=review | priority=320 | research=research_blocked
3. [postscript] postscript review | template=review | priority=300 | research=research_blocked
4. [ad-creative-ai] adcreative ai review | template=review | priority=289 | research=research_blocked
5. [tidio] tidio review | template=review | priority=248 | research=research_blocked
6. [personalization-recs] rebuy review | template=review | priority=246 | research=research_blocked
7. [mailchimp] mailchimp review shopify | template=review | priority=213 | research=/research/2026-05-26-klaviyo-vs-mailchimp.md
8. [returns-automation] loop returns review | template=review | priority=189 | research=research_blocked
9. [shopify-sidekick-magic] shopify sidekick review | template=review | priority=182 | research=research_blocked
10. [tiktok-shop-ops] tiktok shop shopify integration | template=guide | priority=171 | research=research_blocked
11. [recharge-skio-acquisition] migrate skio to loop | template=how-to | priority=147 | research=research_blocked
12. [ai-product-photography] pebblely review | template=review | priority=142 | research=research_blocked
13. [ai-inventory-forecasting] inventory planner review | template=review | priority=138 | research=research_blocked
14. [email-automation-shopify] shopify email automation setup | template=guide | priority=131 | research=/research/2026-05-26-klaviyo-vs-mailchimp.md
15. [recharge-skio-acquisition] skio acquisition recharge | template=guide | priority=126 | research=research_blocked
16. [fraud-detection] signifyd review shopify | template=review | priority=124 | research=research_blocked
17. [loyalty-rewards] yotpo loyalty review | template=review | priority=119 | research=research_blocked
18. [sms-marketing-shopify] shopify sms marketing | template=guide | priority=103 | research=/research/2026-05-26-klaviyo-vs-mailchimp.md
19. [klaviyo] klaviyo customer agent review | template=review | priority=96 | research=/research/2026-05-26-klaviyo-vs-mailchimp.md
20. [ai-inventory-forecasting] prediko review | template=review | priority=93 | research=research_blocked
21. [agency-operator-stack] shopify operator tool stack | template=guide | priority=92 | research=research_blocked
22. [ai-product-descriptions] ai product descriptions shopify | template=guide | priority=90 | research=research_blocked
23. [stay-ai-loop-subs] stay ai review | template=review | priority=86 | research=research_blocked
24. [returns-automation] migrate returnly to loop | template=how-to | priority=73 | research=research_blocked
25. [email-automation-shopify] klaviyo flow templates | template=guide | priority=72 | research=/research/2026-05-26-klaviyo-vs-mailchimp.md
26. [abandoned-cart] shopify abandoned cart benchmarks | template=guide | priority=71 | research=research_blocked
27. [ai-product-descriptions] ai product description 10000 skus | template=guide | priority=69 | research=research_blocked
28. [klaviyo] klaviyo bill jumped active profile | template=how-to | priority=65 | research=/research/2026-05-26-klaviyo-vs-mailchimp.md

## research blocked clusters
- attribution-ai: 1 packet(s) need research before clean materialization. representative keywords: triple whale review
- omnisend: 1 packet(s) need research before clean materialization. representative keywords: omnisend review
- postscript: 1 packet(s) need research before clean materialization. representative keywords: postscript review
- ad-creative-ai: 1 packet(s) need research before clean materialization. representative keywords: adcreative ai review
- tidio: 1 packet(s) need research before clean materialization. representative keywords: tidio review
- personalization-recs: 1 packet(s) need research before clean materialization. representative keywords: rebuy review
- returns-automation: 2 packet(s) need research before clean materialization. representative keywords: loop returns review, migrate returnly to loop
- shopify-sidekick-magic: 1 packet(s) need research before clean materialization. representative keywords: shopify sidekick review
- tiktok-shop-ops: 1 packet(s) need research before clean materialization. representative keywords: tiktok shop shopify integration
- recharge-skio-acquisition: 2 packet(s) need research before clean materialization. representative keywords: migrate skio to loop, skio acquisition recharge
- ai-product-photography: 1 packet(s) need research before clean materialization. representative keywords: pebblely review
- ai-inventory-forecasting: 2 packet(s) need research before clean materialization. representative keywords: inventory planner review, prediko review
- fraud-detection: 1 packet(s) need research before clean materialization. representative keywords: signifyd review shopify
- loyalty-rewards: 1 packet(s) need research before clean materialization. representative keywords: yotpo loyalty review
- agency-operator-stack: 1 packet(s) need research before clean materialization. representative keywords: shopify operator tool stack
- ai-product-descriptions: 2 packet(s) need research before clean materialization. representative keywords: ai product descriptions shopify, ai product description 10000 skus
- stay-ai-loop-subs: 1 packet(s) need research before clean materialization. representative keywords: stay ai review
- abandoned-cart: 1 packet(s) need research before clean materialization. representative keywords: shopify abandoned cart benchmarks

## notes for OPS
- materialize up to publishing_rate_daily packets per day from the list above.
- every packet must include research_file or status: research_blocked; do not create bare packets.
