# Next session — entry point

**Created:** 2026-06-01 (session 5 close)
**Mode for next session:** CONTENT_WRITING_02 (Phase 0 Blueprint data-first pSEO)

---

## Текущее состояние — что работает в проде

**Phase 0 Этапы A-F полный цикл ЗАКРЫТ.** Эшелон 1 (reviews) + Эшелон 2 (comparisons + alternatives).

### Эшелон 1 (Etap E) — 30 reviews

- 30 published tools в `public.tools` с полным комплектом полей включая `verdict` + все *_ru. 4 archived (booth-ai / cogsy / pebblely / prediko) — entity-only.
- `/reviews/[slug]` + `/ru/reviews/[slug]` runtime DB-driven; `/reviews` catalog + `/sitemap.xml` + OG — DB-driven.
- Legacy MDX (6 review-2026 файлов) снесены, 12 redirect 308 в `next.config.ts`.
- Outbound-link sweep + Judge.me carve-out + PartnerAlternatives — нетронуты.

### Эшелон 2 (Etap F) — 23 comparisons + 7 alternatives

- **23 vs-comparison в `public.comparisons`** (EN + RU rows для каждого): 21 свежих в волне F + 2 ранее опубликованных (`klaviyo-vs-mailchimp`, `klaviyo-vs-omnisend`) не тронуты по explicit operator decision.
- **7 tools имеют `alternatives_editorial` jsonb** (gorgias, triple-whale, rebuy, recharge, klaviyo, smile-io, postscript) — editorial intro + perCardContext + verdict в EN + RU.
- Остальные 23 tools имеют `/alternatives/[slug]` URL который рендерится в generic-template (без editorial) — degrades gracefully.
- Migration 017 (`alternatives_editorial jsonb`) applied.
- 3 шаблонных бага в `/compare/[slug]` фикшены: shopify через `shopify_native_notes`, support через `rating_breakdown.support`, axisVal normalize helper.
- Постскрипт `pricing_notes` data-corruption (R2 CSV parser split на `$1,000`) починена.
- 10 excluded ключей + 2 canonical-dup-merged помечены в `semantic_core_entries.status='excluded'` с rationale в notes.
- 4 F2 intra-category gap ключа INSERTED (northbeam-vs-polar-analytics, judge-me-vs-yotpo, manychat-vs-tidio, flair-ai-vs-shopify-sidekick) с cluster + content_angle.

---

## Следующая задача — Этап G (Эшелон 3: best-for-segment листинги)

**Из Blueprint раздел 2 (Эшелон 3):**

Pure pSEO listings агрегирующие Эшелоны 1-2. Три формата:
- **best-for-segment** — "Best [category] for [segment]" из tools отфильтрованных по subcategories + best_for
- **by-integration** — "Best Shopify apps that integrate with [X]" из tools.integrations
- **by-pricing** — "Best [category] under $[N]/mo" из tools.pricing_min/max

Шаблон листинга: интро + ранжированный список тулзов (мини-карточки) + сравнительная таблица + verdict кому что. Internal links на reviews + comparisons. Длина: 2000-3000 слов.

**Из ядра (semantic_core_entries):** ~10 best-for-segment ключей. Точное число и формулировки — пуллим из БД на старте сессии. Owner просил **именно 10 best-for-segment листингов** в первой волне Этапа G (не by-integration / by-pricing — те позже).

### Подход — повторяет Etap F pattern

1. Audit-скрипт — pull всех `template='best-for-segment'` ключей со status, related_tool_slugs, content_angle. Сверка с tools (published / нужное subcategory + best_for покрытие).
2. Slug derivation для пустых `related_tool_slugs`.
3. Excluded markup для невалидных.
4. Финальный список → approval оператора.
5. Template extension если нужен — `/best/[slug]` route или `/guides/[slug]` если уже есть подходящий.
6. Bulk-script с EN + RU + ranked tool list + verdict.
7. Status flip + revalidate + summary.

**КРИТИЧНО — НЕ начинать сразу.** Owner explicitly попросил решать когда стартовать (возможно новая сессия). Спросить через `AskUserQuestion` перед действиями: "Этап G старт сейчас или ждём?"

