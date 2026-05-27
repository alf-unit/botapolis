# CLAUDE.md — Project Context (botapolis)

Этот файл загружается автоматически в начале каждой Claude Code сессии в этом репо. Содержит только базовый контекст проекта. Для специфических задач оператор подгружает дополнительные инструкции вручную.

## Project at a glance

- **Site:** botapolis.com — AI tools для Shopify-операторов
- **Stack:** Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Vercel
- **Languages:** EN (primary), RU (/ru/ prefix, secondary)
- **Hosting:** Vercel (auto-deploy from `main` branch)
- **DB:** Supabase (Postgres + Auth + Storage)
- **Repo branches:** `main` — production. Feature branches → PR → merge.

## Operating modes

Этот проект имеет несколько режимов работы. Оператор подгружает соответствующий instruction file в начале сессии:

| Mode | Когда применяется | Какой файл подгрузить |
|------|-------------------|----------------------|
| **Content writing** | Написание статей, MDX, refresh контента, RU переводы | `CONTENT-WRITING.md` |
| **Code/feature** | Развитие сайта, новые компоненты, фичи, баги | работает по дефолту, читай `HANDOFF.md` и спроси нужно ли дальнейшее углубление в контекст проекта по указанным в файле связаным файлам |
| **Infrastructure** | Setup новых агентов, миграции БД, новые скрипты | **ОБЯЗАТЕЛЬНО прочитай `FINAL-ARCHITECTURE-V4.md` ПОЛНОСТЬЮ** — см. секцию "Infrastructure mode — mandatory reading protocol" ниже |

В начале каждой сессии перечисли доступные mode, и спроси оператора в каком режиме будем работать? . Не пытайся одновременно "и контент и код".

## Session continuity

В проекте ведётся **shared memory между сессиями** через append-only логи:

- `/sessions/writer-log.md` — для **Content writing** сессий
- `/sessions/infra-log.md` — для **Code/feature** и **Infrastructure** сессий

### В начале сессии

После того как оператор подтвердил mode — **прочитай последние 2-3 блока** соответствующего лога:

| Mode | Какой лог читать |
|------|------------------|
| Content writing | `/sessions/writer-log.md` |
| Code/feature | `/sessions/infra-log.md` |
| Infrastructure | `/sessions/infra-log.md` |

Это даст контекст последних работ: что было сделано, какие quirks обнаружены, какие fixes применены, open follow-ups которые могут быть релевантны текущей задаче.

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
- `CONTENT-WRITING.md` — детальные операционные инструкции для написания контента. Читай когда оператор переключает на content mode.
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

## When you need to know more

Если оператор начинает задачу и тебе непонятно в каком mode работать или какой контекст нужен — спроси:

> "В каком режиме сессия? Content writing / Code / Infrastructure?
> Подгрузить соответствующий instruction file?"

Это лучше чем guess и потом переделывать.
