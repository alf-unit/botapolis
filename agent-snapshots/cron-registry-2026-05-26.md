# OpenClaw Cron Registry — Snapshot 2026-05-26

Captured by CHIEF via OpenClaw cron API dump (agent_log id=1f6028d8-83c8-4048-b923-1a92c3145b9d).

This is a read-only audit of the runtime cron registry across all 3 agents
(CHIEF/SCOUT/OPS) at the time of capture. Source of truth is OpenClaw's
internal cron registry on the Mac Mini.

Captures runtime REALITY, not the FINAL-ARCHITECTURE-V4.md spec — they
diverge significantly. Owner has been iterating on the design since
agents went live 2026-05-21.

## Daily timeline (weekday)

```
05:30 LA — SCOUT  RSS monitoring cycle           (db2ed8be)
05:30 LA — SCOUT  Reddit daily scan              (30df8977)  [same time as RSS]
06:00 LA — SCOUT  Affiliate URL health check     (3b51684d)
06:15 LA — OPS    Site health check (every 2d)   (c43a3ffb)
06:30 LA — OPS    Daily metrics aggregation      (93ee6dcd)
07:00 LA — CHIEF  Morning briefing to operator   (145bd969)
```

Sequence is intentional: SCOUT scrapes signals → OPS aggregates → CHIEF
synthesizes + notifies operator. 90-minute window 05:30 → 07:00 LA.

## Weekly anchors

```
Sunday 06:00 LA — SCOUT  Weekly pricing scrape           (da2266d6)
Sunday 18:00 LA — OPS    Weekly digest preparation       (d6464d8b)
Monday 06:00 LA — SCOUT  Weekly SERP check               (2efea558)
Monday 07:00 LA — CHIEF  Weekly strategic planning       (83c482ed)
Friday 10:00 LA — OPS    Weekly refresh candidates       (ba7f89c6)
1st day 07:00 LA — CHIEF Monthly audit                    (55787ff0)
```

## Outlier — added 2026-05-26 (Phase 3 test, to be removed)

```
every 15min — OPS  Poll cycle for ops-requests + priorities  (cb5abd3e)
```

No timezone (raw `everyMs=900000`). Added during Phase 3 test to close
CHIEF→OPS auto-trigger gap. After analysis with owner: redundant —
should be replaced with "Every session" check inside existing OPS wakeups
(daily metrics, site health, weekly tasks). Pending deletion.

## Full registry (verbatim from dump)

| cron_id | agent | schedule | timezone | payload preview |
|---|---|---|---|---|
| 145bd969-03af-4890-959f-a96aa559d32e | chief | `0 7 * * *` | America/Los_Angeles | Daily morning briefing |
| 83c482ed-03c3-467a-a6e7-cb7a1f3ab2bf | chief | `0 7 * * 1` | America/Los_Angeles | Weekly strategic planning |
| 55787ff0-b5f5-4b08-ba32-4b16c4e48ab0 | chief | `0 7 1 * *` | America/Los_Angeles | Monthly audit |
| db2ed8be-dbf6-4fae-9cad-7f3c0c895853 | scout | `30 5 * * *` | America/Los_Angeles | Daily RSS monitoring cycle |
| 30df8977-9919-4138-9f66-877011faa300 | scout | `30 5 * * *` | America/Los_Angeles | Daily Reddit scan |
| 3b51684d-f78d-46e2-9d84-93e20193dea1 | scout | `0 6 * * *` | America/Los_Angeles | Affiliate URL health check |
| da2266d6-a7b2-4f97-a9f2-034258f0f79d | scout | `0 6 * * 0` | America/Los_Angeles | Weekly pricing scrape |
| 2efea558-2e77-4618-91c1-0e3ce4586772 | scout | `0 6 * * 1` | America/Los_Angeles | Weekly SERP check |
| cb5abd3e-1f7c-4357-a130-6b48dd4a38c7 | ops | `every: 900000ms` | _(null)_ | Poll cycle for ops-requests + priorities |
| c43a3ffb-71cf-4026-912b-cff79ca3dba0 | ops | `15 6 */2 * *` | America/Los_Angeles | Site health check (every 2 days) |
| 93ee6dcd-c4e9-4350-a7c5-69492500314b | ops | `30 6 * * *` | America/Los_Angeles | Daily metrics aggregation |
| d6464d8b-483d-48d3-9e0b-b0f1381e03a2 | ops | `0 18 * * 0` | America/Los_Angeles | Weekly digest preparation |
| ba7f89c6-d390-4af1-9622-465805bca5db | ops | `0 10 * * 5` | America/Los_Angeles | Weekly refresh candidates analysis |

