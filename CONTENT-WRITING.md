# CONTENT-WRITING.md — Writer Mode

Этот файл подгружается когда оператор пишет "прочитай CONTENT-WRITING.md".
Пока он подгружен — ты в **Writer mode**. Все правила ниже применяются.
Если оператор переключается на code/debug — этот файл не релевантен, работай
с кодом без оглядки сюда.

> Этот документ перезаписан 2026-06-03 под текущую модель проекта. Старая
> модель (task packets из /writer-queue/, SCOUT-scraping, /reviews/ MDX,
> конвейер OPS→packets) МЁРТВА. Не ищи writer-queue, не жди packets.

---

## 1. Реальная модель проекта (как есть сейчас)

Три участника:
- **Web Chat** (стратегия, Deep Research, семантическое ядро) — через оператора
- **Этот Writer mode (Claude Code)** — пишет контент И обновляет данные в базе
- **CHIEF** (Telegram) — позже будет капельно публиковать готовый пул

Чего НЕТ (выкинуто из старой версии):
- НЕТ task packets и /writer-queue/ — задачи приходят прямо от оператора в чате
- НЕТ отдельного SCOUT-scraping как источника данных — ты сам добираешь веб
- НЕТ /content/reviews/ — reviews слиты в /tools/[slug], рендерятся из базы
- НЕТ конвейера OPS→packets→writer

---

## 2. ГЛАВНЫЙ МЕТОД — data-first + realtime web add

Это стандарт для ВСЕХ содержательных pSEO-статей (pricing, guide, how-to,
comparison, alternatives, best-for). Так пишется каждая статья:

**Шаг 1 — База как фундамент.**
Тяни из Supabase (tools row) + Research-файлы как baseline:
- `/research/` Research 02 (pricing: tiers, gotchas, free_plan, verified_date)
- Research 05 (ratings: G2/Trustpilot/Shopify, 4-axis, pros/cons, operator_quotes)
- tools row (pricing_min/max/model/notes, features, integrations, verdict,
  best_for/not_for, rating, rating_breakdown, external_ratings, operator_quotes)
Это проверенная структура и отправная точка — НЕ пиши с нуля.

**Шаг 2 — Realtime веб-добор.**
Догугли свежее и недостающее В МОМЕНТ написания:
- `WebFetch` ОФИЦИАЛЬНОГО сайта вендора (klaviyo.com/pricing и т.д.) →
  актуальные цены/тарифы AS OF TODAY + verified-дата сегодняшняя
- `WebSearch "{tool} pricing 2026"` → 5-10 third-party разборов
  (EmailToolTester, Vendr, ringly, Retainful и т.д.) для math, scale-points,
  hidden costs которых нет на vendor-странице
- `WebSearch` свежих operator quotes (reddit r/shopify, G2, recent threads
  2026) — с указанием месяца/года
- Для гайдов/how-to: `WebFetch` официальной ДОКУМЕНТАЦИИ вендора
  (help-центр, setup-доки) — она свежее статики и не раскладывается в ресёрч

**Шаг 3 — Синтез в MDX.**
Слепи статью из база + веб. Свежие веб-факты приоритетнее устаревшей статики.

**Ориентир времени:** ~8-14 мин на статью. Время НЕ лимит — качество важнее.
Оператора за материалом НЕ гоняем, веб добираешь сам.

### Правила веб-добора (строго)
- Базовые цены/тарифы — ТОЛЬКО с официального сайта вендора + verified-дата.
  Third-party — для math/scale/quotes, НЕ для базовых цен.
- Если веб противоречит базе (цена изменилась) — бери СВЕЖЕЕ из официального
  источника, помечай "обновлено [дата]".
- НЕ выдумывай цифры. Либо база, либо проверенный официальный веб-источник.
  Не нашёл — "НЕ НАЙДЕНО" / пропусти, не сочиняй.

### Веб → база (двусторонний поток) — ВАЖНО
Когда нашёл свежее официальное расходящееся с базой или отсутствующее:
- **Обновляй устаревшее + дописывай недостающее ТОЛЬКО в СУЩЕСТВУЮЩИЕ поля**
  базы (pricing_min/max/model/notes, rating и т.д.) — сам, напрямую, у тебя
  есть write-доступ к данным. Пометь verified-дату.
- **НИКАКИХ новых полей и НИКАКИХ миграций.** Не предлагай, не проси оператора.
  Если данные не лезут в существующие поля базы, но полезны для статьи — пиши
  их в СТАТЬЮ, базу не трогай.
