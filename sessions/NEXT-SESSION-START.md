# Next session — entry point

**Created:** 2026-06-01 (session 7 close)
**Mode for next session:** CONTENT_WRITING_02 (Phase 0 Blueprint data-first pSEO)

---

## Текущее состояние

### Первая волна (101 ключ) — ЗАКРЫТА и опубликована

- **30 reviews** live (`/reviews/[slug]` runtime DB-driven, EN + RU twins).
- **23 comparisons** + **7 alternatives editorial** live (`/compare/[slug]` + `/alternatives/[slug]`, EN + RU twins, alternatives editorial через migration 017 jsonb).
- **8 best-of листингов** live (`/best/[slug]` MDX+DB hybrid, EN + RU twins).
- **43 published** strings в `semantic_core_entries` (status='published'); **12 excluded** (Blueprint 1.2 rejection + sidekick micro-queries); **3 in_writer_queue** (Etap E carryover); **остальные queued** (1st-wave non-generated guides/how-tos/pricings).

### Вторая волна (220 ключей) — РАЗЛОЖЕНА в БД, готова к генерации

- **212 ключей `status='second_wave'`** с SEMrush метриками (volume / kd / cpc / source_count / affiliate_strength / tool_label).
- **2 ключа `status='excluded'`** (sidekick micro-queries, low-value).
- **3 pricing-ключа refresh** (метрики обновлены на existing rows).
- **3 comparison dedup-skipped** (уже покрыты 1st-wave).

### DB state (snapshot session 7 close)

- **319 total** `semantic_core_entries`
- **By status**: 212 second_wave, 49 queued, 43 published, 12 excluded, 3 in_writer_queue
- **By template**: 66 vs-comparison, 54 guide, 53 pricing, 44 discount, 37 best-for-segment, 27 alternatives, 26 review, 10 how-to, 2 other
- **217 rows** имеют `semrush_volume` populated

### Migrations applied

- **017** — `tools.alternatives_editorial jsonb`
- **018** — `semantic_core_entries.semrush_volume / kd / cpc / source_count / affiliate_strength / tool_label`
- **019** — status CHECK extended (`+ 'second_wave'`), template CHECK extended (`+ 'discount' + 'other'`)

---

## Следующая задача — Этап J-generate (генерация 2-й волны)

**188 страниц во 2-й волне** (212 second_wave − 44 discount-deferred − ~0 другие deferred = 188). По template-bucket'ам:

| Template | Кол-во | Route | Status |
|---|---|---|---|
| `pricing` | 50 | `/pricing/[slug]` — **route не существует** | design + create route первым шагом |
| `discount` | 44 | TBD (redirect to `/go/[slug]`? Отдельная page?) | **НЕ генерировать сейчас** — ждут партнёрских промо-кодов |
| `guide` | 33 (Etap J only) + 19 (1st-wave carryover) + 2 (reclassified Etap G) = ~54 | `/guides/[slug]` — existing | MDX-driven, scope-checked |
| `vs-comparison` | 29 | `/compare/[slug]` — existing DB-driven | как 1st-wave Etap F pattern |
| `best-for-segment` | 29 | `/best/[slug]` — existing MDX+DB hybrid | как 1st-wave Etap G pattern |
| `alternatives` | 20 | `/alternatives/[slug]` — existing DB-driven | extend `alternatives_editorial` jsonb (migration 017) |
| `review` | 6 | `/reviews/[slug]` — existing DB-driven, OR redirect to "worth it" anchor | **decision pending**: new tool entries vs. is-X-worth-it format |
| `how-to` | 1 | `/guides/[slug]` (existing) | single key |

### Подход к генерации

