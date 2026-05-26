# Programmer request: fix GSC metrics ingestion and alerting

Date: 2026-05-26
Requested by: CHIEF
Project: botapolis.com
Severity: critical

## Summary

The botapolis metrics pipeline is writing GSC null/zero values into `performance_snapshots` even though Google Search Console API returns real data.

This has caused CHIEF/OPS reports to hide an active data-ingestion failure as "site too new".

## Evidence

Direct API test from the agent runtime on 2026-05-26:

- Credential file exists: `~/.openclaw/credentials/botapolis-gsc.env`
- OAuth token mint succeeds.
- Property list includes:
  - `sc-domain:botapolis.com` with `siteOwner`
  - `https://botapolis.com/` with `siteOwner`
- Search Analytics API query for `sc-domain:botapolis.com`, 2026-05-11..2026-05-24 returns:
  - clicks: 1
  - impressions: 402
  - avg position: 43.681592039801

But `performance_snapshots` currently shows:

```text
2026-05-21  gsc_impressions=null  gsc_clicks=null
2026-05-22  gsc_impressions=0     gsc_clicks=0
2026-05-23  gsc_impressions=null  gsc_clicks=null
2026-05-24  gsc_impressions=0     gsc_clicks=0
2026-05-25  gsc_impressions=0     gsc_clicks=0
2026-05-26  gsc_impressions=0     gsc_clicks=0
```

OPS logs also show false confidence:

- 2026-05-22: `Integrations: Supabase✓ GSC✓ Beehiiv✓`
- 2026-05-23: `GSC (no data—site too new)`
- 2026-05-24: `GSC data pulled: 0 impressions, 0 clicks`

## Likely causes to check

1. Wrong date window: querying only yesterday/today while GSC data lags. Use `endDate = today - 2 days` for reliable daily aggregation.
2. Wrong property encoding or property mismatch. Known-good endpoint path:
   `https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Abotapolis.com/searchAnalytics/query`
3. Empty rows treated as successful data instead of a warning after indexing has started.
4. Documentation drift confusing OPS:
   - `agent-snapshots/ops/AGENTS.md` correctly documents OAuth refresh-token GSC.
   - `agent-snapshots/ops/TOOLS.md` still says service-account JSON is TBD and GSC should be skipped.
5. Aggregator may be querying a URL-prefix property or wrong date range, then writing zero.

## Requested fix

1. Locate the OPS daily metrics aggregation implementation and make GSC pull deterministic:
   - Load `botapolis-gsc.env`.
   - Mint OAuth token.
   - Query `sc-domain:botapolis.com`.
   - Use mature dates only (`today - 2 days`, not current day).
   - Store actual clicks, impressions, avg position, and keyword buckets.
2. Add a backfill command/script for GSC values in `performance_snapshots`.
3. Backfill 2026-05-12 onward where GSC rows exist.
4. Add explicit alerting:
   - Auth/permission failure = critical.
   - API rows exist but snapshot writes zero/null = error.
   - No GSC rows for 3 mature days after previous non-zero impressions = warning.
5. Fix stale OPS docs so `TOOLS.md` matches current OAuth setup.

## Acceptance criteria

- `performance_snapshots` for mature dates reflect GSC API rows instead of null/zero.
- A daily OPS run cannot silently mark GSC as healthy if API data exists but DB writes are empty.
- CHIEF morning briefing can report actual GSC impressions/clicks/positions or clearly say "GSC ingestion failed", not "no data".
