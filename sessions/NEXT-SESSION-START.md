# Next session — entry point

**Updated:** 2026-06-03 (post structure-rebuild + pricing cleanup close)
**Mode for next session:** CONTENT_WRITING_02 (Phase 0 Blueprint data-first pSEO)

---

## СОСТОЯНИЕ

**Структура полностью здорова.** Закончен трёхфазный structure-rebuild + pricing-cleanup:

- **Слияние tools + reviews** — один канонический URL `/tools/[slug]` на инструмент. Центр архитектуры, где живёт affiliate и копится вес. `/reviews/*` → 308 → `/tools/*` (one-hop). Шаблон полный: tiers, pricing notes (почищены), features, integrations, shopify-fit narrative, rating breakdown 4-axis, external ratings, operator quotes, verdict, integrates-with-tools cross-link grid, Related блок, PartnerAlternatives.
- **Навигация**: `Tools · Compare · Guides · Resources▾`. Resources dropdown — Best, Alternatives (расширяемая структура под pricing-кластер, discount sub-items позже; future News/Blog как top-level leaves).
- **Хабы**: `/best` (8 листингов, MDX) и `/alternatives` (30 source tools, DB) живые. RU mirrors есть.
- **Перелинковка спутник↔центр** (Phase C):
  - Related блок на каждом `/tools/[slug]` (cap 1+3+3=7): ссылка на свой `/alternatives/`, top-3 head-to-head comparisons (same-category first), top-3 best-of mentions.
  - `/compare/[X-vs-Y]`: h2 tool-имени → `/tools/{slug}`, secondary «View details» CTA. Closed dead-end для Judge.me carve-out.
  - `/alternatives/[slug]` breadcrumb: `Home / Alternatives / {name}` (зеркалит `/best/[slug]`).
- **pricing_notes почищены** на 30 published tools (EN + RU): tiers + max 1-2 structural-surprise gotchas + free plan + verified date. Стена из 12-18 строк → 4-6 строк. SQL-файл `scripts/clean-pricing-notes.sql` (idempotent).

**Первая волна (101 ключ) опубликована**:
- 30 tools (на `/tools/[slug]`)
- 30 alternatives surfaces (7 с editorial intro/verdict, 23 generic runtime grid)
- 23 comparisons + 7 alternatives editorial
- 8 best-of листингов

**Вторая волна (212 ключей) разложена в `semantic_core_entries`** `status='second_wave'` с SEMrush метриками (volume, kd, cpc, source_count, affiliate_strength, tool_label), готова к генерации.

---

## СЛЕДУЮЩАЯ ЗАДАЧА — Этап J-generate (главная цель ради которой всё чинили)

Генерация **188 страниц 2-й волны** из 212 `status='second_wave'` keys (минус 44 discount-deferred + 2 sidekick excluded = 188 generatable).

### ПЕРВЫМ ШАГОМ — РЕШИТЬ /pricing/ ROUTE

50 pricing-ключей — **самый денежный bucket** (commercial intent × volume), но риск **каннибализации с pricing-секцией на `/tools/[slug]`** после слияния.

**Аудит каннибализации начат, но не закончен** — продолжить со следующей сессии:

1. Насколько pricing-секция в `/tools/[slug]` глубокая после Phase 1 merge + pricing_notes cleanup? Сейчас на странице рендерится: `PriceCard` (min/max/model), `pricing_notes` text-block (4-6 строк после cleanup), `pricing_source_url` citation. Это ~10-15% страницы.
2. Если создать отдельный `/pricing/[tool]` — будет ли он конкурировать с `/tools/[tool]` за тот же query intent? Pricing-keywords типа «klaviyo pricing 2026», «gorgias pricing breakdown» — кто ранжируется лучше: тонкая отдельная страница про pricing или богатый `/tools/` с pricing-секцией?
3. Рекомендация route — три варианта:
   - **A. Отдельные `/pricing/[tool]`** — новый route, MDX или DB-driven, глубже чем секция в `/tools/`. Риск дубля, требует разной copy для деинтерферирования.
   - **B. Оптимизировать pricing-секцию в `/tools/`** + якорь `/tools/[tool]#pricing` для GSC + расширить секцию богаче (tier-by-tier breakdown, savings calculator). Без отдельной страницы — pricing-keywords ранжируются через `/tools/`.
   - **C. `/tools/[tool]/pricing` подстраница** — Next.js nested route, наследует canonical, делит вес.

**РЕШИТЬ route → ПОТОМ генерить pricing.** До решения 50 pricing-страниц не запускать.

### Остальные buckets — конфликта с /tools/ не имеют

| Bucket | Keys | Route | Подход |
|---|---|---|---|
| `guide` | 33 (J) + 19 (1st-wave carryover) + 2 (reclassified G) = ~54 | `/guides/[slug]` — existing MDX | мини-волны по priority_score |
| `vs-comparison` | 29 | `/compare/[slug]` — existing DB | Etap F pattern |
| `best-for-segment` | 29 | `/best/[slug]` — existing MDX+DB hybrid | Etap G pattern |
| `alternatives` | 20 | `/alternatives/[slug]` — existing DB | extend `alternatives_editorial` jsonb (closes хвост (a)) |
| `review` | 6 | **`/tools/[slug]` post-merge** — existing DB | decision pending: «is X worth it» format vs anchor на существующий |
| `how-to` | 1 | `/guides/[slug]` | single key |
| `discount` | 44 | TBD | **DEFERRED до партнёрок** |

### Порядок исполнения

