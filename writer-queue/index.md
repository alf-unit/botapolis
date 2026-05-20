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

_Queue not yet populated. OPS will write the first batch once
`/agent-snapshots/chief/priorities-YYYY-WNN.md` is published._

## In progress

<!-- Articles currently being drafted by Claude Code. -->

_None._

## Recently done (last 10)

- 001-skio-to-loop-migration.md — 2026-05-20
<!-- OPS appends here when moving a packet to done/. Most recent first. -->

_Nothing published yet._

---

## Counts

- pending: 0
- done: 0
- archive: 0

_Updated by OPS on each queue refresh._
