#!/usr/bin/env sh
# ============================================================================
# current-queue — summary of the writer queue (pending + done counts).
# ----------------------------------------------------------------------------
# Use this before starting a Claude Code session to see the workload.
#
# Usage:
#   sh scripts/claude-code-helpers/current-queue.sh
#   sh scripts/claude-code-helpers/current-queue.sh --names   # list filenames
# ============================================================================
set -e

count_packets() {
  # -name '*.md' but exclude _template.md and .gitkeep
  find "$1" -maxdepth 1 -type f -name '*.md' \
    ! -name '_template.md' ! -name '.gitkeep' 2>/dev/null \
    | wc -l | tr -d ' '
}

pending=$(count_packets writer-queue/pending)
done_n=$(count_packets writer-queue/done)
archive=$(count_packets writer-queue/archive)

echo "writer-queue summary"
echo "  pending: $pending"
echo "  done:    $done_n"
echo "  archive: $archive"
echo

if [ "$1" = "--names" ]; then
  echo "pending:"
  find writer-queue/pending -maxdepth 1 -type f -name '*.md' \
    ! -name '_template.md' ! -name '.gitkeep' 2>/dev/null \
    | sort | sed 's|^|  |'
  echo
fi

if [ "$pending" = "0" ]; then
  echo "queue empty — ping CHIEF in Telegram: 'queue empty — assign next priorities'"
fi
