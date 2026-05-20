#!/usr/bin/env sh
# ============================================================================
# after-publish — local-side housekeeping after Claude Code ships an article.
# ----------------------------------------------------------------------------
# Run this from the repo root right after `git push` succeeds. It:
#   1. Moves the corresponding writer-queue/pending/<packet>.md to /done/
#   2. Appends a one-liner to writer-queue/index.md "Recently done" section
#   3. Optionally pings OPS via agent_logs so the Mac Mini side knows the
#      operator has already done the housekeeping (saves OPS a poll cycle)
#
# The Supabase status flip is handled by the post-commit hook + the
# /api/agents/article-published route. This script is purely about the
# local writer-queue layout.
#
# Usage:
#   sh scripts/claude-code-helpers/after-publish.sh <packet-filename>
#   # e.g. sh scripts/claude-code-helpers/after-publish.sh 042-klaviyo-vs-mailchimp.md
#
# Pass --dry-run to preview without moving files.
# ============================================================================
set -e

packet="$1"
dry_run=""
if [ "$2" = "--dry-run" ] || [ "$1" = "--dry-run" ]; then
  dry_run=1
  if [ "$1" = "--dry-run" ]; then packet="$2"; fi
fi

if [ -z "$packet" ]; then
  echo "[after-publish] usage: $0 <packet-filename> [--dry-run]" >&2
  exit 1
fi

src="writer-queue/pending/$packet"
dst="writer-queue/done/$packet"

if [ ! -f "$src" ]; then
  echo "[after-publish] not found: $src" >&2
  echo "  (run from repo root; pass the bare filename, not a path)" >&2
  exit 1
fi

if [ -n "$dry_run" ]; then
  echo "[after-publish] would mv $src → $dst"
  exit 0
fi

mv "$src" "$dst"
echo "[after-publish] moved $packet → done/"

# Append to "Recently done (last 10)" section in writer-queue/index.md.
# We do this with awk to keep it idempotent on missing-section.
idx="writer-queue/index.md"
if [ -f "$idx" ]; then
  ts=$(date -u '+%Y-%m-%d')
  tmpfile=$(mktemp)
  awk -v entry="- $packet — $ts" '
    BEGIN { injected = 0 }
    {
      print
      if (!injected && /^## Recently done/) {
        # Skip the blank line and the optional placeholder paragraph, then
        # inject our entry as the new first list item.
        getline blank; print blank
        injected = 1
        print entry
      }
    }
  ' "$idx" > "$tmpfile" && mv "$tmpfile" "$idx"
  echo "[after-publish] updated $idx"
fi

echo "[after-publish] done"
