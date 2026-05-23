# Infrastructure session log

Append-only diary of multi-agent infrastructure work — Phase 1 setup, Phase 2/3 hand-offs, schema migrations, post-mortems on quirks. Newest entries on top. One block per session, separated by `---`. Owner: operator + Claude Code.

---

## 2026-05-20 — Phase 1 setup + tools migration + validate-infra fix

### Commits

- [`e53b954`](https://github.com/alf-unit/botapolis/commit/e53b9544388351d3f797111f1e36aac136c13b2f) — feat(multi-agent): Phase 1 infra for CHIEF/SCOUT/OPS pipeline (40 files, +2303)
- [`01776b5`](https://github.com/alf-unit/botapolis/commit/01776b5cb30ce0050381f27fde4172112bf11a96) — feat(semantic-core): seed 101 entries from May 2026 Deep Research report
- [`2bda175`](https://github.com/alf-unit/botapolis/commit/2bda175ee7c46d1bb085fe15ee0cacaa68b3c683) — feat(infra): validate:infra script + expanded configs + pipeline reference artifacts (8 files, +1502)
- [`7e71a0c`](https://github.com/alf-unit/botapolis/commit/7e71a0c3859ffdb38d6661ea1218046bbc6130cc) — feat(tools): add Loop Subscriptions and Skio (migration 009 + seed.sql)
- [`7487e0e`](https://github.com/alf-unit/botapolis/commit/7487e0e22141cb190cca521046cb747f93de62db) — content(guides): add Skio→Loop migration how-to (cluster anchor)
- [`03e6031`](https://github.com/alf-unit/botapolis/commit/03e603182d01d2d4444a99381ecbf384b0859f8a) — chore(writer-queue): move 001-skio-to-loop-migration to done/
- [`d3af1cf`](https://github.com/alf-unit/botapolis/commit/d3af1cf52cd8702ad4c483b7af755944bd71c24a) — fix(scripts): use literal union for table names in validate-infra

### Task

Stand up the repo-side scaffolding for the FINAL-ARCHITECTURE-V4 multi-agent system (CHIEF + SCOUT + OPS) so that, by end of session, operator can move on to Phase 2 (OpenClaw on Mac Mini) without any open repo-side blockers.

### Done

- **Phase 1 scaffolding (commit `e53b954`)** — folder structure (`research/`, `writer-queue/{pending,done,archive}/`, `content-templates/`, `semantic-core/`, `agent-snapshots/{chief/{scout-requests,ops-requests},scout,ops}/`, `config/`); missing content locale trees (`content/{comparisons,alternatives,news,best}/{en,ru}/`); Supabase migration 008 (5 multi-agent tables with RLS, CHECK constraints, status_changed_at trigger, seeded `system_config`); TS types extended in `lib/supabase/types.ts`; 5 content templates + research template + writer-queue template & index; configs (`vendor-feeds.json`, `partner-list.json`, `banned-phrases.json`); `scripts/import-semantic-core.ts` + npm scripts; `/api/agents/article-published` route (REVALIDATE_SECRET, timing-safe); `.husky/post-commit` hook + mirror in `scripts/git-hooks/`; Claude Code helper scripts; `CLAUDE.md` updated with Content workflow + Quality gates sections.

- **Semantic core seed (commit `01776b5`)** — 79 explicit keywords from May 2026 Deep Research report + 21 programmatic patterns + 1 narrow entry (`postscript shopper vs klaviyo customer agent`) added later for emerging-AI-agent BFCM angle = **101 entries** in `semantic_core_entries`, all `status='queued'`. `content_angle` + `content_gap` populated on every row. Aliases appended to 4 entries' `notes` so operator's prose-formulation queries find existing entries.

- **Phase 1.5 reference artifacts (commit `2bda175`)** — `scripts/validate-infra.ts` + `npm run validate:infra` (sanity walk over dirs/files/JSON/CSV/DB/endpoint/hooks, exit 0/1/2); `config/vendor-feeds.json` 4 → 39 entries; `config/partner-list.json` 2 → 15 entries; `research/_example-format.md` (annotated reference for Web Chat); 2 live writer-queue packets (`001-skio-to-loop-migration`, `002-klaviyo-review-refresh`).

- **End-to-end test, partial (commits `7e71a0c`, `7487e0e`, `03e6031`)** — Operator unblocked packet 001's data dependency by writing migration 009 (Loop + Skio in `tools`), then shipped the article through Path B (vendor docs + Recharge Supabase data + WebFetch Loop pricing), then moved the packet from `pending/` to `done/`. Cluster anchor for `recharge-skio-acquisition` is live: `content/guides/en/how-to-migrate-skio-to-loop.mdx`. This validates the full pipeline end-to-end *minus the live OpenClaw agents* — Path B (manual operator) confirmed every link in the chain works (writer-queue → article → commit → post-commit hook → Supabase status flip → revalidate).

### Discovered (quirks / gotchas)

- **`@ts-expect-error` is a deploy-blocker under Vercel strict TS.** I used it in `validate-infra.ts` as a quick way to call `supabase.from(<string>)` with a non-literal table name. Local `tsc --noEmit` passed because Supabase's Database union accepted the typed call at the time. On Vercel (strict mode), the directive became "unused directive" → build failure. Builds failed *silently* — three subsequent pushes (`2bda175`, `7e71a0c`, `7487e0e`) never deployed until `d3af1cf` fixed the typing.

- **`@ts-expect-error` ≠ "skip checking this line".** It asserts that an error WILL be reported. When the underlying type resolves to "no error", the directive itself becomes the error. Don't reach for it as a shortcut — solve the typing.

- **Vercel build status is not surfaced in `git push` output.** A failed deploy doesn't fail the push. Operator needs to actively check Vercel dashboard OR the validate:infra endpoint probe (which only catches reach-ability, not stale revisions). Worth a follow-up: add a `last_deployed_sha` check to validate:infra.

- **Source `semantic_core.md` had heavy UTF-8 mojibake** (`â` for em-dash, `â¦` for `…`, `Ã—` for `×`). Pasted through Claude Code, decoded into CSV cleanly only after manual translation pass.

- **Source report used template values not in the migration 008 CHECK enum** — `listicle` and `calculator`. `listicle` mapped to `best-for-segment` (semantically equivalent for "best X for shopify"). `calculator` excluded entirely (existing site tools, not article production pipeline) — added to `semantic-core/exclusions.md`.

- **Report claimed 427 keywords but the explicit table held only ~79.** "Generate programmatically" pattern note in the report unblocks the remaining ~340 long-tail entries; chose Variant 1 (stay at 101 quality entries vs. inflate with placeholders) per operator decision.

- **`priority_score` schema said 0-100, source report went up to 583.** No CHECK constraint on the column. Kept raw report values (relative ranking preserved); updated `semantic-core/README.md` to drop the "0-100" claim.

- **Husky 9 hooks don't need executable bit** — `.husky/_/` wrappers source the user hooks rather than exec them. But `scripts/git-hooks/post-commit.sh` (standalone mirror for bare Mac Mini clones) DOES need exec bit. `git update-index --chmod=+x` set it in the index.

- **Windows `git add` warns "LF will be replaced by CRLF"** for every text file modified. Cosmetic — `core.autocrlf=true` is the team setting, files stay LF on disk and in repo, CRLF only in working copy when checked out on Windows.

- **`Loop Subscriptions` and `Skio` not in `tools` table** was the gap that nearly blocked packet 001. I flagged it in the packet's "data dependencies" section — operator fixed via migration 009. Lesson: writer-queue packets must explicitly call out missing entity data, not assume the writer will catch it.

- **Aliasing keyword-formulations via `notes` works for human/operator search but NOT for `keyword` UNIQUE constraint matching.** Top-12 strategic publish list from the report's prose section had 4 names that didn't exact-match the report's table-form keywords. Resolved by appending ` | Also searchable as: <prose form>` to `notes`. CHIEF dedup logic still uses the table `keyword` column.

### Fixes (what + why)

- **Validate-infra TS fix (`d3af1cf`)** — replaced `@ts-expect-error` over `supabase.from(<string>)` with an `as const` literal-tuple of table names. Pros: type-safe (compiler verifies every name is a valid table), no comment directives, Vercel-build-safe.

- **Migration 009 (`7e71a0c`)** — added Loop Subscriptions (status='published', affiliate_url=NULL) and Skio (status='archived') to `public.tools`. Both included in `seed.sql` for reproducible fresh-environment setup. Loop's `/go/loop-subscriptions` falls back to `website_url` until Loop Partner Program approval; Skio's `/go/skio` deliberately routes to `/tools` page (no traffic to a sunsetting platform).

- **`scripts/git-hooks/post-commit.sh` exec bit in git index** — `git update-index --chmod=+x` to set 100755 so Mac Mini bare-clone setup that symlinks the file into `.git/hooks/` gets a working hook without manual `chmod`.

- **Top-12 strategic prose-name aliases** — appended ` | Also searchable as: <prose form>` to 4 entries (`skio acquisition recharge`, `loop vs recharge 2026`, `postscript vs klaviyo sms`, `gorgias review`) + INSERT 1 narrow entry (`postscript shopper vs klaviyo customer agent`, priority_score 257) to capture the emerging-AI-agent angle distinct from the broader SMS comparison. Same edits in both CSV and DB so `npm run import:semantic-core` re-runs are idempotent.

- **`semantic-core/README.md` priority_score note** — clarified that the May 2026 seed uses a `volume × intent × cluster-weight` formula up to ~600, not a strict 0–100. CHIEF normalizes as needed.

### Open follow-ups

- **Phase 2 — Mac Mini side (operator)** — install OpenClaw; create 3 workspaces (`~/.openclaw/agents/{chief,scout,ops}/workspace/`) with SOUL/IDENTITY/AGENTS/USER/TOOLS/HEARTBEAT/MEMORY files; 3 private repos for workspace backups; `~/.openclaw/credentials/` (OpenRouter, Supabase service_role, GitHub PAT, Telegram bot, GSC, Plausible, PostHog, Beehiiv, Vercel); Telegram bot via @BotFather → populate `system_config.telegram_chat_id`.

- **Phase 3 — end-to-end test with live agents** — repo side proved out via Path B (operator-driven 001 article). Once agents are live, prove the same with CHIEF → research request → Web Chat Deep Research → OPS packet → Claude Code article.

- **35 RSS feeds in `vendor-feeds.json` need verification** — currently `tracked: false` per entry. Operator should walk through `verification_protocol` section before SCOUT goes live (otherwise SCOUT spends cycles on 404s).

- **15 partners in `partner-list.json` are `status='pending_approval'`** — sign at least the critical/high-priority ones (Shopify Partner Program, Klaviyo, Gorgias, Tidio, Postscript, Recharge, ManyChat) before serious traffic ramp.

- **Loop affiliate_url stays NULL until Loop Partner Program approves botapolis** — meanwhile `/go/loop-subscriptions` falls back to `website_url` (still loses attribution, but not broken).

- **Packet 002 (klaviyo-review-refresh) still in `writer-queue/pending/`** — surgical refresh of the existing klaviyo-review-2026 article. Light dependency: just the latest klaviyo.com/pricing snapshot.

- **Vercel deploy status not visible in validate:infra** — only the endpoint reach test runs against prod. Add a `last_deployed_sha` query (Vercel API) to catch silent build failures earlier.

- **Semantic core expansion 101 → ~427** — programmatic pSEO long-tail per the source report's pattern note. Best done after 30-60 days of GSC data and SCOUT opportunity detection, not preemptively (avoids placeholder rot).

---

## 2026-05-22 — SCOUT unblocked: migration 010 + AGENTS.md write contract

### Commits

- [`8ee09b1`](https://github.com/alf-unit/botapolis/commit/8ee09b1) — feat(supabase): migration 010 — content_opportunities columns for SCOUT

### Task

OpenClaw agents went live 2026-05-21. CHIEF's first morning briefing on 2026-05-22 flagged that SCOUT lost 4 valid opportunities (Gorgias AI pricing, Gorgias guardrails, Recharge-Skio acquisition, Recharge AI agents) because the INSERTs into `public.content_opportunities` referenced columns (`tool_slug`, `category`) the schema didn't define. Unblock SCOUT and lock down the write contract so it doesn't recur.

### Done

- **Migration 010** (commit `8ee09b1`) — added nullable `tool_slug` (text) and `category` (text) columns to `public.content_opportunities` + partial index `idx_opp_tool_slug` on `tool_slug WHERE NOT NULL`. Category left un-CHECKed for v1. Applied via Supabase Studio (same flow as 009).

- **`lib/supabase/types.ts`** (same commit) — `ContentOpportunityRow` extended with the new columns; new `ContentOpportunityCategory` union uses `(string & {})` escape hatch since the DB column is intentionally open.

- **SCOUT `AGENTS.md` rewrite** — handed off to operator as `agent-workspaces/scout/AGENTS.md` (since cleaned), then copied to `~/.openclaw/agents/scout/workspace/AGENTS.md` on Mac Mini. Preserved the architecture's structure verbatim except for an inserted `## content_opportunities — schema for INSERT (READ BEFORE EVERY WRITE)` section near the top: explicit column-by-column write contract, category→urgency mapping, opportunity_score ladder, worked example for the Recharge-Skio acquisition, failure-mode handling (`event_type='schema_mismatch'`, no retry). RSS/Reddit/PH monitoring sections updated to reference the schema section instead of inventing fields ad-hoc.

### Discovered (quirks / gotchas)

- **Architecture spec is silent on where SCOUT writes its classifier category.** `FINAL-ARCHITECTURE-V4.md` SCOUT block says "Categorize: pricing-change | feature-launch | acquisition | news | unrelated" but doesn't say to which column. At runtime Haiku invented `tool_slug` and `category` columns. CHIEF's briefing proposed adding the columns rather than redirecting SCOUT to existing `evidence` JSONB + `related_tools` UUID[]. Gap is in the spec, not the agents.

- **Token-cost comparison favours flat columns over JSONB for SCOUT writes.** Quick estimate: ~30 extra output-tokens per INSERT if category lives in `evidence` JSONB (LLM has to serialize), plus an extra ~50-80 output-tokens per slug→UUID lookup against `tools`. At 60+ INSERTs/day on Haiku that's ~$1/mo. Plus CHIEF (Sonnet, 5-7x dearer) reading the JSONB blob on every morning briefing adds another ~$0.20-0.50/mo. β path (flat columns) is the cheaper + lower-hallucination route.

- **OpenClaw workspace files reload on session start, NOT on every HEARTBEAT tick.** Confirmed against official docs (docs.openclaw.ai/concepts/agent-workspace and docs.openclaw.ai/gateway/heartbeat). HEARTBEAT runs *inside* the agent's main session by default (`isolatedSession: true` is opt-in). Practical consequence: after replacing `AGENTS.md` on disk, you must restart the agent's session for the new instructions to take effect — a running agent keeps the old file's content cached in its prompt context. I'd earlier conflated "RSS task fires every 4h" with "files reload every 4h"; they are unrelated mechanisms.

- **`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is a pre-existing exfil vector.** It's been there since project init and gives PostgREST read/write on every table — bypassing RLS. Today's exploration of CLI-driven self-apply migrations would have added DB-password (DDL access) and PAT (Management API across the whole Supabase account); we deliberately did not do this, keeping migrations on the manual "paste-to-Studio" path so the new attack surface stays unopened. Worth flagging that the *baseline* risk was already present, not "introduced today".

- **"Private repo per agent workspace" is operator-doc lore, not OpenClaw.** Official docs don't recommend it; the pattern lives only in `FINAL-ARCHITECTURE-V4.md` part 1. Operator already does periodic full-folder backups of `~/.openclaw/` — that subsumes the per-agent-repo pattern. We can stop citing it as a requirement.

### Fixes (what + why)

- **Schema gap closed** — `add column if not exists tool_slug text` / `category text` rather than re-routing SCOUT to JSONB. Chose this over `evidence`-based encoding for the token-economics + hallucination-robustness reasons above. Cost: two denormalised columns + small partial index. Not free, but cheap.

- **SCOUT `AGENTS.md` now self-documents the schema.** The architecture's "Categorize: ... write to content_opportunities" was too thin — Haiku had to invent the wiring. New section spells out every required/recommended/optional/never-set column + a real INSERT example. Same pattern should be applied to any other agent write contract that the architecture spec leaves implicit.

- **Cleanup of mid-session false starts** — wrote and then reverted a `scripts/db-push.ts` + `npm run db:push` + `CLAUDE.md` "self-apply" protocol section + `agent-workspaces/scout/` handoff dir, all uncommitted. Kept only the migration + types + this log. The CLI path is feasible (Supabase CLI v2.101.0 installed and pulls; project-ref `vdzslhzyezngdbnrnomc` extractable from `NEXT_PUBLIC_SUPABASE_URL`) but operator chose not to extend the secret footprint right now.

### Open follow-ups

- **4 lost opportunities** (Gorgias AI pricing, Gorgias guardrails, Recharge-Skio acquisition, Recharge AI agents) — SCOUT will re-encounter them on the next RSS cycle once the agent session is restarted with the new `AGENTS.md`. No manual rescue needed.

- **Same write-contract gap may bite again** when SCOUT/OPS/CHIEF do writes the architecture spec describes only at "what to write" level, not "which columns". Pre-emptively spell out schema references in each agent's `AGENTS.md` before going live — same pattern as today's `content_opportunities` block.

- **Tighten `content_opportunities.category` to CHECK constraint** after ~30 days of SCOUT runs reveal the stable vocab. Until then a stray value silently lands rather than failing the INSERT.

- **`SCOUT-specific MEMORY.md / TOOLS.md` not in architecture spec** — `FINAL-ARCHITECTURE-V4.md` only shows CHIEF's TOOLS.md. SCOUT's runtime TOOLS access (Playwright, Supabase, GitHub, Reddit, RSS) isn't documented. Worth a pass before SCOUT scales to full vendor list.

- **Self-apply migration path stays on the shelf.** If operator later wants the Claude-Code-runs-`db:push` workflow, the components needed are: (1) re-add `scripts/db-push.ts` (uses `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` env), (2) add `db:push` to `package.json`, (3) add `supabase/.temp/` to `.gitignore`, (4) document safety protocol in `CLAUDE.md`. Project-ref is `vdzslhzyezngdbnrnomc`. Trade-off discussed: DB password on disk expands prompt-injection surface to DDL.

- **Prior-session follow-ups still open and now more relevant** with agents live:
  - 35 RSS feeds in `vendor-feeds.json` are still `tracked: false` — SCOUT will spend cycles on 404s until verified.
  - 15 partners `pending_approval` — at minimum Shopify/Klaviyo/Gorgias/Recharge need signed before traffic ramp.
  - `last_deployed_sha` check in `validate:infra` — silent Vercel build failures still invisible.
