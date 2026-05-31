# PHASE 0 — Data-First pSEO Blueprint
## Botapolis: от ручной муки к конвейеру

**Версия:** 1.0
**Дата:** 2026-05-30
**Заменяет:** editorial-per-page workflow в части pSEO-контента
**Статус:** план к исполнению, требует одобрения оператора перед стартом

---

## 0. ЗАЧЕМ ЭТОТ ДОКУМЕНТ

Предыдущая модель производства застряла в противоречии: продавали pSEO (быстрая массовая генерация), а исполняли editorial (мучительное вылизывание каждой страницы с Deep Research, согласованиями, правками). Каждая страница = отдельная боль. Идея масштаба умерла.

Этот документ фиксирует переход на правильную модель: **данные собираются один раз column-wise (по срезам на все тулзы сразу), складываются в Supabase, и страницы ГЕНЕРИРУЮТСЯ из данных пачками, а не пишутся по одной**.

Ключевой сдвиг мышления:
- Уникальность страницы идёт от ДАННЫХ (актуальный pricing, точные фичи, реальные числа), а не от уникального эссе на каждую.
- Оператор делает конечное число Deep Research (по срезам), а не один на каждую статью.
- Claude Code генерит все страницы разом из заполненной базы.
- CHIEF публикует капельно из готового пронумерованного пула месяцами.
- Оператор вне ежедневной петли полностью.

---

## 1. ОТБОР ТУЛЗОВ — кто попадает в базу

Принцип жёсткий: **на сайте только те, кто приносит деньги.** Есть живая affiliate-программа и платят комиссию — берём. Мёртвый, generic, или без партнёрки — в мусор.

### 1.1 Существующие 14 тулзов (остаются, дозаполняются)

Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio.

Замечания:
- **Skio** — статус archived (куплен Recharge апрель 2026). Не для affiliate, только как entity для migration-статей. Остаётся для контента, но не монетизируется.
- **ManyChat, Loop Subscriptions** — 0 упоминаний в ядре сейчас. Либо ядро расширяем вокруг них, либо они тихо сидят как catalog entries. Не трогаем пока.

### 1.2 Новые кандидаты — ФИЛЬТР монетизации

Прогнал ~25 вендоров из ядра через фильтр «есть ли деньги». Решение по каждому:

**БЕРЁМ — HIGH (живая партнёрка + сильный Shopify-fit):**

| Tool | Партнёрка | Комиссия (требует verify при ресёрче) |
|------|-----------|----------------------------------------|
| Loop Returns | Да, через partner program | recurring |
| Stay AI | Да (subscriptions) | recurring |
| Triple Whale | Да | recurring/CPA |
| Rebuy | Да | recurring |
| Attentive | Да (SMS) | recurring |
| LoyaltyLion | Да | recurring |
| AfterShip | Да | recurring |
| Signifyd | Да (fraud) | CPA/recurring |
| Shopify Sidekick | НЕ отдельная партнёрка — это фича Shopify → ведёт на Shopify Partner Program (см. раздел 7) | — |

**БЕРЁМ — MEDIUM (релевантны, партнёрку verify при ресёрче):**

Pebblely, AdCreative.ai, Flair AI, Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, LimeSpot, Pencil.
TikTok Shop apps — это не один продукт, разберём при ресёрче (возможно конкретные приложения).

**В МУСОР — не берём (обоснование прямое):**

| Tool | Почему НЕ берём |
|------|-----------------|
| Returnly | Закрыт 1 окт 2023. Только как entity для migration-контента (как Skio), не как живой тулз. |
| ChatGPT | Не партнёрка, generic. Не наша ниша. |
| Zendesk | Enterprise, generic, не Shopify-specific. Партнёрка есть но конверсия для нашей аудитории низкая. |
| Brevo, Sendlane | Слабый Shopify-fit, низкий приоритет, ядро их почти не покрывает (1 упоминание). Отложить — если ядро вокруг них вырастет, вернёмся. |
| Re:amaze, Help Scout | Generic helpdesk, не AI-focused, слабая релевантность нише. |
| NoFraud | 1 упоминание, узко. Отложить. |
| eesel, Zipchat | Появляются как competitors в чужих alternatives, не как продукты которые мы продвигаем. Не берём как catalog tools. |

