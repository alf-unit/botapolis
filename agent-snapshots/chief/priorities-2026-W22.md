# OPS Priorities — 2026-W22 (updated 2026-05-27)

Owner: CHIEF (this revision: CLAUDE_CODE-as-CHIEF fallback after writer-queue-gap incident 2026-05-27 22:37 LA)
Date: 2026-05-27 (originally drafted 2026-05-25)
Publishing cap: 4/day from system_config.publishing_rate_daily
Practical target: 4 packets in pending at all times (daily refresh)
Focus clusters: klaviyo, reviews-ugc

## Background — why this revision

Owner escalated 2026-05-27 22:37 LA: writer-queue was empty (only .gitkeep) for the daily-4-pickup window despite publishing_rate_daily=4 having been set since 2026-05-20. Earlier W22 priorities (fraud-chargebacks, payment-risk, klaviyo refresh, gorgias refresh) were:
- 2 executed (klaviyo refresh = packet 002, gorgias refresh = packet 004), packets moved to /done/ on 2026-05-27.
- 2 deferred (fraud-chargebacks, payment-risk) — blocked on missing tools-table research and absent fraud/payment cluster entries in semantic_core_entries top-15.

Result: pipeline silently went idle for ~36 hours. Owner forced re-prioritization to top semantic_core_entries by priority_score.

## Packet Queue Request (revised 2026-05-27)

Sourced from `semantic_core_entries` top-4 by `priority_score` (`status='queued'`, `language='en'`).

1. **klaviyo pricing** (cluster: klaviyo, template: pricing, priority_score 514)
   - semantic_core_entry_id: f056fa3a-51c8-494e-aebd-1ad403d57ce1
   - content_angle: "The $140–$200 Customer Agent jump on April 1 2026 and which 3 features actually justify it"
   - Research coverage: PARTIAL — uses existing `/research/2026-05-26-klaviyo-vs-mailchimp.md` (covers Klaviyo pricing tiers + Customer Agent intro $140/mo / regular $200/mo on lines 197-198). Writer verifies Customer Agent features on klaviyo.com/pricing 2026-05-27.
   - Packet: `writer-queue/pending/005-klaviyo-pricing.md` (ready-to-write)
   - Priority: P0

2. **loox vs judge me** (cluster: reviews-ugc, template: vs-comparison, priority_score 420)
   - semantic_core_entry_id: 3aa82cf8-7ec1-4eb3-b098-e60ba6360027
   - content_angle: "7% vs 2-3% submission-rate honest test (Loox's claim audited)"
   - Research coverage: NONE — reviews-ugc cluster has no research file.
   - Packet: `writer-queue/pending/006-loox-vs-judge-me.md` (research-blocked; Block B paste-ready prompt inside)
   - Priority: P0

3. **klaviyo vs omnisend** (cluster: klaviyo, template: vs-comparison, priority_score 375)
   - semantic_core_entry_id: 8d081763-c962-4a91-9464-b83226ae8c73
   - content_angle: "Where Omnisend's MCP/ChatGPT integration genuinely wins for sub-25k lists"
   - Research coverage: PARTIAL — Klaviyo side fully covered by existing `/research/2026-05-26-klaviyo-vs-mailchimp.md`. Omnisend side: vendor's own pricing page + features page visited by writer on 2026-05-27, plus competing-ESP analyses cited in research source list.
   - Packet: `writer-queue/pending/007-klaviyo-vs-omnisend.md` (ready-to-write with verify-on-visit requirements)
   - Priority: P1

4. **judge me review** (cluster: reviews-ugc, template: review, priority_score 343)
   - semantic_core_entry_id: db0b9d0b-28b8-4b1e-97e9-4f9cd01f816b
   - content_angle: "The free forever math vs Loox $12.99 at $200k+ GMV"
   - Research coverage: NONE — SHARES research file with packet 006 (one Deep Research session unblocks both).
   - Packet: `writer-queue/pending/008-judge-me-review.md` (research-blocked; reuses Block B from packet 006)
   - Priority: P1

## Research dependency — IMPORTANT for owner

This revision exposes a missed CHIEF step: when selecting themes, CHIEF must also verify cluster research coverage and EMIT a research_request to operator (Block A + Block B) for any cluster without research. Today CHIEF picked 4 themes but did not initiate research_request for reviews-ugc cluster, so packets 006 + 008 are research-blocked.

**Owner action required (one Web Chat session, ~45-60 min):**
- Copy Block B from `writer-queue/pending/006-loox-vs-judge-me.md` (or this packet's text below) into Claude.ai Web Chat (Deep Research mode).
- Save output to `/research/2026-MM-DD-reviews-ugc-loox-judge-me.md` (today's date).
- Reply in Telegram: `research ready: 2026-MM-DD-reviews-ugc-loox-judge-me.md`.
- Both packets 006 + 008 unblock.

## Constraints

- Do not exceed 4 pending packets daily until research backlog catches up.
- Every packet must have research_file frontmatter pointing at a real file in `/research/` OR be marked `status: research_blocked` with Block B prompt inside.
- Include human-readable opportunity names; never raw UUIDs in Telegram briefings.
- Tie each packet to a monetizable tool/category (handled — see tool affiliate_routes in each packet).

## Known Blockers for OPS (carried from earlier W22 draft)

- `tools` table lacks pricing_url, pricing_css_selectors, pricing_data; pricing scrape cannot persist structured data.
- `tools` table lacks affiliate_health_checked_at; affiliate check timestamps cannot be updated.
- Current performance_snapshots lack sessions/pageviews/top_pages, so page-level refresh prioritization is unavailable.

## What changed in this revision (2026-05-27 22:55 LA)

- Replaced 4 stale themes (2 already executed, 2 blocked) with 4 top-priority queued from semantic_core.
- Linked existing research to 2 packets where it covers the angle.
- Flagged 2 packets research-blocked with paste-ready Web Chat prompts inside.
- Reduced "practical target" from 7/week to 4 packets at all times (daily refresh model, not weekly batch).
- Added research-dependency call-out for CHIEF: theme selection must be paired with research_request emission per cluster.
