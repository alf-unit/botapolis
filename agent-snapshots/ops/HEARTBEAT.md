# Schedule — OPS

## Every 2 days

### 06:15 America/Los_Angeles — Site health check (c43a3ffb)
- curl https://botapolis.com — verify 200
- curl 5 random article URLs (from semantic_core_entries WHERE status='published' AND published_article_path IS NOT NULL ORDER BY RANDOM() LIMIT 5)
- Check Supabase response time
- Vercel deployment health: compare GitHub HEAD vs system_config.last_deployed_sha (silent-Vercel-failure detection per AGENTS.md "Site health monitoring" section)
- Frequency = every 2 days (was hourly per original spec; lowered per operator decision 2026-05-22 — sufficient cadence for launch phase, lower noise)

## Daily

### 06:30 America/Los_Angeles — Full metrics aggregation (93ee6dcd)
GSC + Beehiiv + Supabase affiliate_clicks for last 24h → write performance_snapshots row. Full detail in AGENTS.md "Daily metrics aggregation" section. PostHog/Plausible/Vercel-API skipped (credentials not configured — log 'integration X not configured', continue).

### 18:00 America/Los_Angeles — Ops log distillation (6bdc51e1, added 2026-05-26)
Read today's memory/YYYY-MM-DD.md. Compress into key bullets: anomalies detected, completed tasks, API quirks encountered, cost_usd totals for the day. Append distilled summary to MEMORY.md under "Daily activity rollup" section. Goal: long-term log hygiene without losing actionable patterns. Today's full memory file remains untouched (distillation only appends to MEMORY.md).

## Weekly

### Friday 10:00 LA — Refresh candidates analysis (ba7f89c6)
Query performance_snapshots for declining pages: positions 11-20 sustained 4+ weeks, OR dropped >5 positions in last month, OR no impressions growth in last 60 days. Compose candidates list ranked by potential impact. Notify CHIEF via agent_logs + file /agent-snapshots/ops/refresh-candidates-YYYY-WNN.md. CHIEF approves subset → updates semantic_core_entries.status='refreshing' → Claude Code picks up from writer-queue.

### Sunday 18:00 LA — Weekly digest preparation (d6464d8b)
Aggregate last 7 days of performance_snapshots. Compute WoW changes. Identify movers (top growers, top decliners). Compile structured digest (markdown). Save to /agent-snapshots/ops/weekly-YYYY-WNN.md via GitHub API. Log to agent_logs (event_type='weekly_digest') so CHIEF picks up Monday 07:00 LA for strategic planning.

## On demand

### CHIEF → OPS handoff (canonical mechanism)
OPS has no dedicated dispatch cron. On every scheduled wake (above), AGENTS.md "Every session" steps 3-4 read /agent-snapshots/chief/ops-requests/ and /agent-snapshots/chief/priorities-YYYY-WNN.md, process unprocessed items via Task packet generation flow, log to agent_logs as task_packet_created. This is the canonical handoff mechanism per Phase 3 follow-up 2026-05-26 — earlier dedicated 15-min poll cron was redundant with Every-session check and removed.

### New publication detected
Post-commit webhook /api/agents/article-published handles status flip + revalidate + comparison-row bridging immediately. OPS picks up packet-move (pending→done) via after-publish processing on next session wake (per AGENTS.md "After-publish processing" section).

### Critical alert
agent_logs (severity='critical') from any agent → handled when OPS next wakes. CHIEF escalates to operator via Telegram immediately if waiting is unacceptable (CHIEF's HEARTBEAT.md "On critical events" section covers immediate-alert criteria).

## Silent intervals
- N/A — 24/7 background ops, no human-facing communication

## Removed 2026-05-26 (per cron architecture review)
- Every 30 minutes after-publish polling — post-commit webhook covers it (verified working in Phase 3 E2E test 2026-05-26). 48 wakes/day was disproportionate.
- Every hour site health — lowered to every 2 days (sufficient cadence for launch phase).
- Daily 08:00 LA task-packet generation — redundant with Every-session check (AGENTS.md steps 3-4), removed as phantom task.
- Sunday 03:00 LA memory archive — was documented but not registered; archival flow folded into ops log distillation cycle.
- Every 15 minutes ops-requests/priorities poll (cb5abd3e) — added 2026-05-26 morning during Phase 3 test, removed same day as redundant.

## Worst-case CHIEF→OPS pickup latency
- Mon-Thu: ~24h (only OPS daily wake = 06:30 LA daily metrics, plus 06:15 every-2-days site health)
- Fri: 06:30 → 10:00 (refresh candidates) = additional wake same day
- Sun: 06:30 → 18:00 (weekly digest) = additional wake same day
- For real-time loops use post-commit webhook path; calendar wakes designed for content-production cadence (typically weekly priorities from CHIEF, ad-hoc ops-requests rare).
