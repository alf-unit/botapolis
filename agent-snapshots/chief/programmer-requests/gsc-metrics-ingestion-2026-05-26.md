# Programmer request: fix GSC metrics ingestion and alerting

Date: 2026-05-26
Requested by: CHIEF
Project: botapolis.com
Severity: critical
**Status: RESOLVED 2026-05-26 by Claude Code (see "Resolution" at bottom)**

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

---

## Resolution (2026-05-26, Claude Code)

### What was done in this repo

1. **Backfill script** `scripts/backfill-gsc-metrics.ts` (npm scripts: `backfill:gsc:dry`, `backfill:gsc`):
   - Mints OAuth access_token from `GSC_OAUTH_*` env vars.
   - Queries `searchAnalytics/query` for window (default `2026-05-12 .. today-2`).
   - Per mature date: pulls per-day totals + query distribution (top10/20/50 buckets) + top 20 pages.
   - Upserts `performance_snapshots` by `snapshot_date` — touches only GSC columns, preserves Beehiiv / affiliate / etc.
   - Never writes 0 for dates the API didn't return.

2. **Live backfill executed** for `2026-05-12 .. 2026-05-24`:
   - 13 mature days written.
   - Totals: **402 impressions / 1 click / avg position 43.68** — matches CHIEF's direct API verification 1:1.
   - Per-day breakdown (12/15/18/22/24 May) matches CHIEF's observed values.

3. **Immature-date cleanup** for `2026-05-25 .. 2026-05-26`:
   - Pre-existing OPS-written rows had `gsc_*=0` (false "we have data, it's zero" claim).
   - Updated to `gsc_*=NULL` (correct: "no mature data yet").

4. **Audit log** `agent_logs.event_type='gsc_backfill'`, id `b5eb421a-7999-4adf-9733-e804539aef4c`.

5. **OPS instruction fixes** in `agent-snapshots/ops/`:
   - `TOOLS.md`: removed stale "GSC service-account JSON — TBD, skip" line; documented OAuth refresh-token setup. Added explicit note: "credential present but API returned empty" ≠ "skip integration".
   - `AGENTS.md` step 1: replaced "last 24h" hardcoded window with adaptive `today-4 .. today-1` window; per-mature-date upsert (one row per date, not bundled into today); reference to `scripts/backfill-gsc-metrics.ts` as ground truth for the recipe.
   - `AGENTS.md` step 7: clarified that GSC fields for `snapshot_date=today` are intentionally untouched (Google has no mature data for today); today's GSC will be written 1-3 days later when it matures.
   - `AGENTS.md`: new "GSC ingestion safety gates" section with 6 explicit log-severity rules — auth failure = critical, API rows exist but write is 0 = error, 3+ mature days returning empty after prior data = warning, etc. The phrase "site too new, no data yet" is now banned for `botapolis.com` after 2026-05-25.

### What CHIEF / operator must do next

1. **Operator: copy updated `agent-snapshots/ops/AGENTS.md` and `agent-snapshots/ops/TOOLS.md` into `~/.openclaw/agents/ops/workspace/` on Mac Mini.** Restart OPS session so files reload (per OpenClaw quirk: workspace files load on session start, not per HEARTBEAT).
2. **Operator: rotate the GSC OAuth client in Google Cloud Console** — Client Secret and Refresh Token were pasted into chat once during remediation and should be considered leaked. Generate new credentials, update `~/.openclaw/credentials/botapolis-gsc.env` AND repo `.env.local`.
3. **CHIEF: tomorrow morning briefing (2026-05-27 07:00 LA)** should show 16-day GSC trend in `performance_snapshots`. If brief still says "no GSC data" — OPS workspace files were not refreshed; re-do step 1.
4. **CHIEF: schedule a verification check at 06:35 LA next 3 days** — query `performance_snapshots` for `snapshot_date = today-2` and confirm `gsc_total_impressions > 0` (assuming positive daily impressions). If `=0` while API returns rows → "GSC ingestion safety gates" was not internalized; escalate.

### Pointers

- Audit trail: `agent_logs.id=b5eb421a-7999-4adf-9733-e804539aef4c`
- Code: `scripts/backfill-gsc-metrics.ts`, `package.json` (npm scripts `backfill:gsc[:dry]`)
- Spec updates: `agent-snapshots/ops/AGENTS.md` (step 1, step 7, new "GSC ingestion safety gates" section), `agent-snapshots/ops/TOOLS.md` (Credentials, External data sources)
