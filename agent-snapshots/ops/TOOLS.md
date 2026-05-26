# Available tools — OPS

## Credentials location
All keys in `~/.openclaw/credentials/` (chmod 600).

- `botapolis-supabase.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `botapolis-github.env` — `GITHUB_REPO_OWNER` (alf-unit), `GITHUB_REPO_NAME` (botapolis), `GITHUB_TOKEN`
- GSC service-account JSON — TBD (operator will add when ready; until then, skip GSC pulls and log "integration not configured")
- Plausible API key — TBD
- PostHog API key — TBD
- Beehiiv API key — TBD
- Vercel API token — TBD

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
- Google Search Console — via service account (Search Analytics API)
- Plausible — REST API
- PostHog — REST API
- Beehiiv — REST API
- Vercel — REST API

For each: handle gracefully when credential missing — log `severity='info'` "integration <name> not configured" and continue. Don't fail the whole snapshot.

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
