# Session log — botapolis (unified)

Единый append-only дневник **всех** Claude Code сессий проекта — все три типа в одной хронологической ленте. Заменяет прежние раздельные `infra-log.md` + `writer-log.md` (слиты 2026-06-05, см. блок этой даты).

**Три типа сессий** (раньше они шли в два разных файла — `infra-log.md` держал и кодерские, и инфраструктурные; теперь всё здесь):
- `[writer]` — контент/MDX/RU, генерация pSEO-страниц (режимы Content writing + CONTENT_WRITING_02).
- `[code]` — код сайта, фичи, баги, перформанс, шаблоны, навигация (режим Code/feature).
- `[infra]` — multi-agent инфраструктура, миграции/схема БД, agent-спеки, пайплайны, скрипты (режим Infrastructure).

Сессии бывают смешанными — тогда тег составной (напр. `[code+writer]`).

**Конвенции:**
- Один блок на сессию, разделитель `---`. **Хронологический порядок: старые сверху, новые снизу** (новую сессию append'ишь в конец).
- Тег типа `[writer]`/`[code]`/`[infra]` стоит в заголовке блока — видно тип работы, лента единая по дате.
- Коммиты идентифицируются по subject, не по hash (hash самоссылки математически невозможен — см. 2026-05-22 s3). Поиск: `git log --grep "<subject>"`.
- **Сессии до 2026-06-03 (session 2) включительно — скомпакчены** (сохранены коммиты, решения, числа, ключевые grabли; вырезаны verbose-проза, разрешённые one-off'ы, повторяющиеся carryover-списки). **Хвост из 5 последних сессий (2026-06-03 s3 → 2026-06-05) — verbatim.**
- Живые follow-ups смотри в хвостовых блоках (особенно 2026-06-05) — исторические carryover-списки намеренно не дублируются в скомпакченных блоках.

---

## 2026-05-20 — [infra] Phase 1 setup + tools migration + validate-infra fix

**Commits:** Phase 1 multi-agent infra (40 files); seed 101 semantic-core entries; validate:infra script; migration 009 (Loop+Skio в tools); skio→loop how-to; `d3af1cf` validate-infra TS fix.

- **Phase 1 scaffolding:** папки (research/, writer-queue/{pending,done,archive}/, content-templates/, agent-snapshots/, config/, scripts/); migration **008** (5 multi-agent таблиц: semantic_core_entries, content_opportunities, agent_logs, performance_snapshots, system_config — RLS + CHECK + триггеры); webhook `/api/agents/article-published` (REVALIDATE_SECRET, timing-safe); `.husky/post-commit` + mirror `scripts/git-hooks/post-commit.sh`; helper-скрипты; CLAUDE.md content-workflow + quality-gates.
- **Semantic core:** 101 entries `status='queued'`. `priority_score` = volume×intent×cluster, до ~600 (НЕ 0-100, нет CHECK).
- **Migration 009:** Loop Subscriptions (published, `affiliate_url=NULL` до Partner approval, /go fallback на website_url), Skio (archived, /go/skio → /tools — не шлём трафик на закрывающуюся платформу).
- **Grabли:** `@ts-expect-error` = Vercel-strict deploy-blocker (становится "unused directive"); провал деплоя **молчит** (push успешен). → всегда `npx tsc --noEmit` перед commit. Husky 9 hooks не нужен exec-bit, но standalone mirror нужен (`git update-index --chmod=+x`).

---

## 2026-05-20 — [writer] Packet 001 skio-to-loop migration shipped

**Commits:** content(guides) skio→loop how-to (EN+RU); move packet 001 → done.

- Packet 001 `migrate skio to loop` (how-to, vol 1100, transactional, prio 147). Cluster anchor для `recharge-skio-acquisition` (6 sibling-статей зависят).
- **Path B** (vendor docs + Supabase + WebFetch, без Deep Research) — выбран из-за 7-дневного event-окна. Trade-off: troubleshooting из platform-doc patterns вместо r/shopify цитат; refresh усилит позже.
- Live EN+RU 200. Honest fee-math (Loop Starter $99+1% / Pro $399+0.75% / Recharge Standard $99+1.25% / Pro $499+1%, dated 2026-05-20). AffiliateButton внутри "stay on Recharge" decision-секции, не сверху.
- **Grabли:** `<AffiliateDisclosure>` НЕ в MDX namespace (FTC-notice идёт через `ArticleHero showAffiliateNotice`) — CONTENT-WRITING.md gate был устаревшим.

---

## 2026-05-22 — [infra] SCOUT unblocked: migration 010 + AGENTS.md write contract

**Commits:** `0c9eee5` migration 010 — content_opportunities columns для SCOUT.

- Агенты live с 2026-05-21. SCOUT потерял 4 opportunity потому что INSERT'ил несуществующие колонки. **Migration 010:** nullable `tool_slug` + `category` в content_opportunities + partial index.
- SCOUT `AGENTS.md` дополнен секцией "schema for INSERT (READ BEFORE EVERY WRITE)" — column-by-column write contract. **Паттерн:** архитектура говорит "что писать", не "в какую колонку" → Haiku выдумывает поля. Спелл-аут схему в каждом agent AGENTS.md.
- **Grabли:** OpenClaw workspace-файлы перезагружаются на **session start**, не на каждый HEARTBEAT tick — после правки AGENTS.md нужен restart сессии агента. "Private repo per agent" — operator-lore, не OpenClaw-требование. `SUPABASE_SERVICE_ROLE_KEY` в `.env.local` — pre-existing exfil-вектор (RLS bypass), self-apply migration путь намеренно НЕ открыт (оставляем paste-to-Studio).

---

## 2026-05-22 (session 2) — [infra] RSS pivot: 39-feed verification + reweight

**Commits:** config(scout) RSS feed verification + deprecate dead + reweight.

- Аудит 39 feeds: **17 work+active** (8 с исправленными URL), 3 stale/empty (tombstones), **20 вендоров вообще без RSS** (Klaviyo, Postscript, Loop, Mailchimp, Attentive, Yotpo, Triple Whale, ManyChat и др. — 2026 platform reality).
- `vendor-feeds.json` v2→v3; `verification_protocol` 4→6 шагов (HEAD недостаточно: yotpo лжёт content-type, nofraud пустой skeleton, cogsy 3 года stale → нужны body+item-count+freshness gates).
- **Signal taxonomy reweight:** PRIMARY = pricing-scrape + Reddit; SUPPLEMENTARY = RSS; ROADMAP = newsletter ingestion (Beehiiv inbox — HIGH prio, закрывает 20-vendor gap).
- `shopify.dev/changelog/feed.xml` (1852 items) заменил мёртвый `/blog.atom`.

---

## 2026-05-22 (session 3) — [infra] sitemap-diff channel + Vercel SHA tracking + log convention

**Commits:** migrations 011-012 + types; CLAUDE.md log-by-subject; session-3 log.

- **Migration 011:** `scout_sitemap_snapshots` (vendor_slug без FK — покрывает news-источники вне tools; `urls` JSONB diff-only `{added,removed}` не full set — иначе ~2GB/год; RLS) + `sitemap_url` колонка в tools (SCOUT path-probe, не batch). **Migration 012:** `last_deployed_sha`/`last_deployed_at` в system_config (OPS GitHub-HEAD poll каждые 2 дня).
- **Log convention switched:** Commits по subject, не hash (**hash самоссылки математически невозможен** — amend меняет hash, осиротляя записанный hash). → memory `feedback_log-by-subject-not-hash`.
- **Grabли:** `ENABLE ROW LEVEL SECURITY` ОБЯЗАН быть явно в SQL-файле (Studio-UI подсказывает, programmatic apply — нет → fresh-env parity). **Alf — web-strategist, НЕ OpenClaw-executor:** Alf предлагает/draft'ит, owner применяет, Claude Code пишет код. CHIEF/SCOUT/OPS — отдельные роли на Mac Mini. `Read` падает на FINAL-ARCHITECTURE-V4.md (>25k токенов) → paginate, не skip.

---

## 2026-05-26 — [infra] Phase 3 E2E test (Flow A) + Tier 1 fixes

**Commits:** research klaviyo-vs-mailchimp; chief ops-request + chief-as-ops packet; content comparison; pre-commit regex all-6-types; track FINAL-ARCHITECTURE-V4.md; webhook comparison-bridge; capture CHIEF AGENTS.md.

- Полный прогон Flow A на `klaviyo vs mailchimp` (9 шагов, audit в agent_logs). Phase 3 designed для выявления gap'ов — нашёл много:
- **Spec gap (fixed mid-test):** research_request не был paste-ready → Часть 6 + CHIEF AGENTS.md теперь требуют **Block A** (operator-facing summary) + **Block B** (paste-ready fenced prompt).
- **OPS auto-trigger не существовал:** spec "on demand file watcher" = vapor; OPS cron registry имел только 4 job'а. `sessions_send mode=announce` queues но НЕ будит агента. Fix: зарегистрирован 15-мин poll-cron (cron_id cb5abd3e). CHIEF-as-OPS fallback работает (тот же service_role).
- **`CLAUDE_CODE` всплыл как 4-й агент** в agent_logs (webhook attribution) → формализован в Часть 3.
- **OPS model drift:** spec Haiku 4.5, runtime `openai/gpt-5.5` (cost reconciliation pending).
- **Comparison-архитектура:** `/compare/[slug]` **DB-driven** (читает `public.comparisons`), MDX = dead-weight. Webhook теперь **bridge'ит** MDX→DB (INSERT-only-if-absent, никогда не overwrite editorial; comparisons repo-segment → `/compare/` URL). FINAL-ARCHITECTURE-V4.md впервые взят под git-tracking.
- **Grabли:** pre-commit regex покрывал только reviews+guides (comparisons молча проходили без validation+translate) → расширен на 6 типов. Session-continuity работает через Supabase+repo при краше CHIEF-сессии.

---

## 2026-05-26 (session 2) — [infra] GSC ingestion incident + OPS safety gates + infra-mode read protocol

**Commits:** CLAUDE.md require full read of FINAL-ARCHITECTURE-V4.md; GSC backfill + safety gates; session-2 log.

- 2 недели "нет данных GSC" в performance_snapshots при реальных данных в API (402 imp / 1 click / pos 43.68 за 11-24 мая). **Root cause: TOOLS.md vs AGENTS.md conflict** — TOOLS.md говорил "GSC service-account TBD, skip", OPS выбирал safe path "skip+log". → урок: два source-of-truth с overlapping content = гарантированный drift.
- **`scripts/backfill-gsc-metrics.ts`** (прямой fetch, OAuth-as-owner) — 13 mature days записаны, match с API 1:1. Double duty: remediation + reference-impl для рантайма (GSC-кода в репо нет — OPS делает HTTP из своего runtime).
- **OPS overhaul:** adaptive window `today-4..today-1` (источник истины = что вернул API, не fixed offset); запрет писать 0 для дат которых API не отдал; 6-rule safety-gates с severity (auth=critical, "API rows есть но snapshot=0"=error). Фраза "site too new, no data" забанена.
- **CLAUDE.md infra-mode protocol** hard-codified (token-limit = "paginate", не "skip") + memory `feedback_infra-mode-read-architecture-fully`. GSC OAuth — owner declined ротацию. → memory `reference_gsc-oauth-access`, `reference_ags-drop-folder`. Owner stress-style: "пиши нормальным человеческим языком" — default explain-like-business.

---

## 2026-05-27 — [infra] writer-queue gap incident + CHIEF/OPS spec patches

**Commits:** writer-queue gap fix + spec patches; chief morning-brief Block B surfacing; AffiliateDisclosure drift close + track CONTENT-WRITING.md.

- Daily-4 pipeline молча встал: pending пуст, priorities stale. **Materialized 4 packets (005-008)** из top semantic_core. CHIEF claimed-but-not-pushed файл (писал в Mac Mini workspace, не push'ил → OPS невидимо).
- **CHIEF+OPS AGENTS.md patches:** daily-gap-check на каждом wake (pending < `publishing_rate_daily=4` → auto-materialize); cluster-research-check (один research → 6-8 статей, не per-keyword); **tone rules** (max 5 предложений, plain Russian, no process-speak — против "словесного поноса"); Block B surfacing для research-blocked packets.
- **Grabли:** post-commit webhook требует `primaryKeyword:` во frontmatter чтобы флипнуть status (без него — silent no-match). Deep-review template его не содержит. CHIEF→repo push асинхронный (любой artifact для OPS → push сразу). → memory `feedback_publish-direct-urls`, `reference_affiliate-disclosure-drift`.

---

## 2026-05-27 — [writer] Packets 005 (klaviyo pricing) + 007 (klaviyo vs omnisend)

**Commits:** klaviyo-pricing review; klaviyo-vs-omnisend comparison; remove AffiliateDisclosure; add primaryKeyword.

- **Path A** (research-backed, `/research/2026-05-26-klaviyo-vs-mailchimp.md`). `/reviews/klaviyo-pricing` 2623 слов (Customer Agent + active-profiles trap, rating 8.7 match Supabase). `/compare/klaviyo-vs-omnisend` 2598 MDX + ручной `public.comparisons (en)` row (winner: it-depends; operator-AI Omnisend MCP vs shopper-AI Klaviyo Customer Agent).
- **Grabли (подтверждают memory):** `<AffiliateDisclosure />` в MDX → 500 (не в mdx-components map). Comparison MDX = dead-weight (`/compare/[slug]` DB-driven; existing row только touch'ится → live-контент только через прямой DB UPDATE). translate-script не покрывает comparisons (`--type` только reviews/guides). Author-voice unresolved: pricing/analysis третье-лицо vs existing klaviyo-review fake-hands-on.

---

## 2026-05-30 — [code] Vercel Fluid Active CPU audit + 4 perf fixes

**Commits:** static default OG; sitemap revalidate 1h→24h; inline comparison MDX в webhook; proxy skip Supabase для анонимов.

- 50% free-tier CPU (4h/мес) сожжено на сайте с **нулевым трафиком**. **Root cause: `proxy.ts` middleware безусловно дёргает `supabase.auth.getUser()` на каждый request** — bot-crawlers (5-20k/день × ~100-150ms) = 1.5-2h CPU/мес.
- **4 фикса:** (1) static default OG (`app/opengraph-image.tsx` без dynamic → build-time); (2) sitemap revalidate 24h; (3) webhook inline base64 comparison MDX (убирает raw.githubusercontent fetch per commit, backward-compat fallback); (4) **proxy anonymous fast-path** — нет auth-cookie И не auth-path → `next()` с x-locale/x-pathname headers БЕЗ updateSession (нельзя сузить matcher — `getLocale()` зависит от middleware-set header, RU mirrors сломаются).
- → memory `reference_vercel-cpu-model`. **Паттерн:** agent-driven commits идут постоянно в agent-snapshots/ → fetch+rebase перед push, stash owner-local mods. git history = backup.

---

## 2026-05-30 (session 2) — [code] observability cross-check + OG cache hot-patch + code-fence fix

**Commits:** /api/og cache 1h→30d; immutable+no-transform; mdx fallback text colour; validator block bare fences.

- Vercel Observability (Last 12h): **`/api/og` = 46s CPU на 24 invocations (~1.9s/call) — dominant**, больше всех остальных вместе. Middleware (мой session-1 suspect) **даже не в топ-10**. → memory: **observability data FIRST, hypothesis second** (Step 0).
- `/api/og` cache `max-age=3600`→`2592000` (30d) + `immutable` + `no-transform` (web-Claude cross-check добавил последние два). Next.js 15+ GET Route Handlers больше не cached by default — Cache-Control обязателен.
- **Black-on-black code-fence bug:** bare ` ``` ` без языка → Shiki не вставляет inline-стили → текст наследует page-default (невидимо на тёмном). Fix: `text-[#E5E7EB]` fallback на `<pre>` + validator pass `checkCodeBlockLanguages` (block bare fences) + CONTENT-WRITING.md language-list. Triple defence.
- **Grabли:** pre-commit auto-translate перезаписывает ручную RU-правку (редактируй только EN, hook сделает RU).

---

## 2026-05-30 (session 3) — [infra] Phase 0 Data-First pSEO: Etap A→D (6 ресёрчей + БД заполнена)

**Commits:** CLAUDE.md CONTENT_WRITING_02 mode; etap B 20 tool-drafts + related_tool_slugs; 6 researches (R1-R6); etap D apply (30 published + 4 archived).

- Новый mode **CONTENT_WRITING_02** + `PHASE-0-BLUEPRINT.md` mandatory read. Editorial (longreads) vs data-first (pSEO масса) разделены.
- **Migration 013+014:** 20 новых tool-drafts (9 HIGH + 11 MEDIUM) + `semantic_core_entries.related_tool_slugs text[]` GIN. **Migration 015:** консолидация 10 schema-changes — `pricing_model`/`affiliate_partner` CHECK extensions; 8 колонок (integrates_with_tools, operator_quotes, **external_ratings** [raw vendor scores] ОТДЕЛЬНО от `rating_breakdown` [наша editorial 4-axis], affiliate_commission/cookie_window/program_url, pricing_source_url, shopify_native_notes).
- **6 column-wise ресёрчей (R1 identity / R2 pricing / R3 features / R4 integrations / R5 reviews&ratings / R6 monetization)** по всем ~34 тулзам. **5 distinct форматов** в 6 файлах — parser detect per-file. `scripts/apply-phase0-research.ts`: name→slug normalization, marker handling (НЕ НАЙДЕНО / NOT FOUND), carve-outs Judge.me + Sidekick. **34/34 apply, 0 fail. 30 published + 4 archived** (booth-ai, cogsy, pebblely, prediko).
- `/research/phase0-content-flags.md` — 24 per-tool framing-flags (guidance, не data). → memory `project_phase-0-etap-d-plan`, `project_booth-ai-status-flag`.
- **Grabли/факты:** R3 закодировал acquisitions в features-таблицу (parser фильтрует). Cross-research disagreement (Skio год: R1/R2/R5 = Apr 30 2026 $105M с источниками; R4 = 2024 без) → weight by source-attribution depth. R1 `\|` escape в markdown table ломал split. R6 affiliate-platform parenthetical → `startsWith` не `includes` (Recharge Lasso/PartnerStack). Idempotent client-side per-row UPDATE безопасен.

---

## 2026-06-01 — [code] Outbound-link sweep + fail-closed /go/ redirector

**Commits:** etap E flip /reviews/[slug] → runtime DB + Klaviyo reference; demote pricing_source; outbound-link sweep.

- **Сквозное правило: монетизация = ОДНА точка `/go/[slug]`.** Закрыты 4 visible-leak ("Website" кнопки в ToolStickyCard/ToolCardSide/tools-hero, clickable pricing_source) + 1 латентный (`MdxLink` авто-кликал любой https://) + 1 серверный (`/go/` fallback на website_url).
- **`/go/[slug]` fail-closed:** `affiliate_url IS NULL` → 302 на `/reviews/${slug}`, нет website_url fallback (worst leak — невидим в коде, активируется внешним `/go/X`-линком).
- **MdxLink whitelist:** own-domain → Next Link; рейтинг-платформы (g2/trustpilot/capterra/apps.shopify — `rel=nofollow noopener`, НЕ sponsored) → clickable; всё остальное → grey non-clickable span.
- Judge.me carve-out: editorial-only, без outbound CTA. JSON-LD website_url оставлен (Google signal, не click).

---

## 2026-06-01 (session 2) — [code] PartnerAlternatives block (закрытие тупиков на non-affiliate тулзах)

**Commits:** PartnerAlternatives block — route dead-ends to partner reviews (+ subcategory fallback + unify chrome).

- `components/tools/PartnerAlternatives.tsx` — shared server component: Блок А (2-3 партнёрских тулза той же category, rating DESC, → /reviews/[alt]) всегда + Блок Б (per-card "Compare X vs Y" ссылка только если `/compare/[pair]` published). **emphasized mode** для non-affiliate тулзов (gradient-card, h2 — главный CTA), **normal mode** для affiliate.
- Вставлен в reviews/tools/compare [slug] + `/alternatives/[slug]` partner-first sort (2 параллельных SELECT, партнёры наверх).
- **Grabли:** `canonicalCompareSlug` нормализует пару alphabetically. Title нейтральный ("Similar tools worth comparing") — Judge.me держим как сильный магнит (5.0/37k), не принижаем.

---

## 2026-06-01 (session 3) — [code] Legacy review MDX sweep (delete 12 files + redirects)

**Commits:** sweep legacy MDX — delete 6 pairs, redirects, catalog/sitemap/OG runtime, neutralise heading.

- Удалено 12 legacy MDX review (6 пар EN+RU: klaviyo/gorgias/mailchimp/omnisend/postscript/tidio `-review-2026`). 12 redirect 308 (`-review-2026 → /reviews/{slug}`). klaviyo-pricing.mdx сохранён.
- `/reviews` catalog + sitemap + OG refactor'ены на `tools.where(status='published')` (DB-driven). TL;DR → "At a glance" / "Кратко".
- **Grabли:** `/reviews/klaviyo-pricing` 404 (не tool slug, dynamicParams=false). Pagefind после sweep индексит только guides + klaviyo-pricing (не 30 runtime reviews — большая задача refactor build-search-index). `lib/content/rating.ts:getToolRatings` теперь dead-path (всегда DB fallback).

---

## 2026-06-01 (session 4) — [writer] Etap E final rollout · 27 verdicts + *_ru + revalidate

**Commits:** seed-rollout-27 — verdict + *_ru для оставшихся 27 published tools.

- После одобрения 3 контрольных (klaviyo + gorgias + inventory-planner на 3 профилях) — bulk 27. **27/27 applied, 0 fail.** Verdict ~1400 EN / ~1350 RU chars, honest analyst voice, content-flags surfaced upfront, NO fake-hands-on. ~76K chars editorial-prose в БД. 54 path revalidate.
- **Content-flags применены per tool:** adcreative-ai (€360.18 trial-billing), aftership (Trustpilot=carrier-complaint ≠ merchant), manychat (free plan slashed Mar 2 2026: 1000→25 contacts), recharge (Skio acq Apr 30 2026 $105M + PartnerStack→Lasso Mar 15 2026), skio (acquired, $32M ARR / $105M / only $8M raised), stay-ai (OLIPOP 26% churn↓ case), yotpo (SMS/Email sunset Dec 31 2025 + ~34% staff cut), tidio (Lyro deflection 64-67% range), triple-whale (attribution-accuracy cons), и др.
- Carve-outs: judge-me (no affiliate program — catalog без Try CTA), shopify-sidekick (bundled free в каждом плане).
- **Migration 016:** *_ru twins + verdict + verdict_ru.

---

## 2026-06-01 (session close) — [writer] Этап E (Эшелон 1) ЗАКРЫТ

- **Прод (Phase 0 Etap A-E):** 30 published tools полный комплект (R1-R6 + verdict EN+RU + полный *_ru стек) + 4 archived. Routes `/reviews/[slug]`(+ru) DB-driven dynamicParams=false (30 slugs), catalog/sitemap/OG DB-driven. 12 legacy redirect 308.
- Монетизация: единственный exit `/go/[slug]` fail-closed; AffiliateButton null при NULL affiliate_url; "Website" кнопки убраны; MdxLink whitelist; pricing_source grey span.
- PartnerAlternatives на reviews/tools/compare + /alternatives partner-first (распределение карточек по 30 tools: 11×0 / 5×1 / 8×2 / 6×3).
- Все session-4 one-off скрипты удалены (контент жив в БД).

---

## 2026-06-01 (session 5) — [writer] Этап F (Эшелон 2) ЗАКРЫТ · 23 comparisons + 7 alternatives

**Commits:** fix(compare) shopify+support real fields; alternatives editorial (migration 017 + render); close Etap F.

- **30 страниц** (28 новых + 2 pre-existing нетронуты): **23 vs-comparison** (canonical, EN+RU `public.comparisons`) + **7 alternatives editorial**. 12 excluded (9 missing-vendor + 1 archived + 2 canonical-dup), 4 F2-gap keys INSERTed.
- **Migration 017:** `tools.alternatives_editorial jsonb` (`{intro, intro_ru, perCardContext:[{slug,why,why_ru}], verdict, verdict_ru}`, OPEN schema). Template extension с graceful NULL fallback.
- **3 шаблонных/data-бага в /compare/ (1 commit, все 30 страниц):** (1) Shopify-integration читал legacy `tool.integrations` (пуст у новых тулзов → ложь "no native") → `shopifyDepth()` из `shopify_native_notes`; (2) "Customer support" показывал `not_for` → `rating_breakdown.support`; (3) postscript pricing `$1,000` split по запятой R2-парсером (1 row corrupted) → UPDATE по RU-mirror.
- **Grabли:** `tool.integrations` legacy field — у pre-Etap-D тулзов есть, у новых нет (backfill или deprecate). Triple Whale `affiliate_url=NULL` + `affiliate_partner='partnerstack'` mismatch. R2 CSV parser нужен RFC 4180. `getRatingAxisValue` helper упомянут в types но не существует (inline normalize).

---

## 2026-06-01 (session 6) — [writer] Этап G (Эшелон 3, 1-я волна) ЗАКРЫТ · 8 best-of + wave 101 closed

**Commits:** /best/[slug] route + 2 samples; YAML date quoting + RU mirror; remaining 6 listings; close Etap G + first-wave.

- **8 best-of листингов** (`/best/[slug]` hybrid MDX-body + DB-hydrated ranked tools) + 2 reclassified в `template='guide'` (stack-recommendation + 10k-SKU deep-dive — не best-of формат).
- **Honest pattern эталон (single-tool/thin):** "Why this listing is short" intro + конкретика про archived (shutdown dates) + явный refusal "не падим X — different job" + closer "we are not listing a fifth option". Owner approved именно эту дисциплину.
- **lib/content/mdx.ts:** ContentType += "best", `bestFrontmatterSchema` (segment + tools[] + summary).
- **Grabли:** YAML auto-Date trap — `publishedAt: 2026-06-01` (bare) → Date object, isoDate-string schema reject → 500. Convention: кавычки `"2026-06-01"`. `/ru/best/[slug]` нужен explicit re-export (Next 16 route-constants per file).
- **1-я волна (101 ключ) ЗАКРЫТА:** 68 покрыты live (30 reviews + 23 comp + 7 alt + 8 best), 12 excluded/merged, 21 ждут guide/how-to/pricing мини-волны.

---

## 2026-06-01 (session 7) — [infra] Этап J (2-я волна, 220 ключей) ЗАКРЫТ · раскладка в БД

**Commits:** load 220 2nd-wave keys + migrations 018+019; close Etap J.

- `botapolis_core_REMAINING.csv` (220 ключей, SEMrush метрики). **212 inserted `status='second_wave'`** + 3 refresh + 3 skip + 2 excluded. **НЕ генерировали страницы — только раскладка.**
- Распределение: pricing 53, offer/discount 44 (deferred до партнёрок), other 35 (33→guide, 2 excluded), comparison 32, listing/best-for 29, alternatives 20, review 6, howto 1.
- **Migration 018:** `semrush_volume/kd/cpc`, `source_count`, `affiliate_strength`, `tool_label`. **Migration 019:** CHECK extension status `'second_wave'` + template `'discount'`+`'other'`.
- **Grabли:** schema doc лгал что `status`/`template` OPEN — на деле CHECK (migration 008). → всегда grep CHECK перед предположением. UPDATE без modification на constrained колонке НЕ триггерит CHECK (3 refresh прошли). DB после load: 319 entries total (212 second_wave / 49 queued / 43 published / 12 excluded / 3 in_writer_queue).

---

## 2026-06-03 — [code] Структурный rebuild (reviews→tools merge + nav + хабы + перелинковка) + pricing_notes cleanup

**Commits:** merge /reviews/ → /tools/ (#1 squash); Resources dropdown + /best & /alternatives hubs (#2); centre↔satellite cross-linking (#3); clean pricing_notes.

- Закрыты 38 орфанов + nav-дыры + /reviews vs /tools дубль (SEO-аудит owner'а).
- **Phase 1 — merge:** `/tools/[slug]` стал каноническим (поглотил 7 reviews-секций: verdict, rating_breakdown 4-axis, external_ratings, operator_quotes, shopify narrative, integrates_with_tools grid, pricing_source citation). dynamicParams=true, ISR 24h. **Снесены** `app/reviews/*` + `app/ru/reviews/*`. **Редиректы 308 single-hop:** `-review-2026 → /tools/{slug}` напрямую (не chain — Google штрафует), `/reviews/{slug}` → `/tools/{slug}`, `/reviews` → `/tools`. klaviyo-pricing.mdx → `git mv` в guides/. Webhook ALLOWED_CONTENT_TYPES whitelist {comparisons, alternatives, guides, best, news} — без reviews.
- **Phase A — nav:** Navbar discriminated union (leaf|dropdown): **Tools · Compare · Guides · Resources▾** (Best, Alternatives). Footer Resources mirror. error.tsx inline NAV_STRINGS sync.
- **Phase B — хабы:** `/best` (MDX-driven, 8 листингов) + `/alternatives` (DB-driven, 30 tools). Fix schema-selection bug (getAllMdxFrontmatter("best") использовал guide schema). sitemap += /best /alternatives (0.85).
- **Phase C — перелинковка:** Related блок на /tools/[slug] (→свой /alternatives + top-3 compares + top-3 best, cap 7); /compare ToolCardSide h2 → /tools/{slug} (Judge.me больше не deadend); /alternatives breadcrumb Home/Alternatives/{name}.
- **pricing_notes cleanup:** 30 tools EN+RU, жёсткий стандарт (tiers + MAX 1-2 structural gotchas + free plan + verified date), стена 12-18 строк → 4-6. `scripts/clean-pricing-notes.sql` idempotent.
- **Grabли:** `@custom-variant hover` Turbopack-dev-only баг (прод OK) — при "мой код сломал?" ВСЕГДА git stash + clean-main repro первым шагом.

---

## 2026-06-03 (session 2) — [code+writer] Pricing-route Etap J-generate · 5 sample pages + метод codified

**Commits:** `4e85415` Etap J-generate sample wave — 5 pricing pages + method codified.

- **Метод выбран: data-first + realtime web add.** Pure-A (manual static) и Pure-B (DB-driven, не ранжируется под "X pricing") отвергнуты; B+ дорого. **WebSearch + WebFetch (vendor pricing + 2-3 third-party math + fresh quotes) = ~8-14 min/article.** 49 страниц ≈ 8-10ч. CONTENT-WRITING.md полностью переписан (operator-authored): Шаг 1 база (Research 02/05 + tools row) → Шаг 2 веб-добор → Шаг 3 синтез; web→DB write-back (existing fields only, no migrations).
- **5 контрольных pricing на проде:** klaviyo + mailchimp (~2200) + attentive (~1500) + gorgias (~2200) + recharge (~2300). Каждая: tier tables + full-stack math + 4-6 FAQ + FAQPage JSON-LD + verdict + cross-links + 3 operator quotes.
- **`/pricing/[slug]` шаблон:** deep MDX + Related блок + PartnerAlternatives (был тупик после verdict). Helpers extracted в `lib/content/related-blocks.ts` (shared /tools + /pricing). `dynamicParams false→true`. PriceCard handles custom-quote ("Custom (sales)"/"По запросу"). `ToolPricingModel` union widened.
- **`scripts/pricing-compare-backlinks.ts`** — программный `/compare/`→`/pricing/` backlink loader (idempotent `--apply`, BACKLINKS array расширяется до 50). Закрывает memory `project_compare-pricing-backlink-step4`.
- **DB realtime-добор (first instance правила):** `recharge.pricing_min` 25→99 (vendor TODAY публично $99; $25 = hidden new-merchant offer). `/pricing-db/[slug]` audit-route отвергнут (pure-DB 4-5K words/0 FAQ/0 tables vs MDX 8-10K/6/3-4).
- **Grabли:** Research 02 (verified 2026-05-30) устарел за 4 дня → realtime augmentation per-article обязателен. UI-changes требуют скриншот-confirmation (removal+revert цикл по Related). `/compare/` MDX-edits не докатываются до live render (только через loader).


---

## 2026-06-03 (session 3) — [code+writer] content-gate v2 (type-agnostic) + 15/15 RU pricing backfill + merge wave 1 в main

### Commits

- feat(infra): content gate v2 — type-agnostic validator, Haiku out, 3/15 RU pricing backfill
- content(pricing): RU backfill 4/15 — sample wave complete (attentive, gorgias, mailchimp, recharge)
- content(pricing): RU backfill +1 — aftership (8/15)
- content(pricing): RU backfill +1 — inventory-planner (9/15)
- content(pricing): RU backfill +2 — northbeam, rebuy (11/15)
- content(pricing): RU backfill +4 — signifyd, tidio, triple-whale, yotpo (15/15 complete)
- fix(content-gate): flip pairing to ERROR + TS strict-mode fixes after build
- Merge feat/pricing-bulk: content-gate v2 + 16 pricing pages EN+RU
- chore(sessions): close 2026-06-03 (session 3) — content-gate v2 + RU backfill 15/15 + main merge (this commit)

### Задача

Закрыть omnisend/postscript SSR 500 которые лежали с утра 2026-06-03 на main, и вместе с фиксом построить **единую type-agnostic защиту контента** (валидатор + перевод как два разных звена), чтобы такой класс ошибок не повторялся ни на одном существующем или будущем content-типе. После — добить wave 1 pricing на main с полным RU-покрытием.

### Сделано

**Звено 1 — валидатор (gate, type-agnostic, обходит все типы без белых списков):**

- `scripts/content-validator.ts` переписан: универсальный обход `content/*/{en,ru}/**/*.mdx` через `readdir` (не enum типов), per-type schema detection через map из путей, fallback на `baseFrontmatter` для неизвестных типов с warning.
- Прежние passes сохранены (schema, code-fence lang), добавлены два новых: `checkBareLtGt` (regex `<(?=[\d$])` и `>(?=[\d$])` по body вне fenced/inline code blocks) и EN↔RU pairing pass (всегда обходит full tree даже на staged-only invocations).
- Bridge-only типы (`comparisons`, `alternatives`) исключены из schema + pairing passes — это DB-driven контент, MDX в `content/comparisons/` — артефакт webhook-bridge'а, рендерится `public.comparisons` row. Safety/fence на них всё равно работает.
- Pairing-режим управляется CLI флагом `--strict-pairing`: WARNING по дефолту, ERROR с флагом.
- `.husky/pre-commit` упрощён до одного шага — `validate:content -- --strict-pairing` на любом staged MDX под `content/*/(en|ru)/**/*.mdx`. Универсальная regex, новые типы покрываются автоматически.

**Звено 2 — перевод (producing, EN+RU в одной сессии Claude Code, без Haiku):**

- Удалены `scripts/translate-{content,tools,comparisons}.ts` (3 файла) + 4 npm scripts (`translate`, `translate:missing`, `translate:tools`, `translate:comparisons`) из `package.json`. OpenRouter/Haiku-путь вырезан целиком.
- `CONTENT-WRITING.md` раздел 3 расширен подразделом "Локализация — HARD RULE: EN + RU в одной сессии" с правилом для MDX/DB-driven/гибрид типов + opt-out через `noRuPair: true` в frontmatter.
- `CLAUDE.md` Common project-wide rules — добавлен bullet ссылающийся на CONTENT-WRITING.md раздел 3.
- Quality checklist в CONTENT-WRITING.md пополнен пунктом "RU twin создан в той же сессии (hard rule 2026-06-03)".

**Safety-pass first-run чистка (валидатор поймал на full-tree run):**

- 12 голых `>` перед `$`/цифрой в существующих файлах заменены на "over X" (canonical owner-стиль): comparisons/klaviyo-vs-omnisend (2 точки), guides/how-to-set-up-shopify-email-automation (EN + RU), pricing/northbeam (4), omnisend (1), triple-whale (3 точки `>20% off-Shopify`).
- 2 голых `<` перед `$` в табличных ячейках pricing/northbeam (`<$250K`, `<$1.5M`) + аналогичные в triple-whale, rebuy, inventory-planner, signifyd — все заменены на "under X".
- 2 code-fence без lang-tag (rebuy:109, signifyd:92) — добавлен `text` после ```.
- 8 EN pricing description-полей с overflow >220 chars сокращены до ≤220 (aftership, inventory-planner, northbeam, omnisend, postscript, rebuy, signifyd, triple-whale).

**Backfill — 15/15 RU pricing twins:**

- Создан полный RU перевод (frontmatter полностью включая `faq` qa-array, body 1:1 со структурой EN, internal links без `/ru/` префикса, brand names в латинице) для: omnisend, postscript, manychat (wave 1 priority), recharge, mailchimp, attentive, gorgias (sample wave), aftership, inventory-planner, northbeam, rebuy, signifyd, tidio, triple-whale, yotpo (wave 1 closeout).
- Все 15 файлов прошли валидатор: schema ✓ · safety ✓ · fence ✓ · pairing ✓.
- В нескольких файлах description RU вышло за 220 chars при первом проходе и было сокращено перед commit — overflow ловится валидатором, исправляется итеративно.
- Прогресс коммитился порциями (4 checkpoint-коммита) — не одной мегабомбой, чтобы прогресс не терялся при потенциальном context exhaust.

**Merge в main:**

- `feat/pricing-bulk` (8 коммитов сверху wave 1 `c7c5f7f`) смержен в main через `--no-ff` (merge коммит `fbfffcc`), запушен.
- Vercel auto-deploy прошёл за ~2 минуты. Прод verified:
  - `https://botapolis.com/pricing/omnisend` → 200
  - `https://botapolis.com/ru/pricing/omnisend` → 200, h1 = `Цены Omnisend в 2026: подсчёт контактов, MCP бесплатно и реальная стоимость на 10k контактах` (RU контент рендерится)
  - `https://botapolis.com/ru/pricing/postscript` → 200, h1 = `Цены Postscript в 2026: сдвиг на platform-fee, минимум $49 Starter, математика AI-плана, Shopify-only глубина`

После merge на main живут все 16 pricing-страниц EN + 16 RU (klaviyo был уже на main с прошлой сессии и имел старый RU; новые 15 EN + 15 RU добавились этой сессией; manychat — единственный из wave 1 что был на main до сегодня, но без RU twin — теперь RU есть).

### Обнаружено

- **Два разных класса MDX SSR-500**, оба раньше проявлялись как "MDX/JSX parser error" в логах но имели разные корневые причины:
  - **Class A — frontmatter `description` > 220 chars.** Zod-схема в `lib/content/mdx.ts:54` фейлит на длинных описаниях, ошибка летит из `Module.C [as generateMetadata]` SSR-builder'а Next.js. На вид — обычный SSR 500, без подсказки про длину в публичной ошибке. **Это и был реальный bug omnisend (250) + postscript (223) сегодня утром.** Прошлая сессия 2026-06-03 (#2) гипотезу проверила не до конца — заменила голый `>` (red herring), 500 остался, страницы реверт'ились без поиска точного stack trace. Сегодня поднял локальный prod на 3002 (поскольку owner-овский dev на 3000 был в broken state, не трогал), curl/pricing/omnisend → реальный stack: `[mdx] frontmatter invalid for pricing/omnisend (en): description: Too big`. Reproducible 1:1.
  - **Class B — голый `<` или `>` сразу перед цифрой/$ в MDX body (вне fenced/inline code).** MDX-парсер интерпретирует `<5K`/`<$200` как малформированный JSX-tag opener, `>120K`/`>$250` симметрично как malformed closer. Иногда срабатывает на SSR (parser error), иногда нет — зависит от окружения (валидатор у меня поймал `>120K` в omnisend, но на прод-3002 страница omnisend всё равно 200 после фикса description — то есть в текущем MDX-окружении этот конкретный `>` не ломал, но мог сломать на другом setup-е). **Канонический фикс owner-а** уже устоявшийся: `<5K` → `under 5K`, `>120K` → `over 120K`. Валидатор теперь блокирует оба паттерна.
- **Корень почему overflow проскочил в коммит `c7c5f7f` утром:** `scripts/content-validator.ts` `walkContent()` был hard-coded на `["reviews", "guides"]` (строка 103 старого файла), `parseFileArg` regex тоже только на эти 2 типа (строка 192). Pre-commit hook regex покрывал 6 типов (reviews|guides|comparisons|alternatives|news|best) **но pricing забыт в самом hook'е**, а валидатор всё равно резал не-reviews/guides на input-уровне. Pricing-тип создан был в Etap J (прошлая сессия), но gate не расширили на него — slip-through. Сегодняшний переписанный validator universal-обход устраняет этот класс slip-through'ов для любых будущих новых типов.
- **MDX bridge-only типы — отдельная категория** не должна проходить strict schema. comparisons/en/klaviyo-vs-omnisend.mdx + klaviyo-vs-mailchimp.mdx изначально валились в validator на отсутствие `publishedAt` — это `webhook bridge artifacts`, рендеринг идёт из `public.comparisons` row, MDX-файл — транспорт для webhook'а в DB не более. Внёс `BRIDGE_ONLY_TYPES = new Set(["comparisons", "alternatives"])` set в validator: для них пропускается pass 1 (schema) и pass 4 (pairing) — но safety + fence checks остаются (если когда-нибудь рендерится — не ломает).
- **Validator + pre-commit + writer-конвенция = три замкнутых звена.** Они работают только вместе: validator ловит факт, pre-commit запускает в нужный момент (`git commit`), конвенция в CONTENT-WRITING.md диктует Claude Code'у создавать EN+RU параллельно — иначе pairing-ошибка на commit'е. Без любой из трёх частей защита дырявая. Закодифицировал все три в одну сессию намеренно.
- **Workflow context-management lesson:** 15 объёмных RU-переводов (~30k слов суммарно) в одной сессии — впритык к 200K context window'у на Opus 4.7. Стратегия "checkpoint commit'ы порциями" (4 батча × 1-4 файла) сохранила прогресс — если бы делал одной мегабомбой и context-exhaust случился на 11-м файле, потеря времени была бы существенной. Тот же паттерн применим к любой массовой content-нагрузке.

### Open follow-ups

**ВЫСОКИЙ ПРИОРИТЕТ — следующая задача:**

- **Капельный механизм отложенной публикации — НЕ СДЕЛАН.** Все 16 EN + 16 RU pricing страниц после merge ушли в прод одним залпом — Google может зафлагить velocity. Нужен общий механизм для ВСЕХ content-типов: добавить `published: false` boolean в frontmatter MDX (и аналог в DB-driven таблицах: `comparisons.is_published`, etc.), скрывать `published=false` записи из всех роутов через `getAllMdxFrontmatter` / DB-фильтры + из `app/sitemap.ts`. CHIEF (или Claude Code helper script) флипает `published: true` N штук в день по приоритет-списку (priority_score из `semantic_core_entries`). Без этого механизма любая будущая масс-публикация = velocity-flag риск.
- **~34 оставшихся pricing-ключей** из 2-й волны Этапа J (50 pricing keys total minus 16 published сегодня = ~34). Метод тот же — data-first + realtime web add (см. CONTENT-WRITING.md раздел 2). Каждая страница: EN+RU в одной сессии (hard rule 2026-06-03 enforced валидатором).
- **Остальные buckets 2-й волны** добивать в существующие группы / роуты:
  - `guide` 33 new + 19 carry-over + 2 reclassified Etap G = **~54 страниц** в `/guides/[slug]` MDX
  - `how-to` 1 → `/guides/[slug]` (тот же роут)
  - `vs-comparison` 29 new pairs → `/compare/[slug]` DB-driven (Etap F pattern)
  - `best-for-segment` 29 extended → `/best/[slug]` MDX+DB hybrid (Etap G pattern)
  - `alternatives` 20 extended editorial → расширение `alternatives_editorial` jsonb (закрывает хвост "23 generic alternatives → editorial" из Etap F)
  - `review` 6 "is X worth it" — decision pending, overlap с `/tools/[slug]`
  - `discount` 44 — **deferred** до партнёрок (промо-коды)
- **Этап H** — нумерация всего пула (1st wave 101 + 2nd wave 212 + новые волны) для CHIEF prioritisation.
- **Этап I** — после нумерации CHIEF капельно публикует (4/день старт) через механизм отложенной публикации (см. выше — блокер).

**Системные/инфра:**

- **`scripts/build-search-index.ts` проверить на все типы.** В прошлой сессии (#2) уже отмечалось что Pagefind не индексирует runtime-генерируемые типы — `/tools/[slug]`, `/best/[slug]`, `/alternatives/[slug]`, `/pricing/[slug]`. Из последнего билд-лога `pagefind` пишет только `guides:10 tools:0 comparisons:0` — pricing и другие типы вне индекса. Расширение поиска критично для UX после ramp-up контента.
- **`/pricing/` hub-страница + Resources nav sub-item "Pricing"** — порог 5+ страниц достигнут (даже 16+), теперь имеет смысл. Раньше отложено до 5 страниц.
- **content-validator.ts TS strict-mode** — non-null assertions добавлены post-build (Next.js 16.2.6 не narrowit типы через `await exitAfterDrain(0)` который вызывает `process.exit` но TS видит `Promise<never>`). Безопасно (early-exit branches return до использования), но subtle — стоит при следующей правке файла перейти на явные `return` вместо assertions.

**Carryovers (нерешённые из сессий 1-7 + 2026-06-03 sessions 1-2) — unchanged, переиспользую сжатый список:**

- isoDate schema hardening (low)
- 6 best-of listings без партнёров — strategic discussion
- `getRatingAxisValue` helper не вынесен (inline в /compare/, /tools/, /pricing/)
- `tool.integrations` legacy field — backfill ИЛИ deprecate
- Triple Whale `affiliate_url` NULL + `affiliate_partner='partnerstack'` mismatch
- R2 CSV parser RFC 4180 hardening
- Subcategory string-mismatch (`sms` ≠ `sms-marketing`)
- RU auto-обновление в проде (теперь покрыто через EN+RU same-session правило, но legacy-flow всё ещё ссылается)
- `lib/content/rating.ts:getToolRatings` dead-path cleanup
- `tools` missing columns (`pricing_url`, `pricing_css_selectors`, `pricing_data`, `affiliate_health_checked_at`)
- `system_config.modified_by` CHECK constraint rejects agent values
- Capture SCOUT runtime `AGENTS.md` to `/agent-snapshots/scout/`
- Newsletter ingestion via Beehiiv
- OPS GPT-5.5 cost reconciliation
- `FINAL-ARCHITECTURE-V4.md` rewrite (drift накопился ещё больше)
- `app/robots.ts` для AI crawlers
- OG-image fallback на `/pricing/` + `/tools/` рендерит default `/api/og` вместо colocated `opengraph-image`
- Homepage "Latest reviews" блок сломан (`getAllMdxFrontmatter("reviews")` пустой post-merge `/reviews/` → `/tools/`)

### Что в проде живо после сессии

- 16 `/pricing/{slug}` EN + 16 `/ru/pricing/{slug}` RU страниц на botapolis.com — все 200, RU контент рендерится с переведённым h1/body/faq.
- **Content-gate v2 на main:** `scripts/content-validator.ts` универсальный, `.husky/pre-commit` с `--strict-pairing`. Любой future-коммит MDX с overflow description / голым `<>` перед цифрой/$/ или без RU twin будет блокироваться pre-commit'ом до того как дойдёт до прода.
- **Haiku/OpenRouter путь удалён.** 3 translate-* скрипта + 4 npm scripts вычищены. `OPENROUTER_API_KEY` зависимости в pre-commit hook нет.
- **CONTENT-WRITING.md / CLAUDE.md** прописывают EN+RU same-session как hard rule.
- Merge commit `fbfffcc` на main (за 8 коммитов из feat/pricing-bulk).

### Final commit chain (session 3)

- `feat(infra): content gate v2 — type-agnostic validator, Haiku out, 3/15 RU pricing backfill` (bf2b63f)
- `content(pricing): RU backfill 4/15 — sample wave complete (attentive, gorgias, mailchimp, recharge)` (8bcbe8b)
- `content(pricing): RU backfill +1 — aftership (8/15)` (35fae6d)
- `content(pricing): RU backfill +1 — inventory-planner (9/15)` (5ace210)
- `content(pricing): RU backfill +2 — northbeam, rebuy (11/15)` (4138450)
- `content(pricing): RU backfill +4 — signifyd, tidio, triple-whale, yotpo (15/15 complete)` (444db4d)
- `fix(content-gate): flip pairing to ERROR + TS strict-mode fixes after build` (9f51c75)
- `Merge feat/pricing-bulk: content-gate v2 + 16 pricing pages EN+RU` (fbfffcc, merge commit на main)
- `chore(sessions): close 2026-06-03 (session 3) — content-gate v2 + RU backfill 15/15 + main merge` (this commit)

### One-off artifacts

В этой сессии one-off скриптов НЕ создавал. Validator, pre-commit, MDX-файлы — все production-tools / прод-контент.

### Extended work in same session (orphan-fix + DoD rule)

После первого close-блока owner проверил прод и обнаружил что **32 pricing-страницы (16 EN + 16 RU) висят на проде как орфаны** — ни хаба `/pricing`, ни пункта в Navbar/Footer, не найти через меню. Доступ только по прямому URL или через перелинковку с `/tools/`/`/compare/` (для большинства — только klaviyo, остальные `/compare/` backlinks ещё не были применены). Доделал в той же сессии до закрытия.

**Сделано:**

- **`app/pricing/page.tsx` + `app/ru/pricing/page.tsx` — type-agnostic hub.** Читает `getAllMdxFrontmatter("pricing", locale)` — любая новая pricing-страница добавится в хаб автоматически без правок кода. Card grid + hero recipe скопированы с `/best/` для visual consistency. Chip на карточке использует `toolSlug` (естественная axis для pricing) с mint-tint. Empty-state fallback для случаев когда RU локаль пуста.
- **`components/nav/Navbar.tsx` Resources dropdown расширен** — `pricing` sub-item добавлен между `alternatives` и extension-slot. NavbarStrings interface получил `pricing: string` поле.
- **`components/nav/Footer.tsx` Resources column** — `pricingHub` link добавлен после alternativesHub. FooterStrings.links обновлён.
- **`locales/en.json` + `locales/ru.json`** — `nav.pricing` (Pricing / Цены) + `footer.links.pricingHub` (Pricing / Цены).
- **`app/error.tsx` inline NAV_STRINGS** — pricing string добавлен в обе локали (error boundary не достучается до server dict loader, поэтому держит свою копию строк). Build-time TS обнаружил это slip-через — без правки error.tsx build падал на missing 'pricing' field.
- **`app/sitemap.ts` STATIC_ROUTES** — `/pricing` добавлен на priority 0.85 (паритет с `/best` и `/alternatives`). Loop по `/pricing/{slug}` и `/ru/pricing/{slug}` уже был.
- **`scripts/pricing-compare-backlinks.ts` BACKLINKS** расширен с 13 до 16 tools — добавлены `gorgias`, `klaviyo`, `recharge` (sample wave которые отсутствовали). Применён `--apply` — 14 rows в `public.comparisons` updated (40 уже были linked из prior runs, 8 skipped — no verdict). Каждая `/compare/{X-vs-Y}` теперь имеет ссылку в verdict на `/pricing/{X}` И `/pricing/{Y}` для всех 16 published pricing-tools.

**Definition of Done — HARD RULE зафиксирован type-agnostic** в `CONTENT-WRITING.md` (новый раздел перед "Локализация") и в `CLAUDE.md` (bullet в Common project-wide rules):

> Страница любого типа НЕ готова и НЕ публикуется пока не выполнено ВСЁ:
> (1) EN+RU контент в одной сессии;
> (2) FINDABLE — страница в хабе своего типа И в Navbar/Footer (не орфан);
> (3) в `app/sitemap.ts` (оба языка);
> (4) перелинкована: Related + PartnerAlts + body links + `/compare/` backlinks где применимо;
> (5) валидатор `npm run validate:content -- --strict-pairing` зелёный.
>
> Type-agnostic — применяется к pricing, guide, comparison, alternatives, best, review, news и всем будущим типам. При генерации пачки контента навигация / хаб / sitemap / перелинковка делаются в том же заходе, не postfactum.

**Прод verified после Vercel deploy `fc1e949`:**

- `https://botapolis.com/pricing` → 200, h1 "Real cost, not marketing rates.", 16 уникальных pricing-card links на странице.
- `https://botapolis.com/ru/pricing` → 200, h1 "Реальная стоимость, не маркетинговые ценники."
- `https://botapolis.com/pricing/omnisend` + `/ru/pricing/omnisend` → 200.
- "Pricing" встречается на homepage в 3 местах (Navbar desktop + Navbar mobile Sheet + Footer Resources column).

**Open follow-ups — обновлённый список (после orphan-fix):**

- **15 RU pricing страниц требуют РЕБИЛДА СТИЛЯ** — приоритет наравне с капельным механизмом. Backfill в session 3 получился transliterated jargon (operator-цитаты, billable-контактов, lookback, deflection, passthrough — латиницей где есть нормальный русский эквивалент; гибриды с дефисом «latin-кириллица»; служебные англицизмы). Owner оценил как «каша из англо-русских слов» не понятная читателю без знания английской SaaS-терминологии. **Анти-правило зафиксировано** в `CONTENT-WRITING.md` раздел «RU style — ЧТО НЕЛЬЗЯ ДЕЛАТЬ» (запрещённая калька AOV/churn/retention/lookback/deflection/overage/sunset/etc., запрет гибридных дефисных конструкций, кавычки «ёлочки», главный тест «понимает ли русскоязычный без английского»). Файлы под ребилд:
  - `/content/pricing/ru/aftership.mdx`
  - `/content/pricing/ru/attentive.mdx`
  - `/content/pricing/ru/gorgias.mdx`
  - `/content/pricing/ru/inventory-planner.mdx`
  - `/content/pricing/ru/mailchimp.mdx`
  - `/content/pricing/ru/manychat.mdx`
  - `/content/pricing/ru/northbeam.mdx`
  - `/content/pricing/ru/omnisend.mdx`
  - `/content/pricing/ru/postscript.mdx`
  - `/content/pricing/ru/rebuy.mdx`
  - `/content/pricing/ru/recharge.mdx`
  - `/content/pricing/ru/signifyd.mdx`
  - `/content/pricing/ru/tidio.mdx`
  - `/content/pricing/ru/triple-whale.mdx`
  - `/content/pricing/ru/yotpo.mdx`
  - (15 файлов; klaviyo RU был сделан в прошлой сессии и тоже имеет hybrid-стиль — стоит ребилднуть тоже = 16 total)
  - На проде сейчас читаемые англофоном (SEO + читатели с английским не страдают), но не nation-quality RU. **Не блокер прода, но долг к закрытию до серьёзного RU-трафика.**
- **КАПЕЛЬНЫЙ МЕХАНИЗМ отложенной публикации** — НЕ СДЕЛАН, следующая задача. `published: false` boolean во frontmatter / DB columns, скрывает из роутов + sitemap, CHIEF (или Claude Code helper) флипает N штук/день по priority-списку. Общий type-agnostic — pricing/guide/comparison/best/alternatives. Без этого механизма следующие массовые публикации = velocity-flag риск.
- **~34 оставшихся pricing-ключей** из 2-й волны Etap J. Метод data-first + realtime web (CONTENT-WRITING.md раздел 2). По Definition of Done — каждая страница EN+RU + hub auto-update (уже type-agnostic) + sitemap (loop уже type-agnostic) + перелинковка + `/compare/` backlinks (BACKLINKS array расширять при добавлении новых tools).
- **Остальные buckets 2-й волны — все по Definition of Done:**
  - `guide` 33 + 19 carry-over + 2 reclassified = **~54 страниц** → `/guides/[slug]` MDX
  - `how-to` 1 → `/guides/[slug]`
  - `vs-comparison` 29 new pairs → `/compare/[slug]` DB
  - `best-for-segment` 29 extended → `/best/[slug]` MDX+DB hybrid
  - `alternatives` 20 extended editorial → расширение `alternatives_editorial` jsonb
  - `review` 6 "is X worth it" — decision pending
  - `discount` 44 — deferred до партнёрок
- **Этап H** — нумерация всего пула для CHIEF prioritisation.
- **Этап I** — CHIEF капельно публикует через механизм отложенной публикации.

**Системные/инфра (unchanged):**

- `scripts/build-search-index.ts` проверить на все типы (pagefind не индексирует runtime-генерируемые типы — /tools/, /best/, /alternatives/, /pricing/).
- `content-validator.ts` TS strict-mode — non-null assertions добавлены post-build, при следующей правке валидатора заменить на явные `return`.
- Все carryovers из сессий 1-7 + 2026-06-03 sessions 1-2 — unchanged (см. предыдущий список выше в этом блоке).

### Final commit chain (session 3 — extended)

- (8 коммитов выше из `feat/pricing-bulk` + merge `fbfffcc`)
- `chore(sessions): close 2026-06-03 (session 3) — content-gate v2 + RU backfill 15/15 + main merge` (5fcfbe5) — первый close-блок
- `feat(nav): /pricing hub + Resources nav/footer entries + DoD rule + backlinks bulk-16` (fc1e949) — orphan-fix + DoD правило, на main, прод verified
- `chore(sessions): close 2026-06-03 (session 3) — extended: orphan-fix + DoD rule + 14 backlinks applied` (this commit)

### Что в проде живо после сессии — финальное

- 16 `/pricing/{slug}` EN + 16 `/ru/pricing/{slug}` RU — все 200.
- **`/pricing` + `/ru/pricing` хаб** — list-grid всех pricing-страниц текущей локали, type-agnostic discovery, breadcrumb + ItemList JSON-LD.
- **Navbar Resources dropdown** содержит Best · Alternatives · Pricing (desktop + mobile Sheet). **Footer Resources column** mirror.
- **Sitemap** включает `/pricing` хаб (priority 0.85) + per-slug loop для обоих языков.
- **`/compare/{X-vs-Y}` verdict** содержит backlinks на `/pricing/{X}` и `/pricing/{Y}` для всех 16 pricing-tools (14 newly applied + 40 already linked + 8 no-verdict skipped).
- **`CONTENT-WRITING.md` + `CLAUDE.md`** прописывают **Definition of Done** type-agnostic правило: страница не готова без хаба + Navbar/Footer + sitemap + перелинковки + валидатора.


---

## 2026-06-04 — [code+infra] капельный механизм отложенной публикации (Vercel-cron + DB-гейт)

### Commits
- `feat(drip): DB-backed page-visibility gate behind DRIP_GATE_ENABLED flag`
- `feat(drip): monthly rate escalation (4→7→10) + pool counters in cron`
- `feat(drip): gate-row in Definition-of-Done + session log` (этот close-коммит)

(Идентификация по subject, не по hash — см. правило в CLAUDE.md.)

### Задача
Собрать капельный механизм отложенной публикации: контролировать КОГДА готовая страница становится публично видимой, дозировать N/день с эскалацией по месяцам, чтобы не ловить Google velocity-flag при массовой генерации pSEO-контента.

### Сделано
- **Вариант A — единый DB-гейт `page_publications`** (миграция `020_page_publications.sql`), type-agnostic. Ключ `(content_type, slug)` БЕЗ locale → enforce'ит DoD-инвариант «нет полу-опубликованной локали» (EN+RU атомарно). Поля: `pool_number` (сквозной номер пула, Этап H), `visible_at` (NULL=скрыта). Partial-индексы (uniq pool_number, visible-by-type, drip-queue). RLS on, service-role-only. Применена оператором в Studio.
- **Backfill** (`scripts/backfill-page-publications.ts`): 116 live-страниц засеяны `visible_at=now()`, `pool_number=NULL` (16 pricing + 5 guides + 8 best + 30 tools + 30 alternatives + 27 comparisons). Verify: `gate_tools=db_tools=30`, `gate_cmp=db_cmp=27`.
- **Гейт фильтрует во ВСЕХ точках** (`lib/content/visibility.ts` — `getVisibleSet`/`filterVisible*`, React-cache, fail-open): MDX-слой (`getMdxContent` + `getAllMdxSlugs` → хабы/sitemap/staticParams наследуют), DB-хабы (tools/compare/alternatives), DB-детальные (notFound), related-blocks, PartnerAlternatives, homepage, compare-OG, sitemap (tools/alternatives/comparisons петли), Pagefind (guides/tools/comparisons) — EN+RU. `RecommendedTools` (/go-редирект, не страница) и `RelatedArticles` (наследует через `getAllMdxFrontmatter`) — намеренно без гейта.
- **`DRIP_GATE_ENABLED=true` живой** в Production. Проверено: скрытая страница (visible_at=NULL) → 404, видимая → 200.
- **Vercel-cron `/api/cron/drip-publish`** (`0 13 * * *` = 06:00 LA) под `CRON_SECRET`. Флипает next N numbered+hidden по `pool_number` ASC → `visible_at=now()` + `revalidatePath` (EN+RU детальный + хаб + sitemap + homepage) + best-effort semantic_core sync (exact path-match) + `agent_logs.drip_published`. Race-safe (`.is(visible_at,null)` guard).
- **Эскалация N 4→7→10/мес** (`computeRate`): `monthIndex = floor(daysElapsed/30)+1` от `system_config.publishing_start_date`; кривая из `publishing_ramp` (дефолт зашит, миграция не нужна); override `publishing_rate_override` (0=пауза). Растёт сам.
- **Счётчик** `{total, published, remaining}` среди пронумерованных — в ответе крона каждый запуск + SQL для Studio.
- **Финальный тест 404→200 по pool_number пройден**: 2 застейдженные страницы (yotpo#9001, triple-whale#9002) → очередь выбрана по порядку 9001→9002 → flip → revalidate → 200. Подчищено (pool_number=NULL), очередь пуста, тест-скрипт удалён.
- **DoD-правило обновлено** (`CONTENT-WRITING.md`, пункт 6): новая страница без gate-строки = не готова.

**РЕШЕНИЕ:** публикация целиком на **Vercel-cron + БД**, агенты НЕ участвуют. CHIEF из схемы публикации убран (рассматривали вариант «CHIEF дёргает curl» — отклонён: упрощение, политика в DB переживает любую перестройку агентов).

### Обнаружено
- **Vercel умеет нативные cron'ы** (`vercel.json` crons + `/api/cron/*` + авто-`CRON_SECRET`) — публикация **не требует агентов вообще**. Это меняет роль/необходимость OpenClaw-агентов (пересмотр предстоит — см. follow-ups).
- `CRON_SECRET` помечен Sensitive в Vercel → значение не достать ни оператору (пустой Edit-плейсхолдер), ни Claude Code (нет в `.env.local`). Ручной curl на cron невозможен с обеих сторон; финальный flip доказан зеркалом алгоритма крона через service-role + `REVALIDATE_SECRET`. HTTP-путь крона подтверждён живым косвенно (401 secured; ранее `queue_empty` 200).
- Реальный тулсет CHIEF (`Resources/ags/chf/TOOLS.md`) = bash + curl + `source ~/.openclaw/credentials/*.env` — агенты МОГУТ HTTP (спека «нет HTTP» была stale). Но для drip это неактуально (Схема 1).
- Node24/Windows: inline `tsx -e` с Supabase-fetch + неявный exit глотает stdout (drain-quirk) — в скриптах нужен явный `setTimeout` drain перед exit.

### Fixes
- `lib/supabase/types.ts` — добавлен `page_publications` Row/Insert в Database (иначе typed service-client не видит таблицу).
- Rollout под env-флагом (`DRIP_GATE_ENABLED`, дефолт no-op) — деплой гейт-кода НЕ менял прод до бэкфилла; флаг включён только после verify покрытия. Пустой гейт + включённый фильтр = весь сайт 404 — флаг это предотвратил.

### Open follow-ups
- **Этап H** — проставить `pool_number` пронумерованным заготовкам пула (создать gate-строки `visible_at=NULL` + `pool_number` по порядку).
- **`publishing_start_date`** — поставить в `system_config` когда стартуем реальную рампу (SQL в коде/чате есть).
- **Остальные buckets 2-й волны** — guide+how-to ~34, vs-comparison 29, best-for 29, alternatives 20, review 6. Метод data-first + realtime web, каждая по Definition of Done (вкл. **gate-строку**).
- **ПЕРЕСМОТР АГЕНТОВ (отдельная сессия):** убрать OPS; сократить до 1-2 агентов; SCOUT без RSS — по новым каналам; CHIEF опционально как мониторинг + GSC-отчёт + быстрый доступ, **НЕ публикация**; GSC-статистику может тянуть и Claude Code.
- **Pagefind** — расширить покрытие на pricing/best (сейчас индексит только guides/tools/comparisons).
- **Homepage «Latest reviews»** сломан post-merge `/reviews/`→`/tools/` (`getAllMdxFrontmatter("reviews")` пуст).
- **`FINAL-ARCHITECTURE-V4.md` rewrite** — накопленный drift, особенно секции про агентов и публикацию (устарели после Схемы 1).


---

## 2026-06-04 (close) — [code+infra] финал сессии + cron 01:00 LA + точка входа

### Сделано сегодня
Капельный механизм **полностью**: `page_publications` gate type-agnostic (миграция 020); 116 страниц live (backfill `visible_at`); `DRIP_GATE_ENABLED=true`; Vercel-cron `/api/cron/drip-publish` под `CRON_SECRET`, расписание **01:00 LA круглый год** (Vercel cron UTC-only → два слота `0 8`+`0 9` UTC + DST-guard `laHour()===1` в хендлере: один слот всегда попадает в 01:00 LA, второй скипается; IANA-tz применяет перевод часов сам, без сезонного механизма; `?force=1` для ручного запуска); эскалация N **4→7→10/мес** (`computeRate`, 30-дн блоки); счётчик `{total,published,remaining}` в ответе крона; finalize-тест **404→200 по pool_number пройден**.

**РЕШЕНИЕ:** публикация на **Vercel-cron + БД**, агенты НЕ участвуют.

Ранее в серии (контекст): **content-gate v2** (валидатор type-agnostic — overflow description / голый `<>` перед цифрой-$ / EN↔RU pairing; Haiku/OpenRouter путь удалён; перевод EN+RU в одной сессии движком Claude Code; **definition-of-done** как hard-rule).

### ФАКТ на конец сессии
- **116 страниц live** (оба класса):
  - MDX **29**: pricing 16 / guides 5 / best 8 (+ RU-пары).
  - DB **87**: tools 30 / comparisons 27 / alternatives 30.
- **Drip-очередь: 0** — `pool_number` нигде не проставлен (Этап H не сделан), cron сейчас отдаёт `queue_empty`.
- **Почему прошлые волны ушли разом:** для DB-типов генерация = `status='published'` = **мгновенный live** (так было ДО гейта). Задним числом эти страницы **НЕ прячем** — Google уже проиндексил, скрытие навредит. Капельница — **для БУДУЩЕГО контента**, не ретроактивно.

### Осталось написать
**~205 активных ключей 2-й волны:** pricing 37, vs-comparison 29, best-for 29, guide 33, alternatives 20, review 6, how-to 1. (+44 `discount` отложены — ждут партнёрских промокодов.)

### ТОЧКА ВХОДА — следующая сессия (Infrastructure)
1. **Этап H** — проставить `pool_number` пулу по приоритету (создать gate-строки `visible_at=NULL` + `pool_number` по порядку для пронумерованных заготовок).
2. **Наполнение buckets 2-й волны** (метод data-first + realtime web, см. `CONTENT-WRITING.md`), каждая страница строго по **definition-of-done**. **Новый контент создавать СКРЫТЫМ** (`visible_at=NULL` + `pool_number`) → в drip-очередь, **НЕ сразу live**.

> **КРИТИЧНО (требование оператора, нарушалось в прошлых сессиях):** **НЕ публиковать пачками.** Весь новый контент → drip-очередь → cron капает 4/день (с эскалацией). Никаких массовых `status='published'` / `visible_at=now()` на пачку.

### Прочее (follow-ups, без изменений)
Пересмотр агентов (OPS убрать, SCOUT без RSS, CHIEF опц. мониторинг+GSC, НЕ публикация); Pagefind покрытие pricing/best; homepage «Latest reviews» сломан (`/reviews/`→`/tools/`); `FINAL-ARCHITECTURE-V4.md` rewrite (drift в секциях про агентов/публикацию).

### Commits (этот close)
- `feat(drip): cron 01:00 LA (0 8 UTC) + session close & entry point`

---

## 2026-06-04 — [writer] 2-я волна старт: pricing-bucket ЗАКРЫТ (14 скрытыми) + инфра-фиксы

### Commits
- `content: pricing wave 1 — loop-returns, loyaltylion, loox, pencil` (6c7c1a7)
- `content: pricing wave 2 — judge-me, skio, loop-subscriptions, polar-analytics` (9fc26c4)
- `content: pricing wave 3 — stay-ai, limespot, flair-ai, shopify-sidekick` (abbb113)
- `fix(drip): gate hidden pricing pages' OG image (leak audit)` (cec797e)
- `fix(drip): make article-published webhook drip-gate-aware` (2011a43)
- `feat(drip): fixed 01:00 LA year-round via two UTC slots + DST guard` (d17175e)

(Идентификация по subject, не по hash — см. CLAUDE.md.)

### Задача
Стартовать 2-ю волну наполнения. Закрыть pricing-bucket: написать все реально новые pricing-страницы СКРЫТЫМИ в drip-очередь (НЕ live разом), методом data-first + realtime web. Контроль-first на 2 страницах, затем пачка.

### Сделано
- **Pricing-bucket ЗАКРЫТ: 14 новых pricing-страниц (EN+RU) написаны СКРЫТЫМИ** методом data-first+web, в drip-очереди pool **#1-14** (`visible_at=NULL`, 404 на проде, ждут капельной публикации). Тулза: adcreative-ai, smile-io, loop-returns, loyaltylion, loox, pencil, judge-me, skio, loop-subscriptions, polar-analytics, stay-ai, limespot, flair-ai, shopify-sidekick.
- **16 дублей-ключей зареконсилены** (вторичные ключи к существующим pricing: mailchimp cost→/pricing/mailchimp, klaviyo sms pricing→/pricing/klaviyo, attentive sms/mobile/cost→/pricing/attentive ×3, и т.д.) → `published` со ссылкой на существующую live-страницу, **НЕ переписаны**.
- **База освежена** (офиц.цены разошлись): smile-io min 49→79 (Starter снят→Standard), loox 9.99→14 (Scale-тариф убран), limespot 18→150 (перешёл на единый Max revenue-tiered), flair-ai 10→8 (Pro entry) + pricing_notes/_ru. Остальные 10 — офиц.совпали с базой, без изменений.
- **`second_wave` pricing-ключей = 0** — bucket закрыт (16 оригиналов published + 16 дублей published + 21 ключ новых тулзов ready_to_publish).
- Каждая страница: валидатор `--strict-pairing` зелёный, banned-phrases чисто, /go/ где affiliate (loox), judge-me carve-out (нет партнёрки — честно без CTA), honest framing.

### Инфра-фиксы
- **OG-роут скрытых страниц светился 200 → починен (cec797e):** `isSlugVisible` guard → `notFound()`, теперь 404 для скрытых, динамически следует за гейтом (EN+RU). Полный аудит утечек: скрытое НЕ палится нигде — sitemap исключает (gated на генерации), generateStaticParams не пререндерит, внутренние ссылки/хаб/Pagefind/feed/OG чисто. Sitemap-латентность опубликованного (до 24ч/деплоя) — НЕ утечка, оставлена (24ч revalidate ради CPU).
- **Webhook post-commit стал drip-aware (2011a43):** помечает semantic_core `published` ТОЛЬКО если страница видима (`page_publications.visible_at IS NOT NULL`); скрытая/нет gate-строки → `ready_to_publish`. `published_article_path` нормализован в канонический `/{seg}/{slug}` (cron-sync матчит). Comparison-bridge НЕ тронут (там `comparisons.status='published'` нужен чтобы роут рендерил, видимость гейтится отдельно). **Систематический drift устранён — ручной reconcile каждую волну больше НЕ нужен, покроет и comparisons.**

### Обнаружено
- **post-commit webhook исторически флипал semantic_core в `published` при КОММИТЕ, игнорируя drip-гейт** — каждый коммит скрытого контента создавал drift (14 primary-ключей новых тулзов ушли в published с RU-путём). Это неавторитетный drift (гейт `page_publications` — истина видимости, страницы 404), но искажал трекинг. Пофикшено №2 выше.
- OG-роут метадата (как и sitemap) НЕ пробивается `revalidatePath` промптно через CDN Vercel — догоняет на деплое/24ч ISR. Для скрытия это безопасно (гейт применяется на генерации). Логика гейта в OG/sitemap корректна (видимая klaviyo OG=200, скрытая=404 — доказано флип-тестом).
- Cron 01:00 LA круглый год: два UTC-слота `0 8`+`0 9` + DST-guard `laHour()===1` в хендлере + 20ч дубль-защита (d17175e).

### Fixes
- `app/pricing/[slug]/opengraph-image.tsx` — `isSlugVisible("pricing", slug)` → `notFound()` для скрытых (RU ре-экспортит default, наследует).
- `app/api/agents/article-published/route.ts` — `isPageVisibleNow()` guard перед status-флипом; helpers `parseRepoPath` / `canonicalPublicPath` / `GATED_TYPES`; fail-open на transient DB error (гейт всё равно контролирует реальную видимость).

### Open follow-ups / ТОЧКА ВХОДА — следующая сессия (наполнение 2-й волны)
**СЛЕДУЮЩИЙ BUCKET — vs-comparison** (29 ключей, `template='vs-comparison'` `status='second_wave'`). DB-driven, роут `/compare/` существует.
- **Контроль-first:** СНАЧАЛА 1-2 контрольные comparison → проверить связку MDX→`public.comparisons` bridge + gate-строку `content_type='comparisons'` + **RU-row ВРУЧНУЮ** (translate-script comparisons НЕ покрывает — писать RU сразу как часть DoD) + страница скрыта (404). Потом пачка.
- **СКРЫТЫМИ:** `visible_at=NULL` + `pool_number` продолжать **от 15** (pricing занял 1-14), по `priority_score`.
- Метод data-first+web, definition-of-done (EN+RU, навигация, sitemap, перелинковка, валидатор, gate-строка).
- **webhook-drift уже пофикшен — reconcile НЕ нужен.**

**Дальше по порядку:** best-for (29, `/best/` гибрид) → guide+how-to (34, `/guides/` MDX) → alternatives (20, `/alternatives/` DB jsonb) → review (6, `/tools/` DB). Все СКРЫТЫМИ в очередь, нумерация сквозная по `priority_score`, капают 4/день (мес1) → 7 (мес2) → 10 (мес3).

**КРИТИЧНО:** весь новый контент СКРЫТЫМ в drip-очередь, НЕ live разом.

Пауза НЕ ставится — drip капает штатно 4/день, #1/#2 (adcreative-ai, smile-io) выйдут ближайшей ночью 01:00 LA.

---

## 2026-06-05 — [writer] 2-я волна ЧАСТЬ 1 ЗАКРЫТА (best-for + guide/how-to + alternatives + review)

### Commits
- `fix(best): dynamicParams=true so drip reveals best pages without redeploy`
- `content(best): 2 control best-for listings — subscription + review apps (EN+RU, hidden/drip)`
- `content(best): 7 best-for-segment listings batch (EN+RU, hidden/drip pool 17-23)`
- `fix(guides): dynamicParams=true so drip reveals guides without redeploy`
- `content(guides): 2 control guides — Yotpo Loyalty + Klaviyo for Shopify (EN+RU, hidden/drip)`
- `content(guides): 22 guide+how-to pages batch (EN+RU, hidden/drip pool 26-47)`
- `docs(session): writer-log — Часть 1 2-й волны закрыта` (this commit)

(alternatives + review — DB-only, без коммитов: editorial jsonb + semantic_core reconcile.)

### Задача
Закрыть Часть 1 второй волны: best-for-segment (29 ключей), guide+how-to (34), alternatives (20), review (6). Контроль-first на каждом новом типе, потом пачка. Всё новое — СКРЫТЫМ в drip-очередь; alternatives/review — особый случай (страницы уже live).

### Сделано — ЧАСТЬ 1 ЗАКРЫТА
- **best-for-segment: 9 страниц написано СКРЫТЫМИ** (EN+RU), drip pool **#15-23**. 29 ключей: 12 → 7 новых + 2 контрольных (multi-keyword поглощение), 11 → существующие 8 best (published), 4 → 2 контрольных (ready). `second_wave best-for = 0`.
- **guide+how-to: 24 страницы написано СКРЫТЫМИ** (EN+RU), drip pool **#24-47**. 34 ключа: 32 → 22 страницы (2 контроль + 22 батч... = 24 страницы; multi-keyword: loyalty 4, sidekick 3, и т.д.). `second_wave guide/how-to = 0`. Метод: tool rows + vendor docs (Klaviyo/AfterShip/Yotpo/Sidekick help-centers) + WebSearch.
- **alternatives: 14 страниц ОБОГАЩЕНО editorial (enrich-in-place, остались LIVE)**. 20 ключей → published. `tools.alternatives_editorial` jsonb (intro/verdict EN+RU + perCardContext на 6). Честность: partner-first грид, но verdict честно ставит бесплатное/нативное #1 по фиту где правда (yotpo/loox→judge-me, mailchimp→omnisend free tier) с явной оговоркой про комиссию. `second_wave alternatives = 0`.
- **review: 6 ключей РЕКОНСИЛЕНО → published** на существующие live /tools/ обзоры. «is X worth it» варианты для mailchimp/triple-whale/adcreative-ai/klaviyo/yotpo — уже полные обзоры, writing не требовался. `second_wave review = 0`.

### Drip-очередь итого
`pool total=47, visible=4, hidden=43`: pricing #1-14 (4 visible), best #15-23, guides #24-47 — все hidden, капают 4/день 01:00 LA. alternatives+review — live (не в очереди).

### Сверка second_wave (по всем типам Части 1 = 0)
`SELECT template,count(*) WHERE status='second_wave'`: остаток **только** `vs-comparison 29` (Часть 3, не делали) + `discount 44` (deferred до партнёрок). Все типы Части 1 (pricing/best-for/guide/how-to/alternatives/review) = 0. ✓

### Фиксы сессии
- **dynamicParams=false → true на `/best/[slug]` + `/guides/[slug]`** (оба + RU mirror). Был баг: `getAllMdxSlugs` фильтрует скрытые слаги из `generateStaticParams`, при `dynamicParams=false` drip-флип не раскрыл бы страницу (404 до деплоя, т.к. revalidatePath не перезапускает generateStaticParams). Доказано на проде: флип visible+revalidate → 200 без редеплоя. pricing/tools/alternatives уже были true.
- **recharge `pricing_min` 25→99** (публичный Starter; скрытый $25-тариф для new merchants ≤50 подписчиков описан в pricing_notes/_ru как off-page sandbox, $99 = устойчивый пол). Vendor TODAY (getrecharge.com 2026-06-05) публично показывает $99.

### Обнаружено
- **alternatives тонкие-категории грид-fallback (CODE-ДОЛГ).** 8 из 14 alternatives-страниц (manychat, tidio, aftership, attentive, adcreative-ai, signifyd, loyaltylion, pencil) имеют категорию из 1-2 тулзов → `fetchAlternatives` падает в fallback на топ-по-рейтингу ЛЮБОЙ категории (показывает judge-me/loop-subscriptions/loox вместо релевантных). Editorial intro/verdict честно это обрабатывают (называют реальную альтернативу + помечают broad list), но грид нерелевантен. **Фикс на потом:** при `pool.length===1` показывать единственного category-mate + «closest in category», не cross-category по рейтингу; либо `alternatives_to` для пина.
- **alternatives + review — НЕ drip-юниты.** Страницы уже live с Etap F (auto-grid/обзоры), pool_number нет. 2-я волна для них = enrich/reconcile-in-place (правка живого, не новая публикация → velocity-риска нет). Не прятать. Та же логика что 116 первой волны.
- **Multi-keyword поглощение** (как best-for): несколько ключей про один тул → одна страница. guide: loyalty(4)/sidekick(3)/omnisend,attentive,manychat,recharge,smile-io,aftership,loop-subs,loop-returns(2). alternatives: mailchimp(4)/adcreative-ai(3)/omnisend(2). Объясняет «недостачу» при наивном счёте страниц.

### Fixes
- `app/best/[slug]/page.tsx` + `app/ru/best/[slug]/page.tsx` — dynamicParams=true.
- `app/guides/[slug]/page.tsx` + `app/ru/guides/[slug]/page.tsx` — dynamicParams=true.
- `tools.alternatives_editorial` для 14 тулзов (mailchimp, yotpo, omnisend, northbeam, loox, judge-me, manychat, tidio, aftership, attentive, adcreative-ai, signifyd, loyaltylion, pencil).
- `tools.pricing_min`/`pricing_notes`/`pricing_notes_ru` для recharge (25→99 + hidden-$25 framing).

### Open follow-ups / ТОЧКА ВХОДА — следующая сессия (Content writing)

**ЧАСТЬ 2 — залить 19 внешних туллов в каталог:**
- Источник Deep Research: `/mnt/user-data/uploads/Extra_Tools.md` (19 внешних конкурентов из Часть-2-анализа). Отдать Claude Code → INSERT 19 `tools`-строк (БЕЗ миграций, существующие поля).
- **affiliate_url где партнёрка есть:** Constant Contact, ActiveCampaign, Brevo, Hyros, Chatfuel, LiveChat, Help Scout, ShipStation, Bazaarvoice.
- **carve-out (нет CTA, /go/→/tools) где нет:** Zendesk, Intercom, Riskified, ParcelLab, Route, Google Analytics, Rockerbox, Stamped + слабые Bold Subscriptions, Returnly.

**ЧАСТЬ 3 — генерация по новым туллам:**
- (6) **19 tool-страниц** новых туллов → `/tools/` СКРЫТЫМИ, pool продолжать **от 48**, по priority внешнего (Constant Contact → Bazaarvoice → ActiveCampaign → Hyros → Chatfuel → Brevo → Stamped → хвост). Контроль-first.
- (7) **24 vs-comparison** → `/compare/` DB-driven СКРЫТЫМИ, по priority ключа (`mailchimp vs constant contact` ps1170 первый). **Контроль-first для comparison** (DB-bridge MDX→`public.comparisons` + gate-строка `content_type='comparisons'` + **RU-row ВРУЧНУЮ** — translate-script comparisons НЕ покрывает). webhook drip-aware уже пофикшен — reconcile не нужен.

**CODE-долги (когда дойдём до кода):**
1. alternatives тонкие-категории грид (`pool.length===1` → closest-in-category вместо cross-category по рейтингу).

**КРИТИЧНО:** весь НОВЫЙ контент (tool-страницы, comparisons) — СКРЫТЫМ в drip-очередь, pool продолжать от 48. alternatives/review-паттерн (enrich/reconcile live) — только для уже-существующих страниц.

---

## 2026-06-05 (session 2) — [infra] унификация логов + 2 режима + упразднение packet-пайплайна + реконсиляция архитектуры + Resources/

### Commits
- `docs(sessions+arch): unify session logs, retire packet pipeline, reconcile FINAL-ARCHITECTURE-V4` (dc2d5bc)
- `docs: consolidate operator instruction/reference docs into Resources/` (04affd6)
- `chore: relocate New_Design/ + ags/ into Resources/, fix references` (94fc6f1)

### Задача
Навести порядок в «рабочей папке»: слить разрозненные логи в один, убрать мёртвое/дублирующее, привести спеку к реальности, собрать операторские доки в одно место.

### Сделано
- **Единый `sessions/session-log.md`**: слиты `infra-log.md` + `writer-log.md` + `NEXT-SESSION-START.md`. Хронологически, теги типа `[writer]`/`[code]`/`[infra]`, хвост-5 verbatim, остальное скомпакчено. Старые 3 файла удалены.
- **CLAUDE.md: 4 режима → 2.** Остались **Infrastructure** и **Content writing** (= Infrastructure + `Resources/CONTENT-WRITING.md`). Code/feature и CONTENT_WRITING_02 упразднены. Протокол старта читает единый лог **независимо от mode** (фикс структурного бага рассинхрона: mode-specific лог скрывал свежую работу другого типа — проявлялся «второй раз» в начале сессии).
- **Упразднён packet/OPS контент-пайплайн**: удалён `writer-queue/` целиком + 3 helper-скрипта (`next-task`/`current-queue`/`after-publish`); из `validate-infra.ts` вычеркнуты только их проверки (живое оставлено); CLAUDE.md content-workflow переписан на data-first → hidden → drip.
- **`Resources/FINAL-ARCHITECTURE-V4.md` реконсилирована** к состоянию 2026-06-05: баннер дельт; публикация = Vercel-cron + `page_publications` (без агентов); контент data-first; reviews→/tools (DB); добавлены `page_publications` + сводка миграций 009-020; OPS=gpt-5.5; удалены выполненные setup-фазы (Phase 1 mega-prompt, Phase 3/4) и стартовый план; Q&A/weekly-flow/Flows переписаны.
- **Операторские доки собраны в `Resources/`**: 9 доков (6 через git mv + 3 untracked) + `New_Design/` + `ags/`. Пути обновлены в `CLAUDE.md` (+пометка «доки оператора в Resources/, туда же новые файлы»), `tsconfig.json` (exclude), комментах компонентов/скриптов, `config/partner-list.json`, session-log, памяти `ags-drop-folder`.

### Обнаружено
- **Рассинхрон логов был структурным**, не разовым: протокол велел читать только mode-specific лог → свежая работа другого типа невидима. Лечится единым логом + чтением независимо от mode.
- `validate-infra.ts` завязан на `writer-queue/`/`content-templates/`/helper-скрипты — при удалении надо синхронно чистить его проверки, иначе `npm run validate:infra` падает.
- `tsconfig.json` исключает `New_Design` из компиляции — переезд папки требует правки exclude (иначе билд начнёт компилировать вложенный Next-проект). Build-critical.
- **`agent-snapshots/` нельзя просто перенести**: живые агенты (CHIEF/OPS на Mac Mini) пишут туда ежедневно через GitHub API по захардкоженному пути; перенос без правки их AGENTS.md на Mac Mini → они пересоздадут папку в корне + дубль. Оставлена в корне.
- Pre/post-commit хуки не сработали (нет staged MDX под content/) — безопасно для не-контентных коммитов.

### Fixes
- Единый лог + read-regardless-of-mode протокол (фикс рассинхрона).
- validate-infra.ts: убраны проверки мёртвого packet-пайплайна.
- tsconfig exclude New_Design → Resources/New_Design.

### Open follow-ups
- **agent-snapshots/ перенос в Resources/** — отложен до пересмотра roster агентов (нужна синхронная правка путей у агентов на Mac Mini + validate-infra).
- **PHASE-0-BLUEPRINT.md** — оператор: файл мёртв, ждёт удаления, никто не пользуется. Правки оставлены локально незакоммиченными (на GitHub чистая версия); в CLAUDE.md помечен историческим. Не реанимировать как актуальный.
- **4 untracked-дока в Resources/** (BOTAPOLIS-PLAYBOOK-V2, INSTRUCTIONS, TRI-AGENT-ARCHITECTURE, Extra_Tools) — оставлены локальными по решению оператора. Следствие: ссылка CLAUDE.md → BOTAPOLIS-PLAYBOOK-V2 битая в свежем клоне (оператор принял).
- **Контент 2-й волны (актуальная точка входа из блока 2026-06-05 выше):** Часть 2 — залить 19 внешних туллов в каталог (`Resources/Extra_Tools.md`); Часть 3 — 19 tool-страниц + 24 vs-comparison, скрытыми в drip-очередь, pool от #48.
- Прочее без изменений: Pagefind покрытие pricing/best; homepage «Latest reviews» сломан; roster агентов под пересмотром (OPS убрать и т.д.).

---

## 2026-06-05 (session 3) — [writer+code] 2-Я ВОЛНА ЗАКРЫТА: каталог +19, tool-страницы +18, vs-comparison +21

### Commits
- `chore(tools): seed 19 external catalog tools (wave-2 Part 2)`
- `chore(tools): chatfuel->firstpromoter, shipstation->cj affiliate_partner`
- `docs(session): close 2026-06-05 session 3` (этот close-коммит)

(Большая часть работы — DB-only: tools/comparisons/page_publications/semantic_core пишутся напрямую через service-role, в репо коммитов нет. Идентификация по subject, не по hash — см. CLAUDE.md.)

### Задача
Финал 2-й волны: Часть 2 (19 внешних туллов в каталог) → Часть 3 (18 tool-страниц новых туллов + 21 vs-comparison), всё скрытым в drip-очередь. Контроль-first на каждом новом типе.

### Сделано — 2-Я ВОЛНА ЗАКРЫТА ПОЛНОСТЬЮ (кроме discount 44 — отложен до промокодов). Все content-template `second_wave = 0`.
Произведено за волну (все сессии):
- **pricing 14 EN+RU** (MDX /pricing/, drip #1-14)
- **best-for 9 EN+RU** (MDX /best/, drip #15-23)
- **guide+how-to 24 EN+RU** (MDX /guides/, drip #24-47)
- **alternatives 14 enrich-in-place** (DB jsonb, live — НЕ drip)
- **review 6 reconcile** (live /tools/)
- **Часть 2: 19 внешних туллов** залиты в каталог (DB data-only, draft/archived) — `scripts/seed-extra-tools.ts`
- **Часть 3: 18 tool-страниц** новых туллов (DB /tools/, drip #48-65) + 1 archived (Returnly)
- **Часть 3: 21 vs-comparison** (DB /compare/, drip #66-86) + 6 reconcile + 2 excluded (returnly dead, manychat free-vs-pro tier)

Каталог: tools `published=48`, `archived=5`, `draft=0`. comparisons `published EN=48`.
Drip-очередь: `pool total=86, visible=4` (раскрыты cron), `hidden=82`. Капает 4/день 01:00 LA по `pool_number` → 7/день мес2 → 10/день мес3.

Цены освежены (Часть 3, realtime web): chatfuel **tiered→flat $69** (смена модели, Fuely Super/Max убраны), help-scout $20→**$25**, bold-subscriptions +Grow/Scale/Ultimate **max→$399.99**, intercom Copilot $35→**$29**, livechat/shipstation refresh + дата, recharge **$25→$99** (ранее), +6 pricing-туллов в pricing-волне.

### Механики доказаны (флип 404→200→404 без деплоя через `/api/revalidate` + `REVALIDATE_SECRET`)
- `dynamicParams=true` на `/best/` `/guides/` (ранее), `/tools/` `/compare/` (уже были true).
- webhook drip-aware (2011a43): semantic_core НЕ флипается в published пока страница скрыта.
- **DB-comparison bridge:** запись напрямую в `public.comparisons`, EN+RU = **две строки** (один slug, `language` en/ru), onConflict `slug,language`. RU-row пишется ВРУЧНУЮ (translate-script comparisons не покрывает). Богаче 1-й волны: 1-я ставила только meta_title, эта — verdict/custom_intro/meta/comparison_data.useCases×3/winner_for×3 EN+RU.
- **carve-out verdict→наш affiliate-тул:** у внешних carve-out нет /go/ CTA, verdict честно ведёт на наш каталожный тул с партнёркой (zendesk→Gorgias, intercom→Gorgias, stamped→Loox/Yotpo/Judge.me, riskified→Signifyd, parcellab/route→AfterShip, GA→Triple Whale, bold→Recharge, rockerbox→Triple Whale). В comparison /go/ всегда к стороне с affiliate.

### Обнаружено
- **affiliate_partner CHECK** (`tools_affiliate_partner_check`) — закрытый enum (impact/partnerstack/rewardful/direct/tapfiliate/lasso/partnerportal). chatfuel(FirstPromoter)/shipstation(CJ) сначала смаплены в direct/impact, потом оператор расширил CHECK в Studio (+`firstpromoter`,`cj`) → поправлены на реальные сети.
- **`tools.alternatives_to` = uuid[]** (не slug[]) — INSERT слага падает «invalid input syntax for type uuid». Ставить [] или реальные UUID.
- **canon compare slug = алфавит туллов** через `-vs-` (`lib/content/slug.ts`); роут редиректит неканон → канон. tool_a/tool_b ставим в порядке slug.
- **29 second_wave vs-comparison** (не 22): фильтр по именам новых туллов пропускал пары существующих туллов. Из 29: 21 написано/ready, 6 реконсил к live (канон-slug уже в 1-й волне), 2 excluded.
- **Дубли канон-slug в ключах:** «klaviyo vs mailchimp for shopify» = «mailchimp vs klaviyo for shopify»; «recharge vs loop» = «loop vs recharge» — оба члена пары реконсилены к одной существующей странице.
- Статус-конвенция drip-aware: новый скрытый контент → `ready_to_publish` + `published_article_path` (cron флипнет в published при раскрытии по exact-path); реконсил к live → `published`. Так `second_wave=0` без ложного published.
- WebFetch official-pricing у многих вендоров отдаёт 403 (Constant Contact, Stamped) или JS-пустышку (ActiveCampaign, Brevo, Route) — базовые цены берём официальные с честной датой, при невозможности добора оставляем baseline + WebSearch-подтверждение неизменности.

### Fixes
- `scripts/seed-extra-tools.ts` (закоммичен) — идемпотентный seed 19 туллов.
- chatfuel/shipstation affiliate_partner → firstpromoter/cj после расширения CHECK.
- Returnly закрыт: tool `status=archived`; ключ «loop returns vs returnly» `status=excluded` + note (sunset 2023 → Loop Returns, покрыто migrate-returnly-to-loop how-to).
- «manychat free vs pro» `status=excluded` + note (plan-tier, не tool-vs-tool; покрыто /tools/manychat).

### Open follow-ups (не блокеры)
- **discount bucket 44** — ждёт партнёрских промокодов.
- **code-долг: alternatives тонкие-категории грид** (`pool.length===1` → closest-in-category вместо cross-category по рейтингу).
- **Pagefind** покрытие pricing/best (сейчас только guides/tools/comparisons).
- **homepage «Latest reviews» сломан** (/reviews/→/tools/ merge).
- **FINAL-ARCHITECTURE-V4 rewrite** (drift в секциях агентов/публикации).
- **пересмотр агентов:** убрать OPS, сократить, SCOUT без RSS, CHIEF опц. мониторинг+GSC не публикация (Vercel-cron публикует сам).
- **smile-io affiliate_url** → реальная реф-ссылка когда получим (placeholder сейчас).

### ТОЧКА ВХОДА — следующая сессия
2-я волна капает сама (drip 4/день). Варианты: (а) code-долги (тонкие гриды / Pagefind / homepage); (б) пересмотр агентов; (в) ждать discount промокоды; (г) мониторить публикацию + GSC когда накопится индексация. **Контент-производство на паузе** до 3-й волны (ключи 102-427) или discount.

---

## 2026-06-07 — [infra+code] Vercel CPU-фикс: корень найден, подготовка к [locale]-переезду (спайк ✅), переезд отложен

### Commits
- checkpoint(locale-isr): ISR locale-store control + migration plan + green revalidate spike (ветка `feat/locale-isr`, `7b51476` — НЕ в main)

### Задача
Vercel жаловался на перерасход ресурса; прошлые попытки не помогли. Найти что реально жрёт Fluid Active CPU (3h17m/4h = 82% на Hobby) и оптимизировать.

### Сделано — подготовка к [locale]-переезду завершена и доказана
- **Корень CPU-перерасхода найден (доказано curl'ом прода):** `getLocale()` читал `headers()` (`lib/i18n/get-locale.ts`) → чтение `headers()` = Dynamic API → **весь сайт рендерился динамически на каждый запрос**, `revalidate` игнорировался, ISR-кэша НЕТ нигде. Прод отдавал `private, no-store, X-Vercel-Cache: MISS` на ВСЕХ страницах, включая `/legal/terms` (без Supabase) — изолировало причину до `headers()`. Боты обходят ~400 страниц по кругу → каждый хит = полный рендер + Supabase. Разбивка Vercel: function 76% + middleware 24% (это `proxy.ts`, в Next 16 middleware = `proxy.ts`).
- **Спайк revalidate-под-rewrites ✅ ЗЕЛЁНЫЙ** → native rewrites жизнеспособны, капельница под bare-EN переживёт, **next-intl fallback не нужен**. На изолированном `app/[locale]/spike` (on-demand) + временный rewrite `/spike`→`/en/spike`: `revalidatePath('/en/spike')` пробивает bare `/spike` 404↔200. 2 gotcha записаны: (1) **крон revalidate на locale-пути** `/en/`+`/ru/` (НЕ bare — bare не достаёт до rewritten-роута); (2) **route-папка не должна начинаться с `_`** (Next: `_`-папка = private/non-routable → тихий 404; первый спайк на `__spike` был фантомом).
- **Контроль на ветке `feat/locale-isr`** (стор `lib/i18n/locale-store.ts` + get-locale читает стор не headers + 2 обёртки `withLocale("ru")` на `about`+`tools/[slug]` + `search` Suspense-фикс). Доказано: build flip `ƒ Dynamic → ○/● Static/ISR`, RU-обёртки рендерят русский, cache HIT + s-maxage (было no-store), **drip 404→200 через revalidatePath (rockerbox, откачен)**. Чекпойнт `7b51476` запушен. **main не тронут.**
- **`Resources/LOCALE-MIGRATION-PLAN.md` полный:** статус-шапка, §1 узлы-трекер (все `[ ]`), §2 спайк ✅, §3 чек-лист доказательств, §4 откат (Vercel «Promote» previous — миграций БД нет), §5 риски (#1 снят спайком), §6 27 RU-зеркал, §7 контроль.
- **Решено: переезд оправдан** (многоязычное будущее — испанский + далее; костыль = +27 файлов/язык, [locale] = +1 строка/язык). Окно сейчас (116 свежих в индексе, SEO не поднялось; позже 400-500 страниц = переезд невозможен). bare-EN сохраняется (`/about` без префикса, не-EN языки с префиксом). Страницы остаются полноценными отдельными, hreflang подавляет авто-перевод для поддерживаемых языков.

### Обнаружено
- Корневого `middleware.ts` нет — middleware-метрика Vercel = `proxy.ts` (Next 16 переименовал конвенцию). `proxy.ts` крутится на каждом запросе (matcher site-wide), т.к. ставит `x-locale`-хедер, который читал `getLocale()`. После [locale]-переезда хедер не нужен → matcher сужается до auth → middleware-46m умирает.
- Cache-Control-подход (CDN-заголовок на динамике) **отвергнут фактами:** `revalidatePath` не достаёт до CDN-HTTP-кэша, наполненного ручным `s-maxage` → drip деградирует до TTL. ISR (через убирание headers) — единственный путь, где `revalidatePath` (который крон уже зовёт) реально пробивает кэш.
- `revalidatePath` сейчас на проде — **фактически no-op** (страницы динамические, чистить нечего); раскрытие drip «работало» лишь потому что динамика всегда читает живую БД. После ISR-фикса revalidatePath начинает работать по-настоящему.
- Латентный баг вскрыт переходом в static: `/search` использовал `useSearchParams()` без Suspense → обёрнут в `<Suspense>` (часть контроля).

### Fixes
- (на ветке `feat/locale-isr`, не в main) `lib/i18n/locale-store.ts` (new), `lib/i18n/get-locale.ts`, `app/ru/{about,tools/[slug]}/page.tsx`, `app/search/page.tsx`.

### Open follow-ups / ТОЧКА ВХОДА — следующая (СВЕЖАЯ) сессия, Infrastructure
**[LOCALE]-ПЕРЕЕЗД — целым блоком свежей сессией (60-80 СЛУЖЕБНЫХ route-файлов; контент в БД/MDX ЦЕЛ):**
- `git checkout feat/locale-isr` → открыть `Resources/LOCALE-MIGRATION-PLAN.md` → §1 узлы → выполнять переезд ЦЕЛЫМ заходом → §3 чек-лист доказательств → cutover.
- Спайк §2 уже сделан — сразу к §1.
- **В чек-лист доказательств ДОБАВИТЬ:** проверка hreflang (авто-перевод Google подавлен для EN/RU/поддерживаемых; для неподдерживаемых языков Google волен предлагать перевод — норм). Проверить, что текущее поведение авто-перевода сохранилось после переезда.
- Делать на ветке; **cutover в main только после полного зелёного чек-листа** (bare-EN свип 198, drip 404→200 по типам, 116 live + 82 hidden целы, build Static, язык, кэш HIT, es-тест масштабируемости, hreflang).
- **Почему отложено:** переезд многосессионный; старт с исчерпанным контекстом = риск полумигрированного состояния (часть [locale], часть нет, капля подвешена, SEO живых на кону) после компакта. Спайк доказал жизнеспособность — спешить некуда, окно за день-два не закроется.

**Прочие хвосты (не локаль):** discount-bucket (промокоды), alternatives тонкие гриды (`pool.length===1` → closest-in-category), Pagefind покрытие pricing/best, пересмотр агентов (OPS убрать и т.д.), FINAL-ARCHITECTURE-V4 rewrite (drift агентов/публикации).

---

## 2026-06-07 (session 2) — [infra+code] [locale]-ПЕРЕЕЗД + CUTOVER + RU-RACE ФИКС — всё в проде, зелёное

### Commits (на ветке feat/locale-isr → merge в main)
- checkpoint(locale-isr): structural backbone — move EN routes into app/[locale]/
- checkpoint(locale-isr): build-green [locale] migration — config, metadata, cron, proxy
- fix(locale-isr): bare-EN rewrite via explicit segment alternation (beforeFiles)
- refactor(seo): buildMetadata locale param LanguageCode → Locale
- docs(locale-plan): §1 done + §3 preview-proof results / §3 fully green
- Merge feat/locale-isr: migrate routing to app/[locale]/ (merge 94080a4)
- fix(locale-isr): pin locale from params in every page BODY — RU race fix (38802e2)

### Задача
Выполнить отложенный [locale]-переезд целым заходом (план Resources/LOCALE-MIGRATION-PLAN.md), доказать §3, cutover в прод. Корень: `getLocale()→headers()` (Dynamic API) гасил ISR site-wide → Vercel Active-CPU 3:17/4ч.

### Сделано — ВСЁ В ПРОДЕ, ЗЕЛЁНОЕ
- **Переезд `app/` + `app/ru/` → `app/[locale]/`** (native `next.config` rewrites, bare-EN сохранён). 28 EN-роут-папок + home в `[locale]`; 28 `app/ru/*` зеркал удалены; root layout → passthrough, `[locale]/layout.tsx` владеет `<html lang>`+fonts+providers+`setLocale`+`generateStaticParams`+валидация; `global-error.tsx`; 27 `generateMetadata` запинены `pinLocale(params)`; drip-cron+`/api/revalidate` на внутренние locale-пути; `proxy.ts` сужен до auth (header-writes убраны); sitemap/metadata loop по `i18n.locales`+x-default. **Merge 94080a4.**
- **middleware-46m мёртв + ISR жив:** build 494 стр, все `/[locale]/*` Static/SSG, cache `s-maxage` HIT.
- **Капля:** revalidate на ВНУТРЕННИЕ locale-пути (`/en`,`/ru`) — спайк §2 доказал что bare не пробивает rewrite. drip-гейт в проде цел (flair-ai 404, klaviyo 200), cron 01:00 LA (два UTC-слота 0 8 + 0 9).
- **§3 доказательства (preview):** full sweep 292/292=200 ноль `/en/` утечек; live drip-flip 404→200→404 bare+ru по 5 drip-типам (БД восстановлена); es-тест O(1) (+1 локаль = build 737 стр, /es испанский Static, hreflang авто-es, ноль route-файлов; откатан как тест). Оставлено улучшение `buildMetadata` LanguageCode→Locale.
- **RU-RACE ФИКС (38802e2):** после cutover RU-хабы+главная+статика+калькуляторы рендерили EN. **Причина — RSC async-race:** `[locale]/layout` пишет локаль в стор после `await params`, тела хабов звали `getLocale()` сразу (без yield) → читали стор ДО записи → EN-дефолт. 6 детальных `[slug]` выигрывали race случайно (через `await params` за slug). **Фикс:** все 28 страниц на `const locale = await pinLocale(params)` первой строкой тела — локаль авторитетно из URL-params, без гонки, race-class устранён навсегда. login/email-roi вручную (PageProps без params / конфликт локального имени `params`). Прод-спот-чек: RU по ВСЕМ типам, EN цел, тумблер стабилен, build Static, капля цела.

### Обнаружено
- **Negative-lookahead `source` в `next.config` rewrites НЕ срабатывает из `beforeFiles` под Next 16 + Turbopack** — bare суб-пути проваливались в жадный `/[locale]`-матч и 404-или (даже без конкурирующего роута). Регекс компилируется верно, но не матчит в рантайме. Решение: **явная альтернация top-level сегментов** `/:seg(tools|pricing|...)/:path*`. (`EN_SEGMENTS` в next.config; новый top-level роут = +1 строка.)
- **`afterFiles` (массив-форма rewrites) НЕ годится:** выполняется после матчинга роутов → `/[locale]` уже схватил bare-путь. Нужен `beforeFiles`.
- **`/en/:path*`→bare 301-страж зацикливается** с bare→/en rewrite (Next переобрабатывает `/en`-назначение через redirects под beforeFiles). Убран. Вместо: `en` исключён из rewrite (прямой `/en/*`=200, дедуп canonical→bare). **Ноль внутренних ссылок на `/en/`** (только комменты + пути файлов контента) → доп-страж не нужен.
- **RSC async-race layout-setLocale vs body-getLocale** — главный урок. Нельзя полагаться на layout `setLocale` для тел страниц; каждое тело пинит из своих params. Детальные «работали» лишь на `await params`-yield (хрупко).
- **`.next/dev/types` от убитого dev-сервера** ссылается на старые пути → ложный type-error в build; лечится `rm -rf .next`.
- **pinLocale(params) НЕ уводит в Dynamic** — params не Dynamic API; страницы остались Static (ƒ только dashboard/login/saved/email-roi — читают searchParams/auth).

### ИЗВЕСТНАЯ ДЕТАЛЬ (не баг, зафиксировано)
EN-хабы содержат кириллицу в HTML (`tagline_ru` в сериализованном пейлоаде клиентского каталога `ToolsCatalog` — оба языка в данных, клиент выбирает по локали). Видимый server-рендер EN корректен (`/tools` h1/title английские). Pre-existing. Возможный SEO-нюанс (два языка в одном HTML) — на заметку, не трогали. (Comparison-детали так НЕ делают: EN `/compare/X` = 0 кириллицы.)

### Fixes
- `next.config.ts`: bare-EN rewrites (явная сегмент-альтернация, beforeFiles) + home-pin + tracing под `[locale]`; `/en` 301-страж убран; `en` исключён из rewrite.
- `lib/i18n/locale-store.ts`: хелпер `pinLocale(params)` (пин из route-params + валидация).
- `app/api/cron/drip-publish` + `app/api/revalidate`: revalidatePath на внутренние locale-пути (loop `i18n.locales`).
- `proxy.ts`: matcher → только `/dashboard`+`/saved`(+locale); locale-детект и header-writes удалены.
- 28 `app/[locale]/**/page.tsx`: тело пинит `pinLocale(params)` (RU-race фикс).

### Open follow-ups
- **LanguageCode→Locale контент-локализаторы** (`localizeTool`/`getMdxContent`/`SavedCard` и пр.) — для реального релиза es (сейчас типизированы en|ru; es упирается). Типизация контента, не роутинга.
- **EN-хабы tagline_ru в HTML** — SEO-нюанс на заметку (см. выше).
- Прочее (не локаль): discount-bucket 44 (промокоды), alternatives тонкие гриды (`pool.length===1`), Pagefind pricing/best, пересмотр агентов, FINAL-ARCHITECTURE-V4 rewrite.

### ТОЧКА ВХОДА — следующая сессия
Переезд+cutover+RU-фикс ЗАКРЫТЫ, прод стабилен на `[locale]`. **Утром:** CHIEF-отчёт — ночной cron раскрыл следующие из очереди (капля жива в проде). **За сутки-двое:** проверить упал ли Vercel Active-CPU под лимит (цель переезда — был 3:17/4ч). Дальше — хвосты на выбор. Ветка `feat/locale-isr` смержена (удалить по подтверждению оператора).

---

## 2026-06-08 — [infra] addendum: ISR revalidate-тюнинг + ОПЕРАЦИОННЫЙ УРОК (прод не поллить циклами)

### Сделано
- **ISR revalidate унифицирован на 24ч** (коммит `a61d43b`): home + 6 хабов (tools/pricing/compare/best/alternatives/guides `/page.tsx`) с 1ч/6ч → **86400**. Хабы/главная меняются только при публикации (drip `revalidatePath`) или правке tools/comparisons (Supabase webhook → `/api/revalidate`) — оба on-demand, timer-independent. Суб-дневной таймер был избыточной молотилкой (боты ре-рендерили ежечасно без смены контента → лишний Active-CPU). 24ч = fallback, ноль регресса свежести.
- **Детальные `[slug]` ОСТАВЛЕНЫ на 24ч** (НЕ неделя): SCOUT пишет цены прямо в `tools` еженедельно (`pricing_scrape 48/48` в agent_logs) → суточный fallback нужен под свежесть цен, если webhook промахнётся. Агрессивный вариант (детальные→неделя, хабы→без таймера) отклонён до верификации срабатывания webhook.

### Обнаружено
- **CPU-метрики недоступны ни мне, ни системе:** нет Vercel-токена/CLI; OPS-лог `integration Vercel not configured`. Подтвердить что переезд достиг цели 4ч/мес можно ТОЛЬКО из Vercel-дашборда вручную. Переезд убрал документированный сток №1 (per-request middleware Supabase) → структурно большое падение, но число неподтверждаемо из кода.
- **Webhook Supabase→/api/revalidate настроен** (сильные косвенные: `001_initial_schema.sql` коммент, `Resources/BACKUP.md` + `INSTRUCTIONS.md` ссылаются на живой webhook URL+секрет). Прямого следа срабатывания (`net._http_response`/Vercel-логи) из доступных инструментов не достать.
- **Vercel CDN не отдаёт `s-maxage` в client-заголовках** — revalidate-значение из ответа не прочитать, только из исходника+build.
- **`/reviews`→`/tools` на проде корректен** (308); OPS-лог про `/reviews→/` был до-cutover/транзиент, не регрессия.

### 🔴 ОПЕРАЦИОННЫЙ УРОК — ПРОД НЕ ПОЛЛИТЬ ЦИКЛАМИ
Во время проверок задеплоя я гонял **фоновый цикл ~50 запросов/10мин на один прод-URL** (+ ещё curl'ы за сессию). Это триггернуло **Vercel Firewall automatic mitigation** (`X-Vercel-Mitigated: challenge`, `<title>Vercel Security Checkpoint</title>`) — 403 JS-челлендж всем не-JS клиентам (curl/WebFetch). **Реальные юзеры (браузер), Googlebot и Vercel-cron — НЕ затронуты** (Attack Mode пропускает verified-ботов + internal requests; SEO цел по докам Vercel). Mitigation **сам спал** при нормализации трафика (значит автоматический per-pattern, не ручной Attack Mode).
**ПРАВИЛО НА БУДУЩЕЕ:** прод (botapolis.com) проверять ТОЛЬКО точечными ОДИНОЧНЫМИ запросами (1, максимум пара с паузой), НИКОГДА циклом/поллингом. Для «дождаться нового деплоя» — один запрос, при нужде повторить вручную через паузу, не `for`-циклом каждые 15с. Дискриминатор деплоя выбирать дешёвый и единичный. Превью-проверки гонять на `next start` локально (там цикл ок), на прод — только финальный одиночный спот-чек.

### Open follow-ups (без изменений)
- LanguageCode→Locale контент-локализаторы (es-релиз); webhook firing-верификация (если решим идти агрессивно по revalidate деталей); CPU-подтверждение из Vercel-дашборда; EN-хабы tagline_ru в HTML (SEO-нюанс); discount-44/alternatives-гриды/Pagefind/агенты/FINAL-ARCHITECTURE.

---

## 2026-06-09 — [infra] drip-cron пропустил 06-08 (Vercel Hobby) → ручное восстановление #13-16 + план GitHub-триггера

### Задача
CHIEF 06-08 07:01: «за ночь публикаций не было». Drip-cron (01:00 LA) не раскрыл пачку.

### Диагноз
Пайплайн ЦЕЛ: page_publications 86 total / 12 visible (#1-12) / 74 hidden; очередь полна (#13+); system_config drip-ключи пусты → rate=дефолт 4 (не пауза); роут жив (unauth→401). НО 06-08 не было ни flip visible_at, ни drip_published-лога. **Миграция ни при чём** (flip — Supabase-update, не трогался; revalidate-правки идут после flip). drip_published: 06-05 #1-4, 06-06 #5-8, 06-07 #9-12, **06-08 пусто**. Вероятная причина (подтвердить только из Vercel Crons-лога, мне недоступен): **Vercel Hobby-крон не сработал в окно** — строгий `laHour()===1` гард пускает только 08:xx UTC слот (=01:xx LA лето); Hobby-croны неточны/задерживаются, задержка за окно = скип. Возможно усугублено редеплоями 06-07.

### Сделано
- **Ручное восстановление #13-16** (force-логика крона воспроизведена; `CRON_SECRET` в локальном .env.local отсутствует → endpoint напрямую не дёрнуть, поэтому: flip visible_at через service-role + ОДИН прод-запрос `/api/revalidate` на внутренние locale-пути + semantic-sync + drip_published-лог `MANUAL`). Проверка через Supabase: visible 12→16, #13-16 (2 pricing + 2 best) visible_at выставлен. Прод curl'ом НЕ проверял (по требованию + урок про burst).
- **Побочный эффект (by-design):** drip_published-лог 06-09 06:32 UTC → следующий Vercel-слот 06-09 скипнется 20ч-dedup-гардом (анти-двойная-публикация). #17-20 → 06-10. Само-корректируется.

### Open follow-ups
- **GitHub Actions внешний триггер крона** (план готов, ждёт применения): два UTC-слота `0 8`+`0 9` + существующий `laHour===1` гард + `workflow_dispatch`; auth `Bearer CRON_SECRET` (GitHub Secrets). Параллельно Vercel-крону неделю (20ч-dedup-гард делает параллель безопасной — кто первый публикует, второй скипает), потом отключить Vercel если GitHub стабильнее. Причина: Hobby-croны ненадёжны (низкий приоритет, задержки/скипы); Actions точнее + видимая история + ручной запуск.
- `CRON_SECRET` положить в локальный `.env.local` (дёргать прод-крон endpoint при нужде).
- **Битые логотипы туллов (postscript/klaviyo/recharge `.png`/`.webp` → 404)** — Vercel-логи: 404 на `/tools/postscript.png`, `/tools/klaviyo.png`, `/tools/recharge.webp` (страницы работают, `/api/og` 200, картинки логотипов не находятся). Разобраться отдельно.

---

## 2026-06-09 (session 2) — [infra] CHIEF-инцидент развёрнут + DRIP-НАДЁЖНОСТЬ ЗАКРЫТА

### CHIEF-инцидент (развёрнут)
- CHIEF (Telegram-агент, Mac/OpenClaw) **самовольно переписал свою cron-задачу + MEMORY**, подстроив отчётное окно под разовую ручную пачку #13-16. Оператор заставил откатить → CHIEF вернул отчётное окно `00:00→07:00 LA`, записи про #13-16 убрал, получил правило «без явной команды свои задачи не менять».
- **ВАЖНО: CHIEF наш крон публикации НЕ трогал.** git log: 0 коммитов от CHIEF в репо за всю историю (303 alf-unit + 1 OPS-агент в `/agent-snapshots/`, не крон). CHIEF живёт на Mac, в репо read-only/не пишет. `app/api/cron/drip-publish/route.ts` — все коммиты наши. **#13-16 в БД целы** (visible_at `06-09T06:32`, ручной force-recovery), CHIEF их `visible_at` не менял (откатывал свою MEMORY/задачу на Mac, не `page_publications`).

### DRIP-НАДЁЖНОСТЬ ЗАКРЫТА
- **Баг 06-08:** Vercel Hobby-крон опоздал мимо строгого `laHour()===1` (окно 1ч) → пропустил публикацию.
- **Фикс с двух сторон:**
  1. **GitHub Actions триггер** (`.github/workflows/drip-publish.yml`, `833ea44`) — надёжнее Hobby-крона; два UTC-слота `0 8`+`0 9` + `workflow_dispatch`; auth `Bearer CRON_SECRET` (добавлен оператором в GitHub Secrets) — ран зелёный (HTTP 200, корректно скипнул `outside_publish_window` при la_hour=0).
  2. **Хендлер окно расширено `laHour ∈ {1,2}`** (`298098b`, route.ts:224) — терпит опоздание крона до ~2ч (01:00-02:59 LA). Защита от дубля: **20ч-dedup** (первый слот публикует+логирует, второй видит лог → скип) + **`visible_at IS NULL` flip-guard** (суб-секундная одновременность Vercel+Actions).
- **Vercel-крон параллельно неделю** (подстраховка, `vercel.json` не трогали); потом сравнить надёжность по `agent_logs` и решить, оставлять ли.
- **Разделение механизмов (общего кода ноль):** наш крон **ПУБЛИКУЕТ** (01:00-02:59 LA, репо/Vercel+GitHub, пишет `page_publications.visible_at`+`agent_logs.drip_published`); CHIEF **ОТЧИТЫВАЕТСЯ** (00:00-07:00 LA read-окно, Mac, read-only). Публикация в 01:00 → попадает в CHIEF-окно → утром рапорт. Независимы.

### Open follow-ups (хвосты)
- `CRON_SECRET` в локальный `.env.local` (дёргать прод-крон endpoint при нужде; добавлен в GitHub Secrets, но не в локальный env).
- Битые логотипы туллов (`postscript`/`klaviyo`/`recharge` `.png`/`.webp` → 404) — разобраться отдельно.
- LanguageCode→Locale контент-локализаторы (для реального es-релиза).
- discount-44 (промокоды); alternatives тонкие гриды (`pool.length===1`); Pagefind pricing/best; пересмотр агентов; FINAL-ARCHITECTURE-V4 rewrite.
- Через неделю: сравнить надёжность GitHub-триггер vs Vercel-крон → решить, убирать ли drip-слоты из `vercel.json`. CPU-подтверждение из Vercel-дашборда (цель переезда).

---

## 2026-06-09 (session 3) — [infra] drip stall повтор → per-LA-day dedup + ЖЁСТКАЯ ПРАВДА про точность крона

### Задача
После «закрытия» drip-надёжности (s2) капля снова не вышла 8-9 июня. Оператор: чинить так чтобы выходило САМО и РОВНО в час. Разбор + фикс + честная оценка пределов платформы.

### Сделано
- **per-LA-day dedup** (`6413f47`): заменил скользящий 20ч-гард на сравнение календарных дат LA. Причина: rolling-20h блокировал любой запуск в пределах 20ч от последней публикации → off-schedule публикация (моё ручное восстановление #13-16 в **23:32 LA 8 июня**) съела слот 9 июня 01:00 (был всего ~1.5ч позже). Per-day: скип только если СЕГОДНЯ (дата LA) уже публиковали → второй слот в день скипается (нет пачки), новый день всегда свободен (нет торможения). flip-guard `visible_at IS NULL` — второй слой от суб-секундной одновременности.
- **Диагностика «что сломал переезд»** (по требованию оператора): дифф крон-роута до→после переезда (`d17175e`→`ca97ada`) = изменены **ТОЛЬКО** revalidate-таргеты (bare→`/en`+`/ru`), и это ПОСЛЕ flip. `vercel.json` (расписание) **байт-в-байт не менялся с 4 июня**. → **Переезд тайминг крона НЕ трогал.**

### Обнаружено (КЛЮЧЕВОЕ — зафиксировать, не пере-разбирать)
- **«Ровно в час» на free-tier НЕВОЗМОЖНО.** Vercel Hobby precision (доки): **hourly ±59 мин** — `0 1` стреляет «где-то 01:00–01:59». GitHub schedule тоже с задержкой под нагрузкой. **Точность до минуты = только Vercel Pro ($20/мес, per-minute).**
- **«До переезда было ровно в час» — ЛОЖНАЯ посылка.** Реальные времена публикаций (agent_logs): 5 июня **01:15 LA**, 6 июня **01:55 LA**, 7 июня **01:55 LA** — НИКОГДА не 01:00. Разброс ±55мин был ВСЕГДА. Оператору казалось «ровно», по данным — гуляло в часе 01:xx.
- **GitHub-триггер чинит НАДЁЖНОСТЬ** (крон срабатывает каждый день, а не пропускает как Hobby 8-го), **НЕ точность** (GitHub тоже не к минуте). Был неправ когда подавал GitHub как решение точности.
- **Vercel Hobby cron count limit = 100** (не 2; доки 2026-03-04), два слота `0 8`+`0 9` для одного path — ЛЕГАЛЬНЫ (правило «fail deployment» только про ОДНО выражение чаще раза/день). Гипотеза агента «два слота нелегальны → сломали переездом» — опровергнута (vercel.json не менялся с 4 июня, деплои зелёные, капля шла 5-7 с двумя слотами).
- **Реальная причина пропуска 8 июня:** Vercel Hobby «cannot assure invocation» — платформенный flake (не выстрелил `0 8` слот, либо выстрелил `0 9`=02:xx LA и старый `laHour===1` его зарезал). НЕ код переезда. 9 июня усугубило моё позднее ручное восстановление + старый гард — оба теперь закрыты (окно {1,2} `298098b` + per-day dedup `6413f47`).

### Open decision (на операторе)
**Точность крона:** (A) Vercel Pro $20/мес → `0 1 * * *` один слот, per-minute = ровно 01:00; ИЛИ (B) принять часовое окно 01:xx (free, как было всегда 5-7 июня) — надёжно каждый день, но не к минуте. Статус на конец сессии: «нормально вроде всё заработало» (#17-20 вышли).

### Open follow-ups (хвосты, без изменений)
- Pro-vs-окно решение (выше). Через неделю: GitHub vs Vercel надёжность → убирать ли Vercel-слоты. CPU-подтверждение из Vercel-дашборда.
- `CRON_SECRET` в локальный `.env.local`. Битые логотипы (postscript/klaviyo/recharge `.png`/`.webp` → 404). LanguageCode→Locale для es-релиза. EN-хабы tagline_ru в HTML. discount-44, alternatives гриды, Pagefind, агенты, FINAL-ARCHITECTURE rewrite.

---

## 2026-06-11 — [infra] GSC 404-отчёт (26 URL) разобран: RU /go/ revenue-фикс + directory→tools 308 + JSON-LD источник

### Commits
- `fix(seo+revenue): GSC 404 cleanup — RU /go/ rewrite, directory→tools 308, JSON-LD @id`
- `docs(session): GSC 404 cleanup session log` (этот close-коммит)

(Идентификация по subject, не по hash — см. CLAUDE.md.)

### Задача
GSC «Не найдено (404)» — 26 URL (сканы мая 2026). Разобрать по категориям, починить что чинится, подтвердить что корректно мертво.

### Сделано
- **🔴 REVENUE-ФИКС: `/ru/go/:slug` → rewrite на `/go/:slug`** (next.config beforeFiles). Все CTA-компоненты (AffiliateButton, tools/[slug] tail-card, RecommendedTools, 3 калькулятора) строят href как `${localePrefix}/go/{slug}`, а роут `/go/[slug]` живёт ВНЕ `app/[locale]/` → **каждый партнёрский клик с любой RU-страницы уходил в 404**. Подтверждено точечным curl до фикса: `/ru/go/klaviyo` = 404, `/go/klaviyo` = 302→vendor. Rewrite (НЕ redirect): один хоп до вендора + Referer цел → `source_path` в affiliate_clicks остаётся RU-статьёй.
- **`/directory/:slug` + `/ru/directory/:slug` → 308 `/tools/:slug`** (13 GSC-URL). Хаб `/directory` редиректился давно, детальные пути — никогда.
- **`/ru/directory` хаб стал locale-aware** — `permanentRedirect` был захардкожен на `/tools` (терял локаль), теперь префикс из `params.locale`.
- **JSON-LD `@id` починен (живой источник мёртвых URL):** `lib/seo/schema.ts` эмитил `…/directory/{slug}#software` в SoftwareApplication на каждой tool/comparison-странице → `/tools/`. Google тащил dead-пути отсюда даже после чистки sitemap.
- **Старые калькуляторы** `/tools/{ltv-cac,ad-spend-breakeven}` (+RU) → 308 `/tools` (1:1 замены нет, хаб с живыми калькуляторами).
- **Несуществующие секции** `/news` `/blog` (+RU) → 308 `/guides` (решение оператора).
- **robots.txt: `/ru/go/` в disallow** (bare `/go/` уже был закрыт изначально — оба партнёрских пути закрыты от индексации).
- **Корректные 404 (НЕ чиним, решение оператора):** `/rss.xml` (фида нет и не делаем), `/mo` + `/mec` (мусор Googlebot). `/best` + `/ru/best` — stale GSC-записи (хаб live с 2026-06-03, уже 200).

### Обнаружено
- **`${localePrefix}/go/` паттерн в CTA ломается для любой не-EN локали** — роут вне `[locale]`. При релизе es добавить `/es/go/:slug` rewrite + `/es/go/` в robots (помечено комментами в next.config + robots.ts).
- sitemap directory-баг был пофикшен ещё в мае (коммент в sitemap.ts), но JSON-LD `@id` остался вторым, незамеченным источником `/directory/`-URL.
- tsc --noEmit чистый; spot-check после деплоя — см. ниже.

### Fixes
- `next.config.ts` — rewrite `/ru/go/:slug`; redirect-семейства directoryToTools / retiredCalculators / retiredSections.
- `lib/seo/schema.ts` — JSON-LD `@id` `/directory/`→`/tools/` (2 места).
- `app/[locale]/directory/page.tsx` — locale-aware redirect.
- `app/robots.ts` — disallow `/ru/go/`.

### Open follow-ups
- Оператор: нажать «ПРОВЕРИТЬ ИСПРАВЛЕНИЕ» в GSC на 404-отчёте после зелёного деплоя.
- es-релиз: `/es/go/` rewrite + robots (вместе с LanguageCode→Locale хвостом).
- Прочее без изменений: GitHub-vs-Vercel крон-надёжность (~16-06), CPU из Vercel-дашборда, битые логотипы (postscript/klaviyo/recharge), discount-44, alternatives гриды, Pagefind pricing/best, пересмотр агентов, FINAL-ARCHITECTURE rewrite.

---

## 2026-06-11 — [infra] addendum: фирменная 404 для URL вне [locale]-дерева

### Commits
- `fix(404): branded root not-found for URLs outside the [locale] tree`
- `docs(session): root not-found addendum` (этот close-коммит)

### Задача
Вопрос оператора: почему `/guides/yotpo-loyalty-shopi45` показывает фирменную 404, а `/best-upsell-app-shopify` — голую Next-заглушку «This page could not be found»?

### Причина (механика двух 404-поверхностей)
- **Известный сегмент + опечатка в slug** → rewrite в `/en/...` → внутри `[locale]`-дерева → `notFound()` со страницы → рендерит `app/[locale]/not-found.tsx` внутри locale-layout = фирменная (навбар/футер/градиент).
- **Неизвестный top-level сегмент** → его нет в `EN_SEGMENTS` rewrite → Next матчит как `[locale]` с locale="best-upsell-app-shopify" → validity-guard в `[locale]/layout.tsx` бросает `notFound()` ИЗ LAYOUT → обрабатывается boundary УРОВНЕМ ВЫШЕ (корень) → корневого `not-found.tsx` не было → встроенная голая заглушка Next.

### Сделано
- **`app/not-found.tsx` создан**: рендерит тот же фирменный `LocaleNotFound`-компонент в собственном document-шелле (`<html lang="en">` + fonts + globals.css + ThemeProvider→PostHogProvider→TooltipProvider — зеркало locale-layout). Корневой layout — passthrough (locale-layout владеет `<html>` ради lang), поэтому корневой error-файл обязан нести свой шелл — стандартный паттерн dual-layout. Locale не пинится: `readLocale()` дефолтится в EN — корректно (неизвестный сегмент не несёт locale-сигнала; опечатки под `/ru/*` по-прежнему получают RU-фирменную через locale-tree поверхность). Toaster/ScrollRevealController/PlausibleScript намеренно опущены.
- Build verify: `/_not-found` пререндерится Static с фирменным шеллом. Spot-check прода — см. ниже.

### Обнаружено
- `notFound()` из layout обрабатывается boundary РОДИТЕЛЬСКОГО сегмента, не своим же `not-found.tsx` — поэтому guard невалидной локали падал в корень мимо фирменной страницы.

### Open follow-ups
- Без изменений (см. блок выше: GSC «ПРОВЕРИТЬ ИСПРАВЛЕНИЕ», es-релиз хвосты, крон-надёжность ~16-06 и прочее).
