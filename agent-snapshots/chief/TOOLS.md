# Available tools — CHIEF

## Credentials location
All keys live in `~/.openclaw/credentials/` (chmod 600). Never copy them into MEMORY.md, daily logs, or commits. Read them at runtime via `source <file>` or `cat`.

- `botapolis-supabase.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `botapolis-github.env` — `GITHUB_REPO`, `GITHUB_REPO_OWNER` (alf-unit), `GITHUB_REPO_NAME` (botapolis), `GITHUB_TOKEN`
- `botapolis-telegram.env` — `TELEGRAM_BOT_TOKEN_CHIEF`, `TELEGRAM_BOT_USERNAME_CHIEF` (botapolis_chief_bot), `TELEGRAM_OWNER_CHAT_ID` (1020995171)
- OpenAI Codex / GPT-5.5 — handled by OpenClaw (no need to read tokens directly)

## Supabase
- Endpoint: https://vdzslhzyezngdbnrnomc.supabase.co
- Auth: service_role key (bypasses RLS — full access)
- Call style: REST via `curl` with `apikey` + `Authorization: Bearer <key>` headers, OR via `@supabase/supabase-js` if running JS
- Quick check pattern:
  ```bash
  source ~/.openclaw/credentials/botapolis-supabase.env
  curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
       -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
       "$SUPABASE_URL/rest/v1/<table>?select=*&limit=10"
  ```
- Tables CHIEF reads from: all
- Tables CHIEF writes to: `semantic_core_entries` (status changes), `system_config`, `agent_logs`
- Tables CHIEF NEVER writes to: `tools` (SCOUT's domain), `affiliate_clicks` (site), `subscribers` (site)
- Never modify schema — escalate to operator

## GitHub API
- Repo: alf-unit/botapolis (public, default branch `main`)
- Token: fine-grained PAT, scope = botapolis repo, Contents read/write
- Endpoint: https://api.github.com
- Auth header: `Authorization: Bearer $GITHUB_TOKEN`
- Read access: all paths
- Write access (CHIEF only): `/agent-snapshots/chief/**` — anywhere else is forbidden
- Common operations:
  - Read file: `GET /repos/alf-unit/botapolis/contents/<path>`
  - Create/update file: `PUT /repos/alf-unit/botapolis/contents/<path>` with base64-encoded content + sha (if updating)
  - List dir: `GET /repos/alf-unit/botapolis/contents/<dir>`

## Telegram Bot API
- Bot: @botapolis_chief_bot (id 8779467377)
- Token: in `botapolis-telegram.env`
- Operator chat_id: 1020995171
- Endpoint: https://api.telegram.org/bot<TOKEN>/<method>
- Common methods:
  - `sendMessage` for briefings
  - `sendMessage` with `parse_mode=Markdown` for structured output (limit messages to 4096 chars)
- Format guidelines:
  - Russian language, lowercase, conversational
  - Code blocks (```) for tables/data
  - Plain text for short notes
- Quick send:
  ```bash
  source ~/.openclaw/credentials/botapolis-telegram.env
  curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN_CHIEF/sendMessage" \
       -d "chat_id=$TELEGRAM_OWNER_CHAT_ID" \
       --data-urlencode "text=сообщение"
  ```

## OpenAI Codex runtime (via OpenClaw)
- Model: openai/gpt-5.5
- Configured at OpenClaw layer — CHIEF doesn't need to manage tokens directly
- Do not route CHIEF work to Sonnet; current and future default is GPT-5.5 unless operator explicitly changes it.

## Web Search (Brave via tool plugin)
- For verifying facts, checking SERPs, news lookups
- Use sparingly — prefer SCOUT's already-gathered data when available
- Tool name: `web_search`

## Cross-agent communication
- To SCOUT: write file to `/agent-snapshots/chief/scout-requests/<topic>-YYYY-MM-DD.md` via GitHub API
- To OPS: write file to `/agent-snapshots/chief/ops-requests/<topic>-YYYY-MM-DD.md` or write priorities to `/agent-snapshots/chief/priorities-YYYY-WNN.md`
- To Alf (main agent): use OpenClaw `sessions_send` tool with `agentId=main`
- Never call SCOUT/OPS directly via API — always via Supabase signals or GitHub request files

## Forbidden tools
- Browser automation for content (that's SCOUT)
- Direct edits to site code, MDX files, configs
- Manual database schema changes
- Sending email from any operator address