### 1.3 Итоговый список базы

`14 существующих + 9 HIGH + 11 MEDIUM ≈ 34 живых монетизируемых тулза` (минус Skio/Returnly которые archived-entity, не монетизируются).

Точное финальное число подтвердится при ресёрче — если у какого-то MEDIUM-тулза не окажется живой партнёрки, выпадет. Целимся в ~32-34 монетизируемых.

**ВАЖНО:** affiliate-программу каждого нового тулза проверяем в ресёрче (раздел 4, срез «monetization»). Тулз без подтверждённой партнёрки в базу как монетизируемый не идёт.

---

## 2. ТИПЫ pSEO СТРАНИЦ — что генерируем

Шесть типов, в порядке эшелонов зависимости. Базовая структура взята из текущего CONTENT-WRITING.md, упрощена под data-first генерацию (убрано требование Deep Research на каждую — данные берутся из заполненной базы).

### Эшелон 1 — Tool pages (reviews)

`Один на каждый тулз. ~32-34 страницы EN + RU twins.`

Это фундамент — на них ссылаются все остальные. Должны существовать первыми.

Шаблон (генерится из полей `tools`):
```
H1: [Tool] Review 2026 — [tagline angle]
- Intro: что это, для кого (из tools.description, best_for)
- Pricing breakdown (таблица из pricing_model/min/max/notes + tiers из ресёрча)
- Features (таблица из tools.features jsonb)
- Integrations (из tools.integrations)
- Pros / Cons (из tools.pros/cons)
- Rating breakdown 4 оси (из tools.rating_breakdown)
- Best for / Not for (из tools.best_for/not_for)
- Verdict (из ресёрча, конкретный)
- Affiliate CTA (/go/[slug])
```

Длина: 1200-2000 слов. Большая часть собирается из полей, ресёрч даёт verdict + нюансы + 2-3 операторские цитаты.

### Эшелон 2 — Comparisons (X vs Y) + Alternatives

`Comparisons: комбинаторика пар тулзов внутри категорий. Alternatives: один на тулз.`

Зависят от Эшелона 1 — линкуются на tool pages.

**vs-comparison** шаблон (генерится из двух карточек tools + comparison-данных):
```
H1: [Tool A] vs [Tool B] 2026 — [angle]
- TL;DR verdict (кто для кого)
- Side-by-side таблица (pricing, features, integrations, rating — из обеих карточек)
- Winner for [segment X] / Winner for [segment Y] (из winner_for)
- Где каждый сильнее (из pros/cons обоих)
- Affiliate CTA обоих (/go/[slug-a], /go/[slug-b])
- Internal links на /reviews/[a], /reviews/[b]
```
Длина: 1400-1800 слов.

**alternatives** шаблон:
```
H1: [Tool] Alternatives 2026 — [angle]
- Почему ищут альтернативы (из cons тулза)
- 3-5 альтернатив (каждая = мини-карточка из её tools-записи)
- Сравнительная таблица
- Кому какая подходит
- Affiliate CTA альтернатив
- Internal links на /reviews/ каждой альтернативы + /compare/
```
Длина: 1500-2000 слов.

### Эшелон 3 — Pure pSEO listings

`Агрегируют Эшелоны 1-2. Генерятся последними.`

- **best-for-segment:** "Best [category] for [segment]" — из tools отфильтрованных по subcategories + best_for
- **by-integration:** "Best Shopify apps that integrate with [X]" — из tools.integrations
- **by-pricing:** "Best [category] under $[N]/mo" — из tools.pricing_min/max

