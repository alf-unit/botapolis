# OPS request — restore daily 4-article writer queue

Date: 2026-05-27 America/Los_Angeles
Owner: CHIEF
Severity: error

## Problem
`system_config.publishing_rate_daily` is 4, but GitHub `writer-queue/pending/` currently contains only `.gitkeep`.
`writer-queue/index.md` is stale: it lists `pending/004-gorgias-review-refresh.md` and `pending/002-klaviyo-review-refresh.md`, while both packets are already in `writer-queue/done/` and pending count is 0.

This breaks the operator requirement that the writer receives 4 article tasks every day.

## Required outcome
Prepare 4 writer packets for 2026-05-28 and regenerate `writer-queue/index.md` so `pending` count and Next up match actual files.

## Priority packet candidates
Use these semantic core entries unless blocked by missing research:

1. `klaviyo pricing`
   - semantic_core_entry_id: `f056fa3a-51c8-494e-aebd-1ad403d57ce1`
   - cluster: `klaviyo`
   - template: `pricing`
   - score: 514
   - angle: The $140-$200 Customer Agent jump on April 1 2026 and which 3 features actually justify it

2. `loox vs judge me`
   - semantic_core_entry_id: `3aa82cf8-7ec1-4eb3-b098-e60ba6360027`
   - cluster: `reviews-ugc`
   - template: `vs-comparison`
   - score: 420
   - angle: 7% vs 2-3% submission-rate honest test (Loox's claim audited)

3. `klaviyo vs omnisend`
   - semantic_core_entry_id: `8d081763-c962-4a91-9464-b83226ae8c73`
   - cluster: `klaviyo`
   - template: `vs-comparison`
   - score: 375
   - angle: Where Omnisend's MCP/ChatGPT integration genuinely wins for sub-25k lists

4. `judge me review`
   - semantic_core_entry_id: `db0b9d0b-28b8-4b1e-97e9-4f9cd01f816b`
   - cluster: `reviews-ugc`
   - template: `review`
   - score: 343
   - angle: The free forever math vs Loox $12.99 at $200k+ GMV

## Process fix needed
Daily 07:00 CHIEF briefing must not only report queue state. It must verify there are 4 real non-hidden pending packets for the current publish day. If fewer than 4 exist, CHIEF should create an OPS request/priorities file immediately and tell the operator the queue is short.
