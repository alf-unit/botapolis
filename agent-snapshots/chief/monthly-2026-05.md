# Monthly audit — 2026-05

Generated: 2026-06-01 07:00 America/Los_Angeles
Period boundaries: 2026-05-01 00:00 through 2026-05-31 23:59 America/Los_Angeles.

## Executive summary

May was the first measurable operating month. The site has early search visibility and affiliate click activity, but no confirmed affiliate revenue yet. The biggest business issue is not traffic volume; it is measurement reliability: direct affiliate click tracking shows 456 clicks, while performance snapshots sum to 179, and the expected affiliate_revenue table is absent from Supabase schema cache.

Recommendation for June: keep publishing, but prioritize measurement repair and commercial intent clusters over broad expansion. Scaling content before reliable revenue and click attribution is a bad trade.

## P&L

```
Revenue tracked:              $0.00
Token costs logged:           $0.06
Net contribution:             $-0.06
Direct affiliate clicks:      456
Snapshot affiliate clicks:    179
Affiliate revenue table:      missing from Supabase schema cache
Previous month cost:          $0.00
```

Notes:
- Revenue is counted from `performance_snapshots.affiliate_revenue_usd` because `affiliate_revenue` is not available in the schema cache.
- April has no performance snapshots and no tracked affiliate clicks, so month-over-month comparisons are baseline-only, not mature trend analysis.
- Logged token cost is tiny because only SCOUT/OPS costs are recorded in `agent_logs.cost_usd`; CHIEF/Codex runtime cost is not materially represented in the table.

## Performance review

```
GSC impressions:              686 (n/a MoM)
GSC clicks:                   1 (n/a MoM)
Weighted avg position:        47.41
Max keywords top 10:          2
Max keywords top 20:          3
Max keywords top 50:          15
Subscribers last known:       4
New subscribers tracked:      0
Snapshot rows:                20 (2026-05-12..2026-05-31)
```

### Top pages by GSC impressions

1. `/reviews/postscript-review-2026` — 121 impressions, 0 clicks, avg position 26.9
2. `/compare/klaviyo-vs-mailchimp` — 104 impressions, 0 clicks, avg position 73.7
3. `/compare/klaviyo-vs-omnisend` — 58 impressions, 0 clicks, avg position 54.6
4. `/tools/yotpo` — 54 impressions, 0 clicks, avg position 66.1
5. `/reviews/mailchimp-review-2026` — 46 impressions, 0 clicks, avg position 32.0
6. `/compare/klaviyo-vs-manychat` — 43 impressions, 0 clicks, avg position 29.1
7. `/compare/manychat-vs-klaviyo` — 42 impressions, 0 clicks, avg position 57.6
8. `/reviews/klaviyo-review-2026` — 39 impressions, 0 clicks, avg position 41.7
9. `/compare/klaviyo-vs-postscript` — 30 impressions, 0 clicks, avg position 22.8
10. `/reviews/gorgias-review-2026` — 29 impressions, 0 clicks, avg position 69.1
11. `/ru/tools/mailchimp` — 21 impressions, 0 clicks, avg position 36.9
12. `/tools/smile-io` — 11 impressions, 0 clicks, avg position 43.4

### Affiliate click leaders

Source slug:
- klaviyo: 115
- omnisend: 90
- postscript: 62
- gorgias: 45
- mailchimp: 42
- tidio: 23
- manychat: 20
- loox: 12
- judge-me: 10
- recharge: 7

Source path:
- /tools/email-roi-calculator: 57
- /compare/klaviyo-vs-omnisend: 29
- /compare/klaviyo-vs-mailchimp: 26
- /compare/klaviyo-vs-postscript: 22
- /reviews/gorgias-review-2026: 21
- /reviews/postscript-review-2026: 18
- /reviews/klaviyo-review-2026: 17
- /ru/reviews/postscript-review-2026: 11
- /reviews/klaviyo: 10
- /reviews/omnisend-review-2026: 9

Campaign:
- klaviyo: 87
- postscript: 53
- omnisend: 50
- gorgias: 32
- email-roi-calculator: 31
- mailchimp: 30
- tidio: 23
- manychat: 20
- tool-email-roi: 17
- review-gorgias-review-2026: 13

## Content and opportunity pipeline

```
Semantic core entries:        101
Queued:                       94
In writer queue:              4
Published:                    3
May opportunities captured:   1000
High-priority pending:        159
```

Top semantic clusters:
- klaviyo: 11
- gorgias: 9
- recharge-skio-acquisition: 8
- postscript: 7
- attribution-ai: 6
- ai-inventory-forecasting: 5
- ai-product-descriptions: 4
- loyalty-rewards: 4
- returns-automation: 4
- stay-ai-loop-subs: 3
- shopify-sidekick-magic: 3
- ai-product-photography: 3

High-priority pending examples:
- 90: Open-to-Buy Planning: Formula, Steps & OTB Software (prediko)
- 90: Recharge welcomes Skio to build the future of subscription commerce
- 90: How Klaviyo, Gatsby, Fluency Firm, and Smile.io are Rethinking Retention Acro...
- 90: Why Loyalty Belongs in Your Stack Now
- 90: Escaping the Acquisition Death Spiral: Retention Strategies for Ecommerce Brands
- 90: The Loyalty Data Your AI Chat Is Ignoring – And Why It's Costing You Revenue
- 90: The average customer acquisition cost (CAC) in ecommerce in 2025
- 90: Why calculating customer lifespan is more complex for ecommerce stores – and ...
- 90: How to increase Shopify AOV: 10 proven tactics for growth
- 90: 8 inspiring fashion loyalty programs (and how to build yours)

## Operational issues

```
agent_logs rows:              265
info:                         151
warning:                      70
error:                        43
critical:                     1
schema mismatch events:       14
writer queue gap events:      3
affiliate health alerts:      36
pricing scrape warnings:      45
```

Cost by agent:
- SCOUT: $0.04
- OPS: $0.03
- CHIEF: $0.00
- CLAUDE_CODE: $0.00

Root causes:
- GSC/snapshot ingestion is improved enough to show May data, but affiliate click snapshot aggregation still disagrees with direct click tracking.
- Affiliate revenue tracking is incomplete because `affiliate_revenue` is missing from schema cache and no conversion/revenue feed is visible.
- SCOUT cannot persist some pricing and affiliate health metadata because expected `tools` columns are missing from the exposed schema.
- Writer queue underfill repeated late in the month; the daily gap check now catches it, but upstream queue materialization still needs stronger automation.

## Strategic recommendations for June

1. Fix measurement before optimizing monetization. Programmer task: expose/implement revenue tracking and reconcile `affiliate_clicks` vs `performance_snapshots.affiliate_clicks`.
2. Keep content velocity at 4/day only if each packet has linked research or a `research_blocked` marker. Bare packets should stay blocked.
3. Focus June content on clusters already showing commercial interaction: klaviyo, omnisend, postscript, gorgias, mailchimp, and email ROI calculator support content.
4. Use high-priority RSS opportunities selectively. The pipeline has 1000 pending opportunities, but many are acquisition/retention generic; accepting them blindly will dilute the Shopify AI affiliate positioning.
5. Create a conversion-review loop for the top affiliate paths, especially `/tools/email-roi-calculator`, `/compare/klaviyo-vs-omnisend`, `/compare/klaviyo-vs-mailchimp`, and `/reviews/gorgias-review-2026`.

## Recommended action

Send the programmer a measurement fix request: revenue table/feed, affiliate click snapshot reconciliation, and missing `tools` metadata columns. Without that, June can generate more activity but still cannot prove revenue progress.
