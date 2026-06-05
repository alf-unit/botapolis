# CLAUDE.md — Project Context (botapolis)

Этот файл загружается автоматически в начале каждой Claude Code сессии в этом репо. Содержит только базовый контекст проекта. Mode-specific инструкции (FINAL-ARCHITECTURE-V4 / CONTENT-WRITING) ты сам читаешь сразу после того как оператор подтвердил mode — см. секцию "Session continuity → В начале сессии".

## Project at a glance

- **Site:** botapolis.com — AI tools для Shopify-операторов
- **Stack:** Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Vercel
- **Languages:** EN (primary), RU (/ru/ prefix, secondary)
- **Hosting:** Vercel (auto-deploy from `main` branch)
- **DB:** Supabase (Postgres + Auth + Storage)
- **Repo branches:** `main` — production. Feature branches → PR → merge.

## Operating modes

У проекта **два режима работы**. Каждому соответствует обязательное чтение на старте (см. "Session continuity → В начале сессии" для точного порядка действий):

| Mode | Когда применяется | Что читать на старте |
|------|-------------------|----------------------|
| **Infrastructure** | Агенты (CHIEF/SCOUT/OPS/OpenClaw), миграции/схема БД, скрипты, код сайта, компоненты, фичи, баги, перформанс | `Resources/FINAL-ARCHITECTURE-V4.md` ПОЛНОСТЬЮ (см. "Infrastructure mode — mandatory reading protocol" ниже) |
| **Content writing** | Контент: статьи, MDX, pSEO-страницы (reviews/comparisons/alternatives/listings/pricing/guides), RU-переводы, refresh | то же что Infrastructure (`Resources/FINAL-ARCHITECTURE-V4.md` ПОЛНОСТЬЮ) **ПЛЮС** `Resources/CONTENT-WRITING.md` ПОЛНОСТЬЮ (см. "Content writing mode — mandatory reading protocol" ниже) |

**Content writing — это надмножество Infrastructure:** тот же архитектурный контекст плюс контентные правила. В нём ты знаешь и инфраструктуру, и контент-пайплайн одновременно.

В начале каждой сессии **обязательно вызови тул `AskUserQuestion`** — оператор выберет mode кнопкой, а не печатая ответ. Параметры вызова:
- `question`: "В каком режиме сегодня работаем?"
- `header`: "Mode"
- `multiSelect`: false
- `options`: два варианта в этом порядке:
  1. label "Infrastructure", description "Агенты, миграции БД, скрипты, код сайта, фичи, баги"
  2. label "Content writing", description "Контент/MDX/pSEO/RU — Infrastructure + Resources/CONTENT-WRITING.md"

Не перечисляй mode простым текстом, не задавай вопрос словами — только через тул.

## Session continuity

В проекте ведётся **shared memory между сессиями** через **единый append-only лог**:

- `/sessions/session-log.md` — **один лог для всех типов сессий**. Каждый блок помечен тегом типа в заголовке: `[writer]` (контент/MDX/RU), `[code]` (код сайта/фичи/баги), `[infra]` (агенты/миграции/схема/скрипты); смешанные — составной тег. Лента хронологическая (старые сверху, новые снизу). Раньше было два файла (`writer-log.md` + `infra-log.md`) — слиты в один 2026-06-05.

### В начале сессии

После того как оператор подтвердил mode — **выполни ДВА действия в одном сообщении (параллельные tool calls), до любого другого ответа оператору:**

1. **Прочитай mode-specific instruction file(ы) ПОЛНОСТЬЮ** (из таблицы Operating modes выше):
   - Infrastructure → `Resources/FINAL-ARCHITECTURE-V4.md` (особый pagination protocol — см. ниже)
   - Content writing → `Resources/FINAL-ARCHITECTURE-V4.md` **И** `Resources/CONTENT-WRITING.md` (оба ПОЛНОСТЬЮ — см. "Content writing mode — mandatory reading protocol" ниже)
