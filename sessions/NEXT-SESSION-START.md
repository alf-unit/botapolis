# Next session — entry point

**Created:** 2026-06-01 (session 4 close)
**Mode for next session:** CONTENT_WRITING_02 (Phase 0 Blueprint data-first pSEO)

---

## Текущее состояние — что работает в проде

Phase 0 Этап E (Эшелон 1 — tool reviews) **ЗАКРЫТ**.

- **30 published tools** в `public.tools` с полным комплектом полей включая `verdict` + все *_ru. 4 archived (booth-ai / cogsy / pebblely / prediko) — entity-only.
- **`/reviews/[slug]` + `/ru/reviews/[slug]`** — runtime DB-driven, dynamicParams=false, 30 slugs пре-генерируются через `generateStaticParams` из `tools.where(status='published')`. Locale через `localizeTool(row, locale)`.
- **`/reviews` catalog + `/sitemap.xml` + `/reviews/[slug]/opengraph-image`** — все DB-driven (refactored с MDX в session 4).
- **Legacy MDX (6 review-2026 файлов)** снесены, 12 redirect-правил (308 permanent, EN + RU) в `next.config.ts`.
- **Outbound-link sweep** закрыл все каналы кроме `/go/[slug]`: AffiliateButton carve-out при NULL `affiliate_url`, "Website" secondary кнопки убраны, MdxLink whitelist, pricing_source non-clickable span, `/go/` fail-closed.
- **PartnerAlternatives** — two-pass fetch (same-category → subcategory overlap), identical framed-card chrome на всех страницах. Распределение по 30 tools: 11×0 / 5×1 / 8×2 / 6×3 cards.
- **Honest analyst verdict tone** — все 30 verdicts (~1,400 chars EN + ~1,350 RU avg) без fabricated hands-on; content-flags surfaced upfront где есть.

---

## Следующая задача — Этап F (Эшелон 2: comparisons + alternatives)

**Из Blueprint раздел 2 (Эшелон 2):**
- **vs-comparisons** — комбинаторика пар тулзов внутри категорий. Шаблон уже есть (`app/compare/[slug]/page.tsx`, DB-driven через `comparisons` table). Что предстоит: построить контент-payload для каждой пары.
- **Alternatives** — один на тулз. Уже частично работает через `/alternatives/[slug]` (refactored partner-first sort в session 4). Возможно потребуется content-обогащение (intro + per-alternative-блок).

**КРИТИЧНО — не начинать Этап F сразу!**

Owner explicitly попросил **сверить план с веб-Claude** перед запуском Этапа F. Открытые вопросы для веб-Claude:
- **Объём комбинаторики:** N(N-1)/2 пар на 30 tools = 435 потенциальных compare-страниц. Какие отсечь? По категории / subcategory / partner-only / content-rules?
- **Принцип отбора пар:** в первую очередь intra-category (Klaviyo vs Omnisend, Tidio vs Gorgias)? Cross-category где subcategory-overlap? Партнёр vs не-партнёр?
- **Дедупликация:** `canonicalCompareSlug` уже делает `a-vs-b` → `b-vs-a` в одну форму. Migration 004 + CHECK constraint enforce в БД.
- **Что заполняем:** `comparisons.comparison_data` (jsonb с quickStats/features/pricing/useCases), `verdict`, `custom_intro`, `custom_methodology` — что обязательное, что опциональное.
- **Объём текста на страницу:** Blueprint указывает 1400-1800 слов. Где грань между data-driven (auto-generated из tools-полей) и editorial-добавкой?

**До получения структуры Этапа F от веб-Claude — НЕ начинать массовую генерацию.**

---

## Что прочитать на старте новой сессии

После выбора CONTENT_WRITING_02 mode (через AskUserQuestion как первое действие):
1. **`PHASE-0-BLUEPRINT.md`** ПОЛНОСТЬЮ (mandatory read protocol; pagination если token-limit). Особое внимание — раздел 2 (типы pSEO страниц / Эшелон 2 шаблоны) + раздел 6 (последовательность исполнения, конкретно этап F).
2. **`research/phase0-content-flags.md`** — per-tool framing rules (cons-must-surface, ecosystem-event, etc.). Применяй на compare-страницах так же как на reviews.
3. **`sessions/infra-log.md`** — последние 2-3 блока (2026-05-30 session 3 → 2026-06-01 sessions 1-4). Особенно session 4 close-block для полного контекста Этапа E финала.
4. **`CONTENT-WRITING.md`** — quality gates (banned phrases, JSON-LD, honest framing) применяются и к comparison-страницам.

---

## Открытые хвосты (передаются в Этап F или позднее)

