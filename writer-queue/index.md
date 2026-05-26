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

1. `pending/004-gorgias-review-refresh.md` — gorgias review refresh — gorgias — target 2026-05-28
2. `pending/002-klaviyo-review-refresh.md` — klaviyo review refresh — klaviyo — target TBD

## In progress

<!-- Articles currently being drafted by Claude Code. -->

_None._

## Recently done (last 10)

- 003-klaviyo-vs-mailchimp.md — 2026-05-26
- 001-skio-to-loop-migration.md — 2026-05-20
<!-- OPS appends here when moving a packet to done/. Most recent first. -->

---

## Counts

- pending: 2
- done: 2
- archive: 0

_Updated by after-publish.sh on each packet move (formerly OPS-managed; see Phase 3 finding 2026-05-26)._
