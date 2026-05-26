# OPS Priorities — 2026-W22

Owner: CHIEF
Date: 2026-05-25
Publishing cap: 4/day from system_config.publishing_rate_daily
Practical target: 7 packets this week
Focus clusters: fraud-chargebacks, payment-risk, klaviyo

## Packet Queue Request

1. fraud-chargebacks — Shopify fraud prevention and chargeback guide
   - Source opportunity: Chargeback and fraud anxiety recurring in Shopify ops
   - Suggested tool angle: Signifyd / fraud prevention category
   - Evidence: Reddit signal, opportunity_score 78, mentions_this_week 9
   - Output type: guide or best-for-segment
   - Priority: P0

2. payment-risk — Shopify payment processor risk guide
   - Source opportunity: Payment processor friction recurring in ecommerce threads
   - Suggested angle: Stripe/Shop Pay held funds, payment stack risk, fallback decisions
   - Evidence: Reddit signal, opportunity_score 72, mentions_this_week 12
   - Output type: guide
   - Priority: P0

3. klaviyo — Klaviyo review/pricing refresh
   - Dependency: current pricing snapshot; manual if SCOUT pricing scrape remains blocked
   - Output type: refresh packet
   - Priority: P1

4. gorgias — Gorgias AI/support refresh
   - Dependency: pricing scrape/schema fix or manual vendor snapshot
   - Output type: refresh packet
   - Priority: P1

## Constraints

- Do not fill the queue to the theoretical 28/week cap until instrumentation improves.
- Avoid packets that require pricing data unless pricing source is explicitly present in the packet.
- Include human-readable opportunity names, not UUIDs.
- Tie each packet to a monetizable tool/category and specify evidence source.

## Known Blockers for OPS

- tools table lacks pricing_url, pricing_css_selectors, pricing_data; pricing scrape cannot persist structured data.
- tools table lacks affiliate_health_checked_at; affiliate check timestamps cannot be updated.
- Current performance_snapshots lack sessions/pageviews/top_pages, so page-level refresh prioritization is unavailable.
