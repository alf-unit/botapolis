# Weekly Digest — 2026-W22

**Generated:** 2026-05-25 17:51 America/Los_Angeles  
**Coverage:** 2026-05-19 through 2026-05-25 (rolling 7 days)  
**Comparison Window:** 2026-05-12 through 2026-05-18  
**Prepared by:** OPS  
**Status:** Ready for CHIEF review

---

## Executive Summary

OPS generated a rolling W22 digest because the W21 digest already exists at `agent-snapshots/ops/weekly-2026-W21.md`. Snapshot coverage is incomplete for both windows: current window has 5 performance snapshot rows; comparison window has 0. Week-over-week values from `performance_snapshots` are therefore marked unavailable where the prior baseline is missing.

Key points:
- GSC remains at 0 impressions and 0 clicks in captured snapshots; this matches the known new-site delay pattern.
- Performance snapshots show 41 affiliate clicks across 5 captured daily rows.
- Raw `affiliate_clicks` table shows 61 clicks in the current rolling window vs 219 in the prior window (-72.1%). Treat this as directional only because early launch/test traffic likely affects the prior baseline.
- Latest captured subscriber total is 1 with 0 new subscribers in captured snapshots. Subscriber totals remain inconsistent across recent runs and should be interpreted cautiously.

---

## Data Availability

| Source | Current Window | Status |
|--------|----------------|--------|
| performance_snapshots | 5 rows (2026-05-21, 2026-05-22, 2026-05-23, 2026-05-24, 2026-05-25) | Partial |
| Previous baseline snapshots | 0 rows | Unavailable |
| Affiliate clicks raw table | 61 current / 219 prior | Available |
| Google Search Console | 0 impressions / 0 clicks | Live, no visible traffic yet |
| Plausible | Not configured | Skipped |
| PostHog | Not configured | Skipped |
| Vercel API | Not configured | Health handled by separate curl/GitHub checks |
| Recent OPS errors | 0 error/critical logs in last 24h | Clear |
| CHIEF ops requests | 0 files | None pending |

Latest CHIEF priority files observed: `priorities-2026-W22.md`.

---

## Metrics

| Metric | Current Window | Prior Window | WoW |
|--------|----------------|--------------|-----|
| Snapshot rows | 5 | 0 | n/a |
| GSC impressions | 0 | — | n/a |
| GSC clicks | 0 | — | n/a |
| Affiliate clicks (snapshots) | 41 | — | n/a |
| Affiliate clicks (raw table) | 61 | 219 | -72.1% |
| Affiliate conversions | 0 | — | n/a |
| Affiliate revenue | $0.00 | — | n/a |
| New subscribers | 0 | — | n/a |
| Latest total subscribers | 1 | — | n/a |

---

## Daily Breakdown

| Date | Aff Clicks | New Subs | Total Subs | GSC Imp | GSC Clicks | Vercel Error Rate |
|------|------------|----------|------------|---------|------------|-------------------|
| 2026-05-21 | — | — | — | — | — | — |
| 2026-05-22 | 11 | 0 | 6 | 0 | 0 | — |
| 2026-05-23 | 9 | 0 | 6 | — | — | 0 |
| 2026-05-24 | 7 | 0 | 6 | 0 | 0 | — |
| 2026-05-25 | 14 | 0 | 1 | 0 | 0 | — |

---

## Top Affiliate Tools

| Rank | Tool | Raw Clicks |
|------|------|------------|
| 1 | Postscript (postscript) | 13 |
| 2 | Klaviyo (klaviyo) | 12 |
| 3 | Omnisend (omnisend) | 6 |
| 4 | Mailchimp (mailchimp) | 6 |
| 5 | Loop Subscriptions (loop-subscriptions) | 5 |
| 6 | ManyChat (manychat) | 5 |
| 7 | Gorgias (gorgias) | 4 |
| 8 | Tidio (tidio) | 3 |
| 9 | Judge.me (judge-me) | 3 |
| 10 | Yotpo (yotpo) | 2 |

---

## Movers

### Top Growers

| Tool | Current | Prior | Delta | Change |
|------|---------|-------|-------|--------|
| Loop Subscriptions (loop-subscriptions) | 5 | 0 | +5 | new |
| Judge.me (judge-me) | 3 | 2 | +1 | +50.0% |

### Top Decliners

| Tool | Current | Prior | Delta | Change |
|------|---------|-------|-------|--------|
| Omnisend (omnisend) | 6 | 62 | -56 | -90.3% |
| Klaviyo (klaviyo) | 12 | 61 | -49 | -80.3% |
| Gorgias (gorgias) | 4 | 25 | -21 | -84.0% |
| Mailchimp (mailchimp) | 6 | 23 | -17 | -73.9% |
| Tidio (tidio) | 3 | 10 | -7 | -70.0% |

---

## Anomalies And Notes

1. Raw affiliate clicks are down -72.1% vs the previous rolling window. Because this is still launch baseline establishment and the prior window may include setup/test behavior, this is a watch item rather than an alert.
2. Snapshot subscriber totals changed from 6 in earlier rows to 1 on 2026-05-25. This matches the known Supabase/Beehiiv count discrepancy and needs source-of-truth clarification.
3. GSC remains at zero. Per MEMORY.md, do not alert on GSC dips or zeros until data has had 48+ hours to settle.
4. No OPS error or critical logs were found in the last 24 hours.

---

## Next Actions For CHIEF

1. Confirm whether W22 priorities in `agent-snapshots/chief/priorities-2026-W22.md` should trigger packet generation now.
2. Clarify subscriber source of truth: Supabase subscriber table vs Beehiiv subscription count.
3. Continue monitoring affiliate click baseline for one more full week before treating drops as operational anomalies.