Шаблон листинга: интро + ранжированный список тулзов (мини-карточки) + таблица + verdict кому что. Internal links на reviews и comparisons. 2000-3000 слов.

---

## 3. СРЕЗЫ ДАННЫХ — что нужно собрать

Это сердце column-wise подхода. Вместо «один ресёрч на тулз» — **один ресёрч на СРЕЗ данных по ВСЕМ тулзам сразу**. Глубоко по срезу, широко по тулзам, формат единый by design.

Из шаблонов раздела 2 выводим какие именно срезы нужны:

| # | Срез данных | Что собирает | Заполняет поля tools |
|---|-------------|--------------|----------------------|
| 1 | **Identity & positioning** | name, tagline, что это, для кого, для кого НЕ | name, tagline, description, best_for, not_for, category, subcategories |
| 2 | **Pricing** | все tiers с цифрами, модель ценообразования, подводные камни | pricing_model, pricing_min, pricing_max, pricing_notes |
| 3 | **Features** | полный список фич с описаниями, что включено в каких планах | features (jsonb) |
| 4 | **Integrations** | с чем интегрируется (Shopify, Klaviyo, и т.д.) | integrations |
| 5 | **Reviews & ratings** | агрегат G2/Trustpilot/Capterra, 4-осевой рейтинг, реальные операторские цитаты, паттерны жалоб | rating, rating_breakdown, pros, cons + cite material для notes |
| 6 | **Monetization** (внутренний, не на сайт) | есть ли affiliate-программа, комиссия, recurring/CPA, через какую платформу | affiliate_url, affiliate_partner (+ решение брать/не брать) |

Шесть срезов. Каждый = один Deep Research проход по всем ~34 тулзам.

`Почему именно так считается:` шаблоны страниц требуют ровно эти поля. Каждое поле приходит из одного из 6 срезов. Собрав 6 срезов — заполняем все поля всех тулзов — генерим все страницы. Конечное, обозримое число: **6 ресёрчей** на весь набор инструментов.

---

## 4. ПРОМПТЫ DEEP RESEARCH — готовые к копированию

Каждый промпт **полностью самодостаточный**: содержит контекст, полный список инструментов, что искать и формат вывода. Копируешь целиком в Web Chat, запускаешь Deep Research, ничего доклеивать не надо. Каждый промпт написан как с чистого листа — агент не помнит прошлых сессий, и это учтено.

Все 6 ресёрчей работают по одному списку из 34 инструментов. Список вшит в каждый промпт.

### Ресёрч 1 — Identity & Positioning

```
Я собираю структурированные данные для базы сравнительного сайта по 
Shopify AI-инструментам. Мне нужны точные, проверяемые данные в табличном 
формате, не проза. Если данные по инструменту найти не удалось — пиши 
"НЕ НАЙДЕНО", не выдумывай.

Проанализируй каждый из этих 34 инструментов:
Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, 
Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio, 
Loop Returns, Stay AI, Triple Whale, Rebuy, Attentive, LoyaltyLion, 
AfterShip, Signifyd, Shopify Sidekick, Pebblely, AdCreative.ai, Flair AI, 
Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, 
LimeSpot, Pencil.

Для каждого инструмента собери:
- Официальное название
- Tagline (одна фраза что это)
- Что это (2-3 предложения): категория продукта, основная функция
- Для кого идеально (best_for): тип/размер Shopify-магазина
- Для кого НЕ подходит (not_for): где инструмент плохой выбор
- Категория: одна из [email, sms, support, chat, reviews, upsell, 
  subscriptions, loyalty, returns, inventory, attribution, ads, 
  product-content, fraud, personalization]
- Подкатегории: 2-4 тега

Выведи таблицей, одна строка на инструмент, колонки:
tool | name | tagline | what_it_is | best_for | not_for | category | subcategories
```

### Ресёрч 2 — Pricing

