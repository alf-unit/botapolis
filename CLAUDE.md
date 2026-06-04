# CLAUDE.md — Project Context (botapolis)

Этот файл загружается автоматически в начале каждой Claude Code сессии в этом репо. Содержит только базовый контекст проекта. Mode-specific инструкции (CONTENT-WRITING / HANDOFF / FINAL-ARCHITECTURE-V4 / PHASE-0-BLUEPRINT) ты сам читаешь сразу после того как оператор подтвердил mode — см. секцию "Session continuity → В начале сессии".

## Project at a glance

- **Site:** botapolis.com — AI tools для Shopify-операторов
- **Stack:** Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Vercel
- **Languages:** EN (primary), RU (/ru/ prefix, secondary)
- **Hosting:** Vercel (auto-deploy from `main` branch)
- **DB:** Supabase (Postgres + Auth + Storage)
- **Repo branches:** `main` — production. Feature branches → PR → merge.

## Operating modes

У проекта четыре режима работы. Каждому соответствует свой instruction file, который ты обязан прочитать сразу после того как оператор выбрал mode (см. "Session continuity → В начале сессии" для точного порядка действий):

| Mode | Когда применяется | Какой файл читать |
|------|-------------------|-------------------|
| **Content writing** | Написание статей по editorial workflow (per-article Deep Research, ручные правки) — **legacy режим, постепенно вытесняется CONTENT_WRITING_02** | `CONTENT-WRITING.md` (читай целиком) |
| **Code/feature** | Развитие сайта, новые компоненты, фичи, баги | `HANDOFF.md` (читай целиком, дальше спроси оператора нужно ли углубиться в связанные файлы) |
| **Infrastructure** | Setup новых агентов, миграции БД, новые скрипты | `FINAL-ARCHITECTURE-V4.md` (читай ПОЛНОСТЬЮ — см. "Infrastructure mode — mandatory reading protocol" ниже) |
| **CONTENT_WRITING_02** | Data-first pSEO конвейер: column-wise ресёрчи → наполнение `tools` → программная генерация эшелонов 1-2-3 (reviews → comparisons/alternatives → listings) → передача пронумерованного пула CHIEF | `PHASE-0-BLUEPRINT.md` (читай ПОЛНОСТЬЮ — это единственный источник правды по новому пайплайну, заменяет editorial workflow для pSEO-контента) |

В начале каждой сессии **обязательно вызови тул `AskUserQuestion`** — оператор выберет mode кнопкой, а не печатая ответ. Параметры вызова:
- `question`: "В каком режиме сегодня работаем?"
- `header`: "Mode"
- `multiSelect`: false
- `options`: четыре варианта в этом порядке:
  1. label "Content writing", description "Статьи, MDX, refresh контента, RU переводы (legacy editorial)"
  2. label "Code/feature", description "Развитие сайта, компоненты, фичи, баги"
  3. label "Infrastructure", description "Агенты, миграции БД, скрипты, OpenClaw"
  4. label "CONTENT_WRITING_02", description "Data-first pSEO конвейер: column-wise ресёрчи → база → программная генерация"

Не перечисляй mode простым текстом, не задавай вопрос словами — только через тул. Не пытайся одновременно "и контент и код".

## Session continuity

В проекте ведётся **shared memory между сессиями** через append-only логи:

- `/sessions/writer-log.md` — для **Content writing** и **CONTENT_WRITING_02** сессий
- `/sessions/infra-log.md` — для **Code/feature** и **Infrastructure** сессий

### В начале сессии

После того как оператор подтвердил mode — **выполни ДВА действия в одном сообщении (параллельные tool calls), до любого другого ответа оператору:**

1. **Прочитай mode-specific instruction file ПОЛНОСТЬЮ** (из таблицы Operating modes выше):
   - Content writing → `CONTENT-WRITING.md`
   - Code/feature → `HANDOFF.md`
   - Infrastructure → `FINAL-ARCHITECTURE-V4.md` (особый pagination protocol — см. ниже)
   - CONTENT_WRITING_02 → `PHASE-0-BLUEPRINT.md` (особый protocol — см. "CONTENT_WRITING_02 mode — mandatory reading protocol" ниже)
2. **Прочитай последние 2-3 блока соответствующего лога:**
   - Content writing → `/sessions/writer-log.md`
   - Code/feature → `/sessions/infra-log.md`
   - Infrastructure → `/sessions/infra-log.md`
   - CONTENT_WRITING_02 → `/sessions/writer-log.md`

Instruction file даёт детальные операционные правила для mode'а. Лог даёт контекст последних работ: что было сделано, какие quirks обнаружены, какие fixes применены, open follow-ups которые могут быть релевантны текущей задаче.

