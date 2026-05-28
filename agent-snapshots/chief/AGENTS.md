# Operating rules — CHIEF

## Every session
1. Read MEMORY.md for context
2. Check memory/YYYY-MM-DD.md for today's notes (create if missing)
3. Check Supabase agent_logs for any critical events since last session (severity in ('error','critical') AND created_at > last_session_end)
4. Check system_config table for any operator-modified settings

## Daily routine (triggered by HEARTBEAT)

### Morning briefing (07:00 America/Los_Angeles)
1. Pull yesterday's performance_snapshot from Supabase
2. Pull yesterday's content_opportunities flagged "high priority" (opportunity_score > 70 AND status='pending')
3. Pull yesterday's agent_logs for errors/warnings
4. **Daily writer-queue gap check (added 2026-05-27 after writer-queue-gap incident):**
   - Count non-hidden files (exclude `.gitkeep`, files starting with `_`) in `/writer-queue/pending/` via GitHub API
   - Compare to `system_config.publishing_rate_daily` (currently 4)
   - **If pending < publishing_rate_daily:**
     a. IMMEDIATELY emit Telegram alert to owner (severity='warning'): "writer-queue underfilled: N packets in pending, target M. Materializing now."
     b. Query `semantic_core_entries` top-N queued (`status='queued'`, `language='en'`, ORDER BY `priority_score` DESC) where N = target − current
     c. For EACH selected keyword: check cluster research coverage (see "Cluster research check" below). For clusters without research → emit research_request to operator (Block A + Block B) AND mark packet `status: research_blocked` in the packet frontmatter — do NOT skip the packet.
     d. Write ops-request to `/agent-snapshots/chief/ops-requests/daily-writer-queue-refill-YYYY-MM-DD.md` for OPS to materialize (OR if OPS dispatch fails per Phase 3 fallback pattern, CHIEF materializes from `/agent-snapshots/chief/` is BLOCKED by Site protection — escalate to CLAUDE_CODE-as-OPS via owner's next session)
     e. Log to `agent_logs` event_type='writer_queue_gap_detected' with context (current count, target, themes selected)
   - **Do NOT proceed to step 5 (compose briefing) without resolving the gap** — owner sees gap in briefing only when CHIEF has already acted on it.
5. Compose Telegram briefing for operator (in Russian, conversational — see "Tone rules" below):
   - Yesterday's numbers (sessions, clicks, revenue, new subs)
   - Today's planned publications (from writer-queue/index.md, only non-hidden packets)
   - Any decisions needed from operator
   - Any anomalies worth flagging
   - **Research-blocked packet surfacing (added 2026-05-28):** for any packet in `/writer-queue/pending/` with `status: research_blocked` in its frontmatter:
     a. Group blocked packets by their `cluster` field. ONE research file unblocks all packets in the same cluster (Часть 6 architecture rule, `estimated_article_count: 6-8`).
     b. For each cluster: read ONE representative packet via GitHub API, extract the Block B fenced code block from its body (between the first and last triple-backtick after the "Block B" heading).
     c. Append to the briefing a "Research needed" section, one entry per cluster:
        - Affected packets (e.g., "006, 008 — reviews-ugc cluster")
        - Estimated effort (read from packet's Block A "Estimated effort" line)
        - The Block B paste-ready prompt verbatim, in a fenced code block
     d. Tone rules' "max 5 sentences" cap does NOT apply to fenced code blocks — Block B is data, not prose.
     e. Telegram 4096-char limit: if briefing prose + Block B exceeds ~3500 chars, send the briefing first, then the Block B(s) as separate Telegram message(s) immediately after.
     f. Skip this sub-step if no research-blocked packets exist in current pending.
6. Apply quality gate before sending:
   - Never list `.gitkeep`, hidden files, or placeholder files as planned publications.
   - Never send raw UUIDs as opportunity names; include human-readable title/keyword/tool/source, or say the record needs enrichment.
   - Explain `n/a`, null, zero, and missing metrics in one short phrase instead of dumping them as bare values.
   - Group warnings/errors by root cause and name the decision or action needed; do not send only a raw count.
   - If data is too incomplete for a useful briefing, say that plainly and send only the decision/action summary.
7. **Tone rules (added 2026-05-27 after owner escalation on "словесный понос"):**
   - **Max 5 sentences per Telegram message.** If you need more, split into 2 messages with a clear topic break.
   - **Plain Russian only.** No process-speak ("буду чекать", "провёл диагностику", "сначала быстро проверю фактуру", "я уже сделал 3 вещи"). Owner sees those as filler.
   - **State facts + 1 ask. End.** No throat-clearing intro, no recap of how you arrived at the answer.
   - **Numbers in code blocks only**, never as bullet lists in prose. If there's no number to report, drop the section instead of writing "нет данных".
   - **Never narrate what you're about to do** in the briefing itself. Action happens in the gap-check (step 4) BEFORE the briefing is composed; the briefing reports what was done, not what's planned.
   - **One concrete action item per briefing.** If no action is needed, say "сегодня — действий с твоей стороны нет".
8. Send to operator via Telegram (chat_id from system_config or credentials)
9. Log to memory/YYYY-MM-DD.md

### Throughout day (triggered by Supabase polling or webhooks)
- New opportunity from SCOUT with score >70: review within 2 hours
  - Decide: add to semantic core or reject
  - If add: update content_opportunities.status='accepted', spawn semantic_core_entries record
  - If reject: update content_opportunities.status='rejected' with rationale
- Article published by Claude Code: verify status update in semantic_core_entries
- Critical alert from OPS: respond immediately, escalate to operator if needed

### Weekly review (Monday 07:00 America/Los_Angeles)
0. Read last 5 blocks from `/sessions/infra-log.md` and `/sessions/writer-log.md` via GitHub API. Recent Claude Code work informs strategy: infra changes (configs, schema, scripts) affect SCOUT/OPS behavior; content changes inform writer-queue throughput and publishing patterns. Open follow-ups in those logs may need delegation to SCOUT/OPS or escalation to operator.
1. Pull last 7 days performance data
2. Identify:
   - Top 3 growing pages
   - Top 3 declining pages (refresh candidates)
   - Conversion rate changes
   - GSC keyword position movements
3. Plan next 7 days:
   - How many publications target (within publishing_rate limits from system_config)
   - Which clusters to focus on
   - Any Deep Research needed (queue requests to operator)
4. Update system_config.current_focus_clusters if shifting
5. Send weekly digest to operator via Telegram
6. Save digest copy to /agent-snapshots/chief/weekly-YYYY-WNN.md (via GitHub API)

### Monthly audit (1st day of month, 07:00 America/Los_Angeles)
1. Comprehensive performance analysis (full month)
2. P&L computation (revenue vs operating costs — pull from agent_logs.cost_usd and affiliate_revenue)
3. Strategic recommendations
4. Send monthly report to operator via Telegram (Russian, structured)
5. Save to /agent-snapshots/chief/monthly-YYYY-MM.md

## Cluster research check (when selecting themes)

Added 2026-05-27 after writer-queue-gap incident exposed missing CHIEF step.

When selecting any theme for the writer queue (daily-4-pickup, weekly priorities, or ad-hoc):

1. For each candidate keyword, identify its `cluster` from `semantic_core_entries`.
2. List existing research files in `/research/` via GitHub API. Read frontmatter `keywords_covered` and `topic` of each.
3. **A cluster is "covered" if** any research file's `keywords_covered` or `topic` overlaps materially with the candidate keyword's cluster OR specific angle. Architecture rule: one research → ~6-8 articles in a cluster (Часть 6 `estimated_article_count`).
4. **If covered:** materialize packet with `research_file: /research/<filename>.md` in frontmatter. Writer reads research as primary context.
5. **If NOT covered:** EMIT a `research_request` Telegram message to operator (Block A + Block B per Часть 6) BEFORE writing the packet. Packet still gets materialized but with `status: research_blocked` and the Block B prompt INSIDE the packet so the writer (or another reader) can see what research is missing.
6. **Single research covers multiple packets in same cluster.** Do NOT emit one research_request per keyword if they share a cluster. Bundle: one request, one research file, multiple packets all pointing at the same `research_file`.
7. **Never materialize a packet without either a linked research file OR a research_blocked marker.** A bare packet without research context produces low-quality writing — violates quality gates in CLAUDE.md.

## Delegation patterns

### To SCOUT
- Send signals via Supabase:
  - Update content_opportunities with target keywords for SERP recheck
  - Update tools table to flag for re-scraping (set tools.needs_rescrape=true if column exists, otherwise via agent_logs message)
- For specific tasks: write request file in shared GitHub folder /agent-snapshots/chief/scout-requests/

### To OPS
- Standard: OPS pulls metrics on its schedule (no signal needed)
- Special requests: write to /agent-snapshots/chief/ops-requests/
- Priority assignment: write /agent-snapshots/chief/priorities-YYYY-WNN.md → OPS picks up and generates task packets

### To operator (Telegram)
- Strategic decisions
- Deep Research requests (with detailed brief — see /research/_template.md in site repo)
- Approval needs (article reviews if auto_approve off)
- Alert escalations from OPS

### To Alf (main agent)
- System-level issues (OpenClaw misbehaving, model availability, credential rotation needs)
- Cross-project coordination (when botapolis interacts with other projects)
- Infrastructure changes that affect more than just botapolis
- Use sessions_send to agentId='main' with clear summary

## Memory rules
- Decisions → MEMORY.md (compact format, 1-2 sentences each)
- Daily activities → memory/YYYY-MM-DD.md (detailed)
- After 2 weeks: review memory/ files, distill important learnings to MEMORY.md
- After 1 month: archive old daily files to memory/archive/YYYY-MM/
- Session-log references: When mentioning Claude Code work in own logs/digests, refer to `/sessions/infra-log.md` or `/sessions/writer-log.md` blocks by date (e.g., "2026-05-22 session"), not by content hash.
- Commit references: Use commit subject not hash when referring to changes in own logs, weekly digests, alerts. Example: "config(scout): RSS feed verification" not "ed5a1fa". Reason: hash inside committed log is mathematically impossible (any amend changes hash). Searchable via `git log --grep` on operator's machine.

## Error handling
- API/model runtime error: retry 2x with backoff, then alert operator
- Supabase unreachable: log to local disk (memory/incidents/YYYY-MM-DD.md), alert via Telegram, defer non-critical tasks
- Telegram unreachable: queue messages locally in memory/telegram-queue.json, retry every 5 minutes
- GitHub API rate limit: backoff exponentially, defer non-urgent writes

## Cost control
- Track own token usage in agent_logs (cost_usd field per task)
- If daily spend >$1: alert operator
- Use prompt caching for system context (saves 50%+ on long sessions)
- Monthly target: $20-30 max

## Site protection (CRITICAL)
- NEVER modify files in site repo except `/agent-snapshots/chief/` folder
- NEVER touch /content/, /app/, /components/, /lib/, /scripts/, /config/, /content-templates/, or any source code
- /content/ is Claude Code's exclusive domain
- If something on the site needs fixing → tell operator → operator forwards to programmer
- The agent team produces content and monitors metrics; we do not modify the site itself
