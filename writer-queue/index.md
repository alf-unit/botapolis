# Writer Queue — Index

Single source of truth for what Claude Code should write next. Generated/
maintained by OPS; do not hand-edit unless you know what you're doing.

## How to use this file

1. Open the top entry under **Next up**.
2. `cat writer-queue/pending/<filename>` — that's your full brief.
3. Write the article into the `output_path` specified in the packet.
4. Commit + push. OPS moves the packet to `done/` and updates Supabase.

If the queue is empty, ping CHIEF in Telegram: "queue empty — assign next priorities".

---

## Next up

<!-- OPS regenerates this section. Format:
1. `priority/NNN-slug.md` — primary keyword — cluster — target YYYY-MM-DD
-->

1. `pending/005-klaviyo-pricing.md` — klaviyo pricing — klaviyo — target 2026-05-28 — **ready-to-write** (research linked)
2. `pending/007-klaviyo-vs-omnisend.md` — klaviyo vs omnisend — klaviyo — target 2026-05-29 — **ready-to-write** (research linked, Klaviyo side covered; verify Omnisend pricing on 2026-05-27)
3. `pending/006-loox-vs-judge-me.md` — loox vs judge me — reviews-ugc — target 2026-05-30 — **research-blocked** (Block B paste-ready prompt inside packet; one research unblocks 006 + 008)
4. `pending/008-judge-me-review.md` — judge me review — reviews-ugc — target 2026-05-30 — **research-blocked** (shares research with 006)

## In progress

<!-- Articles currently being drafted by Claude Code. -->

_None._

## Recently done (last 10)

- 002-klaviyo-review-refresh.md — 2026-05-27
- 004-gorgias-review-refresh.md — 2026-05-27
- 003-klaviyo-vs-mailchimp.md — 2026-05-26
- 001-skio-to-loop-migration.md — 2026-05-20
<!-- OPS appends here when moving a packet to done/. Most recent first. -->

---

## Counts

- pending: 4
- done: 4
- archive: 0

_Updated by after-publish.sh on each packet move (formerly OPS-managed; see Phase 3 finding 2026-05-26)._