**(a) Subcategory string-mismatch.** `sms` ≠ `sms-marketing`, `email` ≠ `email-marketing` в subcategory-tags — Attentive/Klaviyo не overlap, хотя семантически в одной нише. Унифицировать теги (canonical vocabulary) или добавить equivalence-map в PartnerAlternatives fetch. Затронет также подбор compare-пар если использовать subcategory как сигнал релевантности.

**(b) `/reviews/klaviyo-pricing` 404.** `content/reviews/{en,ru}/klaviyo-pricing.mdx` живёт, но не маршрутизуется (slug не в tools). Решение:
- (i) Move → `content/guides/klaviyo-pricing.mdx`, URL станет `/guides/klaviyo-pricing` + redirect `/reviews/klaviyo-pricing → /guides/klaviyo-pricing` — наиболее правильно (это how-to, не review).
- (ii) Manual redirect `/reviews/klaviyo-pricing → /reviews/klaviyo` + удалить MDX.
- Owner-решение.

**(c) Pagefind search не индексирует 30 runtime-reviews.** `scripts/build-search-index.ts` сейчас читает MDX-frontmatter; reviews-section после flip пустой (только klaviyo-pricing). Нужен refactor чтобы ингестить tool rows из БД для review-section. Большая задача, отдельная сессия.

**(d) RU auto-обновление в проде не реализовано.** SCOUT в `tools` не пишет (его данным не доверяем — explicit owner decision). Решение: при изменении pricing/rating в БД RU `*_ru` НЕ обновится автоматически. Owner-driven RU refresh через Opus / новый seed-script при значимых изменениях.

**(e) `lib/content/rating.ts:getToolRatings` dead path.** После сноса MDX `getAllMdxFrontmatter("reviews", locale)` возвращает только klaviyo-pricing — функция всегда сваливается на `tool.rating` DB-fallback. Cleanup: упростить до DB-only. Перфоманс-нюанс, не блокер.

**Carryovers from prior sessions (unchanged):**
- `tools` table missing columns (pricing_url, pricing_css_selectors, pricing_data, affiliate_health_checked_at) — SCOUT-write track cancelled, low-priority cleanup.
- `system_config.modified_by` CHECK constraint rejects agent values.
- Capture SCOUT runtime AGENTS.md to `/agent-snapshots/scout/`.
- Option B refactor `/compare/[slug]` MDX-driven (bridge papers over) — может частично решиться когда Этап F структура согласована.
- Newsletter ingestion via Beehiiv.
- OPS GPT-5.5 cost reconciliation.
- Single-pass spec rewrite `FINAL-ARCHITECTURE-V4.md`.
- TOOLS.md ↔ AGENTS.md drift prevention для CHIEF + SCOUT.
- Tighten `app/robots.ts` для AI crawlers до 50+ страниц.

---

## Тулзовые шаблоны и компоненты — уже готовы

Не нужно создавать с нуля для Этапа F:

- **`app/compare/[slug]/page.tsx`** — DB-driven runtime через `comparisons` table. Поддерживает: hero (2 ToolCardSide), at-a-glance, quickStats (auto + jsonb override), pricing (PriceTierCard × 2), features (ComparisonTable from jsonb OR FeatureBucket fallback), Shopify integration, Integrations (Venn-style A/Both/B), Support, Pros&Cons, Use cases (jsonb), Verdict, Methodology (optional), CTA tail, Related comparisons. Полная разметка готова — нужно только наполнение rows в `comparisons` table.
- **`components/tools/PartnerAlternatives.tsx`** — already инсёрчен в `/compare/[slug]` (между body grid и CTA tail). Работает.
- **`canonicalCompareSlug`** helper + migration 004 + 308 redirect handler — дедупликация A-vs-B / B-vs-A.
- **Webhook bridge MDX→DB** — `/api/agents/article-published` handler уже умеет inline-base64 comparison MDX → DB поля (jsonb). Может быть использован для editorial-добавки если выберем MDX-bridge подход.

---

## Финальное состояние session 4

- **Финальный commit:** см. `git log -1 --oneline` на момент чтения этого файла. Все session-4 артефакты в git history.
- **Рабочее дерево:** чисто (кроме owner-pre-session-modifications `.claude/settings.local.json` + `PHASE-0-BLUEPRINT.md` и owner-untracked файлов).
- **Vercel deploy:** production reflects latest commit; 30 reviews live + revalidated.

---

## В начале новой сессии — обязательный protocol

1. **AskUserQuestion** — выбор mode. Для Этапа F → CONTENT_WRITING_02.
2. **Параллельные reads:** PHASE-0-BLUEPRINT.md (full) + последние блоки writer-log.md (или infra-log.md, в зависимости от mode-mapping).
3. **Только после** обоих чтений — спрашивать "что делаем сегодня?". Если owner отвечает "Этап F" — ПОВТОРНО подтвердить что план Этапа F согласован с веб-Claude. **Не начинать массовую генерацию comparisons до получения структуры от веб-Claude.**
