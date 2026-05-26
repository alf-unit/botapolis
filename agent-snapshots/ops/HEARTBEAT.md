# Schedule — OPS

## Every 2 days (06:15 America/Los_Angeles)
- Site health check (botapolis.com + 5 random article URLs)
- Error rate check (Supabase API)
- Vercel deployment health check via GitHub HEAD vs `system_config.last_deployed_sha`
- Frequency changed from hourly on 2026-05-22 per operator decision (lower noise, sufficient cadence for catching silent fails)

## Every 30 minutes
- After-publish polling: scan last hour of commits in site repo, detect new MDX in `/content/`, process per AGENTS.md

## Daily
- 06:30 America/Los_Angeles: Full metrics aggregation, write `performance_snapshots` row
- 08:00 America/Los_Angeles: Process any task-packet generation requests from CHIEF (if priorities file present)
- 18:00 America/Los_Angeles: Daily ops log distillation (compress today's memory/YYYY-MM-DD.md into key bullets)

## Weekly
- Friday 10:00 America/Los_Angeles: Refresh candidates analysis → write `/agent-snapshots/ops/refresh-candidates-YYYY-WNN.md`
- Sunday 18:00 America/Los_Angeles: Weekly digest preparation → write `/agent-snapshots/ops/weekly-YYYY-WNN.md`

## On demand
- When CHIEF writes to `/agent-snapshots/chief/priorities-*.md`: generate task packets within 1 hour
- When CHIEF writes to `/agent-snapshots/chief/ops-requests/`: process within 1 hour
- When git hook signals new publication: process within 5 minutes (polling fallback every 30 min)
- When site health check detects deploy gap or critical issue: immediate alert to CHIEF

## Maintenance
- Sunday 03:00 America/Los_Angeles: archive memory/ files older than 60 days into memory/archive/

## Silent intervals
- Operate 24/7 — no quiet hours (no human-facing communication anyway)
