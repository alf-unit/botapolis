# Botapolis — Handoff для следующей сессии

> Карта реальности на момент `HEAD` (`058b26a`, 15 мая 2026). Приоритет у этого файла **ВЫШЕ**, чем у `TZ-2-code.md` — TZ был написан до начала работы и местами устарел.

> ⚠ **Источник правды по дизайну — папка `New_Design/`.** Это финальная версия дизайн-проекта v.026. **Любые правки по дизайну/структуре сайта берёшь оттуда, не из TZ-2.** Первый файл: [New_Design/README.md](New_Design/README.md). Дальше по необходимости:
> - [New_Design/app/globals.css](New_Design/app/globals.css) — токены (mint+violet OKLCH ramp, typography, motion, containers)
> - [New_Design/app/components/](New_Design/app/components/) — 32 reference-компонента
> - [New_Design/mockups/](New_Design/mockups/) — HTML мокапы всех страниц
> - [New_Design/docs/motion-specs.md](New_Design/docs/motion-specs.md) — easings / durations / per-component motion
> - [New_Design/docs/brand-book.html](New_Design/docs/brand-book.html) — brand voice + applications

Дизайн-токены УЖЕ совпадают между `app/globals.css` и `New_Design/app/globals.css`. Token-слой не трогали.

---

## 🎯 Состояние одной строкой

**Сайт инженерно готов, отполирован, забэкаплен, локализован end-to-end, выровнен по дизайну v.026. Прод на `https://botapolis.com` стабильный. Engineering scope ЗАКРЫТ. Дальше — operational phase (контент + monitoring), не engineering.**

При начале новой сессии спроси КОНКРЕТНО что нужно сделать?

---

## 🗺 Архитектура

### Стек
- Next.js **16.2.6** App Router + Turbopack
- React **19.2.4**
- Tailwind CSS **v4** (config через `globals.css` + `@theme` директива)
- shadcn/ui под капотом **Base UI** (`@base-ui/react`)
- Supabase (Auth + Postgres + RLS) — `@supabase/ssr` + `@supabase/supabase-js`
- TypeScript strict, env-валидация через `@t3-oss/env-nextjs`

### Next 16 — НЕ тот, что ты знаешь
Читай `node_modules/next/dist/docs/01-app/` перед написанием кода. Ключевые breaking changes:
- `params` теперь `Promise<{...}>` (нужен `await params`)
- `middleware.ts` переименован в **`proxy.ts`** (Node runtime only)
- Route-segment config (`revalidate`, `dynamicParams`) **нельзя re-export'ить** между файлами — только литералы. RU-стабы инлайнят эти константы вручную.
- Colocated `opengraph-image.tsx` ломает catch-all routes (`[...slug]`) — поэтому везде `[slug]`, не catch-all.

### Структура папок
```
botapolis/
├── app/                       # все маршруты
│   ├── (auth)/login/          # auth route group
│   ├── (account)/dashboard/   # account route group
│   ├── (auth)/auth/callback/  # OAuth handler
│   ├── about/, contact/, methodology/
│   ├── alternatives/[slug]/   # pSEO listicle
│   ├── api/                   # newsletter, contact, tools/description, og, revalidate, cron/, calculations
│   ├── compare/, compare/[slug]/  # pSEO X-vs-Y
│   ├── content/               # MDX источник
│   ├── directory/             # → 308 redirect на /tools
│   ├── go/[slug]/             # affiliate redirector
│   ├── guides/, guides/[slug]/  # MDX-driven
│   ├── icon.tsx, apple-icon.tsx # favicon set (next/og)
│   ├── legal/                 # 5 страниц: privacy, terms, affiliate-disclosure, cookie-policy, disclaimer
│   ├── reviews/, reviews/[slug]/  # MDX-driven
│   ├── ru/                    # RU зеркало — ВСЕ thin re-export'ы
│   ├── tools/, tools/[slug]/  # каталог + 3 калькулятора
│   ├── layout.tsx, page.tsx, sitemap.ts, robots.ts
│   ├── not-found.tsx, error.tsx  # branded 404 + 500
│
├── components/
│   ├── analytics/             # PostHogProvider, PlausibleScript, PageViewEvent, ScrollMilestone
│   ├── auth/                  # LoginForm
│   ├── content/               # Callout, ProsConsList, AffiliateButton, ArticleHero, ArticleCover,
│   │                          # TableOfContents, RelatedArticles, TrackedAffiliateLink, mdx-components
│   ├── marketing/             # NewsletterForm, NewsletterDialog, ContactForm
│   ├── nav/                   # Navbar, Footer, Logo, ThemeToggle, LanguageSwitcher, NavbarSearch
│   ├── shared/                # UserMenu, SearchPageClient, TurnstileGate, ScrollRevealController
│   ├── tools/                 # 3 calculator widgets + ToolCard, ToolLogo, ComparisonTable,
│   │                          # RecommendedTools, ToolFaq
│   └── ui/                    # shadcn primitives + LiveNumber (Button, Sheet, Dialog, ...)
│
├── content/                   # MDX источник
│   ├── reviews/{en,ru}/       # 6 EN + 6 RU
│   └── guides/{en,ru}/        # 4 EN + 4 RU
│
├── lib/
│   ├── analytics/events.ts    # типизированный track() helper для PostHog
│   ├── content/               # MDX loader, TOC, reading-time, slug.ts (canonical),
│   │                          # rating.ts, pseo.ts, tool-locale.ts
│   ├── i18n/                  # config, dictionaries, get-locale
│   ├── seo/                   # buildMetadata, JSON-LD generators
│   ├── supabase/              # client, server, service, middleware, types (handwritten)
│   ├── env.ts                 # @t3-oss/env-nextjs schema
│   ├── ratelimit.ts           # Upstash limiters
│   └── utils.ts               # cn, formatPrice, hashIp, absoluteUrl
│
├── locales/{en,ru}.json       # UI strings (НЕ для MDX контента)
├── proxy.ts                   # Next 16's middleware, sets x-locale + auth gate
├── next.config.ts             # CSP (+ wasm-unsafe-eval), security headers, route-specific cache
├── scripts/                   # build-search-index, translate-{content,tools,comparisons},
│                              # sync-ratings, content-validator
├── supabase/
│   ├── migrations/            # 001 initial, 002 contact_submissions, 003 sync_ratings,
│   │                          # 004 canonical_compare_slugs, 005 tools_ru, 006 compare_unique
│   └── seed.sql               # 12 tools + 3 comparisons (composite ON CONFLICT)
├── tests/                     # unit (Vitest, 32 tests) + e2e/README.md (Playwright план)
├── vercel.json                # 2 weekly crons
├── .env.example               # template — реальные значения в Vercel encrypted
│
└── New_Design/                # 🎨 источник правды по дизайну v.026
```

