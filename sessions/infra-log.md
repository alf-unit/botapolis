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

- [`0c9eee5`](https://github.com/alf-unit/botapolis/commit/0c9eee5) — feat(supabase): migration 010 — content_opportunities columns for SCOUT

### Task

OpenClaw agents went live 2026-05-21. CHIEF's first morning briefing on 2026-05-22 flagged that SCOUT lost 4 valid opportunities (Gorgias AI pricing, Gorgias guardrails, Recharge-Skio acquisition, Recharge AI agents) because the INSERTs into `public.content_opportunities` referenced columns (`tool_slug`, `category`) the schema didn't define. Unblock SCOUT and lock down the write contract so it doesn't recur.

### Done

- **Migration 010** (commit `0c9eee5`) — added nullable `tool_slug` (text) and `category` (text) columns to `public.content_opportunities` + partial index `idx_opp_tool_slug` on `tool_slug WHERE NOT NULL`. Category left un-CHECKed for v1. Applied via Supabase Studio (same flow as 009).

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

---

## 2026-05-22 (session 2) — RSS pivot: 39-feed verification + reweight to pricing-scrape/Reddit primary

### Commits

- config(scout): RSS feed verification + deprecate dead feeds + reweight priorities

### Task

Close the "35 RSS feeds untrusted" follow-up from session 1 — verify each URL in `config/vendor-feeds.json`, find replacements for moved feeds, mark dead ones, and flip `tracked` flags so SCOUT stops spending cycles on 404s. Triggered a deeper architectural question (raised by operator mid-session): "why RSS at all in 2026?" Outcome: reweight signal taxonomy — RSS demoted to supplementary, pricing-scrape + Reddit confirmed as primary, newsletter ingestion added to roadmap.

### Done

- **Full audit of all 39 feeds** — methodology: `curl -IL` (HEAD with redirect) → `curl -L` (body fetch) → count `<item>`/`<entry>` → check most-recent `<pubDate>/<updated>`. Result classification:
  - **17 feeds work + active:** shopify (URL changed), gorgias, recharge, stay-ai, omnisend, tidio (URL changed), loox (URL changed), smile-io, loyaltylion, rebuy (URL changed), signifyd, aftership (URL + type changed), inventory-planner (URL changed), prediko (URL changed), techcrunch-ecommerce (URL changed), modern-retail, retail-dive
  - **3 feeds stale/empty:** cogsy (last post 2023-06), nofraud (0 items in valid skeleton), shopify-news (last post 2023-12, added as tombstone)
  - **20 vendors have no working RSS at all:** klaviyo, postscript, loop, mailchimp, attentive, yotpo, judge-me, limespot, nosto, triple-whale, northbeam, polar-analytics, adcreative-ai, pencil, redo, hypotenuse-ai, pebblely, photoroom, emarketer, manychat

- **`config/vendor-feeds.json` rewritten:**
  - Bumped version 2 → 3, `updated_at` → 2026-05-22
  - 17 entries flipped `tracked: true` (8 of them with corrected URLs)
  - 23 entries `tracked: false` + new fields `dead_as_of: "2026-05-22"` + `dead_reason: "<specific>"`
  - 1 new tombstone entry for `shopify-news` (audit trail — checked, found stale, not the answer)
  - Per-entry `notes` updated with verification timestamp + item count for working feeds
  - **`verification_protocol`** upgraded 4 → 6 steps: HEAD-status check kept as step 1; added body-fetch + `<?xml` check (step 2), item count + 90-day freshness check (step 3), path-probe fallback list (step 5), tombstone protocol (step 6). Old protocol would have falsely-greenlit yotpo (content-type lies), nofraud (empty skeleton), cogsy (stale).
  - **`_notes`** restructured around signal-priority taxonomy: PRIMARY = pricing-scrape + Reddit, SUPPLEMENTARY = RSS, ROADMAP = newsletter ingestion

### Discovered (quirks / gotchas)

- **2 of 4 originally `tracked: true` feeds were silently dead all week** — shopify (`/blog.atom` returns HTML, not Atom) and klaviyo (`/blog/feed` → React-Router 404 served with 200 status). SCOUT effectively ran on 2 feeds (gorgias, recharge), not 4. No `agent_logs` alerts because the original verification only inspected HEAD response. **Lesson:** HEAD-status-only verification is structurally insufficient for SPA / React-Router sites that 200-everything and serve the 404 in the body.

- **Yotpo lies in content-type header.** `GET /feed` returns `200 OK` + `content-type: application/rss+xml`, but the body is the HTML homepage (420KB of HTML masquerading as RSS). Only body inspection catches it. Worth assuming other vendors may do the same — body check is non-optional going forward.

- **Nofraud `/feed/` returns valid RSS 2.0 skeleton with 0 items.** Technically "works" (passes header check, passes XML-prefix check) but offers zero signal. The new protocol's item-count gate catches it.

- **Cogsy's blog last post is June 2023** — vendor stopped publishing. RSS still parses cleanly but is 3 years stale. The 90-day freshness gate catches it.

- **Modern marketing-site stacks frequently don't expose RSS at all.** 19 of 39 target vendors — including Klaviyo, Postscript, Loop, Triple Whale, Attentive, ManyChat — have no `/feed` at any common path. Verified via path-probe against /feed, /rss, /blog/feed, /blog/rss, /blog/rss.xml, /blog/atom.xml, /feed.xml, /news/feed, /resources/feed, /changelog/feed.xml. This is a 2026 platform reality (Webflow / Framer / Next.js / HubSpot CMS / custom React), not a config bug.

- **`shopify.dev/changelog/feed.xml` is a stricter upgrade than the dead `/blog.atom`** — 1852 items, directly carries platform/Sidekick/Magic releases the architecture wanted to capture. Less marketing noise, more product-truth. Type changes atom→rss (changelog feed is RSS 2.0, not Atom).

- **Substack-hosted vendor blogs in this niche are mostly dead or unrelated.** `attentive.substack.com` is a different unrelated project ("Attention to Detail — Practical advice for the modern MBA"). `postscript.substack.com` last updated October 2020. Not a viable substitute for RSS-less vendors.

- **Cloudflare bot blocks affect bot-UA + browser-UA equally** for some sites — judge-me, manychat, original techcrunch /category/ecommerce path. SCOUT will hit these if attempted; safer to mark dead than to burn cycles.

### Fixes (what + why)

- **`config/vendor-feeds.json` full rewrite (v2 → v3)** — single source of truth for SCOUT's RSS task surface. The flip from 4 active to 17 active is a 4x increase in coverage at zero LLM-cost change (RSS parse is non-LLM; categorization is per-item not per-feed; ~10-20 extra items/week across 13 new feeds = ~$0.05/mo extra Haiku spend).

- **`verification_protocol` 4 → 6 steps** — body inspection (catches yotpo), item count (catches nofraud), freshness window (catches cogsy), path-probe fallback (recovers loox/rebuy/prediko/etc), tombstone protocol (cogsy/nofraud kept as audit records). Documented inline so re-verification 6 months from now uses the same gates.

- **Signal taxonomy reweight in `_notes`** — RSS confirmed supplementary, not primary. Architecture's existing primary signals (pricing-scrape + Reddit) preserved as-is; this is a CHIEF/operator mental-model fix, not a code change. CHIEF briefings should weight pricing-page-diffs and Reddit chatter above RSS-driven `content_opportunities`.

### Open follow-ups

- **Newsletter ingestion via Beehiiv inbox — HIGH PRIORITY.** Closes the 20-vendor RSS gap. Setup: (1) dedicated mailbox (e.g., `news@botapolis.com`), (2) Beehiiv inbox API hookup, (3) SCOUT email parser writing structured items to `content_opportunities` with `source='vendor_newsletter'`. Estimated 1-2 days. Single biggest signal-coverage gain available — until done, SCOUT only sees Klaviyo/Postscript/Loop/Triple-Whale/Attentive changes via Reddit chatter and weekly pricing scrape (both lag direct vendor announcements). Already mentioned as "not implemented in MVP" in original `_notes` — this audit promotes it to active roadmap item.

- **Re-check RSS-less vendors every ~6 months.** Webflow/Framer/Next.js sites occasionally add RSS endpoints post-launch. Stale feeds (cogsy, nofraud) may resume publishing. Calendar reminder: 2026-11-22.

- **Consider HTML-changelog diff scraping for tech-savvy vendors** (Stripe, Klaviyo developers portal, Recharge developer docs). Some publish structured changelogs without RSS — weekly diff catches changes without needing an RSS endpoint. Not blocking; useful Beehiiv-newsletter-can't-cover-this expansion.

- **TechCrunch coverage broadened, classifier must filter.** Swapped `/category/ecommerce/feed/` (Cloudflare-blocked) → `/feed/` (full TechCrunch). More items per fetch (20/feed vs ~5/feed previously). SCOUT classification step must filter for ecommerce relevance more aggressively. Slight LLM-cost bump from extra items, still well within SCOUT's $0.40/day target.

- **Update `FINAL-ARCHITECTURE-V4.md` Part 3 SCOUT section** — current spec describes "Monitor RSS feeds 50+ vendors every 4 hours" as if it's the bulk of SCOUT's vendor-news signal. Reality post-2026-05-22 is 17 RSS feeds + pricing-scrape + Reddit as primary, newsletter ingestion as roadmap. Spec rewrite blocked on completing newsletter ingestion (otherwise the new spec describes vapor).

- **Prior-session follow-ups still open:**
  - 15 partners `pending_approval` — operator action, blocking revenue.
  - `last_deployed_sha` check in `validate:infra`.
  - Pre-emptive write-contract sections for OPS/CHIEF `AGENTS.md` (apply SCOUT pattern to other agents).
  - `content_opportunities.category` → CHECK constraint after 30 days of SCOUT data (~2026-06-22).
  - General architecture spec drift (`FINAL-ARCHITECTURE-V4.md`) — schema for `content_opportunities`, dropped analytics tools (Plausible/PostHog), per-agent-repos pattern abandoned.

---

## 2026-05-22 (session 3) — sitemap-diff signal channel + Vercel SHA tracking + session-log convention rewrite

### Commits

- feat(scout): migrations 011-012 + types — sitemap-diff monitoring + Vercel SHA tracking
- docs(claude-md): session-log identifies commits by subject not hash
- docs(sessions): 2026-05-22 session 3 log + cosmetic fixes in migrations 011-012

### Task

Process the strategic migration Alf (web-strategist agent) proposed for closing the post-RSS-pivot gap (sitemap-diff signal channel) plus addressing the `last_deployed_sha` open follow-up from session 1. Convert Alf's bundled proposal into clean, applied schema. Decide and document the session-log convention going forward.

### Done

- **Migrations 011 + 012 shipped:**
  - `011_scout_sitemap_monitoring.sql` — new table `scout_sitemap_snapshots` (`vendor_slug` TEXT without FK to cover news sources outside `tools`; `urls` JSONB storing diff-only `{added, removed}` not full URL set; `url_count` + `changes_detected` annotations from SCOUT classifier; UNIQUE per vendor/day; RLS enabled). Also `sitemap_url` column added to `tools` — SCOUT discovers via path-probe on first cycle, no batch-populate.
  - `012_deployment_tracking.sql` — `last_deployed_sha` + `last_deployed_at` keys in `system_config`. Storage only; OPS does the GitHub-HEAD-vs-Supabase poll every 2 days (no Vercel API token used).
  - Both applied via Supabase Studio 2026-05-22 (`Success. No rows returned`); `npx tsc --noEmit` clean post-`lib/supabase/types.ts` update.
- **`CLAUDE.md` session-log convention switched** from `Commits: <hash>` to `Commits: <subject>` list. Hash self-reference is mathematically impossible (hash = sha of content including the log file; any amend changes hash). Lookup via `git log --grep "<subject>"` or GitHub search.
- **Memory updates:** added `feedback_log-by-subject-not-hash` (replaces a wrong amend-based rule I'd just written earlier in-session); added `project_next-session-phase3-prep` to carry Phase 3 prep to the next session; rewrote `feedback_infra-mode-collaboration` to disambiguate web-agent Alf from OpenClaw CHIEF/SCOUT/OPS — Alf strategises, does NOT apply migrations.
- **Cosmetic comment fixes** inside this same commit to migrations 011 and 012 — SCOUT cadence (daily 12:30 UTC, not weekly) and OPS Vercel poll mechanism (GitHub-HEAD comparison every 2 days, not Vercel-API hourly). Schema unchanged; DB descriptions on prod unchanged (would only differ for fresh-env reruns of the SQL files) — acceptable drift for cosmetic strings.

### Discovered (quirks / gotchas)

- **Hash self-reference is mathematically impossible.** Tried the commit→capture-hash→edit-log→amend pattern owner proposed for cleaner history. The amend rewrote the commit's hash, orphaning the hash I'd just written into the log file. Owner confirmed the math after seeing the demo: "Hash = hash содержимого, лог = часть содержимого. Замкнутый круг невозможен." Convention switched to subject-line identification.
- **Supabase Studio surfaces missing RLS via UI prompt** ("Potential issue detected — clients using anon or authenticated keys may access...") when applying a `CREATE TABLE` without `ENABLE ROW LEVEL SECURITY`. The prompt is UI-only; a programmatic apply (psql/CLI) would skip it and produce an RLS-disabled table. So **`ENABLE ROW LEVEL SECURITY` must be in the SQL file explicitly** for fresh-env parity — I missed it on first 011 draft, patched it in. Convention going forward for any new multi-agent table.
- **Alf is a web strategist, NOT an OpenClaw executor.** I addressed paste-ready Alf messages with "apply via Studio" verbs — owner exploded ("с кем ты вообще общаешься?"). Alf proposes/reviews/drafts; owner applies; Claude Code writes code. The three OpenClaw agents (CHIEF/SCOUT/OPS) on Mac Mini are completely separate roles. Mental model fix saved into `feedback_infra-mode-collaboration` so the next session does not repeat.
- **`Read` tool fails with token-limit error on `FINAL-ARCHITECTURE-V4.md`** (25177 > 25000 tokens). Must page through with `offset`/`limit`. Owner pushed back hard when I tried to skip the file citing the limit. Updated `feedback_infra-mode-collaboration` to call this out — paginate, don't skip.
- **Alf's original 010_scout_sitemap_monitoring.sql** had three real issues: (1) migration number collision with our existing `010_content_opportunities_scout_columns.sql`; (2) `urls JSONB NOT NULL` storing full sitemap (10k+ URLs × 50 vendors × 52 weeks ≈ 2GB/year — would blow Supabase free tier in ~3 months); (3) FK `vendor_slug TEXT REFERENCES tools(slug)` would block news-source inserts (techcrunch-ecommerce, modern-retail, retail-dive are in `vendor-feeds.json` but not in `tools`). All three fixed in the shipped 011.
- **`npx tsc --noEmit` exit 0 confirmed before commit.** Establishing this as routine pre-commit step after the strict-TS deploy-blocker incident from session 1.

### Fixes (what + why)

- **Diff-only `urls` field** — schema cost zero; long-term storage savings ~2GB/year. SCOUT enforces `{added, removed}` shape at write time; no CHECK so the format can evolve.
- **No FK on `vendor_slug`** — covers news sources that are in `vendor-feeds.json` but not in `tools`. Plain TEXT column. Slug-collision risk is contained because `vendor-feeds.json` is the single source of truth for slugs SCOUT writes.
- **Skip batch-populate `sitemap_url`** — SCOUT path-probes (`/sitemap.xml`, `/sitemap_index.xml`, `/sitemap.xml.gz`) on first cycle. Avoids week 1 of 404 spam in `agent_logs` for vendors whose sitemap lives at a non-standard path (e.g. Shopify's at `shopify.dev/changelog/sitemap.xml`).
- **Split sitemap monitoring from Vercel SHA tracking** into 011 + 012. Two concerns, two migrations. Rollback safety + clearer commit/file history.
- **`ENABLE ROW LEVEL SECURITY` baked into 011 SQL** post-Studio-prompt — matches migration 008 sibling convention and ensures fresh-env reruns reach the same state as prod.
- **`CLAUDE.md` template** — `Commits` section is now a bullet list of subjects, not a comma-separated hash list. Lookup via `git log --grep`. Eliminates the throwaway "fix hash" follow-up commit pattern that had crept in (commit subject `docs(sessions): fix 2026-05-22 commit hash after rebase` was its predecessor — retired going forward).

### Open follow-ups

- **Phase 3 end-to-end test** — explicitly deferred this session. Pre-work saved in `project_next-session-phase3-prep` memory: pick a test keyword from `semantic_core_entries`, verify pre-conditions, deliver paste-ready Alf message to kick CHIEF off Flow A. Next infra session.
- **Newsletter ingestion via Beehiiv** — still HIGH priority. Sitemap-diff covers part of the RSS gap (catches new URLs on RSS-less vendors); newsletter ingestion covers the curated-by-vendor channel — complementary, not redundant. Setup ~1-2 days.
- **`last_deployed_sha` downstream work** — storage is now in place; remaining: (a) OPS GitHub-HEAD poll every 2 days writing to `last_deployed_sha` + `last_deployed_at`; (b) `validate:infra` check comparing local HEAD to Supabase value and warning on skew >N hours.
- **15 partners `pending_approval`** — operator action, still blocking revenue (carried from session 1).
- **`content_opportunities.category` → CHECK constraint** after ~30 days of SCOUT live data (~2026-06-22).
- **Pre-emptive write-contract sections for OPS/CHIEF `AGENTS.md`** (apply SCOUT pattern). Alf delivered SCOUT update this session; OPS/CHIEF equivalents are not yet drafted.
- **`FINAL-ARCHITECTURE-V4.md` schema drift** continues to accumulate — migration 010 (tool_slug + category), 011 (sitemap_url + scout_sitemap_snapshots), 012 (last_deployed_sha config) all not reflected in the spec. Plus signal-taxonomy reweight from session 2. Spec diverged in 4+ places from reality. Single-pass rewrite needed.
- **Capture Alf's updated SCOUT AGENTS.md to `/agent-snapshots/scout/` as audit trail** — owner pasted it to Mac Mini directly. Repo lacks the artifact; future sessions can't `git diff` what changed. If owner agrees, paste into the repo on next session.

---

## 2026-05-26 — Phase 3 E2E test (Flow A) + Tier 1 fixes from findings

### Commits

- research: klaviyo vs mailchimp for sub-2k Shopify stores
- chief(ops-request): task packet — klaviyo vs mailchimp (Phase 3 test)
- chief-as-ops(packet): klaviyo vs mailchimp (Phase 3 fallback — OPS dispatch blocked)
- chief-as-ops: index update for 003
- content(comparisons): add Klaviyo vs Mailchimp for sub-2k Shopify stores
- content(packet): move 003-klaviyo-vs-mailchimp pending→done
- fix(hooks+helper): pre-commit regex covers all 6 content types + after-publish updates Counts

### Задача

First end-to-end run of Flow A (FINAL-ARCHITECTURE-V4.md Часть 8 Phase 3) — drive a single keyword from `semantic_core_entries` through the full pipeline: CHIEF → research request → operator Web Chat Deep Research → CHIEF reads result → OPS task packet → Claude Code article → publish → status sync → OPS packet move. Phase 3 explicitly designed to surface spec/implementation gaps. Test keyword: `klaviyo vs mailchimp` (priority_score=420, cluster=klaviyo, template=vs-comparison, status='queued'). Claude Code (in repo) led the test step-by-step; operator relayed instructions to CHIEF via Telegram; CHIEF executed and reported back.

### Сделано (Phase 3 chain — 9 steps, full audit trail in `agent_logs` related_entity_id=ef554d4a-47bc-4456-8b71-943b2659504c)

- **Step 1**: CHIEF flipped `semantic_core_entries.status` queued → researching + logged `topic_selected`. Trigger `status_changed_at` fired correctly.
- **Step 2**: CHIEF composed research_request. Initial brief was Часть-6-compliant but NOT paste-ready for Web Chat — operator would have to manually translate brief to Deep Research prompt. **Spec gap caught mid-test**, Часть 6 only spec'd operator-facing summary. **Fix applied immediately**: Часть 6 + CHIEF AGENTS.md "Delegation patterns → To operator (Telegram)" row updated to require Block A (operator-facing summary) + Block B (paste-ready fenced prompt). CHIEF re-issued under new rule; second brief paste-ready into Web Chat without modification.
- **Step 3**: Operator did Deep Research in Web Chat using Block B; saved `/research/2026-05-26-klaviyo-vs-mailchimp.md` (28 sources, 6 article ideas, full 8-section structure). **Workflow gap**: Web Chat → repo file → commit dance was clunky; for this test Claude Code committed for operator. Future workflow Option A/B/C decision deferred.
- **Steps 4-5**: Operator notified CHIEF research-ready; CHIEF read research via GitHub API, flipped status to research_ready, wrote ops-request file to `/agent-snapshots/chief/ops-requests/2026-05-26-packet-klaviyo-vs-mailchimp.md`, logged `research_ready` + `packet_request`.
- **Step 6** — **two major OPS gaps discovered:**
  - **6a** CHIEF diagnostic confirmed available CHIEF→OPS mechanisms: OpenClaw `sessions_send agentId=ops` (real-time messaging), `cron agentTurn` (force a turn), repo files (`ops-requests/` + `priorities-WNN.md`, but no OPS-side watcher), Supabase `agent_logs`. OPS-side AGENTS.md says "process ops-requests within 1 hour" but actual OPS cron registry has only 4 jobs (daily_metrics, site_health, weekly_refresh, weekly_digest) — no polling task for ops-requests/priorities.
  - **6b** CHIEF dispatched via `sessions_send agentId=ops`: returned `runId` + `status=accepted` + `delivery.mode=announce`. OPS never woke (0 activity in agent_logs over 5min). **Confirms two-layer gap**: (1) no OPS HEARTBEAT polling, (2) `mode=announce` queues but doesn't wake target agent.
  - **6c** CHIEF took OPS work as fallback — composed task packet to `/writer-queue/pending/003-klaviyo-vs-mailchimp.md` (209 lines, high quality: verbatim pricing claims dated 2026-05-26, 4 sourced operator quotes, 16 quality gates, banned-phrases ref), flipped `semantic_core_entries.status='in_writer_queue'`, updated `/writer-queue/index.md`, logged with `executed_by=CHIEF`/`intended_executor=OPS`/`fallback_reason=ops_dispatch_no_response`/`supersedes_dispatch_log_id` audit pointer.
- **Step 7**: Claude Code wrote 2362-word vs-comparison MDX to `/content/comparisons/en/klaviyo-vs-mailchimp.mdx`. Followed packet's required claims verbatim + 16 quality gates. Banned-phrases manual scan = 0 hits (pre-commit hook regex was buggy — didn't validate comparisons; caught separately).
- **Step 8**: `git push` triggered post-commit hook → `/api/agents/article-published` returned 200 → Supabase auto-updated: `status='published'`, `published_at=2026-05-26T06:56:19`, `published_article_path` set, `status_changed_at` trigger fired. Webhook emitted 9th `agent_logs` row with `agent_name='CLAUDE_CODE'`/`event_type='task_completed'` — **`CLAUDE_CODE` surfaced as implicit 4th agent**, not in architecture Часть 3.
- **Step 9**: `scripts/claude-code-helpers/after-publish.sh` moved packet pending→done, updated index "Recently done". Did NOT update Counts section (helper bug — fixed in Tier 1).

### Mid-session interruption + recovery

CHIEF's OpenClaw session crashed with "Missing API key for OpenAI" gateway error after Step 6b. New CHIEF session started cold (no in-session memory). Claude Code prepared two-message resume preamble: (1) context + 7 prior agent_logs to verify + repo files to read + 2 operating rules (Block A+B + CHIEF-as-OPS fallback) to acknowledge; (2) Step 6c instruction. New CHIEF session sanity-checked + caught my off-by-one in the preamble (claimed 8 entries, actual 7) + proceeded cleanly. **Persistent storage carried full test context across session boundary** — `agent_logs` + `semantic_core_entries` state + committed research/ops-request files + spec edits were enough to resume without information loss.

### Tier 1 fixes shipped same session (after Phase 3 gaps found)

- **`.husky/pre-commit` regex** expanded to all 6 content types (was reviews+guides only — silently no-op'd validation + EN→RU translation for `klaviyo-vs-mailchimp.mdx` today). Same regex updated in two places (line 24 staged-EN list, line 31 validate-any-MDX list, line 69-70 sed substitution).
- **`scripts/claude-code-helpers/after-publish.sh`** now recomputes pending/done/archive counts on every packet move via `find ... | wc -l`. Comment updated to flag "formerly OPS-managed; see Phase 3 finding 2026-05-26".
- **`writer-queue/index.md`** Counts corrected manually to pending=1 done=2 archive=0 reflecting current state.
- **`FINAL-ARCHITECTURE-V4.md` Часть 6** — added "Paste-ready prompt block (ОБЯЗАТЕЛЬНО)" sub-section spec'ing Block A + Block B structure for research_request messages. Also updated CHIEF AGENTS.md Delegation → To operator (Telegram) row.
- **`FINAL-ARCHITECTURE-V4.md` OPS HEARTBEAT** — added "Every 15 minutes" poll task for ops-requests/ + priorities-*.md to replace the vapor "On demand (triggered by GitHub file watcher)" line. Spec edits ALL local-only because `FINAL-ARCHITECTURE-V4.md` itself is `?? untracked` in git (session 3 carryover).

### Обнаружено (quirks / gotchas)

- **Часть 6 спеки была неполной**: described only operator-facing brief, didn't require paste-ready Web Chat prompt. Operator had to manually translate brief → prompt every cycle. Fixed mid-test; new operating rule applies to all future research_requests.
- **OPS auto-trigger doesn't exist**: spec described "On demand (triggered by GitHub file watcher)" but no watcher was built. OPS HEARTBEAT cron registry only has 4 jobs. Result: every CHIEF→OPS handoff requires manual workaround. Most impactful gap from Phase 3 test.
- **OpenClaw `sessions_send` with `delivery.mode=announce`** queues a message but does not wake the target agent if it's not already running. Other delivery modes might wake; not investigated. `cron agentTurn` is the documented force-run alternative.
- **Pre-commit hook regex drift**: covered only reviews+guides, but post-commit covers all 6 content types. Comparisons committed today bypassed validation + auto-translate silently.
- **`CLAUDE_CODE` emerged as 4th agent in `agent_logs`**: webhook attribution uses this name when post-commit fires. Not in architecture Часть 3. Two options: formalize as 4th agent OR rename in webhook to match existing roster.
- **OPS model drift**: architecture Часть 3 says OPS = Claude Haiku 4.5 via OpenRouter ($5-8/mo target). CHIEF's Step 6a diagnostic claimed OPS configured on `openai/gpt-5.5`. Cost calc in Часть 9 affected.
- **CHIEF rigor**: caught my off-by-one in resume preamble (I said 8 events, actual 7) by querying agent_logs and flagging before proceeding. Worth reinforcing as desired behavior — strict assertion checks, no slack.
- **Session continuity works via persistent storage**: Supabase agent_logs + semantic_core_entries state + committed repo files + paste-ready preamble = full context restore across CHIEF session crash.
- **CHIEF-as-OPS bypass works architecturally**: CHIEF has same Supabase service_role + GitHub PAT access as OPS, so taking OPS work was a clean fallback. Audit trail kept clean via `executed_by`/`intended_executor` context fields in agent_logs.
- **CHIEF (as OPS) produced higher-quality packet than expected**: 209-line packet with verbatim pricing claims, sourced operator quotes, explicit "do not invent Reddit URLs" guard, 16-checkbox quality gates. Writer (Claude Code) downstream could follow with minimal improvisation.
- **`writer-queue/index.md` Counts section** is owned by OPS per the file's footer comment, but OPS auto-trigger is broken everywhere. Until OPS HEARTBEAT lands, the helper script keeps it accurate.

### Fixes (what + why)

- **Часть 6 Block A+B requirement** — research_request was unusable as a paste-ready prompt without manual operator translation. Block B explicit spec ensures future requests are self-contained for Claude.ai Web Chat.
- **`.husky/pre-commit` regex extension** — silently dropping comparisons through auto-translate + validation was a real defect that would have shipped 5 of 6 content types without RU twins and without schema checks.
- **`after-publish.sh` Counts auto-update** — OPS was supposed to refresh Counts but OPS trigger is broken; helper takes over until trigger lands.
- **`FINAL-ARCHITECTURE-V4.md` OPS HEARTBEAT every-15min poll** — replaces vapor "On demand (triggered by GitHub file watcher)" with the actual mechanism needed.

### Open follow-ups (priority order)

- **#1 OPS HEARTBEAT polling — implementation side**: spec updated, but Mac Mini OPS workspace HEARTBEAT.md + AGENTS.md + OpenClaw cron registry still need actual paste/registration. CHIEF can register the new cron via `agentTurn` pattern (per Step 6a diagnostic) — paste-ready prepared in next session.
- **#3 OpenClaw `sessions_send` delivery modes** — investigate OpenClaw docs for a mode that wakes vs only-announces. If only `cron agentTurn` wakes, formalize that as canonical CHIEF→OPS path. Until resolved, polling is the reliable mechanism.
- **#4 Research handoff workflow** — Option A (Claude Code commits, current pattern, works) / B (GitHub Web UI, zero-infra) / C (custom `/api/research/upload` endpoint, ~1-2h dev, mobile-friendly). Owner deferred during test.
- **#5 `FINAL-ARCHITECTURE-V4.md` tracking decision** — file is `?? untracked` (carryover from session 3). Today's edits (Часть 6 Block A+B, OPS HEARTBEAT polling, CHIEF AGENTS.md row) are all local-only. Owner decision: `git add` + track, or keep local.
- **#6 Capture CHIEF runtime AGENTS.md** to `/agent-snapshots/chief/AGENTS.md` (carryover from session 3). Owner pastes CHIEF's current Mac Mini AGENTS.md; Claude Code commits.
- **#8 `CLAUDE_CODE` 4th agent**: formalize in Часть 3 OR rename webhook attribution.
- **#9 OPS model drift**: confirm runtime — Haiku 4.5 (spec) vs `openai/gpt-5.5` (CHIEF Step 6a claim). Update Часть 3 + Часть 9 cost calc.
- **Single-pass spec rewrite** of `FINAL-ARCHITECTURE-V4.md` after #1-9 settle (carryover from session 3, more drift accumulated today).
- **Capture SCOUT AGENTS.md to `/agent-snapshots/scout/`** (carryover from session 3, same pattern as CHIEF capture).
- **`system_config.modified_by` CHECK constraint** rejects values agents try to write (2 warning logs by CHIEF). Side-finding from Phase 3 preflight, not Phase 3 specific. Add 'agent' / 'CHIEF' / 'SCOUT' / 'OPS' / 'CLAUDE_CODE' to constraint or drop it.