```
Я собираю структурированные данные о ценах для базы сравнительного сайта 
по Shopify AI-инструментам. Мне нужны АКТУАЛЬНЫЕ цены, проверенные на 
официальном сайте каждого вендора, с датой проверки. Табличный формат, 
не проза. Если цену найти не удалось — пиши "НЕ НАЙДЕНО", не выдумывай.

Проанализируй каждый из этих 34 инструментов:
Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, 
Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio, 
Loop Returns, Stay AI, Triple Whale, Rebuy, Attentive, LoyaltyLion, 
AfterShip, Signifyd, Shopify Sidekick, Pebblely, AdCreative.ai, Flair AI, 
Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, 
LimeSpot, Pencil.

Для каждого инструмента собери:
- Модель ценообразования: flat | tiered | usage-based | per-conversation | 
  freemium | custom
- Минимальная платная цена ($/мес)
- Максимальная/потолок ($/мес или "custom")
- Все tiers с названиями и ценами
- Подводные камни ценообразования (что дорожает при росте, скрытые лимиты, 
  overage-платежи) — это критично, операторы на этом горят
- Есть ли бесплатный план и его лимиты

Выведи таблицей, одна строка на инструмент, колонки:
tool | pricing_model | price_min | price_max | tiers | pricing_gotchas | 
free_plan | verified_date
```

### Ресёрч 3 — Features

```
Я собираю структурированные данные о функциях для базы сравнительного 
сайта по Shopify AI-инструментам. Мне нужен полный список ключевых фич 
каждого инструмента в структурированном формате, не проза. Если данные 
найти не удалось — пиши "НЕ НАЙДЕНО", не выдумывай.

Проанализируй каждый из этих 34 инструментов:
Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, 
Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio, 
Loop Returns, Stay AI, Triple Whale, Rebuy, Attentive, LoyaltyLion, 
AfterShip, Signifyd, Shopify Sidekick, Pebblely, AdCreative.ai, Flair AI, 
Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, 
LimeSpot, Pencil.

Для каждого инструмента собери полный список ключевых фич, по каждой фиче:
- Название фичи
- Что делает (краткое описание)
- В каких планах доступна (если зависит от тарифа)
- Является ли AI-фичей (и что именно AI делает)

Выведи на каждый инструмент строку, колонки:
tool | features

где features — массив объектов вида 
{name, description, plan_availability, is_ai}
```

### Ресёрч 4 — Integrations

```
Я собираю структурированные данные об интеграциях для базы сравнительного 
сайта по Shopify AI-инструментам. Табличный формат, не проза. Если данные 
найти не удалось — пиши "НЕ НАЙДЕНО", не выдумывай.

Проанализируй каждый из этих 34 инструментов:
Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, 
Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio, 
Loop Returns, Stay AI, Triple Whale, Rebuy, Attentive, LoyaltyLion, 
AfterShip, Signifyd, Shopify Sidekick, Pebblely, AdCreative.ai, Flair AI, 
Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, 
LimeSpot, Pencil.

Для каждого инструмента собери:
- Нативная интеграция с Shopify (да/нет, насколько глубокая)
- С какими из инструментов этого же списка интегрируется (например 
  Klaviyo, Gorgias, Recharge) — это нужно для перелинковки
- Ключевые внешние интеграции (Meta, Google, TikTok, Slack, и т.д.)

Выведи таблицей, одна строка на инструмент, колонки:
tool | shopify_native | integrates_with | key_external_integrations

где integrates_with и key_external_integrations — массивы.
```

### Ресёрч 5 — Reviews & Ratings

