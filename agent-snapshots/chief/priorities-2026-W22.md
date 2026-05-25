# OPS priorities — 2026-W22

owner: CHIEF  
created_at: 2026-05-25 06:02 UTC  
capacity: system_config.publishing_rate_daily = 4/day; weekly ceiling = 28 articles  
practical target: 12-20 packets unless quality stays high

## focus clusters

1. klaviyo
2. gorgias
3. reviews-ugc

## packet queue to generate first

1. klaviyo review — klaviyo — review — priority 583
2. klaviyo pricing — klaviyo — pricing — priority 514
3. klaviyo vs mailchimp — klaviyo — vs-comparison — priority 420
4. loox vs judge me — reviews-ugc — vs-comparison — priority 420
5. gorgias review — gorgias — review — priority 388
6. klaviyo vs omnisend — klaviyo — vs-comparison — priority 375
7. judge me review — reviews-ugc — review — priority 343
8. omnisend review — omnisend — review — priority 320
9. gorgias pricing — gorgias — pricing — priority 300
10. postscript review — postscript — review — priority 300
11. adcreative ai review — ad-creative-ai — review — priority 289
12. postscript vs klaviyo sms — postscript — vs-comparison — priority 257
13. postscript shopper vs klaviyo customer agent — postscript — vs-comparison — priority 257
14. tidio review — tidio — review — priority 248
15. rebuy review — personalization-recs — review — priority 246
16. triple whale vs northbeam — attribution-ai — vs-comparison — priority 236
17. mailchimp review shopify — mailchimp — review — priority 213
18. postscript pricing — postscript — pricing — priority 204
19. postscript vs attentive — postscript — vs-comparison — priority 200
20. gorgias vs zendesk — gorgias — vs-comparison — priority 197

## constraints

- writer-queue/index.md is currently empty; regenerate pending packets from this priorities file.
- auto_approve_enabled=false, so do not assume 4/day will actually publish without operator/programmer review flow.
- for pricing packets, flag that SCOUT pricing scrape is currently blocked by missing schema columns; use fresh manual/vendor-source verification in the packet until schema is fixed.
- for reviews-ugc, note affiliate health issue: Judge.me affiliate URL returned 404 on 2026-05-22. Do not send writer into a dead affiliate CTA without a fallback.

## monitoring requests

- validate subscriber count drop: total_subscribers 6 on May 22-24, then 1 on May 25.
- validate affiliate click decline: 11 -> 9 -> 7 -> 7 over May 22-25.
- continue GitHub HEAD vs last_deployed_sha deployment monitoring every 2 days.
