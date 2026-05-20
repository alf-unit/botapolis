# Semantic Core

The 427-keyword core that drives botapolis content production. This folder
holds the canonical CSV, an exclusions list, and operator notes. The
`semantic_core_entries` Supabase table is the runtime version — agents read
and write status there, not in the CSV.

## Files

- `full-core.csv` — canonical source. Headers must match the schema below.
- `exclusions.md` — keywords/topics deliberately not pursued, with reason.
- This README.

## CSV schema

| column | type | required | notes |
| --- | --- | --- | --- |
| `cluster` | string | yes | Top-level grouping, e.g. `klaviyo`, `gorgias`, `shopify-sidekick`. Lowercase, hyphenated. |
| `template` | enum | yes | One of: `review`, `vs-comparison`, `alternatives`, `how-to`, `guide`, `pricing`, `best-for-segment`, `news`. |
| `keyword` | string | yes | The literal search phrase. Lowercase. Unique across the CSV. |
| `search_intent` | enum | yes | `transactional` \| `commercial-investigation` \| `informational`. |
| `volume_estimate` | integer | no | Monthly search volume estimate (any source). |
| `difficulty` | integer | no | 0–100 (Ahrefs KD-style). |
| `priority_score` | integer | no | Internal score — relative ranking, not a strict 0–100 scale. The May 2026 seed core uses a `volume × intent × cluster-strategic-weight` formula that goes up to ~600 for the highest-leverage entries (e.g. `klaviyo review` = 583). CHIEF normalizes / rescales as it sees fit; importer accepts whatever's in CSV. |
| `content_angle` | string | no | The unique angle this article should take. |
| `content_gap` | string | no | What the top-10 SERP results miss. |
| `competitors_top3` | JSON | no | `[{"url":"...","dr":78,"angle":"listicle"}, ...]`. The importer parses JSON; broken JSON skips the row. |
| `notes` | string | no | Free-form. Verbatim quotes welcome — they survive into Supabase. |
| `language` | enum | no | Defaults to `en`. Use `ru` for RU-originals (not translations of EN). |

## Importing into Supabase

```bash
npm run import:semantic-core
```

What it does:
1. Reads `semantic-core/full-core.csv`.
2. Parses each row per the schema above.
3. Upserts into `semantic_core_entries` keyed by `keyword`.
4. Rows that already exist are updated; status is left untouched (so an
   in-flight article isn't bumped back to `queued`).
5. New rows land with `status='queued'` and `queued_at=now()`.

The CSV is source-of-truth for the *core*; Supabase is source-of-truth for
*workflow state*. Don't try to round-trip status back into the CSV.

## Editing the CSV

- Keep one row per keyword.
- Don't reorder existing rows; the importer is keyed on `keyword`, not row
  number, but humans diff files line-by-line.
- Use double-quoted fields for any cell containing commas or newlines.
- Commit changes with a one-line message describing what you added/changed
  (importer reads from main branch on Vercel for nightly sync if enabled).

## Excluding a keyword

Add it to `exclusions.md` with a one-line reason. The importer will skip
any keyword listed there even if it appears in the CSV. This avoids the
"delete and forget" pattern where the same bad keyword keeps getting
re-added.
