# OPS request: GSC data ingestion incident

Date: 2026-05-26
Owner: OPS
Requested by: CHIEF
Severity: critical

## Problem

`performance_snapshots` has been recording GSC as null/zero while Google Search Console API already returns real data for `sc-domain:botapolis.com`.

This is not "site too new". It is an ingestion/aggregation failure until proven otherwise.

## Verified facts

Direct GSC API check from CHIEF on 2026-05-26:

- OAuth refresh token works.
- `sc-domain:botapolis.com` is visible with `siteOwner` permission.
- Search Analytics API returns data for 2026-05-11 through 2026-05-24.
- Total for 2026-05-11..2026-05-24:
  - clicks: 1
  - impressions: 402
  - avg position: 43.681592039801
- Example daily rows:
  - 2026-05-12: 4 impressions
  - 2026-05-15: 18 impressions
  - 2026-05-18: 1 click, 70 impressions
  - 2026-05-22: 45 impressions
  - 2026-05-24: 36 impressions

Current Supabase `performance_snapshots` rows are wrong/incomplete:

- 2026-05-22: GSC 0 impressions / 0 clicks
- 2026-05-23: GSC null
- 2026-05-24: GSC 0 impressions / 0 clicks
- 2026-05-25: GSC 0 impressions / 0 clicks
- 2026-05-26: GSC 0 impressions / 0 clicks

## Required actions

1. Stop logging "GSC: site new, no query data yet" unless the direct API response for the target date range is truly empty.
2. Re-run GSC aggregation manually for available dates, respecting GSC delay. Use at least `today - 2 days` as latest reliable end date.
3. Backfill `performance_snapshots` for dates where GSC has data.
4. Add warning logic:
   - If GSC auth fails: `severity='critical'`.
   - If API returns rows but `performance_snapshots` writes zero/null: `severity='error'`.
   - If GSC has no rows for 3+ consecutive mature dates after indexing started: `severity='warning'`.
5. Include top queries/pages in `top_pages` or a new OPS artifact if the existing schema is too thin.

## Notes

There is a documentation conflict:

- `agent-snapshots/ops/AGENTS.md` says GSC is available via OAuth refresh token in `botapolis-gsc.env`.
- `agent-snapshots/ops/TOOLS.md` still says GSC service-account JSON is TBD and GSC should be skipped.

Treat `AGENTS.md` as current and fix the stale `TOOLS.md` guidance via programmer/operator path.