2. **Прочитай последние 3-4 блока единого лога `/sessions/session-log.md`** — **независимо от выбранного mode**. Типы сессий перемешаны по дате, и контекст последней работы (а также точка входа следующей сессии) может быть из сессии любого типа. Читать только «свой» тип нельзя — именно так возникал баг рассинхрона (заходишь в Infrastructure, а свежая работа была в writer-сессии, и ты её не видишь).

Instruction file даёт детальные операционные правила для mode'а. Лог даёт контекст последних работ: что было сделано, какие quirks обнаружены, какие fixes применены, open follow-ups которые могут быть релевантны текущей задаче.

**Только после того как оба чтения завершены** — отвечай оператору ("готов, что делаем?" или сразу по делу если оператор уже описал задачу). Не пропускай instruction file даже если задача кажется очевидной — он часто содержит quality gates и conventions которые ты иначе нарушишь.

### Infrastructure mode — mandatory reading protocol

**При выборе оператором Infrastructure mode ты ОБЯЗАН прочитать `Resources/FINAL-ARCHITECTURE-V4.md` ПОЛНОСТЬЮ до того как задашь "что делаем сегодня?" или начнёшь любую работу.**

Этот файл — единственный источник правды по multi-agent системе (CHIEF/SCOUT/OPS/CLAUDE_CODE, схема Supabase, HEARTBEAT cron'ы, Deep Research format, setup phases). Без него ты будешь предлагать решения противоречащие спеке, и оператору придётся всё переобъяснять.

**Protocol чтения:**

1. Сделай `Read` на `Resources/FINAL-ARCHITECTURE-V4.md`.
2. **Если получаешь ошибку "File content exceeds maximum allowed tokens"** — это ожидаемо, файл ~1771 строк / ~28k токенов. Read'ни постранично через `offset`/`limit`, три параллельных вызова в одном сообщении:
   - `offset=1, limit=600`
   - `offset=601, limit=600`
   - `offset=1201, limit=600`
3. **НИКОГДА не пропускай файл из-за token-limit ошибки.** Это паттерн нарушения зафиксирован в memory (`feedback_infra-mode-collaboration`, `feedback_act-on-source-not-theorize`). Token limit — это сигнал "разбей на страницы", а не "забей".
4. Только после полного прочтения architecture + последних 3-4 блоков `session-log.md` — спрашивай "что делаем сегодня?".

**Если файл переименовали или вынесли** — найди актуальный (Glob `**/FINAL-ARCHITECTURE*.md` или ищи в `/sessions/session-log.md` упоминания) и прочитай его. Не работай без architecture context.

### Content writing mode — mandatory reading protocol

**При выборе оператором Content writing mode ты ОБЯЗАН прочитать ДВА файла ПОЛНОСТЬЮ до того как задашь "что делаем сегодня?" или начнёшь любую работу:**

1. **`Resources/FINAL-ARCHITECTURE-V4.md`** — то же что в Infrastructure mode (тот же pagination protocol при token-limit, см. выше). Контент-сессии тоже трогают БД, миграции, агентов, роуты и drip-гейт — без архитектурного контекста будешь предлагать решения противоречащие спеке.
2. **`Resources/CONTENT-WRITING.md`** — операционные правила производства контента: data-first + realtime web метод, banned phrases, `/go/[slug]`, JSON-LD, honest framing, EN+RU same-session, Definition of Done, RU style anti-rules, gate-строка drip-очереди.

**Protocol чтения:** оба файла Read'ятся ПОЛНОСТЬЮ. **Если "File content exceeds maximum allowed tokens"** — paginate (offset/limit, параллельные вызовы в одном сообщении), НИКОГДА не skip (зафиксированный паттерн нарушения, memory `feedback_infra-mode-read-architecture-fully.md`). Только после обоих файлов + последних 3-4 блоков `session-log.md` — спрашивай "что делаем сегодня?".

**Content writing = Infrastructure + контент-слой.** Весь pSEO-контент (reviews/comparisons/alternatives/listings/pricing/guides) и уникальные editorial-страницы делаются в этом режиме; метод — в `Resources/CONTENT-WRITING.md`. Историческая data-first спека `Resources/PHASE-0-BLUEPRINT.md` — read-on-demand reference (её рабочая часть уже перенесена в `Resources/CONTENT-WRITING.md`).

### В конце сессии (когда оператор просит сохраниться)

Когда оператор говорит "сохрани сессию", "закроемся", "запиши лог" или аналогичное — **append новый блок** в конец единого лога `/sessions/session-log.md`. В заголовке блока ставь **тег типа сессии** (`[writer]` / `[code]` / `[infra]`, или составной для смешанной). Формат блока:

```markdown
---

## YYYY-MM-DD — [тип] краткое описание сессии

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

> **Все инструкционные / справочные доки оператора лежат в `Resources/`** (туда же оператор кладёт новые файлы, которые передаёт Claude). В корне репо остаются только `CLAUDE.md`, `AGENTS.md`, `README.md` + проектные config/code файлы.

- `Resources/BOTAPOLIS-PLAYBOOK-V2.md` — стратегия, монетизация, позиционирование, бизнес-логика. Читай когда нужно понять why behind decisions.
- `Resources/FINAL-ARCHITECTURE-V4.md` — техническая архитектура multi-agent системы (3 OpenClaw агента + Web Chat + Claude Code). Читай когда нужно понять как агенты взаимодействуют или работаешь с инфраструктурой.
- `Resources/CONTENT-WRITING.md` — детальные операционные правила производства контента (data-first + realtime web метод, banned phrases, /go/, JSON-LD, EN+RU same-session, Definition of Done, RU style anti-rules, drip gate-строка). **Mandatory read в Content writing mode.**
- `Resources/PHASE-0-BLUEPRINT.md` — историческая data-first pSEO спека (column-wise ресёрчи, генерация эшелонов, нумерация пула). Read-on-demand reference; рабочая часть метода перенесена в `Resources/CONTENT-WRITING.md`.
- `Resources/HANDOFF.md` — историч. операционный контекст для кодовых работ. Read-on-demand (режим Code/feature упразднён — код-работа идёт в Infrastructure mode).
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
├── Resources/                  — доки-инструкции/справки оператора (+ новые передаваемые файлы)
├── content-templates/          — шаблоны структур статей
├── research/                   — column-wise ресёрчи (R1-R6) + content-flags, baseline данные
├── semantic-core/              — 427 keywords ядро
├── agent-snapshots/            — отчёты от OpenClaw агентов
│   ├── chief/
│   ├── scout/
│   └── ops/
├── sessions/                   — shared memory лог между Claude Code сессиями
│   └── session-log.md          — единый лог всех сессий (writer/code/infra, теги типа)
├── config/                     — конфиги (vendor feeds, banned phrases, etc.)
├── scripts/                    — helper скрипты
├── supabase/                   — миграции БД
├── public/                     — статика
└── lib/                        — utilities, Supabase clients, etc.
```

## Content workflow (data-first → hidden → drip publish)

Контент производится **data-first методом**. Источник правды — `Resources/CONTENT-WRITING.md` (mandatory read в Content writing mode). Старый packet / OPS / writer-queue пайплайн **упразднён** — task packets, `next-task.sh`, ручная очередь больше не используются.

Высокоуровнево (детали — в `Resources/CONTENT-WRITING.md`):

1. **База:** `tools` row в Supabase (заполнен 6 column-wise ресёрчами R1-R6) + при необходимости `/research/*` baseline.
2. **Realtime веб-добор:** WebFetch vendor pricing/features page + WebSearch top third-party math + свежие operator quotes. Baseline устаревает за дни — realtime augmentation per-article обязателен.
3. **Синтез в MDX / DB-row** (тип определяет surface: reviews/comparisons/alternatives → DB-driven; pricing/guides/best → MDX+DB hybrid). Расхождения веба с базой → UPDATE существующих полей БД (НЕ новые миграции; в commit-summary "тул: было→стало, источник"). `/compare/` live-правки — только через loader, не MDX-edit (webhook не overwrite'ит existing rows).
4. **EN + RU в одной сессии** (hard rule — см. ниже + Resources/CONTENT-WRITING.md).
5. **Definition of Done** (hard rule — см. ниже): хаб + Navbar/Footer + sitemap + перелинковка + валидатор зелёный.
6. **Новый контент создаётся СКРЫТЫМ** (`page_publications.visible_at=NULL` + `pool_number`) → drip-очередь. Vercel-cron `/api/cron/drip-publish` (01:00 LA) раскрывает N/день (эскалация 4→7→10/мес). **НЕ публиковать пачками** — velocity-flag риск (требование оператора).
7. `git commit` — pre-commit валидатор (`validate:content --strict-pairing`: schema + safety + EN↔RU pairing); post-commit webhook drip-aware флипает status только для видимых страниц.

## Quality gates (применяются ко всем статьям)

Перед commit-ом любой MDX в `/content/**/*.mdx`:

- [ ] 1000+ слов substantive content (для news — 500+; для how-to — 800+)
- [ ] Frontmatter полный: `title`, `description`, `slug`, `locale`, `template`, `datePublished`, `tools[]`, `primaryKeyword`
- [ ] JSON-LD корректный для типа (Review / ComparisonArticle / HowTo / Article / NewsArticle) — эмитится из frontmatter, руками `<script>` блоки не пиши
- [ ] 2–5 internal links на existing strong pages
- [ ] Все affiliate URLs через `/go/[slug]` — никогда прямые vendor ссылки
- [ ] Pricing-клеймы датированы: "verified YYYY-MM-DD"
- [ ] Нет banned phrases (см. `/config/banned-phrases.json`)
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
- **Banned phrases enforced.** Список — `/config/banned-phrases.json`.
- **EN+RU в одной сессии (hard rule, 2026-06-03).** Любой EN-контент (MDX, DB-driven, гибрид) → RU twin создаётся Claude Code в той же сессии. Movement движок — сам Claude Code (Opus/Max, бесплатно), НЕ Haiku/OpenRouter (этот путь удалён). Pre-commit валидатор обходит весь `content/*/{en,ru}/` tree и проверяет pairing. Детали — раздел 3 "Локализация" в `Resources/CONTENT-WRITING.md`. Opt-out через `noRuPair: true` во frontmatter для редких EN-only случаев.
- **DEFINITION OF DONE (hard rule, 2026-06-03).** Страница любого типа НЕ готова и НЕ публикуется пока не выполнено ВСЁ: (1) EN+RU контент; (2) FINDABLE — страница в хабе своего типа И в Navbar/Footer (не орфан); (3) в `app/sitemap.ts` (оба языка); (4) перелинкована (Related + PartnerAlts + внутренние ссылки + backlinks с `/compare/`); (5) валидатор `npm run validate:content -- --strict-pairing` зелёный. Type-agnostic — применяется к pricing/guide/comparison/alternatives/best/review/news и всем будущим типам. При генерации пачки контента навигация/хаб/sitemap/перелинковка делаются в том же заходе, не postfactum. Детали — раздел "DEFINITION OF DONE" в `Resources/CONTENT-WRITING.md`.

## When you need to know more

Если оператор начинает задачу и тебе непонятно в каком mode работать или какой контекст нужен — спроси через `AskUserQuestion` тул (см. "Operating modes"):

> "В каком режиме сессия? Infrastructure / Content writing?
> Подгрузить соответствующий instruction file(ы)?"

Это лучше чем guess и потом переделывать.