```
Я собираю агрегированную репутацию инструментов для базы сравнительного 
сайта по Shopify AI-инструментам. Мне нужны реальные рейтинги с площадок 
отзывов и реальные цитаты пользователей с атрибуцией. Табличный формат. 
Если данные найти не удалось — пиши "НЕ НАЙДЕНО", не выдумывай. Цитаты 
не сочиняй — только реальные, с указанием источника и даты.

Проанализируй каждый из этих 34 инструментов:
Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, 
Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio, 
Loop Returns, Stay AI, Triple Whale, Rebuy, Attentive, LoyaltyLion, 
AfterShip, Signifyd, Shopify Sidekick, Pebblely, AdCreative.ai, Flair AI, 
Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, 
LimeSpot, Pencil.

Для каждого инструмента собери:
- Рейтинг G2 (X/5 и количество отзывов)
- Рейтинг Trustpilot (X/5 и количество)
- Рейтинг Shopify App Store (X/5 и количество) если применимо
- 4-осевая оценка, выведенная из отзывов (шкала 0-10): 
  ease_of_use, value, support, features
- Топ-3 плюса (что хвалят чаще всего)
- Топ-3 минуса (на что жалуются чаще всего)
- 2-3 реальные пользовательские цитаты с атрибуцией (источник + дата), 
  и положительные и негативные

Выведи на каждый инструмент строку, колонки:
tool | g2 | trustpilot | shopify_store | ratings_4axis | top_pros | 
top_cons | operator_quotes

где ratings_4axis = {ease, value, support, features}, 
top_pros/top_cons — массивы из 3, 
operator_quotes — массив объектов {quote, source, date}
```

### Ресёрч 6 — Monetization (внутренний срез, НЕ на сайт)

```
Я выясняю партнёрские программы инструментов чтобы решить каких из них 
добавлять на сайт. Мне нужны точные данные о affiliate/partner программах. 
Табличный формат. Если программу найти не удалось — пиши "НЕ НАЙДЕНО", 
не выдумывай.

Проанализируй каждый из этих 34 инструментов:
Klaviyo, Gorgias, Postscript, Recharge, Omnisend, Mailchimp, Tidio, 
Judge.me, Smile.io, Loox, Yotpo, ManyChat, Loop Subscriptions, Skio, 
Loop Returns, Stay AI, Triple Whale, Rebuy, Attentive, LoyaltyLion, 
AfterShip, Signifyd, Shopify Sidekick, Pebblely, AdCreative.ai, Flair AI, 
Booth AI, Inventory Planner, Prediko, Northbeam, Polar Analytics, Cogsy, 
LimeSpot, Pencil.

Для каждого инструмента выясни:
- Есть ли affiliate или partner программа (да/нет)
- Размер комиссии (% или фиксированная сумма)
- Тип: recurring | one-time | CPA
- Через какую платформу (direct, Impact, PartnerStack, Rewardful, 
  ShareASale, и т.д.)
- Ссылка на страницу партнёрской программы
- Cookie window если указан

Выведи таблицей, одна строка на инструмент, колонки:
tool | has_program | commission | type | platform | program_url | cookie_window
```

---

## 5. СХЕМА SUPABASE — что добавить

База уже в основном готова (tools имеет нужные facet-поля). Нужны точечные добавления.

### 5.1 Связь keyword ↔ tool (структурный gap)

Сейчас в semantic_core_entries нет связи с tools кроме текста keyword. Для column-wise генерации нужна явная связь.

```sql
-- Добавить в semantic_core_entries
ALTER TABLE semantic_core_entries 
  ADD COLUMN IF NOT EXISTS related_tool_slugs TEXT[];

-- Заполняется при наполнении: какие тулзы фигурируют в keyword
-- "klaviyo vs mailchimp" → ['klaviyo', 'mailchimp']
-- "gorgias alternatives" → ['gorgias']
```

Junction-таблицу не делаем — text[] проще и достаточно для наших объёмов.

### 5.2 comparisons — дозаполнение контент-полей

Таблица существует как scaffold (контент-поля NULL). При генерации Эшелона 2 заполняются:
- verdict, winner_for, comparison_data (jsonb со side-by-side данными), custom_intro

Структуру не меняем — она готова, просто наполняем.

### 5.3 Новые тулзы — INSERT

~20 новых тулзов (HIGH + MEDIUM прошедшие фильтр) вставляются в tools по мере заполнения данными из ресёрчей. Через миграцию или seed (как делали Loop/Skio — migration + seed для воспроизводимости).

