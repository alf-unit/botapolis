# OpenClaw Cron Registry — Final state 2026-05-26

Post-redesign snapshot after Phase 3 follow-up cron architecture review.
Supersedes [`cron-registry-2026-05-26.md`](./cron-registry-2026-05-26.md)
(the initial snapshot captured before the redesign).

Captures via CHIEF `cron_redesign` action (agent_log
b3157130-6d34-4b55-bba8-1239a86db1c7, 2026-05-26T09:43:49Z). All schedules
in `America/Los_Angeles`.

## Daily timeline (weekday)

```
05:30 LA — SCOUT  RSS monitoring cycle           (db2ed8be)
05:30 LA — SCOUT  Reddit daily scan              (30df8977)  [parallel with RSS]
06:00 LA — SCOUT  Affiliate URL health check     (3b51684d)
06:15 LA — OPS    Site health check (every 2d)   (c43a3ffb)
06:30 LA — OPS    Daily metrics aggregation      (93ee6dcd)
07:00 LA — CHIEF  Morning briefing to operator   (145bd969)
18:00 LA — OPS    Daily ops log distillation     (6bdc51e1)  [NEW 2026-05-26]
```

## Weekly anchors

```
Sunday 03:00 LA  — SCOUT  Weekly memory cleanup         (aa6382e2)  [NEW]
Sunday 03:30 LA  — SCOUT  Weekly pattern distillation   (9705def8)  [NEW]
Sunday 06:00 LA  — SCOUT  Weekly pricing scrape         (da2266d6)
Sunday 18:00 LA  — OPS    Weekly digest preparation     (d6464d8b)
Monday 06:00 LA  — SCOUT  Weekly SERP check             (2efea558)
Monday 07:15 LA  — CHIEF  Weekly strategic planning     (83c482ed)  [shifted from 07:00 to avoid Monday briefing collision]
Wednesday 05:30 LA — SCOUT  Weekly changelog scrape     (7bca35d5)  [NEW]
Friday 06:00 LA  — SCOUT  Weekly Product Hunt scan      (ff3b3e6d)  [NEW]
Friday 10:00 LA  — OPS    Weekly refresh candidates     (ba7f89c6)
1st day 07:00 LA — CHIEF  Monthly audit                  (55787ff0)
```

## Full registry (17 active cron jobs)

| cron_id | agent | schedule | timezone | task |
|---|---|---|---|---|
| 145bd969-03af-4890-959f-a96aa559d32e | chief | `0 7 * * *` | LA | Daily morning briefing |
| 83c482ed-03c3-467a-a6e7-cb7a1f3ab2bf | chief | `15 7 * * 1` | LA | Weekly strategic planning (shifted from 07:00) |
| 55787ff0-b5f5-4b08-ba32-4b16c4e48ab0 | chief | `0 7 1 * *` | LA | Monthly audit |
| db2ed8be-dbf6-4fae-9cad-7f3c0c895853 | scout | `30 5 * * *` | LA | Daily RSS monitoring cycle |
| 30df8977-9919-4138-9f66-877011faa300 | scout | `30 5 * * *` | LA | Daily Reddit scan |
| 3b51684d-f78d-46e2-9d84-93e20193dea1 | scout | `0 6 * * *` | LA | Affiliate URL health check |
| da2266d6-a7b2-4f97-a9f2-034258f0f79d | scout | `0 6 * * 0` | LA | Weekly pricing scrape |
| 2efea558-2e77-4618-91c1-0e3ce4586772 | scout | `0 6 * * 1` | LA | Weekly SERP check |
| aa6382e2-0495-41c5-8bf9-2da0e1707820 | scout | `0 3 * * 0` | LA | Weekly memory cleanup (NEW) |
| 9705def8-cec0-49df-a819-4df3e1f31054 | scout | `30 3 * * 0` | LA | Weekly pattern distillation (NEW) |
| 7bca35d5-4b08-4d2d-ba2a-dc87ff2083b7 | scout | `30 5 * * 3` | LA | Weekly changelog scrape (NEW) |
| ff3b3e6d-73ba-41b9-bf6d-9b8746219963 | scout | `0 6 * * 5` | LA | Weekly Product Hunt scan (NEW) |
| c43a3ffb-71cf-4026-912b-cff79ca3dba0 | ops | `15 6 */2 * *` | LA | Site health check (every 2 days) |
| 93ee6dcd-c4e9-4350-a7c5-69492500314b | ops | `30 6 * * *` | LA | Daily metrics aggregation |
| d6464d8b-483d-48d3-9e0b-b0f1381e03a2 | ops | `0 18 * * 0` | LA | Weekly digest preparation |
| ba7f89c6-d390-4af1-9622-465805bca5db | ops | `0 10 * * 5` | LA | Weekly refresh candidates analysis |
| 6bdc51e1-498e-48a3-b40a-b37008aabb4b | ops | `0 18 * * *` | LA | Daily ops log distillation (NEW) |