### Open вопросы для Этапа G (решить с оператором)

- **Где живёт `/best/[slug]` route?** Сейчас в репо есть `content/best/{en,ru}/` (MDX path из Etap E setup), но не DB-driven. Решить: создавать MDX-driven или extend `/guides/` + cluster=best-for, или новый DB-driven runtime route.
- **Ranking-algorithm для tool-listing внутри листинга** — простой по `rating DESC`, или с фильтром по subcategories + best_for match, или с manual editorial override (как Etap F PartnerAlts partner-first)?
- **Покрытие категорий ≤3 published tools** — если в категории всего 2-3 тулза published (например chat: tidio + manychat), листинг "Best [chat] for Shopify" будет тонким. Либо консолидировать кластеры, либо те листинги пишутся differently.

---

## Этап H (после G) — нумерация пула для CHIEF

После завершения Этапа G:
1. Claude Code присваивает сквозные номера всем страницам Phase 0 в порядке эшелонов:
   - 1-30: tool reviews
   - 31-53: vs-comparisons (23)
   - 54-60: alternatives (7)
   - 61-70: best-for-segment listings (10)
2. Список (с slug + URL + краткое summary) → CHIEF
3. CHIEF берёт пул и начинает капельную публикацию по `system_config.publishing_rate_daily` (4/день в месяце 1).

**Pre-CHIEF check:** все 70 страниц уже в проде (опубликованы). H это просто organizational handoff — присвоение porядка для CHIEF traffic-monitoring и refresh-cadence. Это не релизный gate.

---

## Этап J (параллельно с I) — добивка ключей 102-427

После H Claude Code может начать программный вывод ключей 102-427:
- Все пары published tools одной category = vs-keys (комбинаторика minus уже размеченные)
- Все 30 published tools = alternatives-keys (уже все 30 покрыты)
- Все category × segment matches = best-for-keys
- INSERT в `semantic_core_entries` со `status='second_wave'`

Лежат готовые. **Через ~2 месяца GSC-статистика → решаем идти по второй волне как есть или скорректировать курс по данным.**

---

## Что прочитать на старте новой сессии

После выбора CONTENT_WRITING_02 mode (через AskUserQuestion как первое действие):
1. **`PHASE-0-BLUEPRINT.md`** ПОЛНОСТЬЮ (mandatory read protocol; pagination если token-limit). Особое внимание — раздел 2 (Эшелон 3 шаблоны) + раздел 6 (последовательность исполнения, конкретно этап G).
2. **`research/phase0-content-flags.md`** — per-tool framing rules. Применяй на best-for-listings так же как на reviews + comparisons.
3. **`sessions/infra-log.md`** — последние 2-3 блока (2026-06-01 sessions 4-5). Особенно session 5 close-block для полного контекста Этапа F + новые open follow-ups.
4. **`CONTENT-WRITING.md`** — quality gates (banned phrases, JSON-LD, honest framing).

---

## Открытые хвосты (передаются в Этап G или позднее)

### Новые из Этапа F (session 5)

**(a-new) PartnerAlternatives subcat-fallback слабо-релевантное.** Recharge на reviews-странице через `retention` subcategory overlap, и аналогичные cross-category matches. Унификация subcategory-тегов (canonical vocabulary) → точнее фильтр. Связан с (a) ниже про string-mismatch.

**(b-new) `getRatingAxisValue` helper** не существует, inline normalize в `/compare/[slug]/page.tsx`. Вынести в `lib/content/rating.ts` или `lib/utils/rating.ts` если третий consumer появится. Низкий приоритет.

**(c-new) `tool.integrations` legacy field** — backfill для 20 новых Etap D tools ИЛИ deprecate field + переключить consumers на `integrates_with_tools` + `shopify_native_notes` exclusively. Низкий приоритет до 50-tool catalog.

**(d-new) Triple Whale `affiliate_url` NULL + `affiliate_partner='partnerstack'`** — signal inconsistency. Cleanup: заполнить URL после получения, либо NULL `affiliate_partner`.

**(e-new) R2 CSV parser hardening** — RFC 4180 quoted-string handling до следующей R2 волны (если будет refresh всех tools).

