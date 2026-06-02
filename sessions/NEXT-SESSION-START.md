# Next session — entry point

**Created:** 2026-06-01 (session 6 close)
**Mode for next session:** CONTENT_WRITING_02 (Phase 0 Blueprint data-first pSEO)

---

## Текущее состояние — что работает в проде

**Первая волна Phase 0 (101 ключ) — ЗАКРЫТА.** Эшелон 1 + 2 + 3 (best-for-segment) первой волны опубликованы.

### Этапы A-G полный цикл закрыт

| Эшелон | Что | Кол-во live | Session |
|---|---|---|---|
| 1 — Tool reviews | `/reviews/[slug]` runtime DB-driven, 30 published tools с verdict + *_ru | 30 EN + 30 RU | Etap E (s4) |
| 2 — Comparisons | `/compare/[slug]` runtime DB-driven, 23 canonical pairs с verdict + intro + jsonb | 23 EN + 23 RU | Etap F (s5) |
| 2 — Alternatives editorial | `/alternatives/[slug]` runtime DB-driven, 7 sources с `alternatives_editorial` jsonb (migration 017) | 7 EN + 7 RU + 23 generic | Etap F (s5) |
| 3 — Best-for-segment | `/best/[slug]` MDX+DB hybrid (lib/content/mdx.ts расширен) | 8 EN + 8 RU | Etap G (s6) |

### Из 101 ключа первой волны
- **68 ключей** покрыты live-страницами
- **12 excluded/merged** в `semantic_core_entries` с notes (Blueprint 1.2 rejection / archived participant / canonical dup)
- **21 ключ** ждут отдельных мини-волн: `how-to` (9), `pricing` (3), `guide` (19, + 2 reclassified из best-for-segment). Многие уже частично существуют в `/guides/` через Phase 1 scaffolding.

---

## Следующая задача — Этап J (раскладка 220 ключей 2-й волны)

**Owner предоставит файл `botapolis_core_REMAINING.csv`** (220 ключей дедуплицированных против первой волны, с SEMrush метриками: volume, kd, cpc, intent, priority_score).

Owner предложил выбрать как принять файл:
1. **В репо** (`/semantic-core/botapolis_core_REMAINING.csv` или подобный путь) — naturально для CSV размера ~220 строк
2. **Paste содержимого** в сообщение — быстро если ~50KB-100KB

Спросить у owner при старте сессии что удобнее.

### Действия в Этапе J

**Это РАСКЛАДКА в базу, НЕ генерация страниц.** Owner explicit: "не генерь страницы — только раскладка ключей в базу."

1. **Финальная дедупликация против ВСЕЙ `semantic_core_entries`** — не только published. Pull всех keywords из всей таблицы, сверить с 220 ключами файла. Покажи owner-у дубли если найдутся сверх ожидаемых.

2. **Миграция: новые колонки на `semantic_core_entries`** для SEMrush метрик. SQL owner approves в Studio:
   ```sql
   ALTER TABLE public.semantic_core_entries
     ADD COLUMN IF NOT EXISTS volume INTEGER,
     ADD COLUMN IF NOT EXISTS kd INTEGER,
     ADD COLUMN IF NOT EXISTS cpc NUMERIC(8,2),
     ADD COLUMN IF NOT EXISTS intent TEXT;
   ```
   `priority_score` уже есть в schema. `intent` — TEXT без CHECK (Blueprint convention OPEN schemas).

3. **Загрузка 220 ключей** с `status='second_wave'`, template = page_type из CSV. Mapping для CSV column "page_type" → semantic_core_entries.template:
   - `review` → 'review'
   - `vs-comparison` → 'vs-comparison'
   - `alternatives` → 'alternatives'
   - `how-to` → 'how-to'
   - `guide` → 'guide'
   - `best-for-segment` → 'best-for-segment'
   - `pricing` → 'pricing'
   - **`offer` → 'discount' или 'deal'** (новый template type для 44 discount-ключей; ЛОГИКА НЕ ГЕНЕРИРУЕТСЯ ПОКА — коды публикуются после партнёрок)
   - **`other` → разобрать с owner-ом** перед загрузкой (35 ключей; показать список + content_angle если есть, разметить template)

4. **`offer` (44 discount-ключей)** — пометить отдельным template (`discount` или `deal`), НЕ генерить страницы. Окно публикации откроется после получения активных промо-кодов от партнёров.

5. **`other` (35 ключей)** — показать owner-у, разобрать template вместе.

### Сводка после загрузки (обязательно)

- Сколько ключей легло
- Разбивка по template
- Сколько отсеял (дубли)
- Что в `other` + предложенный template для каждого
- Сколько discount-ключей помечено как pending партнёрок

### Что НЕ делать в Этапе J

- **НЕ генерить страницы.** Только раскладка ключей в базу.
- **НЕ публиковать reviews/comparisons/etc.** Это будущие отдельные мини-волны после раскладки.

---

## Этап H (после J + всех мини-волн) — нумерация пула для CHIEF

Когда первая волна (101) + вторая волна (220) обе будут покрыты live-страницами или явно queued/excluded/discount-pending, Claude Code присваивает сквозные номера всем страницам Phase 0 в порядке эшелонов → передача пула CHIEF для капельной publication.

H не запускается до завершения второй волны generation passes.

---

## Что прочитать на старте новой сессии

