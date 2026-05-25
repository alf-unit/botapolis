# weekly strategy — 2026-W22

period reviewed: 2026-05-19..2026-05-25 utc  
run time: 2026-05-25 06:02 utc / 2026-05-24 23:02 los angeles

## executive read

Data is still too thin for true page-level weekly strategy. `performance_snapshots` only has usable rows from 2026-05-22 through 2026-05-25, sessions/pageviews are null, GSC is zero, and `top_pages` is null/empty. So WoW growth/decline by page is not computable yet.

The one measurable live signal is affiliate clicks: 11 -> 9 -> 7 -> 7 from May 22-25, 34 total over the observed window. Revenue remains $0, conversions 0 where recorded. Subscriber count dropped 6 -> 1 on May 25, which looks like a measurement/source anomaly unless there was a list reset.

Main strategic issue this week is not content ideas. It is pipeline readiness: SCOUT found opportunities but writes are partly blocked by schema mismatches, and OPS has not populated writer-queue yet.

## WoW / trends

- true WoW comparison: unavailable, no prior-week baseline in `performance_snapshots`.
- sessions/pageviews/unique visitors: unavailable, all null.
- GSC clicks/impressions: 0 where recorded.
- affiliate clicks: 34 observed, with an in-window decline from 11 on 2026-05-22 to 7 on 2026-05-24/25 (-36%).
- revenue: $0.
- subscribers: 6 on May 22-24, then 1 on May 25; needs OPS validation.
- page-level top growers: not computable, `top_pages` is empty/null.
- page-level top decliners: not computable, `top_pages` is empty/null.

## operational signals

Recent session logs matter:

- `/sessions/infra-log.md`, 2026-05-22 sessions: RSS was demoted to supplementary; pricing scrape + Reddit + sitemap diff are primary signals. Sitemap monitoring and deploy tracking schema landed.
- `/sessions/writer-log.md`, 2026-05-20 session: first article shipped, `how-to-migrate-skio-to-loop`; queue follow-ups depend on OPS generating packets from CHIEF priorities.

Agent log issues this week:

- SCOUT pricing scrape aborted on 2026-05-24 because `tools` lacks `pricing_url`, `pricing_css_selectors`, `pricing_data`.
- SCOUT RSS cycle on 2026-05-22 found 4 opportunities but skipped writes because `content_opportunities` lacked expected columns `tool_slug`, `category`.
- affiliate health errors: ManyChat 403, Judge.me 404.

## focus shift

Updated `system_config.current_focus_clusters` to:

```text
klaviyo
gorgias
reviews-ugc
```

Reason: `klaviyo` and `gorgias` remain the strongest commercial priorities in queue. `reviews-ugc` now outranks `shopify-sidekick` in available semantic-core priority (`loox vs judge me`, `judge me review`, `loox vs yotpo`) and has direct affiliate-health risk worth resolving before traffic scales.

## next 7 days plan

Publishing rate from `system_config.publishing_rate_daily`: 4/day. Weekly capacity ceiling: 28 articles. Because writer-queue is empty and auto-approve is off, the practical plan is to have OPS generate packets first, then let Claude Code publish only what can pass review.

Recommended OPS packet mix for 2026-W22:

1. `klaviyo review` — priority 583 — refresh/review
2. `klaviyo pricing` — priority 514 — pricing
3. `klaviyo vs mailchimp` — priority 420 — comparison
4. `loox vs judge me` — priority 420 — comparison
5. `gorgias review` — priority 388 — review
6. `klaviyo vs omnisend` — priority 375 — comparison
7. `judge me review` — priority 343 — review
8. `omnisend review` — priority 320 — review
9. `gorgias pricing` — priority 300 — pricing
10. `postscript review` — priority 300 — review
11. `adcreative ai review` — priority 289 — review
12. `postscript vs klaviyo sms` — priority 257 — comparison
13. `postscript shopper vs klaviyo customer agent` — priority 257 — comparison
14. `tidio review` — priority 248 — review
15. `rebuy review` — priority 246 — review
16. `triple whale vs northbeam` — priority 236 — comparison
17. `mailchimp review shopify` — priority 213 — review
18. `postscript pricing` — priority 204 — pricing
19. `postscript vs attentive` — priority 200 — comparison
20. `gorgias vs zendesk` — priority 197 — comparison

Do not force 28 pieces if packet quality drops. 12-20 good packets is better than filling the cap with weak briefs.

## operator decisions needed

1. approve schema work for SCOUT pricing scrape storage, or choose an alternate storage pattern. CHIEF cannot modify schema directly.
2. decide what to do with 15 partner approvals still pending; revenue remains blocked until affiliate routes are usable.
3. decide whether newsletter ingestion via Beehiiv should be the next infra task. It is the biggest signal-coverage upgrade after RSS was downgraded.

## recommendation

This week should be pipeline week, not volume week: unblock SCOUT schema issues, let OPS generate 12-20 high-priority packets, and publish the first reviewed batch from `klaviyo`, `gorgias`, and `reviews-ugc`.