### Carryovers из Etap E (session 4)

**(a) Subcategory string-mismatch.** `sms` ≠ `sms-marketing`, `email` ≠ `email-marketing` в subcategory-tags. Унифицировать теги (canonical vocabulary) или добавить equivalence-map в PartnerAlternatives fetch. **Связан с (a-new) выше.** Решать комбинированно.

**(b) `/reviews/klaviyo-pricing` 404.** `content/reviews/{en,ru}/klaviyo-pricing.mdx` живёт, но не маршрутизуется. Owner-решение:
- (i) Move → `content/guides/klaviyo-pricing.mdx`, URL `/guides/klaviyo-pricing` + redirect.
- (ii) Manual redirect `/reviews/klaviyo-pricing → /reviews/klaviyo` + удалить MDX.

**(c) Pagefind search не индексирует 30 runtime-reviews.** `scripts/build-search-index.ts` — большая задача отдельной сессии.

**(d) RU auto-обновление в проде не реализовано.** SCOUT в `tools` не пишет (explicit owner decision). Owner-driven RU refresh через Opus / новый seed-script при значимых изменениях.

**(e) `lib/content/rating.ts:getToolRatings` dead path.** Cleanup: упростить до DB-only.

### Carryovers более ранние (unchanged)

- `tools` table missing columns (pricing_url, pricing_css_selectors, pricing_data, affiliate_health_checked_at) — SCOUT-write track cancelled, low-priority cleanup.
- `system_config.modified_by` CHECK constraint rejects agent values.
- Capture SCOUT runtime AGENTS.md to `/agent-snapshots/scout/`.
- Option B refactor `/compare/[slug]` MDX-driven (bridge papers over) — менее актуально после Etap F.
- Newsletter ingestion via Beehiiv.
- OPS GPT-5.5 cost reconciliation.
- **Single-pass spec rewrite `FINAL-ARCHITECTURE-V4.md`.** Накопленный drift: Этапы D/E/F + migrations 015-017 + alternatives_editorial template extension + 3 compare-template фикса.
- TOOLS.md ↔ AGENTS.md drift prevention для CHIEF + SCOUT.
- Tighten `app/robots.ts` для AI crawlers до 50+ страниц.

---

## Тулзовые шаблоны и компоненты — уже готовы

Не нужно создавать с нуля для Этапа G (после решения по `/best/` route):

- **`app/compare/[slug]/page.tsx`** — DB-driven runtime с editorial + jsonb override. Используется для cross-link из best-for-listings.
- **`app/alternatives/[slug]/page.tsx`** — DB-driven с migration 017 editorial. Используется для cross-link.
- **`app/reviews/[slug]/page.tsx`** — DB-driven (Etap E). Используется как primary internal-link target.
- **`components/tools/PartnerAlternatives.tsx`** — works (две-pass query: same-category → subcategory overlap).
- **Webhook bridge** `/api/agents/article-published` — MDX→DB для comparisons; пригодится если решим что best-for-listings идут через MDX.

---

## Финальное состояние session 5

- **Финальный commit:** `chore(sessions): close Etap F + NEXT-SESSION-START update + scripts cleanup` (этот файл + session-log update + script cleanup в одном коммите).
- **Рабочее дерево:** чисто (кроме owner-pre-session-modifications `.claude/settings.local.json` + `PHASE-0-BLUEPRINT.md` и owner-untracked файлов).
- **Vercel deploy:** production reflects latest commit; 30 reviews + 23 comparisons + 7 editorialized alternatives + 23 generic alternatives live.

---

## В начале новой сессии — обязательный protocol

1. **AskUserQuestion** — выбор mode. Для Этапа G → CONTENT_WRITING_02.
2. **Параллельные reads:** PHASE-0-BLUEPRINT.md (full) + последние блоки writer-log.md (или infra-log.md если оператор выбирает Infrastructure).
3. **Только после** обоих чтений — спрашивать "Этап G старт сейчас или ждём?". Если owner отвечает "старт" → audit-скрипт по best-for-segment ключам → финальный список 10 → approval → bulk-script + template-decision → apply.