После выбора CONTENT_WRITING_02 mode (через AskUserQuestion):
1. **`PHASE-0-BLUEPRINT.md`** ПОЛНОСТЬЮ (mandatory read protocol; pagination если token-limit). Особое внимание раздел 6 (последовательность), Этап J описан в общих чертах.
2. **`research/phase0-content-flags.md`** — per-tool framing rules (применяется если/когда будут генерироваться страницы 2-й волны).
3. **`sessions/infra-log.md`** — последние 2-3 блока (sessions 5-6). Особенно session 6 close-block для контекста первой волны.
4. **`CONTENT-WRITING.md`** — quality gates (если решим что часть 2-й волны генерится через editorial workflow).

---

## Открытые хвосты (передаются в Этап J или позднее)

### Новые из Этапа G (session 6)

**(a-new-G) isoDate schema hardening** — coerce Date object в ISO string в `baseFrontmatterSchema` через `z.preprocess` или custom transform. Низкий приоритет — convention "wrap в кавычки" достаточно.

**(b-new-G) 2 reclassified ключа в `guide`** (`shopify operator tool stack` + `ai product description 10000 skus`) — нуждаются в отдельной мини-волне guide-генерации. Формат уже работает (`/guides/[slug]`).

**(c-new-G) 6 best-of listings без партнёров** (attribution, inventory, photography, product-description, ad-creative editorial) — стратегически: подобрать partner для attribution-категории (Triple Whale partnerstack — но affiliate_url пока NULL), либо принять editorial-only как стратегию для thin категорий. Owner decision.

**(d-new-G) Pagefind: добавить best-of section в build-search-index** — связан с (c-carryover) ниже про 30 reviews + теперь 8 best-of.

### Новые из Этапа F (session 5) — unchanged

**(a) PartnerAlternatives subcat-fallback слабо-релевантное** (Recharge на reviews-странице через retention overlap).
**(b) `getRatingAxisValue` helper** не вынесен, inline в /compare/.
**(c) `tool.integrations` legacy field** — backfill или deprecate.
**(d) Triple Whale `affiliate_url` NULL** + `affiliate_partner='partnerstack'` signal mismatch.
**(e) R2 CSV parser hardening** (RFC 4180).

### Carryovers из Etap E (session 4) и ранее

- (a) Subcategory string-mismatch (`sms` ≠ `sms-marketing`) — связан с PartnerAlts.
- (b) `/reviews/klaviyo-pricing` 404 (owner decision).
- (c) Pagefind не индексирует 30 runtime-reviews + 8 best-of (related to d-new-G).
- (d) RU auto-обновление не реализовано.
- (e) `getToolRatings` dead-path cleanup.
- `tools` table missing columns (pricing_url, pricing_css_selectors, pricing_data, affiliate_health_checked_at).
- `system_config.modified_by` CHECK constraint.
- Capture SCOUT runtime AGENTS.md.
- Newsletter ingestion via Beehiiv.
- OPS GPT-5.5 cost reconciliation.
- **Single-pass spec rewrite `FINAL-ARCHITECTURE-V4.md`** — накопленный drift: Этапы D/E/F/G + migrations 015-017 + alternatives_editorial extension + 3 compare-template фикса + /best/ route + bestFrontmatterSchema.
- TOOLS.md ↔ AGENTS.md drift prevention для CHIEF + SCOUT.
- Tighten `app/robots.ts` для AI crawlers.

---

## Тулзовые шаблоны и компоненты — уже готовы

Не нужно создавать с нуля для Этапа J (раскладка ключей не требует UI). Для будущих generation-passes 2-й волны:

- **`app/reviews/[slug]/page.tsx`** — DB-driven runtime (Etap E).
- **`app/compare/[slug]/page.tsx`** — DB-driven runtime + jsonb editorial (Etap F, 3 фикса в session 5).
- **`app/alternatives/[slug]/page.tsx`** — DB-driven runtime + editorial из tools.alternatives_editorial (Etap F + migration 017).
- **`app/best/[slug]/page.tsx`** — MDX + DB hybrid (Etap G + lib/content/mdx.ts расширен).
- **`app/guides/[slug]/page.tsx`** — MDX-only (existing с Phase 1).
- **`/api/agents/article-published`** webhook — MDX→DB bridge для comparisons (если потребуется снова).

---

## Финальное состояние session 6

- **Финальный commit:** `chore(sessions): close Etap G + first-wave (101 keys) close-block` (session-log + этот файл в одном коммите).
- **Рабочее дерево:** чисто (кроме owner-pre-session-modifications `.claude/settings.local.json` + `PHASE-0-BLUEPRINT.md` и owner-untracked файлов).
- **Vercel deploy:** production reflects latest commit; 30 reviews + 23 comparisons + 7 editorialized alternatives + 23 generic alternatives + 8 best-of live (EN + RU).

---

## В начале новой сессии — обязательный protocol

1. **AskUserQuestion** — выбор mode. Для Этапа J → CONTENT_WRITING_02.
2. **Параллельные reads:** PHASE-0-BLUEPRINT.md (full) + последние блоки writer-log.md / infra-log.md.
3. **Только после** обоих чтений — спрашивать "Этап J старт сейчас или ждём?" + "CSV в репо или paste?". Если owner отвечает "старт" — принять CSV → audit dedup + миграция SQL → apply + load + сводка. **НЕ генерировать страницы в этом этапе.**