**Только после того как оба чтения завершены** — отвечай оператору ("готов, что делаем?" или сразу по делу если оператор уже описал задачу). Не пропускай instruction file даже если задача кажется очевидной — он часто содержит quality gates и conventions которые ты иначе нарушишь.

### Infrastructure mode — mandatory reading protocol

**При выборе оператором Infrastructure mode ты ОБЯЗАН прочитать `FINAL-ARCHITECTURE-V4.md` ПОЛНОСТЬЮ до того как задашь "что делаем сегодня?" или начнёшь любую работу.**

Этот файл — единственный источник правды по multi-agent системе (CHIEF/SCOUT/OPS/CLAUDE_CODE, схема Supabase, HEARTBEAT cron'ы, Deep Research format, setup phases). Без него ты будешь предлагать решения противоречащие спеке, и оператору придётся всё переобъяснять.

**Protocol чтения:**

1. Сделай `Read` на `FINAL-ARCHITECTURE-V4.md`.
2. **Если получаешь ошибку "File content exceeds maximum allowed tokens"** — это ожидаемо, файл ~1771 строк / ~28k токенов. Read'ни постранично через `offset`/`limit`, три параллельных вызова в одном сообщении:
   - `offset=1, limit=600`
   - `offset=601, limit=600`
   - `offset=1201, limit=600`
3. **НИКОГДА не пропускай файл из-за token-limit ошибки.** Это паттерн нарушения зафиксирован в memory (`feedback_infra-mode-collaboration`, `feedback_act-on-source-not-theorize`). Token limit — это сигнал "разбей на страницы", а не "забей".
4. Только после полного прочтения architecture + последних 2-3 блоков `infra-log.md` — спрашивай "что делаем сегодня?".

**Если файл переименовали или вынесли** — найди актуальный (Glob `**/FINAL-ARCHITECTURE*.md` или ищи в `/sessions/infra-log.md` упоминания) и прочитай его. Не работай без architecture context.

### CONTENT_WRITING_02 mode — mandatory reading protocol

**При выборе оператором CONTENT_WRITING_02 mode ты ОБЯЗАН прочитать `PHASE-0-BLUEPRINT.md` ПОЛНОСТЬЮ до того как задашь "что делаем сегодня?" или начнёшь любую работу.**

Этот файл — единственный источник правды по новой data-first pSEO модели производства контента. Он заменяет editorial workflow (`CONTENT-WRITING.md`) для всех pSEO-страниц (reviews, comparisons, alternatives, listings). Без полного прочтения ты будешь предлагать решения противоречащие новой модели — например, генерить отдельные Deep Research под каждую статью, писать руками по одной странице, пропускать column-wise сбор данных.

**Что фиксирует Blueprint (high-level, читай файл целиком — детали критичны):**

- **Список тулзов:** 14 существующих + ~20 новых = ~32-34 монетизируемых; фильтр "живая партнёрка обязательна" (раздел 1).
- **6 типов pSEO страниц в 3 эшелонах** (раздел 2): Эшелон 1 — tool reviews (фундамент); Эшелон 2 — comparisons + alternatives (зависят от Э1); Эшелон 3 — best-for/by-integration/by-pricing листинги (агрегируют Э1+Э2).
- **6 column-wise срезов данных** (разделы 3-4): identity, pricing, features, integrations, reviews&ratings, monetization. Каждый = ОДИН Deep Research проход по ВСЕМ ~34 тулзам сразу, не per-tool. Промпты раздела 4 готовы к копированию в Web Chat as-is.
- **Supabase изменения** (раздел 5): `semantic_core_entries.related_tool_slugs TEXT[]`, дозаполнение `comparisons` контент-полей, INSERT новых tools как заготовок.
- **Последовательность исполнения** (раздел 6): A (анализ ✓) → B (заготовки tools) → C (6 ресёрчей оператором) → D (наполнение базы Claude Code) → E/F/G (генерация эшелонов) → H (нумерация пула) → I (капельная публикация CHIEF) → J (добивка ключей 102-427).
- **Shopify Partner Program кластер** (раздел 7) — отдельный кластер `shopify-platform`, страницы в `/guides/` до достижения 5+ страниц + GSC-трафика, потом вынос в hub `/shopify/`.
- **Что меняется в CONTENT-WRITING.md** (раздел 8): убираем per-page Deep Research, per-page operator quotes, per-page согласование. Оставляем banned phrases, /go/[slug], JSON-LD, honest framing + новый quality gate "профиль тулза неполный → страница не генерится".

**Protocol чтения:**

1. Сделай `Read` на `PHASE-0-BLUEPRINT.md`.
2. **Если получаешь ошибку "File content exceeds maximum allowed tokens"** — paginate (offset/limit, параллельные вызовы в одном сообщении). Token limit — сигнал "разбей на страницы", не "забей". Тот же урок что для FINAL-ARCHITECTURE.
3. **НИКОГДА не пропускай файл из-за token-limit ошибки.** Зафиксированный паттерн нарушения (см. memory `feedback_infra-mode-read-architecture-fully.md`).
4. Только после полного прочтения Blueprint + последних 2-3 блоков `writer-log.md` — спрашивай "что делаем сегодня?".

**Editorial vs data-first разделение:**

- `CONTENT-WRITING.md` остаётся для **уникальных editorial-страниц**, которые не вписываются в pSEO-шаблоны (например, longread-гайды с операторской экспертизой, news-разборы, custom essay-форматы). Это меньшая доля контента.
- `PHASE-0-BLUEPRINT.md` обслуживает **весь pSEO-контент** (reviews/comparisons/alternatives/listings) — то есть основной объём страниц.
- Если оператор не уверен какой режим — спрашивай: статья шаблонная (генерится из данных tools) или уникальная (требует своего ресёрча и authorial voice)? Шаблонная → CONTENT_WRITING_02. Уникальная → Content writing.

### В конце сессии (когда оператор просит сохраниться)

Когда оператор говорит "сохрани сессию", "закроемся", "запиши лог" или аналогичное — **append новый блок** в конец соответствующего лога. Формат блока:

```markdown
---

## YYYY-MM-DD — краткое описание сессии

### Commits
- <commit subject 1>
- <commit subject 2>

(Идентификация коммитов по subject, не по hash — hash внутри коммитимого файла математически невозможен: hash = sha(содержимое), файл = часть содержимого. Поиск через `git log --grep "<subject>"` или GitHub-search.)

### Задача
[что было задачей сессии]

### Сделано
- [пункт 1 со ссылкой на commit subject если применимо]
- [пункт 2]

### Обнаружено
- [quirks, gotchas, undocumented behavior, важные nuances]

### Fixes
- [что и почему было исправлено]

### Open follow-ups
- [что осталось на потом]
```

Если в один день несколько сессий — заголовок `## YYYY-MM-DD (session 2) — ...`.

После append'а — commit + push. Это последнее действие сессии.

## Key documents (read on demand)

- `BOTAPOLIS-PLAYBOOK-V2.md` — стратегия, монетизация, позиционирование, бизнес-логика. Читай когда нужно понять why behind decisions.
- `FINAL-ARCHITECTURE-V4.md` — техническая архитектура multi-agent системы (3 OpenClaw агента + Web Chat + Claude Code). Читай когда нужно понять как агенты взаимодействуют или работаешь с инфраструктурой.
- `PHASE-0-BLUEPRINT.md` — data-first pSEO конвейер: column-wise ресёрчи, наполнение `tools`, программная генерация эшелонов, передача пула CHIEF. Mandatory read для CONTENT_WRITING_02 mode; ссылайся на него всегда когда обсуждение касается массовой генерации reviews/comparisons/alternatives/listings.
- `CONTENT-WRITING.md` — детальные операционные инструкции для editorial-написания контента (legacy per-article workflow). Читай когда оператор переключает на content mode (уникальные longread'ы, news-разборы, custom essays).
- `HANDOFF.md` — операционный контекст для Code/feature сессий. Читай при переключении в этот mode.
- `/semantic-core/full-core.csv` — 427 keywords ядро. Не читай целиком, обращайся к нужным entries через Supabase когда требуется.

## Repo structure (top-level)

```
botapolis/
├── app/                        — Next.js 15 App Router
├── components/                 — React components (shadcn/ui + custom)
├── content/                    — MDX content
│   ├── reviews/{en,ru}/
│   ├── comparisons/{en,ru}/
│   ├── alternatives/{en,ru}/
│   ├── guides/{en,ru}/
│   ├── news/{en,ru}/
│   └── best/{en,ru}/
├── content-templates/          — шаблоны структур статей
├── research/                   — Deep Research отчёты от Web Chat
├── writer-queue/               — task packets для контент-сессий
│   ├── pending/
│   └── done/
├── semantic-core/              — 427 keywords ядро
├── agent-snapshots/            — отчёты от OpenClaw агентов
│   ├── chief/
│   ├── scout/
│   └── ops/
├── sessions/                   — shared memory логи между Claude Code сессиями
│   ├── writer-log.md           — content writing сессии
│   └── infra-log.md            — code/feature + infrastructure сессии
├── config/                     — конфиги (vendor feeds, banned phrases, etc.)
├── scripts/                    — helper скрипты
├── supabase/                   — миграции БД
├── public/                     — статика
└── lib/                        — utilities, Supabase clients, etc.
```

## Content workflow (writer queue → publish)

В content-сессиях Claude Code пишет по task packets, подготовленным OPS-агентом. Источник правды — `/writer-queue/`.

1. Посмотри что в очереди: `sh scripts/claude-code-helpers/current-queue.sh`
2. Вытащи следующий packet: `sh scripts/claude-code-helpers/next-task.sh`
3. Открой packet (`writer-queue/pending/NNN-<slug>.md`) — там полный brief: keyword, angle, research file, screenshots, internal links, banned phrases, quality gates.
4. Следуй структуре из `/content-templates/<template>.md` (vs-comparison, deep-review, how-to, guide, news).
5. Пиши MDX в путь, указанный в packet (`output_path`).
6. Quality checklist перед `git add` (см. ниже).
7. `git commit` — pre-commit hook авто-переводит EN→RU, post-commit hook пингует `/api/agents/article-published`, который флипает status в Supabase и revalidate-ит страницу.
8. После `git push` запусти `sh scripts/claude-code-helpers/after-publish.sh NNN-<slug>.md` — перемещает packet в `/done/` и обновляет `writer-queue/index.md`.

Если packet ссылается на research, который не существует (`research_file: /research/...md` отсутствует) — НЕ выдумывай данные. Останови работу и пингуй оператора, пусть подгрузит research через CHIEF.

## Quality gates (применяются ко всем статьям)

Перед commit-ом любой MDX в `/content/**/*.mdx`:

- [ ] 1000+ слов substantive content (для news — 500+; для how-to — 800+)
- [ ] Frontmatter полный: `title`, `description`, `slug`, `locale`, `template`, `datePublished`, `tools[]`, `primaryKeyword`
- [ ] JSON-LD корректный для типа (Review / ComparisonArticle / HowTo / Article / NewsArticle) — эмитится из frontmatter, руками `<script>` блоки не пиши
- [ ] 2–5 internal links на existing strong pages
- [ ] Все affiliate URLs через `/go/[slug]` — никогда прямые vendor ссылки
- [ ] Pricing-клеймы датированы: "verified YYYY-MM-DD"
- [ ] Нет banned phrases (см. `/config/banned-phrases.json`); per-packet bans — в самом packet
- [ ] Image alt-text не тривиальный ("screenshot of pricing page" — плохо; "Klaviyo pricing page showing $0.70/conv tier" — хорошо)
- [ ] Rating в frontmatter (если есть) совпадает с Supabase `tools.rating` — `npm run sync:ratings` проверяет
- [ ] Для UI/JSX изменений — открыл `npm run dev` и проверил mobile preview

## Common project-wide rules

Эти правила применяются всегда, независимо от mode:

- **Не коммить секреты.** `.env` files в `.gitignore`. Проверь перед `git add .` что не добавляешь credentials.
- **Не пуш напрямую в main без необходимости.** Для крупных изменений — feature branch + PR. Для content и мелких фиксов — direct push OK (current convention).
- **Не модифицируй Supabase schema без апрува оператора.** Если кажется что нужна новая таблица или колонка — спроси.
- **Все affiliate URLs в коде идут через `/go/[slug]` pattern.** Никогда прямые vendor ссылки.
- **Все секретные значения через `process.env.*`**, никогда hardcoded.
- **Banned phrases enforced.** Глобальный список — `/config/banned-phrases.json`. Per-packet — в writer-queue packet'е.
- **EN+RU в одной сессии (hard rule, 2026-06-03).** Любой EN-контент (MDX, DB-driven, гибрид) → RU twin создаётся Claude Code в той же сессии. Movement движок — сам Claude Code (Opus/Max, бесплатно), НЕ Haiku/OpenRouter (этот путь удалён). Pre-commit валидатор обходит весь `content/*/{en,ru}/` tree и проверяет pairing. Детали — раздел 3 "Локализация" в `CONTENT-WRITING.md`. Opt-out через `noRuPair: true` во frontmatter для редких EN-only случаев.
- **DEFINITION OF DONE (hard rule, 2026-06-03).** Страница любого типа НЕ готова и НЕ публикуется пока не выполнено ВСЁ: (1) EN+RU контент; (2) FINDABLE — страница в хабе своего типа И в Navbar/Footer (не орфан); (3) в `app/sitemap.ts` (оба языка); (4) перелинкована (Related + PartnerAlts + внутренние ссылки + backlinks с `/compare/`); (5) валидатор `npm run validate:content -- --strict-pairing` зелёный. Type-agnostic — применяется к pricing/guide/comparison/alternatives/best/review/news и всем будущим типам. При генерации пачки контента навигация/хаб/sitemap/перелинковка делаются в том же заходе, не postfactum. Детали — раздел "DEFINITION OF DONE" в `CONTENT-WRITING.md`.

## When you need to know more

Если оператор начинает задачу и тебе непонятно в каком mode работать или какой контекст нужен — спроси через `AskUserQuestion` тул (см. "Operating modes"):

> "В каком режиме сессия? Content writing / Code / Infrastructure / CONTENT_WRITING_02?
> Подгрузить соответствующий instruction file?"

Это лучше чем guess и потом переделывать.