---

## 🔑 Критические идиомы (соблюдай ВЕЗДЕ)

### Серверный компонент → клиентский остров
Pages = server. Интерактив (calc widgets, NewsletterForm, ContactForm, UserMenu, LoginForm, ThemeToggle, LanguageSwitcher, ToolsCatalog filter, SearchTrigger, TurnstileGate, TrackedAffiliateLink) — `"use client"`. Локализованные strings уходят props'ами сверху вниз. **Client-компоненты НИКОГДА не вызывают `getDictionary` сами.**

### Локализация
- `proxy.ts` ставит header `x-locale` в зависимости от `/ru/...` префикса.
- На странице: `const locale = await getLocale()` + `const dict = await getDictionary(locale)` + `const localePrefix = locale === "ru" ? "/ru" : ""`.
- `/ru/<route>/page.tsx` — thin re-export от `/app/<route>/page.tsx`. Route-segment config (`revalidate`, `dynamicParams`) инлайнится в каждом файле (Next 16 не даёт re-export'ить эти константы).
- **`app/ru/compare/[slug]/page.tsx` существует** как thin re-export от `@/app/compare/[slug]/page`. Если добавляешь новые RU маршруты типа `/ru/blog/[slug]` — не забудь создать thin re-export.

### Авто-перевод MDX (husky pre-commit hook)
- Любой staged файл под `content/{reviews,guides}/en/*.mdx` триггерит `.husky/pre-commit`, который вызывает `scripts/translate-content.ts --force` для каждой пары `type/slug` и подмешивает свежий RU-twin в коммит.
- **Модель**: `anthropic/claude-haiku-4.5` через OpenRouter (override через `OPENROUTER_MODEL`). Локально нужен `.env.local` с `OPENROUTER_API_KEY` — иначе hook логирует warning + пропускает (НЕ блокирует коммит).
- **Опт-аут** на конкретную статью: `manuallyTranslated: true` в frontmatter RU-файла. Переводчик уважает флаг даже с `--force`.
- **По умолчанию правка EN перезаписывает RU.** Сознательный trade-off владельца — лучше потерять ручные правки, чем держать переводы в очереди на ревью.

### Metadata
**Всегда** через `buildMetadata({...})` из `lib/seo/metadata.ts`. Сам добавляет canonical + hreflang. Не пиши `<title>` руками — root layout накладывает template `%s · Botapolis`. RU homepage использует `absoluteTitle: true` чтобы обойти template.

### JSON-LD
Импорт helper'а из `lib/seo/schema.ts` → `<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}/>` в конце страницы. Helpers: `generateOrganizationSchema`, `generateWebSiteSchema`, `generateBreadcrumbSchema`, `generateArticleSchema`, `generateReviewSchema`, `generateHowToSchema`, `generateSoftwareApplicationSchema`, `generateItemListSchema`, `generateOwnedToolSchema`, `generateFAQSchema`.

### Стили
**Только** CSS variables (`var(--brand)`, `var(--bg-surface)`, etc.) и Tailwind. Никаких raw hex, КРОМЕ mint→mint gradient на primary CTA (`linear-gradient(180deg, #34D399 0%, #10B981 100%)` — эталонный). Иконки — lucide-react или inline SVG, никогда emoji.

### Affiliate links
Всегда через `${localePrefix}/go/${slug}?utm_campaign=<source>` с `rel="sponsored nofollow noopener"` + `target="_blank"`. `<AffiliateButton tool="<slug>">` для inline в MDX или `<TrackedAffiliateLink>` если нужен PostHog `affiliate_clicked` event. Прямые ссылки на vendor.com **только** для secondary CTA «Website».

### Типы Supabase
Handwritten в `lib/supabase/types.ts`. **Каждый Row — `type` alias, не `interface`** — PostgREST'овский `GenericTable.Row extends Record<string, unknown>` принимает только type-aliases. Если переключишь на interface, все `.select()` коллапсируют в `never`.

### MDX gotchas
- В body **НИКОГДА не пиши `<digit`** (типа `<200ms`, `<50 чего-то`) — MDX парсит как начало JSX-тега и крашится. Пиши «under 200ms» / «менее 50».
- Технические термины, product names, acronyms (MRR, TCPA, SMS, AI, ROI, AOV) **оставляй на английском** в RU-переводах — convention.
- JSX-prop expressions типа `<ProsConsList pros={[...]}/>` работают, но `blockJS: false` обязателен в loader'е (`lib/content/mdx.ts`) — иначе массивы из props стрипаются.

### Комменты в коде
Плотные, объясняют **почему**, не **что**. BUG-FIX'ы / audit-фиксы помечаются `BUG-FIX (<month> <year> audit):` или `Block X — ...`. Не штрафуй себя за длину — стиль установлен с первых коммитов.

---

## 🔒 Locked items (НЕ трогай без явной просьбы)

| Что | Где | Почему |
|---|---|---|
| CTA shimmer `variant="cta"` + `:active` triggers | `components/ui/button.tsx` + `globals.css §7` | mint-glow + shimmer на 17 primary CTA, `:active` нужен для тача (без него на iPhone кнопка «мёртвая»). **Не убирай `:active` из селекторов `.btn-cta::before` и `.btn-cta:active`.** |
| Inline `NavbarSearch` + `/search` page (не Cmd+K модалка) | `components/nav/NavbarSearch.tsx` + `components/shared/SearchPageClient.tsx` | Amazon-style, submit-only. Cmd+K фокусит, не открывает модалку. |
| `LanguageSwitcher` mint-active state | `components/nav/LanguageSwitcher.tsx` | Брендовая mint-подсветка активной локали (отличима в Chrome translate). |
| `NewsletterDialog` modal | `components/marketing/NewsletterForm` + `NewsletterDialog.tsx` | Заменяет scroll-to-footer (раньше был два клика до одного действия). Mobile (внутри SheetClose) **намеренно** остался на scroll-to-footer — modal-over-sheet ломается на iOS Safari (z-index с virtual keyboard). |
| `@custom-variant hover (@media (hover: hover) and (pointer: fine) { &:hover });` | `globals.css:41` | Tailwind v4 ship'ит `hover:` без media-gate → двойные тапы на iOS. **Не убирай.** |
| `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent` | `globals.css §4 base` на интерактивах | Снимает iOS 300ms tap delay + синюю вспышку. |
| `.surface-glass` opaque на mobile | `globals.css §6` | Glass-навбар = scroll lag в Safari iOS. Blur только на `(min-width: 1024px) and (hover: hover)`. **Не верни без замеров perf.** |
| `<LiveNumber/>` primitive | `components/ui/LiveNumber.tsx` | Стандарт для числовых результатов в калькуляторах и hero. count-up + tween, `tabular-nums`. Reduced-motion → snap-to-final. |
| `<ScrollRevealController/>` + `.scroll-reveal` class | `components/shared/ScrollRevealController.tsx` + `globals.css §8` | Один controller на всю app. Использует `usePathname()` как dep — иначе scroll-reveal секции на client-side route swaps остаются `opacity: 0` навсегда. Selector `:not(.in-view)` — чтобы browser back не перезапускал fade. |
| `defaultTheme="system"` без workaround'ов | `layout.tsx` | Owner-decided: респектим matchMedia. Chrome iOS incognito misreporting — его проблема. |
| `<noscript>` style block для scroll-reveal | `layout.tsx` | No-JS users (включая crawlers) получают `opacity: 1` принудительно. **Не удаляй.** |

---

## 🌍 i18n регламент — три источника, три скрипта

### Где какой контент живёт

| Тип | Источник EN | Источник RU |
|---|---|---|
| UI-строки (nav, buttons, hero copy) | `locales/en.json` | `locales/ru.json` |
| Long-form articles (reviews, guides) | `content/{type}/en/*.mdx` | `content/{type}/ru/*.mdx` |
| Tool data (name, tagline, pros, cons) | `tools` table — `name`, `tagline`, ... | `tools` — `name_ru`, `tagline_ru`, ... (migration 005) |
| Comparisons (verdict, custom_intro) | `comparisons` table — строки с `language='en'` | те же поля, в строках с `language='ru'`. UNIQUE(slug, language) — migration 006 |

### Скрипты (всё через OpenRouter / Claude Haiku 4.5)

```bash
# MDX — husky pre-commit hook делает это автоматом на каждый EN MDX commit
npm run translate -- --type reviews --slug klaviyo-review-2026     # один файл
npm run translate:missing                                          # все EN без RU twin

# DB · tools (migration 005)
npm run translate:tools                  # все tools у которых хоть одно _ru пусто
npm run translate:tools -- --slug X
npm run translate:tools -- --force       # переписать существующие _ru

# DB · comparisons (migration 006)
npm run translate:comparisons            # клонирует EN-строки в RU twin
npm run translate:comparisons -- --slug klaviyo-vs-mailchimp
npm run translate:comparisons -- --force
```

Все три скрипта **идемпотентны** — без `--force` пропускают переведённое.

### Что делать при добавлении нового контента

| Что добавляешь | Триггер перевода |
|---|---|
| Новый MDX review / guide | husky pre-commit hook сам сгенерит RU. Если нет — `npm run translate -- --type X --slug Y` |
| Новый tool в БД | После insert: `npm run translate:tools` |
| Новый comparison | После insert: `npm run translate:comparisons` |
| Новый UI-ключ | Дописать вручную в `locales/en.json` и `locales/ru.json` |

### Read-side fallback

В коде везде helper из `lib/content/tool-locale.ts`:
```typescript
const tool = localizeTool(rawTool, locale)         // полный Row
const tool = localizeToolPartial(rawTool, locale)  // для catalog cards с Pick<>
```
Читает `tool.name_ru ?? tool.name`, `tool.pros_ru ?? tool.pros`, etc. **Новый tool без перевода** работает на RU — текст остаётся EN до запуска `translate:tools`.

### Стиль переводов

SYSTEM_PROMPT в `scripts/translate-{content,tools,comparisons}.ts`:
- Informal Russian, "ты"-form
- Brand names в EN (Klaviyo, Shopify, Mailchimp, ...)
- Acronyms в EN (SMS, AI, ROI, MRR, TCPA, ...)
- Числа и валюты verbatim ($48k, 8.4/10, 200ms)

Если AI-перевод корявый — отредактируй RU MDX вручную + `manuallyTranslated: true` в frontmatter. Для tool/comparison rows — отредактируй `_ru` поля; повторный скрипт без `--force` их не тронет.

### Миграции (запустить один раз при восстановлении окружения)

| Migration | Что делает |
|---|---|
| `005_tools_ru_columns.sql` | ADD COLUMN name_ru / tagline_ru / description_ru / pros_ru[] / cons_ru[] / best_for_ru |
| `006_comparisons_language_unique.sql` | UNIQUE(slug) → UNIQUE(slug, language) |

---

## ⚠️ Подводные камни и quirks

### Окружение / dev experience

**Vercel CLI env pull ЗАТИРАЕТ значения пустыми кавычками.** `npx vercel env pull .env.local` (и `vercel link`) на этом аккаунте переписывает `.env.local` форматом `KEY=""` вместо реальных encrypted-секретов. **Не запускай без бэкапа `.env.local`.** Если случилось — восстанавливать руками из Vercel UI → Settings → Environment Variables → Reveal. Список ключей — в [BACKUP.md](BACKUP.md). Симптомы: `OPENROUTER_API_KEY not set` при запуске скрипта; локальный билд жалуется на `NEXT_PUBLIC_SUPABASE_URL`. **Только** локально — на проде Vercel вкатывает env правильно из своего UI.

Workaround для одной команды без переписывания файла:
```powershell
$env:OPENROUTER_API_KEY="..."
node --experimental-strip-types scripts/foo.ts
```
Но **БЕЗ `--env-file=.env.local`** — пустой файл переопределит твой `$env:` обратно в `""`.

**`.env.local` НЕ загружается Node автоматически.** Поэтому скрипты `translate` и `search:index` идут с `--env-file=.env.local`. Если пишешь новый скрипт — тот же флаг.

### Pagefind

**Output gitignored.** `/public/pagefind/` НЕ в репо — генерится postbuild (`npm run search:index`). На Vercel это запускается автоматически.

**`entry.json` ОБЯЗАН быть `Cache-Control: no-store`.** Раз в N деплоев Vercel CDN залипает на старом manifest'е (перечисляет имена шардов с хэшами в названии) → 404 на `.pf_meta` → «Couldn't load the search index». Защита в `next.config.ts` через явный `Cache-Control: no-store, must-revalidate` для `pagefind-entry.json`, `pagefind.js`, `pagefind-worker.js`. **Не убирай.**

**WASM нужен `'wasm-unsafe-eval'` в `script-src`.** Без этого Pagefind тихо падает на init.

### Mobile / iOS

**iOS Safari зумит input если `font-size < 16px`.** Auto-zoom при фокусе сдвигает viewport. **Минимум 16px на все input'ах на мобиле.** На /search — `text-[16px] lg:text-[17px]`.

**Глобальный `overflow-x: clip` на html+body** в `globals.css`. Защита от любого случайного горизонтального overflow. `clip` а не `hidden` — потому что `hidden` создаёт scroll container и ломает sticky-навбар. Не трогай.

**Tailwind v4 `hover:` без media-gate.** На тач первый тап вешает hover-state, второй кликает — двойные тапы. Override в `globals.css:41` гейтит ВСЕ `hover:*` утилиты к `(hover: hover) and (pointer: fine)`. **Не убирай.** Native CSS `:hover` правила (CTA shimmer, ad-hoc стили в компонентах) переопределение НЕ задевает — там либо гейти вручную через `@media`, либо дублируй через `:active`.

**`.btn-cta` shimmer / lift на тач — через `:active`.** CTA получил `:active` trigger на shimmer (`globals.css §7`) и `filter: brightness(1.08)`. Без этого на iPhone «мёртвая». **Не сноси `:active`.** Hover-lift гейтнут к `(hover: hover) and (pointer: fine)` — на тач он не нужен.

**`.surface-glass` на mobile полностью opaque.** Glass-навбар (`backdrop-filter: blur(...)`) — главный источник scroll lag в Safari iOS. На mobile + tablet-portrait surface рендерится как solid `var(--bg-base)` без blur. Богатый blur(16) saturate(1.5) восстанавливается только в `(min-width: 1024px) and (hover: hover)`.

**`scroll-behavior: smooth` на html — только на desktop+hover.** Закрыт к `(min-width: 768px) and (hover: hover)`. На iOS Safari дерётся с нативным momentum scroll'ом. Если нужен smooth scroll на mobile — делай imperative через `el.scrollIntoView({ behavior: 'smooth' })`.

### Scroll-reveal

**Controller re-runs на каждой client-side навигации.** `ScrollRevealController.tsx` использует `usePathname()` как dep. Без этого `.scroll-reveal` секции, отрендеренные ПОСЛЕ первого mount layout'а (= все client-side route swaps), оставались `opacity: 0` навсегда. **Не пиши IO в layout как `[]` dep.**

**Требует double-rAF перед `.in-view` flip.** В controller'е `reveal()` оборачивает `classList.add("in-view")` в **два вложенных** `requestAnimationFrame`. Браузер skip'ает CSS transition если invisible state и target state наблюдаются в одном frame'е. **Не упрощай до одного rAF** — проверено experimentally, не работает.

### LiveNumber

**`startOnView` — только для статичных значений.** Используй ТОЛЬКО когда `value` статично (как `$4,410` в hero DemoWidget). Для калькуляторов где `value` меняется на каждый slider-change — БЕЗ `startOnView`, иначе на первый change tween не сработает (controller ждёт viewport-входа, а пользователь уже двигает слайдер).

### Theme

**`defaultTheme="system"` без workaround'ов для misreporting браузеров.** Chrome iOS в incognito стабильно возвращает `prefers-color-scheme: dark` независимо от iOS Display settings (likely anti-fingerprint mask — Safari на том же устройстве возвращает корректно). Owner-decided: **не лечим**. Сайт уважает matchMedia, точка. Workaround есть в git history (`cd275bf` + `494d373`) если когда-то владелец изменит решение. Также есть удалённый `<ThemeDebugger />` overlay (`?debug-theme=1`) — `git show 884764b:components/shared/ThemeDebugger.tsx` если понадобится.

### Base UI 1.4 — два разных error #31

В production-mode оба throws показывают одинаковый `Base UI error #31`. На самом деле **два разных source location**:
1. **`render` prop валидация** — Trigger / Item / Close требуют render-prop'а который резолвится в native `<button>`. Если `render={<CustomButton>}` или `render={<Link>}` — нужен `nativeButton={false}` рядом с `render`. Места — UserMenu, Navbar Sheet, Dialog/Sheet Close-X.
2. **`GroupLabel` без `Group`** — `<DropdownMenuLabel>` обязан жить внутри `<DropdownMenuGroup>`. Иначе context-provider null → throw. См. `node_modules/@base-ui/react/esm/menu/group/MenuGroupContext.js`.

Если когда-то #31 снова — копай в одну из этих сторон.

### CSP / third-party noise

**PostHog ассеты на отдельном CDN — `us-assets.i.posthog.com`** (отдельно от ingest `us.i.posthog.com`). **Оба** должны быть в `script-src` + `connect-src`, иначе snippet падает в unhandled rejection на init.

**Cloudflare Turnstile iframe шумит в Console.** Frame `flexible?lang=auto` генерирует TrustedHTML/TrustedScript/xr-spatial-tracking violations внутри **своего** sandbox iframe. Это не наш CSP. Юзеры не видят. Фильтр `-flexible` в DevTools если мешает.

**Browser auto-translate отключён site-wide.** `<html translate="no">` + `<meta name="google" content="notranslate">` в `layout.tsx`. Причина: своя RU-локализация через `/ru/*`. Без opt-out Chrome запускает translate-iframe → CSP violations + двойной перевод UX-кашу.

### Newsletter

**NewsletterDialog vs NewsletterForm — две поверхности, один Form.** Footer-форма (mounted с страницей) ловит Turnstile-token заранее. Navbar-modal mounts widget только при open Dialog → 500ms-2s race window. NewsletterForm ждёт token до 5 sec через ref-polling (`turnstileTokenRef` — **ref**, не state, иначе stale closure). Если правишь логику — используй ref для значений в async handler.

### MDX

**`blockJS: false` обязательно** в `lib/content/mdx.ts`. Без этого MDX стрипает JSX-prop expressions типа `pros={[...]}` и компоненты падают на `.length`. Не трогай.

### TOC

**github-slugger в `lib/content/toc.ts` — обязательно.** rehype-slug использует его же для генерации `<h2 id="...">`. Замена на slugify сломает RU TOC якоря — slugify транслитерирует кириллицу (`Генерируй` → `generiruj`), а rehype-slug сохраняет → анкоры не совпадают. EN не пострадает (ASCII слаги одинаковые в обеих библиотеках).

### Vercel cron

**Не активен в Hobby tier.** На Pro+ работает. Проверить через Vercel Dashboard → Settings → Crons.

### Migration order при восстановлении

**Migration 005 и 006 — обязательны на каждом Supabase environment.** Без 005 `translate:tools` упадёт на UPDATE неизвестных колонок; без 006 `translate:comparisons` упадёт на duplicate-key violation.

---

## 🛠 TODO на пользователе (опционально, не блокирует)

| # | Что | Контекст |
|---|---|---|
| 1 | **Real social URLs** в Footer | Сейчас `href="#"` placeholder. Когда заведёшь @botapolis на X/LinkedIn/GitHub — правка `components/nav/Footer.tsx` (3 строки в массиве social) + `lib/seo/schema.ts` `generateOrganizationSchema().sameAs`. SVG-функции `TwitterMark` / `LinkedinMark` / `GithubMark` уже определены — расщёлкнуть закомментированный блок. |
| 2 | **Google OAuth Consent Screen branding** | OAuth технически работает; «unverified app» warning не блокирует. console.cloud.google.com → APIs & Services → OAuth consent screen + Google Search Console для domain verification. |
| 3 | **Stats strip на /methodology** | Дизайн просит (Tools tested / Hours per review / Stores involved / Vendor edits). Наши реальные числа (6 reviews) смотрелись бы плохо. Вернуться когда накопится 20+ reviews. |
| 4 | **Real cover images** для /reviews и /guides | Сейчас `ArticleCover` с per-slug gradient'ом (визуально совпадает с дизайн-мокапом). Добавить опциональный `imageUrl` prop + frontmatter поле + источник картинок. |
| 5 | **Supabase webhook → Telegram/Discord** для /contact form | Когда дойдёт до feedback flow. Инструкция в `memory/project_contact-form-notifications.md`. ~5 минут настройки, 0 нового кода. |
| 6 | **Team grid + Timeline на /about** | «Anonymous operators» политика. Timeline пока без реальных вех. |

---

## ❌ Что НЕ сделано намеренно

| Что | Почему |
|---|---|
| Resend для transactional email | Beehiiv покрывает newsletter; /contact уведомления — Supabase webhook → Telegram. **1 email-сервис, 0 SMTP.** |
| Stagger между карточками для scroll-reveal | Section-level fade достаточно. Per-card stagger = N timeline instances + animation-delays — composite work balloon. |
| LiveNumber в ProductDescriptionGenerator | Выход — текст, числовых результатов нет. |
| LiveNumber в Featured Tools / Tools index | Значения — статические шаблонные строки («Up to $50k/mo»), не реальные числа. |
| Hard Light theme default | Owner-decided: «по системе» независимо от Chrome iOS incognito misreporting. |
| `/best/[slug]`, `/prompts/`, `/news/`, `/blog/` | НЕ в scope MVP (см. таблицу TZ-2 vs реальность ниже). |
| Giscus comments | TZ § 7.5 — отложено. |
| `/api/like`, `/api/feedback` | TZ § 5.4 — таблица `content_likes` есть, endpoint'ов нет. |

---

## ✅ Что готово (краткий итог)

### 💸 Денежные пути
- **AI tool** — OpenRouter (`anthropic/claude-haiku-4.5`, override `OPENROUTER_MODEL`), 3.5с генерация, 3 варианта на запрос
- **Newsletter** — Beehiiv + Supabase mirror + Turnstile-gate (welcome automation сконфигурирован в Beehiiv UI; без него `send_welcome_email: true` silent-ignore'ится)
- **Contact form** — пишет в `contact_submissions` table; чат-нотификация TODO
- **Affiliate** — `/go/[slug]` + UTM overlay + click logging в `affiliate_clicks`
- **PostHog** — 9 типизированных событий через `lib/analytics/events.ts`: tool_started, tool_completed, affiliate_clicked, newsletter_subscribed, contact_submitted, sign_in_completed, comparison_viewed, review_scrolled_50, search_performed
- **Plausible** — script инжектится (env `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true`)

### 🌐 SEO + социальный шеринг
- Sitemap ~52 URL с hreflang
- JSON-LD: Organization + WebSite + SearchAction на homepage; Article + Review + HowTo + BreadcrumbList + ItemList + FAQPage на нужных страницах
- OG fallback через `/api/og`
- Pagefind static index (~700KB) — `/search` страница + inline-форма в навбаре. Регенерится postbuild.

### 📚 Контент
- 6 EN reviews: klaviyo, gorgias, tidio, mailchimp, omnisend, postscript
- 4 EN guides: AI product descriptions, email automation, support automation, SMS tool decision
- 10 RU переводов (все 8 авто + 2 manual)
- `/alternatives/[slug]` для каждого published tool (12 сейчас)
- БД: 12 tools (klaviyo, gorgias, tidio, mailchimp, omnisend, postscript, recharge, loox, judge-me, smile-io, yotpo, + AI generator), 3 comparisons, RU coverage 12/12

### 🌍 RU локализация
~22 RU маршрута: homepage, tools (catalog + 3 calculators + /[slug]), compare (index + slug), reviews, guides, alternatives, all legal, about, methodology, contact, login/dashboard/saved, auth callback

### 🏛 Trust signals
8 legal/trust pages: privacy, terms, affiliate-disclosure, cookie-policy, disclaimer, methodology, about, contact

### ⚙️ Dev experience
- `.env.example` зачекинен
- Type-safe env через `@t3-oss/env-nextjs`
- 32 unit-теста на Vitest (`npm test`) — green
- Playwright scaffolding в `tests/e2e/README.md`

---

## 🛡 Backup & Recovery

Полная карта — в [BACKUP.md](BACKUP.md). Кратко:

- **Код + контент** → git tag `stable-*` в origin. Откат: `git reset --hard <tag> && git push --force-with-lease origin main`. `git tag -l "stable-*" -n1` — список всех точек.
- **Билд** → Vercel Deployments hold all previous; rollback за 30 сек через Promote to Production в UI.
- **БД (Supabase public schema)** → `.github/workflows/backup-db.yml` гонит `pg_dump` через Docker каждый понедельник 04:00 UTC. Дампы как artifacts 90 дней. **PG client 17 вызывается по абсолютному пути** `/usr/lib/postgresql/17/bin/pg_dump` — pg_wrapper иначе резолвит к старшей предустановленной версии. Восстановление: скачать → `gunzip` → `psql $DB_URL < file.sql`. Исключены Supabase-managed схемы (auth/storage/realtime/vault/supabase_functions) — они часть их живой системы.
- **API ключи** → НЕ бэкапим. Живут в источниках. Vercel хранит env vars как Sensitive (после сохранения недоступны даже владельцу).
- **Пароли + 2FA** → в менеджере паролей пользователя. Recovery codes 2FA — отдельно.

**Branch protection / PR-flow намеренно НЕ настроены.** Сознательное решение владельца: для соло-флоу agent+owner это тормоз без выгоды. Точки возврата заменяют процесс-перестраховку.

**Регламент:** перед большой правкой — новый stable-tag. Раз в месяц — скачать последний artifact локально. После любого нового env var — дописать в `lib/env.ts`, `.env.example`, `BACKUP.md`.

---

## 🌀 Operational phase

Engineering scope **закрыт**. Дальше:

- 📝 **Контент-каденс** — TZ закладывал 20-30 reviews + 100-200 pSEO. Сейчас 6+4. Чтобы добить — 2-4 статьи в неделю. EN → husky-хук сгенерит RU.
- 📈 **PostHog/GSC мониторинг** — раз в неделю funnel + impressions.
- 🧪 **A/B тесты** на homepage hero, OG copy, CTA-варианты (PostHog feature flags).
- 🔁 **Quarterly review-refresh** по methodology — пересмотр rating'ов когда меняются tool'ы.
- 🤝 **Affiliate outreach** — Recharge/Loox/Smile.io/Yotpo по мере новых обзоров.
- 🚀 **Promo / launch** — Indie Hackers, Product Hunt, r/shopify Reddit, Hacker News.

---

## 🔄 TZ-2-code.md vs реальность

TZ написан ДО начала работы. Главные расхождения:

| TZ говорит | Реальность |
|---|---|
| `middleware.ts` | `proxy.ts` (Next 16 переименовал) |
| `/compare/[...slug]` catch-all | `/compare/[slug]` single (Next 16 не даёт colocated `opengraph-image.tsx` в catch-all) |
| `/directory` отдельный | 308 redirect на `/tools` |
| Anthropic API direct | OpenRouter gateway |
| `lib/supabase/types.ts` через `supabase gen` | Handwritten type aliases (PostgREST constraint) |
| 50 tools в seed | 12 |
| 100+ comparisons | 3 (klaviyo-vs-mailchimp, omnisend-vs-klaviyo, gorgias-vs-tidio) |
| Route groups `(marketing)/*` | Не используются — пути плоские |
| `/best/[slug]`, `/prompts/`, `/news/`, `/blog/` | НЕ реализованы (намеренно) |
| Giscus comments | НЕ реализованы |
| `/api/like`, `/api/feedback` | НЕ реализованы (таблица есть, endpoint'ов нет) |

Если будешь имплементировать что-то из «не реализовано» — иди по уже работающим паттернам (`compare/[slug]`, `tools/[slug]`, `legal/privacy`). Не изобретай.

---

## 📋 Cheat sheet команд

```bash
# Локальная разработка
npm run dev                              # next dev на 3000
npm run build                            # next build + pagefind index
npm test                                 # vitest run (32 tests)
npm run test:watch                       # vitest watch mode
npx tsc --noEmit                         # typecheck

# Контент
npm run translate:missing                # все EN без RU twin
npm run translate -- --type reviews --slug X
npm run translate -- --type reviews --slug X --force

# Pagefind
npm run search:index                     # перестроить /public/pagefind/

# Рейтинги MDX↔DB
npm run sync:ratings                     # dry-run: расхождения
npm run sync:ratings:apply               # пушнуть MDX → DB
npm run validate:content                 # ручной запуск pre-commit validator

# Vercel
npx vercel ls --scope alf-unit-bot1
npx vercel env ls --scope alf-unit-bot1 production
npx vercel env add KEY production
npx vercel env rm KEY production --yes
npx vercel logs <deployment-url>

# Git
git push origin main                     # триггер Vercel deploy
git log --oneline -15
git tag -l "stable-*" -n1                # все точки восстановления

# Backups (см. BACKUP.md)
git tag -a stable-$(date +%Y-%m-%d) -m "..."
git push origin --tags
gh workflow run backup-db.yml --ref main
```

---

## 🚦 Первые шаги в новой сессии

1. **Прочитай этот файл (HANDOFF.md) полностью.**
2. **Если правки по дизайну / структуре сайта** → сразу `New_Design/README.md`, потом `New_Design/mockups/index.html`. **TZ-2 устарел для дизайн-решений.**
3. Прочитай `TZ-2-code.md` и `INSTRUCTIONS.md` — только для общего контекста инженерного ТЗ (не визуала).
4. Прочитай [BACKUP.md](BACKUP.md) — шпаргалка восстановления.
5. Сверь `git log --oneline -3` с реальностью — убедись что репо актуальный.
6. Если пользователь говорит «продолжай / делай дальше» — спроси КОНКРЕТНО что. Engineering scope закрыт.
7. **Не нарушай идиомы и не трогай locked items.**

### Что попросит пользователь скорее всего

- «**Напиши новый review/guide**» → пиши только EN MDX. На `git commit` husky pre-commit hook авто-сгенерит RU-twin. В БД 12 tools со слагами для `<AffiliateButton tool="..."/>`.
- «**Добавь новый tool в каталог**» → SQL INSERT в Supabase (либо append в `seed.sql`). После: `npm run translate:tools` для RU полей. `/tools/<slug>` и `/alternatives/<slug>` появятся автоматически.
- «**Почему статья на /ru/X показывает английский?**» → Нет RU MDX (pre-commit hook не отработал — обычно потому что коммитили без `OPENROUTER_API_KEY` в env). Проверь `content/reviews/ru/<slug>.mdx`. Если нет — `npm run translate -- --type reviews --slug <slug>`.
- «**Авто-перевод затёр мои ручные правки RU**» → `manuallyTranslated: true` в frontmatter RU-статьи.
- «**Расширь функционал X**» → проверь «TZ-2 vs реальность» + «Что НЕ сделано намеренно». Если не запрещено политикой — обсуди scope.

### Памятки про дизайн

- **TOC справа на всех editorial pages** (/reviews/[slug], /guides/[slug], /compare/[slug]) — owner-decided для consistency. На /reviews/[slug] TOC + ToolStickyCard в одном `<aside lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto>` чтобы не наезжали.
- **github-slugger в `lib/content/toc.ts`** — обязательно, замена сломает RU TOC якоря.
- **ArticleCover на /reviews/[slug] и /guides/[slug]** — gradient-only, 6 slug-hashed вариантов (djb2-hash). Реальные фото — через будущий опциональный `imageUrl` prop.
- **404 / 500 страницы** — `app/not-found.tsx` (server) и `app/error.tsx` (client per Next).
- **Footer social icons** — `href="#"` placeholder, готовы принять реальные URL'ы одной строкой.
- **Логотип на текущей странице** → `window.scrollTo({top:0})` (Logo — client component с `usePathname`). Modifier keys (Cmd/Ctrl/middle-click) не перехватываем — open-in-tab работает.

---

**Удачи. Сайт в хорошей форме. Не сломай.**