### 5.4 RU facets (отложенный gap, не блокер первой волны)

Для RU pSEO не хватает *_ru на нормализованных полях (subcategories, features.description, pricing_notes). Решение — runtime-перевод через существующий OpenRouter hook ИЛИ добор *_ru колонок. Решаем после EN-волны, не блокирует старт.

### 5.5 competitors_top3 — обогащение (минор)

Сейчас [{url}], спека ждала [{url, dr, angle}]. При ресёрче 5 (reviews) можно заодно собрать competitor angle. Не критично для первой волны.

---

## 6. ПОСЛЕДОВАТЕЛЬНОСТЬ ИСПОЛНЕНИЯ

```
ЭТАП A — Анализ ✓ СДЕЛАНО
  (этот документ + аудит базы)

ЭТАП B — Отбор тулзов
  - Claude Code: добавить ~20 новых тулзов в tools как заготовки 
    (slug, name, status='draft' пока без данных)
  - Финальный фильтр по монетизации произойдёт после Ресёрча 6

ЭТАП C — Ресёрчи (оператор, интенсивно)
  - 6 срезов = 6 Deep Research сессий (промпты раздел 4)
  - Каждый результат → файл в /research/ → отдать Claude Code
  - Прогресс виден: "сделано N из 6"

ЭТАП D — Наполнение базы (Claude Code)
  - Разложить результаты ресёрчей в tools (все поля всех тулзов)
  - Заполнить related_tool_slugs в semantic_core_entries
  - Исключить тулзы без живой партнёрки (по Ресёрчу 6)
  - Verify: все активные тулзы имеют полный профиль

ЭТАП E — Генерация Эшелон 1 (Claude Code)
  - Tool pages (reviews) для всех ~32-34 тулзов
  - НЕ публикуются сразу — складываются, нумеруются
  
ЭТАП F — Генерация Эшелон 2 (Claude Code)
  - Comparisons (комбинаторика пар внутри категорий)
  - Alternatives (по тулзу)
  - Линкуются на Эшелон 1
  
ЭТАП G — Генерация Эшелон 3 (Claude Code)
  - best-for / by-integration / by-pricing листинги
  - Агрегируют Эшелоны 1-2

ЭТАП H — Передача пула CHIEF
  - Claude Code присваивает сквозные номера всем страницам
    в порядке эшелонов (тулзы → сравнения → листинги)
  - Список → CHIEF

ЭТАП I — Капельная публикация (CHIEF, без оператора)
  - 4/день месяц 1 → больше → больше
  - Порядок = порядок эшелонов (тулзы первыми индексируются,
    набирают вес, потом сравнения линкуются, потом листинги)
  - Несколько месяцев из готового пула

ЭТАП J — Добивка ключей 102-427 (СРАЗУ после H, не ждём)
  - Claude Code программно выводит из комбинаторики заполненной базы:
    все пары тулзов = vs-ключи, все тулзы = alternatives-ключи,
    сегменты = best-for-ключи
  - В semantic_core_entries со статусом 'second_wave'
  - Лежат готовые
  - [Через ~2 месяца: GSC-статистика → решаем идти по второй волне 
    как есть или скорректировать курс по данным]
```

---

## 7. SHOPIFY PARTNER PROGRAM — закрытие дыры

Дыра которую оператор поймал: Shopify Partner Program прописан в Playbook как главная партнёрка ($460/мес с Plus-реферала), но ни одной страницы ведущей на неё не было.

`Решение — Shopify-кластер` (добавляется как расширение, не блокирует первую волну):

Страницы которые ловят людей выбирающих/апгрейдящих платформу:
- "Shopify vs WooCommerce" / "Shopify vs BigCommerce" (выбор платформы)
- "Shopify Plus worth it" / "когда переходить на Shopify Plus"
- "Shopify pricing tiers explained 2026"
- "Shopify Basic vs Shopify vs Advanced"

