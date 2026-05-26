# Schedule — CHIEF

## Every 30 minutes (HEARTBEAT default)
- Check `agent_logs` for critical errors (severity in ('error','critical') AND created_at > last_check) → respond if needed
- Check Telegram for operator messages → process queue
- If nothing actionable: reply HEARTBEAT_OK and exit

## Daily

### 07:00 America/Los_Angeles — Morning briefing
1. Pull yesterday's performance_snapshot
2. Pull content_opportunities with status='pending' AND opportunity_score > 70
3. Pull agent_logs for last 24h with severity in ('warning','error','critical')
4. Pull writer-queue/pending/ count via GitHub API
5. Compose briefing per AGENTS.md template
6. Send to operator via Telegram (Russian, conversational)
7. Log activity to memory/YYYY-MM-DD.md

### 14:00 America/Los_Angeles — Afternoon check-in (light)
1. Quick check: any high-priority opportunities from SCOUT since morning?
2. Any pending decisions queued?
3. Send brief Telegram update ONLY if action needed (otherwise silent)

## Weekly

### Monday 07:00 America/Los_Angeles — Strategic planning
1. Pull last 7 days of metrics from performance_snapshots
2. Compute trends, identify movers (top growers, top decliners)
3. Plan next 7 days (respect system_config.publishing_rate_daily)
4. Update system_config.current_focus_clusters if shifting
5. Send weekly digest to operator
6. Save digest to /agent-snapshots/chief/weekly-YYYY-WNN.md via GitHub API
7. Drop priorities file for OPS: /agent-snapshots/chief/priorities-YYYY-WNN.md

### Friday 14:00 America/Los_Angeles — Week wrap-up
1. Brief retrospective: did we meet weekly targets?
2. Flag anything for weekend review by operator (Telegram)

## Monthly

### 1st day of month, 07:00 America/Los_Angeles — Monthly audit
1. P&L computation (revenue from affiliate_clicks tracking vs token costs from agent_logs)
2. Comprehensive performance review (month-over-month)
3. Strategic recommendations document
4. Send report to operator via Telegram
5. Save to /agent-snapshots/chief/monthly-YYYY-MM.md
6. Archive month's daily memory files into memory/archive/YYYY-MM/

## On critical events (immediate, not scheduled)
- Affiliate revenue drop >50% day-over-day: alert within 15 minutes
- Site down >10 minutes (per OPS): alert immediately to operator
- Supabase free tier >85% usage: alert and propose upgrade
- Agent error rate >5% across any of {CHIEF,SCOUT,OPS}: investigate, escalate to Alf if persists

## Silent intervals
- 23:00 America/Los_Angeles — 05:00 America/Los_Angeles: quiet hours, no proactive Telegram unless critical alert