## Changelog from initial snapshot

**Deleted (1):**
- `cb5abd3e-1f7c-4357-a130-6b48dd4a38c7` — `every: 900000ms` OPS poll cycle. Redundant with OPS AGENTS.md "Every session" check (steps 3-4 already pick up ops-requests + priorities on every existing wake).

**Modified (1):**
- `83c482ed-03c3-467a-a6e7-cb7a1f3ab2bf` — CHIEF weekly strategic. Schedule `0 7 * * 1` → `15 7 * * 1` (Monday 07:00 → 07:15 LA). Resolves collision with Daily 07:00 morning briefing on Mondays.

**Added (5):**
- `aa6382e2-0495-41c5-8bf9-2da0e1707820` — SCOUT Sun 03:00 LA weekly memory cleanup
- `9705def8-cec0-49df-a819-4df3e1f31054` — SCOUT Sun 03:30 LA weekly pattern distillation
- `7bca35d5-4b08-4d2d-ba2a-dc87ff2083b7` — SCOUT Wed 05:30 LA weekly changelog scrape
- `ff3b3e6d-73ba-41b9-bf6d-9b8746219963` — SCOUT Fri 06:00 LA weekly Product Hunt scan
- `6bdc51e1-498e-48a3-b40a-b37008aabb4b` — OPS Daily 18:00 LA daily ops log distillation

**Confirmed NOT added (5 phantom tasks documented in HEARTBEAT.md but intentionally skipped):**
- CHIEF every-30-min agent_logs poll (would be 48 wakes/day, low value vs cost)
- CHIEF Daily 14:00 LA afternoon check (covered by morning briefing + event-triggered alerts via critical-event criteria in HEARTBEAT.md)
- CHIEF Friday 14:00 LA week wrap-up (covered by Monday strategic planning retrospective)
- OPS Daily 08:00 LA task-packet generation (redundant — OPS Every-session step 3-4 already processes priorities/ops-requests on every wake)
- OPS Every-30-min after-publish poll (post-commit webhook handles publication detection; verified working in Phase 3 test 2026-05-26)

## Operating principle established

CHIEF→OPS handoff via priorities-WNN.md + ops-requests/ files is the
canonical mechanism. OPS picks them up via Every-session check (AGENTS.md
steps 3-4) on every scheduled wake — no dedicated poll cron needed.

OpenClaw `sessions_send` with `delivery.mode=announce` does NOT wake target
agent (Phase 3 finding). If real-time CHIEF→OPS handoff ever becomes
critical, investigate other OpenClaw delivery modes; until then the
calendar-aligned wakes are sufficient.

## Sequence dependency graph

Daily (weekday):
```
SCOUT 05:30 → OPS 06:30 → CHIEF 07:00
(signal collection → aggregation → synthesis + operator notification)
```

Weekly (Monday):
```
OPS Sun 18:00 weekly digest → CHIEF Mon 07:00 briefing →
SCOUT Mon 06:00 SERP check (overlaps with previous day's data) →
CHIEF Mon 07:15 strategic planning → writes priorities-WNN.md →
OPS Tue 06:30 daily metrics (Every-session check picks up priorities) →
OPS Tue 06:30 generates task packets to writer-queue/pending/
```

Weekly priorities → OPS pickup latency: ~23h 15min (CHIEF Mon 07:15 →
OPS Tue 06:30). Acceptable for content production; not a real-time loop.

## Outstanding workspace file alignment

After this cron registry change, workspace HEARTBEAT.md and AGENTS.md
files on Mac Mini need updates to match the new state (phantom tasks
removed, new tasks documented). Paste-ready content prepared separately
for operator to apply on Mac Mini, then repo audit copies in
`/agent-snapshots/<agent>/` refreshed.