**Мини-волнами по template-bucket'ам** (по аналогии с Etap E/F/G):
1. Контрольные 1-2 страницы → проверка → одобрение → пачка.
2. Приоритет внутри bucket — по `priority_score` (volume × intent × affiliate_strength).
3. Honest framing pattern переиспользуем (Etap G's "Why this listing is short" для single-tool / thin segments).
4. Content-flags применяются per source per page (`research/phase0-content-flags.md` reference).

### Порядок bucket'ов — предложение для обсуждения с owner

1. **pricing 50** (самый большой volume × commercial intent; нужен новый route — infra-effort upfront)
2. **alternatives 20** (existing route + editorial extension; быстрый win)
3. **vs-comparison 29** (existing route; reuse Etap F pattern)
4. **best-for-segment 29** (existing route; reuse Etap G pattern)
5. **guide ~54** (existing route; самая большая буква, разнообразный контент)
6. **review 6** (decision needed on format первая)
7. **how-to 1** (single key, легко закроется в любой момент)
8. **discount 44** — DEFERRED до партнёрок

Owner может перетасовать порядок по бизнес-приоритетам.

---

## Этап H (после Этапа J-generate) — нумерация ВСЕГО пула для CHIEF

Когда:
- 188 страниц 2-й волны сгенерированы и live
- 44 discount-ключа хотя бы partially (после активации первых партнёрок)

Тогда Claude Code присваивает **сквозную нумерацию** всему пулу (1-я + 2-я волна) в порядке:
1. Эшелон 1 (reviews) — приоритет по volume × affiliate
2. Эшелон 2 (comparisons + alternatives) — приоритет по volume × intent
3. Эшелон 3 (best-for + guides + pricing) — приоритет по volume × commercial
4. discount — в конце (после партнёрок)

Список → CHIEF для капельной publication.

---

## Этап I — CHIEF капельно публикует

**Скорость старта**: 4/день (ждём Deep Research про velocity ramp-up, по умолчанию из Blueprint section 7).

Owner: "ждём Deep Research про velocity, пока 4/день старт".

---

## Что прочитать на старте новой сессии

После выбора CONTENT_WRITING_02 mode (через AskUserQuestion):
1. **`PHASE-0-BLUEPRINT.md`** ПОЛНОСТЬЮ (mandatory read protocol).
2. **`research/phase0-content-flags.md`** — per-tool framing rules.
3. **`sessions/infra-log.md`** — последние 2-3 блока (sessions 6-7).
4. **`semantic-core/botapolis_core_REMAINING.csv`** — справочно, если нужно перепроверить SEMrush метрику (БД источник истины для генерации).

---

## Открытые хвосты

### Новые из Этапа J (session 7)

**(a-new-J) `/pricing/[slug]` route не существует** — нужен для 50 pricing-ключей. Decision: создать новый route (MDX-driven с DB hydration по образцу `/best/`) ИЛИ extend `/reviews/[slug]` pricing-section через anchor + redirect. Первое — больше работы, чище SEO; второе — меньше работы, потенциально менее ranking-эффективно.

**(b-new-J) 6 review keys 2-й волны** — формат "is X worth it" overlap с existing `/reviews/[slug]`. Decision: separate worth-it pages ИЛИ redirect к existing с anchor + verdict-section emphasis.

**(c-new-J) 44 discount cluster deferred** — ждут активации первых партнёрских промо-кодов. Когда первая партнёрка активируется → решить format (simple redirect-страница с pinned promo + CTA, или больше editorial).

**(d-new-J) Schema doc "OPEN" drift** — текущая convention в Blueprint писала что schema OPEN, но CHECK constraints на status + template из migration 008 in force. На будущее: `grep -A20 "constraint.*chk" supabase/migrations/*.sql` ДО предположений OPEN.

### Carryovers из Etap G (session 6) — unchanged

- isoDate schema hardening (low priority).
- 2 reclassified guide-keys (`shopify operator tool stack`, `ai product description 10000 skus`) ждут guide-pass — теперь часть combined ~54 guide-bucket в Etap J-generate.
- 6 best-of listings без партнёров — strategic discussion.
- Pagefind best-of section не индексирована.

### Carryovers из Etap F (session 5) — unchanged

- PartnerAlternatives subcat-fallback слабо-релевантное (Recharge на reviews через retention overlap).
- `getRatingAxisValue` helper не вынесен.
- `tool.integrations` legacy field — backfill или deprecate.
- Triple Whale `affiliate_url` NULL + partnerstack mismatch.
- R2 CSV parser RFC 4180 hardening.

### Carryovers ранее — unchanged

- Subcategory string-mismatch (`sms` ≠ `sms-marketing`).
- `/reviews/klaviyo-pricing` 404 (owner decision: move к /guides/ или manual redirect).
- Pagefind не индексирует 30 runtime-reviews + 8 best-of (теперь + потенциально 188 страниц после Этапа J-generate).
- RU auto-обновление не реализовано.
- `lib/content/rating.ts:getToolRatings` dead path cleanup.
- tools missing columns (pricing_url, pricing_css_selectors, pricing_data, affiliate_health_checked_at).
- system_config.modified_by CHECK constraint.
- Capture SCOUT runtime AGENTS.md.
- Newsletter ingestion via Beehiiv.
- OPS GPT-5.5 cost reconciliation.
- **Single-pass spec rewrite `FINAL-ARCHITECTURE-V4.md`** — drift накопился (Этапы D/E/F/G/J + migrations 015-019 + /best/ + bestFrontmatterSchema + alternatives_editorial + 3 compare-template фикса + status/template CHECK extensions).
- TOOLS.md ↔ AGENTS.md drift prevention для CHIEF + SCOUT.
- Tighten `app/robots.ts` для AI crawlers.

---

## Финальное состояние session 7

- **Финальные commits**: `feat(etap-j): load 220 2nd-wave keys + migrations 018 + 019` + `chore(sessions): close Etap J + NEXT-SESSION-START update + load-script cleanup`.
- **Рабочее дерево**: чисто (кроме owner-pre-session-modifications `.claude/settings.local.json` + `PHASE-0-BLUEPRINT.md` и owner-untracked файлов).
- **Vercel deploy**: production reflects latest commit; 30 reviews + 23 comparisons + 7 editorialized alternatives + 23 generic alternatives + 8 best-of live (EN + RU). 2-я волна в БД, страницы 2-й волны не публикуются до Этапа J-generate.

---

## В начале новой сессии — обязательный protocol

1. **AskUserQuestion** — выбор mode. Для Этапа J-generate → CONTENT_WRITING_02.
2. **Параллельные reads:** PHASE-0-BLUEPRINT.md (full) + последние блоки infra-log.md.
3. **Только после** обоих чтений — спрашивать "Этап J-generate старт сейчас? Какой template-bucket первым (предложение pricing/alternatives/guide/...)?" Если owner отвечает с порядком — начинать с контрольных 1-2 страниц этого bucket'а → approval → пачка.
