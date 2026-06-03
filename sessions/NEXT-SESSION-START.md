# Next session — entry point

**Updated:** 2026-06-03 (post structure-rebuild)
**Mode for next session:** CONTENT_WRITING_02 (Phase 0 Blueprint data-first pSEO)

---

## Текущее состояние

### Первая волна (101 ключ) — закрыта и опубликована

- **30 reviews → теперь на `/tools/[slug]`** (canonical URL после слияния `/reviews/ → /tools/`, PR #1 в проде 2026-06-03). Live EN + RU. Полная Etap E review-surface: verdict, rating_breakdown 4-axis с [H]/[I], external_ratings, operator_quotes, shopify_native_notes, integrates_with_tools cross-link grid, pricing_source citation.
- **23 comparisons** + **7 alternatives editorial** live (`/compare/[slug]` + `/alternatives/[slug]`, EN + RU twins, alternatives_editorial jsonb из migration 017).
- **8 best-of листингов** live (`/best/[slug]` MDX+DB hybrid, EN + RU twins).
- **43 published** строк в `semantic_core_entries` (status='published'); **12 excluded**; **3 in_writer_queue** (Etap E carryover); **остальные queued**.

### Вторая волна (220 ключей) — разложена в БД, готова к генерации

- **212 ключей `status='second_wave'`** с SEMrush метриками.
- **2 ключа `status='excluded'`** (sidekick micro-queries).
- **3 pricing-ключа refresh**.
- **3 comparison dedup-skipped**.

### DB state (snapshot session 7)

- **319 total** `semantic_core_entries`
- **By status**: 212 second_wave, 49 queued, 43 published, 12 excluded, 3 in_writer_queue
- **By template**: 66 vs-comparison, 54 guide, 53 pricing, 44 discount, 37 best-for-segment, 27 alternatives, 26 review, 10 how-to, 2 other
- **217 rows** имеют `semrush_volume` populated

### Migrations applied

- **017** — `tools.alternatives_editorial jsonb`
- **018** — `semantic_core_entries.semrush_volume / kd / cpc / source_count / affiliate_strength / tool_label`
- **019** — status CHECK extended (`+ 'second_wave'`), template CHECK extended (`+ 'discount' + 'other'`)

---

## Структурный rebuild (2026-06-03) — закрыт

Три PR в main по очереди, все squash:

1. **PR #1 `feat(tools): merge /reviews/ into /tools/`** — `/reviews/[slug]` → 308 → `/tools/[slug]` (one-hop). Слитый шаблон (Article-chrome + 11 секций + 3 JSON-LD), legacy `-review-2026` редиректы collapsed в одну ступень, ~67 ссылок переключены (код + MDX), `klaviyo-pricing` MDX перенесён в `/guides/`, webhook scope сужен, sitemap почищен.
2. **PR #2 `feat(nav): Resources dropdown + /best & /alternatives hubs`** — Navbar: Tools / Compare / Guides / **Resources▾** (dropdown с Best + Alternatives, расширяемый под Pricing-cluster, Discount позже; future leaves News/Blog тоже в той же структуре). Footer: Library колонка переименована/перестроена в Resources (зеркалит Navbar). `/best/` хаб (MDX-driven, 8 листингов) + `/alternatives/` хаб (DB-driven, 30 source-tools) — закрыты 38 орфанов из nav-аудита. Sitemap включает оба хаба + 8 best + 30 alternatives + RU mirrors.
3. **PR #3 `feat(linking): centre <-> satellite cross-linking`** — `/tools/[slug]` получил курированный **Related** блок: ссылка на свой `/alternatives/{slug}` + топ-3 head-to-head comparisons (same-category first → updated_at DESC) + топ-3 best-of mentions (publishedAt DESC). Cap 1+3+3=7. `/compare/[X-vs-Y]` ToolCardSide: h2 имя обёрнут в Link на `/tools/{slug}` + secondary outline «View {name} details» — закрыта дыра спутник→центр (раньше только `/go/`). Для Judge.me carve-out «View details» теперь sole exit вместо deadend'а. `/alternatives/[slug]` breadcrumb: Home / Alternatives / {name} (раньше через /tools).

**Что в проде сейчас (verified curl)**: все три PR live, 0 regressions, `/reviews/*` всё 308'ит, `/tools/[slug]` полный, Related-блок рендерится, dropdown в Navbar работает, sitemap чист.

---

## Следующая задача — Этап J-generate (генерация 2-й волны)

**188 страниц во 2-й волне** (212 second_wave − 44 discount-deferred = 188). По template-bucket'ам:

| Template | Кол-во | Route | Status |
|---|---|---|---|
| `pricing` | 50 | `/pricing/[slug]` — **route не существует** | design + create route первым шагом |
| `discount` | 44 | TBD | **НЕ генерировать сейчас** — ждут партнёрских промо-кодов |
| `guide` | ~54 (33 J + 19 1st-wave carryover + 2 reclassified G) | `/guides/[slug]` — existing | MDX-driven |
| `vs-comparison` | 29 | `/compare/[slug]` — existing DB-driven | как Etap F pattern |
| `best-for-segment` | 29 | `/best/[slug]` — existing MDX+DB hybrid | как Etap G pattern |
| `alternatives` | 20 | `/alternatives/[slug]` — existing DB-driven | extend `alternatives_editorial` jsonb |
| `review` | 6 | **/tools/[slug] post-merge** — existing DB-driven | **decision pending**: «is X worth it» format vs anchor на существующий |
| `how-to` | 1 | `/guides/[slug]` | single key |

### Порядок bucket'ов — предложение

1. **pricing 50** — самый большой volume × commercial intent; нужен новый route (или extension существующего /tools/ через anchor — пересмотреть после слияния)
2. **alternatives 20** — existing route + editorial extension (extending `alternatives_editorial` jsonb за оставшиеся 23 generic, см. хвост (a) ниже)
3. **vs-comparison 29** — existing route, reuse Etap F pattern
4. **best-for-segment 29** — existing route, reuse Etap G pattern
5. **guide ~54** — existing route, самая большая буква
6. **review 6** — decision needed по format
7. **how-to 1** — single key
8. **discount 44** — DEFERRED до партнёрок

Owner может перетасовать.

---

## Этап H + I (после Этапа J-generate)

**H — нумерация пула для CHIEF**: когда 188 страниц 2-й волны сгенерированы + 44 discount хотя бы частично — Claude Code присваивает сквозную нумерацию всему пулу (1-я + 2-я волна) в порядке эшелонов. Список → CHIEF для капельной публикации.

**I — CHIEF капельно публикует**: 4/день старт (Owner: «ждём Deep Research про velocity, пока 4/день»).

---

## Что прочитать на старте новой сессии

После выбора CONTENT_WRITING_02 mode (через AskUserQuestion):

1. **`PHASE-0-BLUEPRINT.md`** ПОЛНОСТЬЮ (mandatory read protocol).
2. **`research/phase0-content-flags.md`** — per-tool framing rules.
3. **`sessions/infra-log.md`** — последние 2-3 блока (sessions 6-7) + блок 2026-06-03 structure-rebuild (если будет ploguен в close-сессию).
4. **`semantic-core/botapolis_core_REMAINING.csv`** — справочно (БД источник истины для генерации).

**Замечание**: `/reviews/[slug]` route больше не существует — везде где Blueprint или CONTENT-WRITING.md упоминают «reviews surface», подразумевается **/tools/[slug]** post-merge. Editorial review-fields (verdict, rating_breakdown, operator_quotes, external_ratings) живут в `public.tools` row и рендерятся слитым шаблоном.

---

## Открытые хвосты

### Новые после structure-rebuild (2026-06-03)

**(a) 23 generic alternatives — кандидаты на editorial extension**. После PR #1-3 у нас 7 source-tools с заполненным `alternatives_editorial` jsonb (intro + per-card why + verdict — Etap F). Остальные 23 published tools имеют `/alternatives/{slug}` страницу с runtime DB-grid, но без editorial-обёртки. Кандидат на отдельную мини-волну (как Etap F делал 7) — не блокер для Этапа J-generate.

**(b) PartnerAlternatives subcat-fallback — слабо-релевантное** (Recharge на reviews/retention overlap). Owner-flagged ещё в Etap F. Не критично, но при унификации subcategory-тегов (canonical vocabulary) фильтр станет точнее.

**(c) `validate-infra.ts:62` ожидает `content/reviews/{en,ru}/`** — после Phase 3 это пустые dirs (`klaviyo-pricing.mdx` переехал в `/guides/`). validate-infra сейчас проходит на пустых, но строки можно убрать вместе с удалением dirs. Low-priority cleanup.

**(d) `@custom-variant hover` DX-баг** в [globals.css:41](app/globals.css#L41) — взаимодействует с `[a]:hover:*` стэками из shadcn button/dialog/badge → Turbopack-dev падает с CSS parse error, production build проходит с warnings и live. Локальный `next dev` не работает. Прод не страдает. Owner-decision на correct rewrite custom-variant — не блокер.

**(e) Homepage Latest reviews блок сломан** — [app/page.tsx:101-109](app/page.tsx#L101-L109) делает `getAllMdxFrontmatter("reviews", locale)`, но `/content/reviews/` после Etap E flip пустая (reviews DB-driven). Секция тихо скрывается. Re-wire на DB query (top 3 by Featured DESC + rating DESC) ИЛИ убрать секцию и перепридумать homepage flow. Owner-decision.

### Хвосты по prior сессиям — неизменные

**Из Этапа J (session 7):**
- `/pricing/[slug]` route не существует — нужен для 50 pricing-ключей (или extension через anchor)
- 6 review keys 2-й волны (worth-it format) — decision pending
- 44 discount cluster deferred — ждут партнёрок
- Schema doc OPEN drift — `grep -A20 "constraint.*chk"` ДО предположений OPEN

**Из Этапа G (session 6):**
- isoDate schema hardening (low priority)
- 2 reclassified guide-keys (`shopify operator tool stack`, `ai product description 10000 skus`) — часть combined guide-bucket
- 6 best-of listings без партнёров — strategic discussion

**Из Этапа F (session 5):**
- `getRatingAxisValue` helper не вынесен (inline в /compare/ + /tools/)
- `tool.integrations` legacy field — backfill 20 новых Etap D tools ИЛИ deprecate field
- Triple Whale `affiliate_url` NULL + `affiliate_partner='partnerstack'` signal mismatch
- R2 CSV parser RFC 4180 hardening (для будущих refresh-волн)

**Из ранних сессий:**
- Subcategory string-mismatch (`sms` ≠ `sms-marketing`) — связан с PartnerAlts хвостом (b)
- Pagefind не индексирует 30 runtime-`/tools/` (post-merge) + 8 best-of + 30 alternatives (теперь все хабы есть, можно расширить bucket'ы; klaviyo-pricing уже в guides bucket автоматом)
- RU auto-обновление в проде не реализовано
- `lib/content/rating.ts:getToolRatings` dead path cleanup
- `tools` missing columns (pricing_url, pricing_css_selectors, pricing_data, affiliate_health_checked_at)
- `system_config.modified_by` CHECK constraint
- Capture SCOUT runtime AGENTS.md
- Newsletter ingestion via Beehiiv
- OPS GPT-5.5 cost reconciliation
- **Single-pass spec rewrite `FINAL-ARCHITECTURE-V4.md`** — drift накопился ещё больше (Этапы D-J + migrations 015-019 + /best/ + bestFrontmatterSchema + alternatives_editorial + 3 compare-template фикса + status/template CHECK extensions + structure-rebuild 2026-06-03 [/reviews/→/tools/ merge + Resources nav + /best + /alternatives hubs + Related cross-link blocks])
- TOOLS.md ↔ AGENTS.md drift prevention для CHIEF + SCOUT
- Tighten `app/robots.ts` для AI crawlers

---

## Финальное состояние (post structure-rebuild)

- **Финальные main commits**: `feat(tools): merge /reviews/ into /tools/ (#1)`, `feat(nav): Resources dropdown + /best & /alternatives hubs (#2)`, `feat(linking): centre <-> satellite cross-linking (#3)`, плюс CHIEF ops commits.
- **Рабочее дерево**: чисто (кроме owner-pre-session-modifications `.claude/settings.local.json` + `PHASE-0-BLUEPRINT.md` и owner-untracked файлов).
- **Vercel deploy**: production отражает все три PR. 30 tools (бывшие reviews) + 23 comparisons + 30 alternatives (7 editorial + 23 generic) + 8 best-of live + 2 хаба (/best, /alternatives) + Resources dropdown в Navbar + Related cross-link block на каждом /tools/[slug]. EN + RU mirrors. 2-я волна (212) в БД, страницы не публикуются до Этапа J-generate.

---

## В начале новой сессии — обязательный protocol

1. **AskUserQuestion** — выбор mode. Для Этапа J-generate → CONTENT_WRITING_02.
2. **Параллельные reads:** PHASE-0-BLUEPRINT.md (full) + последние блоки infra-log.md (включая 2026-06-03 structure-rebuild close-block если будет).
3. **Только после** обоих чтений — спрашивать «Этап J-generate старт сейчас? Какой template-bucket первым?» (предложенный порядок: pricing → alternatives → vs-comparison → best-for-segment → guide → review → how-to, discount deferred). Owner отвечает с порядком — начинать с контрольных 1-2 страниц этого bucket'а → approval → пачка.