- Third-party math/quotes — только в статью, в базу как "истину" НЕ пиши.
- В сводке перечисли что обновил в базе (тул: было→стало, источник) — для
  видимости оператору, апрув не нужен.

Миграции (изменение СТРУКТУРЫ — новые поля/таблицы) — только оператор в
Supabase Studio. Запись ДАННЫХ в существующие поля — ты сам.

---

## 3. Типы страниц, URL, источник

| Тип | URL | Источник | Длина |
|-----|-----|----------|-------|
| Tool (review) | `/tools/[slug]` | **БД** (рендер из tools row) | — рендерится |
| Pricing | `/pricing/[slug]` | **MDX** `/content/pricing/{en,ru}/` | 1500-2500 слов |
| Guide | `/guides/[slug]` | **MDX** `/content/guides/{en,ru}/` | 2000-3000 слов |
| How-to | `/guides/[slug]` (тот же роут) | **MDX** | 1200-2000 слов |
| Comparison | `/compare/[X-vs-Y]` | **БД** `public.comparisons` | 1400-1800 слов |
| Alternatives | `/alternatives/[slug]` | **БД** (+ alternatives_editorial jsonb) | 1500-2000 слов |
| Best-for | `/best/[slug]` | **MDX + БД** (frontmatter + RankedToolGrid) | 2000-3000 слов |

Принцип: **данные → база (рендер на лету), проза-статьи → MDX-файлы.**
- Каталожные/сравнительные (tools, compare, alternatives) собираются из базы.
- Содержательные статьи (pricing, guide, best) пишутся MDX, наполняются
  методом из раздела 2.

### DEFINITION OF DONE — HARD RULE (с 2026-06-03)

Страница любого типа **НЕ считается готовой и НЕ публикуется**, пока не
выполнено ВСЁ:

1. **Контент EN + RU** — обе версии в одной сессии (см. правило локализации
   ниже).
2. **FINDABLE: страница есть в хабе своего типа И в Navbar/Footer — не
   орфан.** Если хаба/пункта в навигации не существует — создаётся в том
   же заходе. Контент без места в навигации = орфан = НЕ готово.
3. **В sitemap (оба языка)** — `app/sitemap.ts` STATIC_ROUTES для хаба + loop
   по детальным slug'ам с языковыми alternates.