Здесь человек на грани регистрации/апгрейда — реферальная ссылка на Shopify Partner Program. Эти запросы в текущем ядре отсутствуют — добавляются отдельным кластером (войдёт в добивку 102-427 или раньше отдельным мини-ресёрчем).

`Решение по Shopify Sidekick / Magic / Flow:` это фичи самого Shopify. Страницы про них («Shopify Sidekick review», «Shopify Magic product descriptions») ведут на Shopify Partner Program, а не на отдельную партнёрку. Монетизируются через главную Shopify-партнёрку.

### 7.1 Где Shopify-кластер живёт в системе (Вариант Б)

На старте кластер **не получает отдельный раздел в меню**. Страницы кладутся в существующий `/guides/` с кластером `shopify-platform`. Причина — не плодить структурные сущности преждевременно (тот же принцип что применили к /directory/: сначала контент, потом структура).

Конкретно:
- Страницы: `/guides/shopify-vs-woocommerce`, `/guides/shopify-plus-worth-it`, `/guides/shopify-pricing-tiers-2026`, и т.д.
- В semantic_core_entries: cluster = `shopify-platform`
- В меню навигации: ничего нового не добавляется, живут внутри Guides

`Триггер на вынос в отдельный hub:` когда в кластере наберётся 5+ страниц И они начнут получать трафик из GSC — Claude Code выносит их в отдельный hub `/shopify/` со своей посадочной, ставит 301-редиректы со старых /guides/ URL. Это концентрирует topical authority по Shopify в одном месте, что усиливает ранжирование платформенных запросов. До достижения порога — не трогаем, держим в /guides/.

Этот вынос — отдельная задача в будущем, не часть первой волны.

---

## 8. ЧТО ИЗМЕНИТСЯ В CONTENT-WRITING.md

Текущий CONTENT-WRITING.md написан под editorial workflow. Для pSEO-генерации нужна упрощённая версия (отдельный режим или секция):

Убрать для pSEO-генерации:
- Требование Deep Research на каждую статью (данные из заполненной базы)
- Требование операторских цитат на каждую (берутся из tools если есть, не обязательны для листингов)
- Per-page согласование с оператором

Оставить:
- Banned phrases (всегда)
- Affiliate /go/[slug] pattern (всегда)
- JSON-LD по типу (всегда)
- Honest framing (всегда — никаких fake hands-on)
- Quality gate на полноту данных (новое: страница не генерится если профиль тулза неполный)

Это отдельный апдейт после одобрения этого документа — не сейчас.

---

## 9. ОТКРЫТЫЕ ВОПРОСЫ / РИСКИ

- **RU-волна:** facet-переводы не готовы. EN-волна идёт первой, RU решается после (runtime-перевод или *_ru колонки).
- **Подкластеры ≤3 ключей:** 20 из 29 кластеров subscale. Для листингов (Эшелон 3) их надо либо консолидировать, либо они дадут мало страниц. Решается на этапе генерации Эшелона 3.
- **Velocity:** держим 4/день месяц 1. Полные данные = страницы не thin = риск бана снят, но темп всё равно консервативный пока домен молодой.
- **Partner verification:** финальный список тулзов зависит от Ресёрча 6. Если у MEDIUM-тулза нет живой партнёрки — выпадает.
- **Объём генерации:** ~34 reviews + N comparisons (комбинаторика, потенциально 100+) + alternatives + листинги. Точное число станет ясно после наполнения базы.

---

## 10. ПЕРВЫЙ ШАГ ПОСЛЕ ОДОБРЕНИЯ

1. Оператор одобряет этот документ (или правит)
2. Claude Code добавляет ~20 новых тулзов как заготовки (Этап B)
3. Оператор запускает Ресёрч 1 (Identity) в Web Chat по промпту из раздела 4
4. Дальше по последовательности раздела 6

Никаких генераций до заполнения базы. Никаких ручных статей которые должны быть программными. Конвейер.

---

**Конец Phase 0 Blueprint.**
