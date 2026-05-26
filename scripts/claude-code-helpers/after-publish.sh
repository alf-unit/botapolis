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
# Also recompute pending/done/archive counts since OPS auto-trigger isn't
# wired (Phase 3 finding 2026-05-26).
idx="writer-queue/index.md"
if [ -f "$idx" ]; then
  ts=$(date -u '+%Y-%m-%d')

  # Count actual files excluding .gitkeep and the optional _template.md
  count_files() {
    find "writer-queue/$1" -maxdepth 1 -type f -name '*.md' \
      ! -name '.gitkeep' ! -name '_template.md' 2>/dev/null | wc -l | tr -d ' '
  }
  pending_count=$(count_files pending)
  done_count=$(count_files done)
  archive_count=$(count_files archive)

  tmpfile=$(mktemp)
  awk -v entry="- $packet — $ts" \
      -v pending_n="$pending_count" \
      -v done_n="$done_count" \
      -v archive_n="$archive_count" '
    BEGIN { injected = 0; in_counts = 0 }
    {
      # Inject the new "Recently done" entry as the first list item.
      if (!injected && /^## Recently done/) {
        print
        getline blank; print blank
        injected = 1
        print entry
        next
      }
      # Rewrite the Counts block by replacing the three count lines.
      if (/^## Counts/) { in_counts = 1; print; next }
      if (in_counts && /^- pending:/)  { print "- pending: "  pending_n;  next }
      if (in_counts && /^- done:/)     { print "- done: "     done_n;     next }
      if (in_counts && /^- archive:/)  { print "- archive: "  archive_n;  next }
      if (in_counts && /^## /)         { in_counts = 0 }
      print
    }
  ' "$idx" > "$tmpfile" && mv "$tmpfile" "$idx"
  echo "[after-publish] updated $idx (counts: pending=$pending_count done=$done_count archive=$archive_count)"
fi

echo "[after-publish] done"
