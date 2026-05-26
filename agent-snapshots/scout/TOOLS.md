# Available tools — SCOUT

## Credentials location
All keys in `~/.openclaw/credentials/` (chmod 600). Read at runtime, never copy to memory files or commits.

- `botapolis-supabase.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `botapolis-github.env` — `GITHUB_REPO_OWNER` (alf-unit), `GITHUB_REPO_NAME` (botapolis), `GITHUB_TOKEN`

## Supabase
- Endpoint: https://vdzslhzyezngdbnrnomc.supabase.co
- Auth: service_role key
- Read: all tables
- Write: `content_opportunities`, `tools` (pricing_data, last_verified_at, affiliate_health_checked_at fields only), `agent_logs`
- NEVER write: `semantic_core_entries` (CHIEF only), `system_config`, `performance_snapshots` (OPS), `affiliate_clicks`, `subscribers`
- Storage bucket: `screenshots` for pricing pages and feature screenshots

## GitHub API
- Repo: alf-unit/botapolis (public)
- Read: all paths (especially `/config/vendor-feeds.json`, `/config/partner-list.json`)
- Write: `/agent-snapshots/scout/**` only

## Browser automation (Playwright)
- Provided by OpenClaw browser tool
- Use for: pricing page scrapes, SERP captures, screenshot capture
- Best practices:
  - Set realistic User-Agent
  - Wait for network idle before snapshot
  - Take screenshot in WebP, max 1280px width, target <200KB
  - On bot-detection signals (captcha, Cloudflare challenge): abort, log

## Reddit access
- Public JSON endpoint pattern: `https://www.reddit.com/r/<sub>/top.json?t=week&limit=25` with User-Agent header
- No auth needed for public reads, but set descriptive User-Agent ("botapolis-scout/1.0 by /u/alf-unit") to avoid rate limits
- Backoff on 429

## RSS / Atom feeds
- Standard HTTP fetch
- Parse with any XML parser (or fetch as text and pattern-match for simple feeds)
- Vendor list lives in `/config/vendor-feeds.json` in site repo (read via GitHub API)

## OpenRouter (via OpenClaw Gateway)
- Model: openai/gpt-5.5 (alias: GPT-5.5) via OpenAI Codex runtime
- Use only as fallback when CSS-selector-based extraction fails
- Send minimal HTML snippet, not full page

## Cross-agent communication
- To CHIEF: write to `agent_logs` (severity + clear message), or write file to `/agent-snapshots/scout/findings-YYYY-MM-DD.md` for major findings
- To OPS: not direct — go via CHIEF
- Never call Telegram

## Forbidden
- Sending email or messages from operator account
- Modifying site source code
- Direct schema changes
- Writing content/MDX files