1. **/pricing/ route decision** → генерация pricing bucket (50 страниц)
2. Остальные buckets мини-волнами по `priority_score` (volume × intent × affiliate_strength)
3. **Этап H** — нумерация всего пула (1-я + 2-я волна)
4. **Этап I** — CHIEF капельно публикует (4/день старт, до Deep Research про velocity ramp-up)
5. `discount` 44 — после активации партнёрок

---

## Что прочитать на старте

После выбора **CONTENT_WRITING_02** mode (через AskUserQuestion):

1. **`PHASE-0-BLUEPRINT.md`** ПОЛНОСТЬЮ (mandatory read protocol).
2. **`research/phase0-content-flags.md`** — per-tool framing rules.
3. **`sessions/infra-log.md`** — последний блок `2026-06-03` (структурный rebuild + pricing cleanup, дополнения к Этапам D-J).
4. **`semantic-core/botapolis_core_REMAINING.csv`** — справочно (БД — источник правды для генерации).

**Важное замечание про слияние**: `/reviews/[slug]` route больше не существует — везде где Blueprint или CONTENT-WRITING.md упоминают «reviews surface», подразумевается `/tools/[slug]` post-merge. Editorial review-fields (verdict, rating_breakdown, operator_quotes, external_ratings) живут в `public.tools` row.

---

## ХВОСТЫ (открыты после rebuild)

| ID | Хвост | Приоритет |
|---|---|---|
| **(a)** | 23 generic alternatives → editorial extension (как Etap F делал 7) | medium |
| **(b)** | PartnerAlternatives subcat-fallback (Recharge через retention overlap) | low |
| **(c)** | `validate-infra.ts:62` пустые reviews-папки → cleanup | low |
| **(d)** | `@custom-variant hover` DX-баг (Turbopack-dev only, прод OK) | low — DX-only |
| **(e)** | Homepage "Latest reviews" блок сломан с Etap E flip — re-wire на DB или убрать | medium |
| **(f)** | pricing_notes можно ещё компактнее (отложено, текущий стандарт работает) | low |
| **(g)** | **`/pricing/[slug]` route decision** — FIRST QUESTION следующей сессии | **HIGH** (блокер pricing bucket) |
| **(h)** | `FINAL-ARCHITECTURE-V4.md` rewrite — drift накопился (Этапы D-J + structure-rebuild) | medium |
| **(i)** | Pagefind не индексирует runtime `/tools/[slug]` (post-merge) + 8 best-of + 30 alternatives | medium |

### Carryovers ранее — неизменные

- isoDate schema hardening (low)
- 6 best-of listings без партнёров — strategic discussion
- `getRatingAxisValue` helper не вынесен
- `tool.integrations` legacy field — backfill 20 новых Etap D tools ИЛИ deprecate
- Triple Whale `affiliate_url` NULL + `affiliate_partner='partnerstack'` mismatch
- R2 CSV parser RFC 4180 hardening
- Subcategory string-mismatch (`sms` ≠ `sms-marketing`) — связан с (b)
- RU auto-обновление в проде не реализовано
- `lib/content/rating.ts:getToolRatings` dead-path cleanup
- `tools` missing columns (pricing_url, pricing_css_selectors, pricing_data, affiliate_health_checked_at)
- `system_config.modified_by` CHECK constraint
- Capture SCOUT runtime AGENTS.md
- Newsletter ingestion via Beehiiv
- OPS GPT-5.5 cost reconciliation
- TOOLS.md ↔ AGENTS.md drift prevention CHIEF + SCOUT
- `app/robots.ts` для AI crawlers

---

## Финальное состояние

- **Финальные main commits** (chronological):
  - `e6757b7` PR #1 squash — `/reviews/` → `/tools/` merge
  - `eeae4fb` `ops: daily writer queue refill 2026-06-02` (CHIEF agent)
  - `1405441` PR #2 squash — Resources dropdown + хабы
  - `3a45ec1` PR #3 squash — Phase C cross-linking
  - `cf93c8d` intermediate NEXT-SESSION-START update
  - `e4af23d` pricing_notes cleanup SQL (применён в Studio)
  - финальный close-блок этой сессии
- **Рабочее дерево**: чисто (кроме owner-pre-session `.claude/settings.local.json` + `PHASE-0-BLUEPRINT.md` и owner-untracked файлов — не моё ведение).
- **Vercel deploy**: production отражает все коммиты. Verified curl на botapolis.com — все Phase 1/2/3 + A/B/C редиректы + хабы + Related + breadcrumb работают.
- **DB state**: 30 tools (бывшие reviews), 23 comparisons, 30 alternatives (7 editorial + 23 generic), 8 best-of live (EN + RU). 2-я волна (212) в semantic_core_entries `status='second_wave'`. pricing_notes / pricing_notes_ru почищены по 30 tools.

---

## В начале новой сессии — обязательный protocol

1. **AskUserQuestion** — выбор mode. Для Этапа J-generate → **CONTENT_WRITING_02**.
2. **Параллельные reads:** `PHASE-0-BLUEPRINT.md` (full) + последний блок `infra-log.md` (`2026-06-03`).
3. **Только после** обоих чтений — НЕ задавать «что делаем сегодня?»:
   - Если оператор не уточнил — задать конкретно: **«Этап J-generate старт с /pricing/ route decision (3 варианта: A отдельные /pricing/[tool], B оптимизировать секцию в /tools/, C /tools/[tool]/pricing подстраница)? Или с другого bucket'а (guide / vs-comparison / best-for / alternatives editorial extension)?»**
   - Если оператор отвечает с порядком — начинать.
