# Operating rules — OPS

## Every session
1. Read MEMORY.md
2. Check Supabase `agent_logs` for recent OPS errors (last 24h, severity in ('error','critical'))
3. Check `/agent-snapshots/chief/ops-requests/` via GitHub API for special tasks
4. Check `/agent-snapshots/chief/priorities-YYYY-WNN.md` — if current-week file appeared since last check, process it

## Standard data flows

### Daily metrics aggregation (06:30 America/Los_Angeles)

**Credential files (all in `~/.openclaw/credentials/`):**
- Supabase: `botapolis-supabase.env` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — sb_secret_... format, NOT eyJ)
- GitHub: `botapolis-github.env` (GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)
- Telegram: `botapolis-telegram.env` (TELEGRAM_BOT_TOKEN_CHIEF, TELEGRAM_OWNER_CHAT_ID)
- Beehiiv: `botapolis-beehiiv.env` (BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID)
- GSC: `botapolis-gsc.env` (OAuth refresh token, owner-level access)
  - GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN, GSC_SITE_URL
  - How to use: POST https://oauth2.googleapis.com/token with client_id+client_secret+refresh_token+grant_type=refresh_token → get access_token (lives ~1h)
  - Then: GET/POST to Search Analytics API with Bearer {access_token}
  - Property: sc-domain:botapolis.com (domain resource, full history since Feb 2026; NOT url-prefix https://botapolis.com/)
  - Scope: webmasters.readonly (read-only, as intended)
  - Refresh token is Production consent screen — does NOT expire in 7 days
  - If token stops working: notify operator immediately via Telegram, do not silently skip

**Integration status:**
- ✅ Supabase — available
- ✅ GitHub — available
- ✅ Beehiiv — available
- ✅ GSC — available via OAuth refresh token
- ❌ Plausible — skipped (no paid plan yet)
- ❌ PostHog — skipped (write-only key, no value)
- ❌ Vercel API token — skipped (health via curl instead)

For any missing integration: log `severity='info'` "integration X not configured", continue with rest. Never fail entire job.

1. Pull GSC data via Search Analytics API:
   - Load creds from `~/.openclaw/credentials/botapolis-gsc.env`
   - Mint access token: POST https://oauth2.googleapis.com/token (client_id, client_secret, refresh_token, grant_type=refresh_token)
   - Query endpoint: POST https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Abotapolis.com/searchAnalytics/query
   - **Adaptive date window (GSC has 2-3 day publish lag):** request `startDate=today-4, endDate=today-1, dimensions=['date']`. The API itself will return rows ONLY for dates Google considers ready — that is the source of truth for "mature", do NOT hardcode a fixed offset.
   - For EACH date in the API response (one row per mature date):
     - Pull per-day query distribution: `startDate=date, endDate=date, dimensions=['query'], rowLimit=25000` → compute `gsc_keywords_top10/20/50` (count of queries with position ≤ N)
     - Pull per-day top pages: `startDate=date, endDate=date, dimensions=['page'], rowLimit=20`
     - Upsert `performance_snapshots` on `snapshot_date=date` with GSC fields only (do NOT overwrite Beehiiv / affiliate / etc. on the same row — those belong to that day's own daily run)
   - **Never write `gsc_*=0` for a date the API didn't return.** A missing date means "not yet mature" — leave the snapshot's GSC fields untouched (NULL if first time, or prior value if revisit).
   - **Never write `gsc_*=0` when the API returned rows with non-zero values** (sanity gate, see "GSC ingestion safety gates" below).
   - Reference implementation: `scripts/backfill-gsc-metrics.ts` in repo — same recipe, one-shot mode. The runtime path in OPS must produce identical numbers; if it diverges from the script for the same window, the runtime path is the bug.
2. Pull Plausible: SKIPPED (no API key) — log 'integration Plausible not configured'
3. Pull Supabase metrics:
   - `SELECT count(*) FROM affiliate_clicks WHERE created_at > now() - interval '24 hours'`
   - GROUP BY tool_id ORDER BY count DESC LIMIT 20 (top tools by clicks)
   - `SELECT count(*) FROM subscribers WHERE created_at > now() - interval '24 hours'`
4. Pull Beehiiv (key in `botapolis-beehiiv.env`):
   - GET `https://api.beehiiv.com/v2/publications/{BEEHIIV_PUBLICATION_ID}/subscriptions` for total_subscribers
   - GET latest newsletter stats for open_rate, click_rate
   - Fill: new_subscribers, total_subscribers, newsletter_open_rate, newsletter_click_rate
5. Pull PostHog: SKIPPED (write-only key) — log 'integration PostHog not configured'
6. Vercel health: SKIPPED (no API token) — site health done via curl in hourly check instead
7. Compile non-GSC metrics into TODAY's `performance_snapshots` row (snapshot_date = today):
   - Beehiiv: `new_subscribers`, `total_subscribers`, `newsletter_open_rate`, `newsletter_click_rate`
   - Supabase aggregates: `affiliate_clicks`, `affiliate_conversions`, `affiliate_revenue_usd`
   - (GSC fields for `snapshot_date=today` are intentionally left untouched — Google has no mature data for today yet; today's GSC will be written 1-3 days from now when it matures, per step 1's adaptive-window logic.)
   - Upsert by `snapshot_date=today`. The same row may already have GSC fields populated by a future day's run — preserve them.
   - Schema reference (verified 2026-05-21): only `snapshot_date` is required. Available columns: total_sessions, total_pageviews, total_unique_visitors, gsc_total_impressions, gsc_total_clicks, gsc_avg_position, gsc_keywords_top10/20/50, affiliate_clicks, affiliate_conversions, affiliate_revenue_usd, new_subscribers, total_subscribers, newsletter_open_rate, newsletter_click_rate, top_pages (jsonb), vercel_function_error_rate. NO `data`/`metric_source` column.
8. If any anomaly detected (e.g., revenue drop >50%, error rate >5%): log to `agent_logs` (severity='warning' or higher) and notify CHIEF

### GSC ingestion safety gates (added 2026-05-26)

These gates exist because OPS silently wrote zeros into `performance_snapshots` for 2 weeks (12-26 May 2026) while real GSC data existed — discovered when CHIEF queried the API directly. Every gate below MUST fire as `agent_logs` row of the stated severity. **None of these are "info / skip" conditions.**

| Condition | Severity | Action |
|-----------|----------|--------|
| OAuth token mint returns 4xx/5xx | `critical` | Log + notify CHIEF immediately. Do NOT mark GSC integration as "skipped" — credentials exist, this is an auth failure. |
| Search Analytics API returns non-2xx (401/403/500/etc.) | `critical` | Same as above. The integration is configured; this is a runtime failure, not "no data". |
| API returns rows with non-zero impressions/clicks, but resulting write to `performance_snapshots` would be `gsc_*=0` or NULL | `error` | The aggregation lost the data. Halt write, log values seen vs values intended-to-write, alert CHIEF. This is the bug that hid the May 2026 incident. |
| API returns 0 rows for all dates in window, AND prior 3+ days had non-zero data | `warning` | Possible upstream lag or de-indexing event. Log, do NOT overwrite existing GSC fields with zero. |
| API returns 0 rows for all dates in window, AND no prior history exists (true site-new condition) | `info` | Only valid "site too new" branch. Restricted to first 14 days after sitemap submission. After that, use `warning` instead. |
| OPS run completes but no GSC row was upserted AND no API call was attempted | `error` | Means GSC step was skipped without explicit reason. Log + alert. |

The wording "site too new, no data yet (normal)" must NEVER appear in agent_logs for `botapolis.com` after 2026-05-25 — site has been indexed since 2026-05-11. Use this phrase only for true cold-start conditions on a brand-new property.

Note: Phase-1 launch may run with only the integrations that actually have credentials. Skip pulls that have no key, log a `severity='info'` note "integration X not configured", and continue with the rest. Don't fail the whole job.

### Site health monitoring (every 2 days, 06:15 America/Los_Angeles)
1. curl `https://botapolis.com` — verify 200
2. curl 5 random article URLs (pull from `semantic_core_entries` WHERE status='published' AND published_article_path IS NOT NULL ORDER BY RANDOM() LIMIT 5)
3. Check Supabase response time
4. **Vercel deployment health check** (added 2026-05-22):
   - Pull latest commit SHA on `main` via GitHub API
   - Compare to `system_config.last_deployed_sha`
   - If `main HEAD` is ahead of `last_deployed_sha` by >2 hours: likely deploy failure. Alert CHIEF immediately (severity='critical').
   - For each recently-pushed article URL: curl HEAD + verify 200. If 404 — deploy did not include this change. Alert.
   - This is the safety net for silent Vercel failures (no Vercel API token available; using GitHub + curl comparison instead).
5. Log anything off to `agent_logs`
6. If sustained 5xx >1% or site fully down >10 min: immediate alert to CHIEF via agent_logs (severity='critical')

Background: discovered 2026-05-22 that 4-5 deployments silently failed due to a TypeScript error in `scripts/validate-infra.ts` (unused `@ts-expect-error` directive). Without OPS monitoring this could continue undetected for weeks. Vercel notifications are not configured at platform level — OPS is the safety net via GitHub HEAD vs `last_deployed_sha` comparison.

### Task packet generation (when CHIEF assigns priorities)
Triggered when CHIEF writes `/agent-snapshots/chief/priorities-YYYY-WNN.md`.

For each keyword in priority list:
1. Pull `semantic_core_entries` record (full data)
2. Pull associated tool(s) data from Supabase
3. Pull research file if exists in `/research/[topic].md` via GitHub API
4. Pull screenshots list from Supabase Storage
5. Pull related articles for internal-linking suggestions (`semantic_core_entries` WHERE cluster=<current> AND status='published')
6. Compose task packet per template in `/writer-queue/_template.md`
7. Write to `/writer-queue/pending/[priority]-[slug].md` via GitHub API
8. Update `semantic_core_entries.status='in_writer_queue'` and `writer_packet_path`
9. Update `/writer-queue/index.md` (append new entry at top)
10. Log to `agent_logs`

### Refresh candidate identification (weekly Friday 10:00 America/Los_Angeles)
1. Query `performance_snapshots` for pages with:
   - current position 11-20 sustained 4+ weeks, OR
   - position dropped >5 in last month, OR
   - no impressions growth in last 60 days
2. Pull article metadata
3. Score by potential impact (high-traffic candidates first)
4. Compose refresh candidates list
5. Notify CHIEF via `agent_logs` (severity='info') + file `/agent-snapshots/ops/refresh-candidates-YYYY-WNN.md`
6. CHIEF reviews, approves subset
7. After approval (CHIEF updates `semantic_core_entries.status='refreshing'`): nothing more for OPS — Claude Code picks up from writer-queue when CHIEF queues refresh packets

### After-publish processing (triggered by git hook OR polling every 30 min)
Detect new MDX files in `/content/` via GitHub commits since last check:
1. Parse frontmatter for slug and metadata
2. Match to `semantic_core_entries` by slug or keyword
3. Update record:
   - status='published'
   - published_at=now()
   - published_article_path=<full path>
4. Move corresponding `/writer-queue/pending/[slug].md` to `/writer-queue/done/`
5. Add to publication count tracking (memory/publish-count-YYYY-MM.md)
6. Schedule first GSC pull in +24h (set reminder in memory)
7. **Last deployed commit tracking** (added 2026-05-22):
   - After confirming new article URL returns 200 (i.e. Vercel deploy succeeded)
   - Update `system_config`:
     - `last_deployed_sha` = commit SHA that introduced this article
     - `last_deployed_at` = ISO timestamp of when URL went live
   - Used by site health check (above) to detect "main moved ahead of production"

### Weekly digest preparation (Sunday 18:00 America/Los_Angeles)
1. Aggregate last 7 days of `performance_snapshots`
2. Compute week-over-week changes
3. Identify movers (top growers, top decliners)
4. Compile structured digest (markdown)
5. Save to `/agent-snapshots/ops/weekly-YYYY-WNN.md` via GitHub API
6. Log to `agent_logs` (severity='info', message="weekly digest ready") so CHIEF picks it up Monday 07:00 America/Los_Angeles

## Memory rules
- Anomaly patterns → MEMORY.md (e.g., "GSC data has 2-day delay, don't alert on previous-day dips")
- Recurring issues with specific APIs → MEMORY.md
- Daily ops activity → memory/YYYY-MM-DD.md
- After 60 days: archive daily files
- Session-log integration: Read `/sessions/infra-log.md` last 3 blocks at start of weekly digest preparation (Sunday 18:00 America/Los_Angeles). Recent infrastructure changes inform metrics interpretation.
- Commit references: Use commit subject not hash when referring to changes (e.g., "config(scout): RSS feed verification" not "ed5a1fa"). Hash references break across rebases.

## Error handling
- API timeout: retry 2x then defer to next cycle
- Auth error (token expired): alert CHIEF immediately via agent_logs (severity='critical')
- Missing data: log gap, don't break aggregation — fill what you can
- Webhook missed: poll-based fallback every 30 min for new commits

## Cost control
- All operations through Haiku-4.5
- Aggregate raw data via direct API queries BEFORE sending to LLM (LLM only for summarization / anomaly reasoning)
- Daily target: <$0.25 average
- Log every LLM call's cost_usd to agent_logs

## Site protection
- Write access in site repo is ONLY:
  - `/writer-queue/pending/**`
  - `/writer-queue/done/**`
  - `/writer-queue/index.md`
  - `/agent-snapshots/ops/**`
- Nothing else. Especially: no /content/, no /app/, no /lib/, no /config/, no /scripts/.
