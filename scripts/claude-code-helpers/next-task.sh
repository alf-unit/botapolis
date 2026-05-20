#!/usr/bin/env sh
# ============================================================================
# next-task — show the next writer-queue packet Claude Code should pick up.
# ----------------------------------------------------------------------------
# Picks the lexicographically-smallest file under writer-queue/pending/
# (packet IDs are zero-padded — "001-..." sorts before "010-...") and
# prints it to stdout. If pending/ is empty, exits 1 with a hint.
#
# Usage:
#   sh scripts/claude-code-helpers/next-task.sh
#   sh scripts/claude-code-helpers/next-task.sh --path-only   # just the filename
# ============================================================================
set -e

queue_dir="writer-queue/pending"
if [ ! -d "$queue_dir" ]; then
  echo "[next-task] $queue_dir/ does not exist — repo not initialized yet?" >&2
  exit 1
fi

next=$(find "$queue_dir" -maxdepth 1 -type f -name '*.md' ! -name '_template.md' ! -name '.gitkeep' \
  | sort | head -n1)

if [ -z "$next" ]; then
  echo "[next-task] queue empty — ping CHIEF in Telegram: 'queue empty — assign next priorities'" >&2
  exit 1
fi

if [ "$1" = "--path-only" ]; then
  echo "$next"
  exit 0
fi

echo "# Next task: $next"
echo
cat "$next"