## Drift from FINAL-ARCHITECTURE-V4.md spec

Spec said (Часть 3):

- SCOUT RSS — **every 4 hours** (spec) vs **daily 05:30 LA** (runtime). 6x reduction in frequency. Sensible — RSS volume from 17 verified feeds doesn't justify 4h cycle.
- SCOUT Reddit — daily 10:00 UTC (spec) vs daily 05:30 LA (runtime). Both daily, time-shifted to LA.
- SCOUT SERP check — Monday 04:00 UTC (spec) vs Monday 06:00 LA (runtime). Time-shifted.
- SCOUT pricing scrape — Sunday 04:00 UTC (spec) vs Sunday 06:00 LA (runtime). Time-shifted.
- SCOUT Product Hunt scan — Friday 04:00 UTC (spec) — **NOT in runtime registry**. Dropped or pending.
- SCOUT vendor news roundup — 16:00 UTC daily (spec) — **NOT in runtime registry**. Dropped or pending.
- SCOUT memory cleanup + distillation — Sunday 03:00/03:30 UTC (spec) — **NOT in runtime registry**.
- OPS site health — **every hour** (spec) vs **every 2 days 06:15 LA** (runtime). Major reduction. Owner has clearly decided site is stable enough that hourly check is overkill.
- OPS daily metrics — 06:00 UTC (spec) vs 06:30 LA (runtime). Time-shifted.
- OPS after-publish processing — daily 08:00 UTC (spec) — **NOT in runtime registry**. Could be folded into Every-session check OR dropped.
- OPS daily ops log distillation — 18:00 UTC (spec) — **NOT in runtime registry**.
- OPS weekly digest — Sunday 18:00 UTC (spec) vs Sunday 18:00 LA (runtime). Time-shifted.
- OPS refresh candidates — Friday 10:00 UTC (spec) vs Friday 10:00 LA (runtime). Time-shifted.

All 3 agents — model drift: spec said Sonnet 4.6 / Haiku 4.5 mix. Runtime: all on `openai/gpt-5.5` per owner 2026-05-26.

All times — timezone drift: spec said UTC. Runtime: America/Los_Angeles. Owner explicitly stated this is the right choice and spec is wrong on TZ.

## Key observations for cron-architecture review

1. **Daily sequence is intentional + clean.** SCOUT (signals) → OPS (aggregation) → CHIEF (synthesis) at 05:30 → 06:30 → 07:00 LA. No overlap, dependencies respected.

2. **SCOUT RSS and Reddit at the same minute** (both 05:30 LA). Either parallel-run intentional batching, or accidental overlap — depends on whether OpenClaw can run two cron jobs for the same agent simultaneously. Worth confirming in workspace AGENTS.md.

3. **OPS does NOT wake between 06:30 LA and next 06:30 LA** (except weekly anchors). Any CHIEF→OPS ops-request written between those times waits ~24h to be picked up if OPS uses "Every session" check pattern. May or may not be acceptable.

4. **Weekly priorities sequencing:** CHIEF writes weekly priorities Monday 07:00 LA. Next OPS wake is Tuesday 06:30 LA daily metrics = ~23.5h latency. If we want OPS to act on fresh priorities within hours, need to add an OPS Monday wake AFTER CHIEF's 07:00. Otherwise daily pickup is fine.

5. **15-min OPS poll is the only sub-daily wake outside the existing pattern.** Removing it returns OPS to a clean calendar-aligned schedule.

6. **No timezone on the 15-min cron.** Inconsistent with rest of registry. Confirms it was added quick-and-dirty during Phase 3 test (by Claude Code's instruction to CHIEF, not by owner's own design).