4. **Перелинкована**: Related блок + PartnerAlternatives (где применимо) +
   внутренние контекстные ссылки в теле + backlinks с `/compare/` где
   применимо (программно через `scripts/pricing-compare-backlinks.ts` для
   pricing; аналогичные loader'ы создаются для других типов по мере нужды).
5. **Прошла валидатор** (`npm run validate:content -- --strict-pairing`):
   frontmatter по схеме (description ≤220, etc.), нет голых `<>` перед
   цифрой/`$` в body, EN↔RU pairing зелёный, code-fence lang-tags на месте.

**Правило type-agnostic** — применяется к pricing, guide, comparison,
alternatives, best, review и **всем будущим типам**. При генерации любой
пачки страниц навигация / хаб / sitemap / перелинковка делаются **В ТОМ ЖЕ
заходе**, не postfactum.

Историческое примечание: в session 3 (2026-06-03) 16 EN + 16 RU pricing
страниц ушли в прод без хаба `/pricing`, без пункта в Navbar/Footer, без
sitemap для самого хаба — классические орфаны, доступные только по прямому
URL или из перелинковки внутри других страниц. Фикс пришлось делать
postfactum той же сессией. Это правило существует чтобы такой класс
пропусков больше не повторялся.

### Локализация — HARD RULE: EN + RU в одной сессии

С 2026-06-03 правило: **при создании ЛЮБОГО EN-контента Claude Code обязан в
той же сессии создать RU twin.** Без исключений по типу страницы — pricing,
guide, best, news, или любой новый тип в `content/*/en/` требует
`content/*/ru/` файл с тем же slug.

Применяется к трём классам:
- **MDX** (`/content/<type>/en/<slug>.mdx` → `/content/<type>/ru/<slug>.mdx`)
  — оба файла записываются одной операцией.
- **DB-driven** (`/compare/[slug]`, `/alternatives/[slug]`) — каждый
  `public.<table>` INSERT/UPDATE с `language='en'` сопровождается parallel
  INSERT/UPDATE с `language='ru'` в той же сессии. Webhook EN→DB bridge НЕ
  переводит — RU row пишет Claude Code.
- **Гибрид (`/best/[slug]`)** — MDX EN + MDX RU оба, plus tools-array
  hydration параллельно.

Pre-commit валидатор (`scripts/content-validator.ts`) обходит весь content
tree и проверяет EN↔RU pairing. С backfill = `--strict-pairing` ERROR (без
RU twin → commit заблокирован). До backfill = WARNING (видно но не блочит).

Движок перевода — сам Claude Code в текущей сессии (Opus на Max, бесплатно).
Никакого OpenRouter/Haiku — путь удалён 2026-06-03.

Opt-out для редких случаев когда RU не нужен: добавить `noRuPair: true` в EN
frontmatter (например, EN-only owner letter). По дефолту RU обязателен.

---

## 4. МОНЕТИЗАЦИЯ и внешние ссылки (site-wide, строго)

- **Единственный выход к вендору = `/go/[slug]`.** Никаких прямых vendor-URL
  кнопок. "Visit website" / "Website" — НЕ ставим.
- Affiliate-ссылки: `rel="sponsored nofollow noopener"` `target="_blank"`.
- `/go/[slug]` fail-closed: если affiliate_url NULL → редирект на
  `/tools/[slug]`, НЕ на сайт вендора. website_url только в JSON-LD.
- В теле статьи любой vendor-URL и pricing_source_url — НЕкликабельный серый
  текст. Кликабельны (nofollow) только рейтинговые площадки (G2, Trustpilot,
  Capterra, apps.shopify.com) и собственный домен.
- **БЕЗ ссылок на `/research/` файлы в тексте статьи** — это внутренние файлы,
  читателю не светим (баг из klaviyo-pricing — не повторять).
- Judge.me carve-out: published, но affiliate НЕТ — `/go/` ведёт на /tools/,
  в тексте честно "Judge.me не ведёт партнёрку".

---

## 5. ПЕРЕЛИНКОВКА (обязательна на каждой статье)

Цель: гнать вес на целевые `/tools/[slug]` (там affiliate) + давать пути.

**Внутри текста** — ссылки на релевантные /tools/, /compare/, /pricing/,
/alternatives/, /best/, /guides/ (контекстные, по смыслу).

**Структурные блоки внизу (как на /tools/[slug] — должны быть на ВСЕХ
содержательных типах, включая /pricing/):**
- **Related** блок: ссылка на /alternatives/[tool] + топ-3-5 релевантных
  /compare/ где тул участвует (same-category first) + /best/ листинги где тул
  фигурирует. Cap ~7, курировано, НЕ свалка.
- **PartnerAlternatives** карточки: партнёрские альтернативы той же категории
  (sorted by rating, two-pass с subcategory fallback). emphasized если у
  страницы тула нет affiliate.

> ИЗВЕСТНЫЙ БАГ (чинить): /pricing/[slug] сейчас НЕ рендерит Related +
> PartnerAlternatives блоки (только текстовая перелинковка). Перенести эти
> блоки с /tools/ на /pricing/ — иначе pricing-страницы тупик после verdict.

**Системная /compare/ → /pricing/ перелинковка:** когда у тула есть
/pricing/ страница — в verdict релевантных /compare/ (где tool_a/tool_b =
этот тул) добавить ссылку на /pricing/[tool]. Программно через
`scripts/pricing-compare-backlinks.ts` (идемпотентно), НЕ руками.

---

## 6. ТОН и стиль — всегда

**Operator perspective:**
- Прямой, без SaaS-жаргона.
- Конкретные числа ВСЕГДА. Не "improves significantly" → "operators report
  18-27% open rates" / "saves ~$2,400/mo at 10k subscribers".
- Verdict ЯВНЫЙ. Не "depends on your needs" → "X wins if [scenario], Y wins
  if [scenario]".
- Реальная атрибуция цитат: "u/ShopifyOp on r/shopify, 2026-04-12: '[quote]'".

**Honest framing — НЕ фейк hands-on (ban-риск, fabrication of Experience):**
- ✅ "Based on 47 G2 reviews and 23 Reddit threads, operators consistently
  report..."
- ✅ "Aggregated from vendor docs, G2 reviews (n=47), and r/shopify..."
- ❌ "I tested X for 30 days" / "In my experience..." — НЕ делали, НЕ пиши.

**Анти-padding честность** (особенно best-for и single-tool):
- Не раздувай список ради видимости. Если в категории 1-2 реальных тула —
  скажи прямо "category is light, here's why we're not padding it". Лучше
  честный короткий листинг чем фейковый топ-10.
- Не бойся сказать "не покупай" / "skip if" — анти-впаривание строит доверие.

**Reading level:** Flesch-Kincaid 50-70.

---

## 7. BANNED PHRASES — strict reject

"best of breed", "industry-leading", "seamless", "robust", "cutting-edge",
"next-generation", "state-of-the-art", "in today's world", "in the modern
landscape", "let's dive in", "let's explore", "in conclusion", "ultimate
guide", "definitive guide", "comprehensive overview", "game-changer",
"needle-mover", "unlock the power of", "harness the power of", "supercharge",
"revolutionize", "best-in-class", "world-class", "top-notch", "leverage" (как
глагол → "use"), "synergy", "actionable insights".

Plus AI-tells: "It's important to note that...", "It's worth mentioning
that...", частые "delve", "navigate", "tapestry", "landscape" в одной статье.

---

## 8. Frontmatter

Обязательно для всех MDX:
```yaml
---
title: "..."            # <60 chars, includes target keyword
description: "..."      # 140-160 chars
slug: "kebab-case"      # matches filename (без -pricing суффикса для pricing:
                        #   /content/pricing/en/klaviyo.mdx → /pricing/klaviyo)
publishedAt: "2026-06-03"
updatedAt: "2026-06-03"
author: "Botapolis editorial"
language: "en"          # или "ru"
---
```

**pricing** дополнительно:
```yaml
toolSlug: "klaviyo"
primaryKeyword: "klaviyo pricing"
faq:                    # 6 Q/A → рендерит FAQPage JSON-LD
  - q: "..."
    a: "..."
```

**best-for** дополнительно: `segment`, `tools: [slug, ...]`, `summary`.

canonical всегда на собственный URL (/pricing/{slug}, не на /tools/).

---

## 9. Quality checklist — pre-commit

- [ ] База использована как фундамент + веб-добор сделан (свежие цены с
      официального сайта + verified-дата)
- [ ] Свежие официальные данные, расходящиеся с базой, ОБНОВЛЕНЫ в базе
      (существующие поля) + перечислены в сводке
- [ ] Минимум 3 verbatim sources/quotes с атрибуцией
- [ ] Verdict КОНКРЕТНЫЙ (не "depends")
- [ ] Pricing в статье совпадает со свежим официальным источником
- [ ] Affiliate только `/go/[slug]`, rel="sponsored nofollow noopener"
- [ ] Vendor-URL и /research/ пути в тексте — НЕкликабельны / отсутствуют
- [ ] Перелинковка: текстовые ссылки + Related блок + PartnerAlternatives
- [ ] /compare/→/pricing/ backlink добавлен (если у тула есть /pricing/)
- [ ] BANNED PHRASES прогнаны (check-banned-phrases.sh)
- [ ] Frontmatter валиден, canonical на свой URL
- [ ] **RU twin создан в той же сессии** (`/content/[type]/ru/[slug].mdx`) —
      hard rule с 2026-06-03, см. раздел 3 "Локализация"
- [ ] Honest framing (нет фейк hands-on)
- [ ] Quality gate: если данных мало (база+веб) — НЕ публикуй, помечай

После push (~2 мин Vercel): `curl -I https://botapolis.com/[type]/[slug]` → 200.

---

## 10. Git

```
1. Write MDX в /content/[type]/[lang]/[slug].mdx (или обнови БД для
   data-driven типов)
2. Обнови существующие поля БД свежими официальными данными где надо
3. Добавь перелинковку (Related + PartnerAlts на странице; /compare/ backlink
   через loader)
4. git commit: `content: [type] [slug]`
5. git push (триггерит Vercel deploy)
```

---

## 11. Что Claude Code НЕ делает

- ❌ Strategic decisions (это Web Chat / CHIEF через оператора)
- ❌ Deep Research новых срезов (6 ресёрчей собраны — этого baseline хватает;
     свежесть добираешь realtime-вебом per article)
- ❌ Миграции структуры БД (новые поля/таблицы) — это оператор в Studio
- ❌ Капельная публикация по расписанию (это CHIEF позже)
- ❌ Talking to Telegram (это CHIEF)

Задача за scope — flag оператору в чате/commit.

---

## 12. Cost awareness

Claude Code на подписке Max — бесплатно для проекта, но лимиты есть.
- Read только нужное. Точечные Supabase queries, не SELECT *.
- Сессия >2ч continuous → commit progress, /clear, fresh session.

---

## Final reminder

Цель не "максимум статей", а **статьи которые rank и конвертят**. Каждая:
1. Закрывает реальный поисковый intent ключа (свежими данными)
2. Имеет proprietary элементы (свежие веб-факты, реальные quotes, math)
3. Verdict ясный, anti-padding честность
4. Монетизация (/go/) + перелинковка (Related + PartnerAlts) на месте
5. Свежие данные синхронизированы обратно в базу

Качество > количество. Время на статью не лимит.

**Непонятно — спроси оператора.** Лучше вопрос чем guess.
