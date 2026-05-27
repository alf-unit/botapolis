# Available tools — OPS

## Credentials location
All keys in `~/.openclaw/credentials/` (chmod 600).

- `botapolis-supabase.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `botapolis-github.env` — `GITHUB_REPO_OWNER` (alf-unit), `GITHUB_REPO_NAME` (botapolis), `GITHUB_TOKEN`
- `botapolis-telegram.env` — `TELEGRAM_BOT_TOKEN_CHIEF`, `TELEGRAM_OWNER_CHAT_ID` (CHIEF only — OPS never calls Telegram)
- `botapolis-beehiiv.env` — `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`
- `botapolis-gsc.env` — **OAuth refresh-token** (owner-as-user, NOT service-account):
  - `GSC_OAUTH_CLIENT_ID`, `GSC_OAUTH_CLIENT_SECRET`, `GSC_OAUTH_REFRESH_TOKEN`, `GSC_SITE_URL`
  - Scope: `webmasters.readonly`. Property: `sc-domain:botapolis.com` (domain resource, full history since Feb 2026)
  - How to use: see AGENTS.md → "Daily metrics aggregation" → step 1 (full HTTP recipe there)
  - Refresh token is Production OAuth consent — does NOT expire in 7 days
  - **History (2026-05-26):** prior wording "service-account JSON — TBD, skip GSC pulls" was stale; that line caused OPS to silently skip GSC for 2 weeks while real data existed (see `agent_logs.event_type='gsc_backfill'` 2026-05-26 + programmer-request `gsc-metrics-ingestion-2026-05-26.md`)
- Plausible API key — not configured (no paid plan, skipped by design)
- PostHog API key — not configured (write-only key only, no read value)
- Vercel API token — not configured (deploy health via GitHub HEAD + curl instead)

## Supabase
- Endpoint: https://vdzslhzyezngdbnrnomc.supabase.co
- Auth: service_role key
- Read: all tables
- Write: `performance_snapshots` (insert one row per day), `agent_logs`, `semantic_core_entries` (status transitions only: in_writer_queue / refreshing / published, plus `published_at`, `published_article_path`, `writer_packet_path`)
- NEVER write: `tools` (SCOUT only), `system_config` (CHIEF only), `content_opportunities` (SCOUT only), `subscribers`, `affiliate_clicks`

## GitHub API
- Repo: alf-unit/botapolis
- Read: all paths
- Write (OPS only): `/writer-queue/pending/**`, `/writer-queue/done/**`, `/writer-queue/index.md`, `/agent-snapshots/ops/**`
- Commit messages: prefix with `ops:` (e.g., `ops: queue 5 packets for week 21`, `ops: move klaviyo-vs-mailchimp to done`)

## External data sources
- Google Search Console — Search Analytics API via OAuth refresh-token (owner-as-user, scope `webmasters.readonly`)
- Beehiiv — REST API (key configured)
- Plausible — REST API (skipped by design — no paid plan)
- PostHog — REST API (skipped by design — write-only key)
- Vercel — REST API (skipped by design — deploy health via GitHub HEAD comparison)

For credential gracefully-missing case: log `severity='info'` "integration <name> not configured" and continue with rest of pipeline.

**Important:** "credential missing" and "credential present but API returned empty" are NOT the same. If `botapolis-gsc.env` exists and OAuth token mints successfully → GSC is configured. An empty API response on a configured integration is a data condition (handled per AGENTS.md "GSC ingestion safety gates"), NOT a "skip integration" signal.

## OpenRouter (via OpenClaw Gateway)
- Model: openai/gpt-5.5 (alias: GPT-5.5) via OpenAI Codex runtime
- Use sparingly — only for:
  - Anomaly summarization
  - Task-packet composition (assembling research + tools data into the template)
  - Weekly digest narrative
- Bulk math/aggregation: do it via SQL or in code, not via LLM tokens

## Cross-agent communication
- To CHIEF: `agent_logs` (info/warning/error) + critical findings to `/agent-snapshots/ops/`
- To SCOUT: not direct — go via CHIEF
- Never call Telegram

## Forbidden
- Writing content to /content/
- Modifying site source code
- Schema changes
- Sending email
