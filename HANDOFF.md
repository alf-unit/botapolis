# Botapolis — Handoff для следующей сессии

> **Это твой первый файл для чтения. Загрузи также `TZ-2-code.md` и `INSTRUCTIONS.md` (они подгрузятся в чат) для полного контекста ТЗ. Этот документ — карта реальности на момент `HEAD` (`784ffde`, май 2026), и приоритет у него ВЫШЕ, чем у TZ-2, потому что TZ был написан до начала работы.**

---

## 🎯 Состояние одной строкой

**Сайт инженерно готов. Все 6 блоков (Sprint 2 + A–F) + 3 hotfix'а на проде на `https://botapolis.com`. Дальше — operational phase (контент + monitoring), не engineering.**

Если пользователь просит «доделать сайт» — он не понимает, что доделывать. Инженерное ТЗ закрыто. Спроси конкретно что нужно (контентная статья? новый UI-блок? фикс конкретной страницы?).

---

## 🗺 Архитектура: где что лежит

### Стек
- Next.js **16.2.6** App Router + Turbopack
- React **19.2.4**
- Tailwind CSS **v4** (config через `globals.css` + `@theme` директива)
- shadcn/ui под капотом **Base UI** (`@base-ui/react`)
- Supabase (Auth + Postgres + RLS) — `@supabase/ssr` + `@supabase/supabase-js`
- TypeScript strict, типы через `@t3-oss/env-nextjs` для env-валидации

### Важно: Next 16 — НЕ тот, что ты знаешь
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
│   ├── alternatives/[slug]/   # pSEO listicle (Block F)
│   ├── api/                   # newsletter, contact, tools/description, og, revalidate, cron/, calculations
│   ├── compare/, compare/[slug]/  # pSEO X-vs-Y
│   ├── content/               # MDX источник (см. ниже)
│   ├── directory/             # → 308 redirect на /tools
│   ├── go/[slug]/             # affiliate redirector
│   ├── guides/, guides/[slug]/  # MDX-driven
│   ├── icon.tsx, apple-icon.tsx # favicon set (next/og)
│   ├── legal/                 # 5 страниц: privacy, terms, affiliate-disclosure, cookie-policy, disclaimer
│   ├── reviews/, reviews/[slug]/  # MDX-driven
│   ├── ru/                    # RU зеркало — ВСЕ thin re-export'ы
│   ├── tools/, tools/[slug]/  # каталог + 3 калькулятора
│   ├── layout.tsx, page.tsx, sitemap.ts, robots.ts
│
├── components/
│   ├── analytics/             # PostHogProvider, PlausibleScript, PageViewEvent, ScrollMilestone
│   ├── auth/                  # LoginForm
│   ├── content/               # MDX components — Callout, ProsConsList, AffiliateButton, ArticleHero, TableOfContents, TrackedAffiliateLink, mdx-components
│   ├── marketing/             # NewsletterForm, ContactForm
│   ├── nav/                   # Navbar, Footer, Logo, ThemeToggle, LanguageSwitcher
│   ├── shared/                # UserMenu, SearchModal, SearchTrigger, TurnstileGate
│   ├── tools/                 # 3 calculator widgets + ToolCard, ToolLogo, ComparisonTable, etc.
│   └── ui/                    # shadcn primitives (Button, Sheet, Dialog, ...)
│
├── content/                   # MDX источник
│   ├── reviews/{en,ru}/       # 6 EN + 6 RU
│   └── guides/{en,ru}/        # 4 EN + 4 RU
│
├── lib/
│   ├── analytics/events.ts    # типизированный track() helper для PostHog
│   ├── content/               # MDX loader, TOC extractor, reading-time
│   ├── email/resend.ts        # Resend wrapper + 3 шаблона (welcome, contact inbox, auto-reply)
│   ├── i18n/                  # config, dictionaries, get-locale
│   ├── seo/                   # buildMetadata, JSON-LD generators
│   ├── supabase/              # client, server, service, middleware, types (handwritten)
│   ├── env.ts                 # @t3-oss/env-nextjs schema
│   ├── ratelimit.ts           # Upstash limiters
│   └── utils.ts               # cn, formatPrice, hashIp, absoluteUrl, etc.
│
├── locales/{en,ru}.json       # UI strings (NOT used for MDX content)
├── proxy.ts                   # Next 16's middleware, sets x-locale header + auth gate
├── next.config.ts             # CSP + security headers + outputFileTracingIncludes для content/
├── scripts/
│   ├── build-search-index.ts  # Pagefind index builder (runs postbuild)
│   └── translate-content.ts   # EN→RU MDX translator (OpenRouter)
├── supabase/
│   ├── migrations/            # 001 initial, 002 contact_submissions
│   └── seed.sql               # 12 tools + 3 comparisons (после reload)
├── tests/
│   ├── unit/                  # Vitest: 25 tests for lib/utils + lib/content
│   └── e2e/README.md          # Playwright план (не установлен — см. README)
├── vercel.json                # 2 weekly crons
└── .env.example               # template — реальные значения в Vercel encrypted
```

---

## 🔑 Критические идиомы (соблюдай ВЕЗДЕ)

### Серверный компонент → клиентский остров
Pages = server. Интерактив (calc widgets, NewsletterForm, ContactForm, UserMenu, LoginForm, ThemeToggle, LanguageSwitcher, ToolsCatalog filter, SearchTrigger, TurnstileGate, TrackedAffiliateLink) — `"use client"`. Локализованные strings уходят props'ами сверху вниз. **Client-компоненты НИКОГДА не вызывают `getDictionary` сами.**

### Локализация
- `proxy.ts` ставит header `x-locale` в зависимости от `/ru/...` префикса
- На странице: `const locale = await getLocale()` + `const dict = await getDictionary(locale)` + `const localePrefix = locale === "ru" ? "/ru" : ""`
- `/ru/<route>/page.tsx` — это thin re-export от `/app/<route>/page.tsx`. Route-segment config (`revalidate`, `dynamicParams`) инлайнится в каждом файле (Next 16 не даёт re-export'ить эти константы).

### Авто-перевод контента (husky pre-commit hook)
- Любой staged файл под `content/{reviews,guides}/en/*.mdx` триггерит `.husky/pre-commit`, который вызывает `scripts/translate-content.ts --force` для каждой пары `type/slug` и подмешивает свежий RU-twin в коммит. Пользователь подписался на «auto-on-commit, без ревью».
- **Модель**: `anthropic/claude-haiku-4.5` через OpenRouter (override через env `OPENROUTER_MODEL`). Локально нужен `.env.local` с `OPENROUTER_API_KEY` (или экспортнутая переменная) — иначе hook логирует warning + пропускает (НЕ блокирует коммит).
- **Опт-аут** на конкретную статью: добавь `manuallyTranslated: true` в frontmatter RU-файла. Переводчик уважает флаг даже с `--force`. Используй когда отшлифовал RU руками и не хочешь чтобы будущая правка EN затёрла твою работу.
- **Поведение по умолчанию** (без флага): правка EN перезаписывает RU. Пользователь сознательно выбрал этот trade-off — лучше потерять ручные правки чем держать переводы в очереди на ревью.
- Hook идёт через **shell**, кроссплатформенно работает через git's bundled bash. `set -e` НЕ блокирует на ошибке отдельного файла — loop'ит дальше, коммит проходит.

### Metadata
**Всегда** через `buildMetadata({...})` из `lib/seo/metadata.ts`. Сам добавляет canonical + hreflang. Не пиши `<title>` руками — root layout накладывает template `%s · Botapolis`. RU homepage использует флаг `absoluteTitle: true` чтобы обойти template (его title уже содержит "Botapolis").

### JSON-LD
Импорт helper'а из `lib/seo/schema.ts` → `<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}/>` в конце страницы. Helpers: `generateOrganizationSchema`, `generateWebSiteSchema`, `generateBreadcrumbSchema`, `generateArticleSchema`, `generateReviewSchema`, `generateHowToSchema`, `generateSoftwareApplicationSchema`, `generateItemListSchema`, `generateOwnedToolSchema`, `generateFAQSchema`.

### Стили
**Только** CSS variables (`var(--brand)`, `var(--bg-surface)`, etc.) и Tailwind. Никаких raw hex, КРОМЕ mint→mint gradient на primary CTA (`linear-gradient(180deg, #34D399 0%, #10B981 100%)` — он эталонный, используется на всех «Try X» кнопках). Иконки — lucide-react или inline SVG, никогда emoji.

### Affiliate links
Всегда через `${localePrefix}/go/${slug}?utm_campaign=<source>` с `rel="sponsored nofollow noopener"` + `target="_blank"`. Используй `<AffiliateButton tool="<slug>">` для inline в MDX или `<TrackedAffiliateLink>` если нужно ловить PostHog `affiliate_clicked` событие на клике. Прямые ссылки на vendor.com **только** для secondary CTA «Website».

### Типы Supabase
Handwritten в `lib/supabase/types.ts`. **Каждый Row — `type` alias, не `interface`** — PostgREST'овский `GenericTable.Row extends Record<string, unknown>` принимает только type-aliases. Если переключишь на interface, все `.select()` коллапсируют в `never`.

### MDX gotchas
- В body **НИКОГДА не пиши `<digit`** (типа `<200ms`, `<50 чего-то`) — MDX парсит как начало JSX-тега и крашится с `Unexpected character 'X' (U+0035) before name`. Пиши «under 200ms» или «менее 50».
- Технические термины / product names / acronyms (MRR, TCPA, SMS, AI, ROI, AOV) **оставляй на английском** в RU-переводах — это convention, заданный manual'ными RU klaviyo-review + AI-product-description guide.
- JSX-prop expressions типа `<ProsConsList pros={[...]}/>` работают, но `blockJS: false` обязателен в loader'е (`lib/content/mdx.ts`) — иначе массивы из props стрипаются и компонент крашится на `.length`.

### Комменты в коде
Плотные, объясняют **почему**, не **что**. Все BUG-FIX'ы / audit-фиксы помечаются `BUG-FIX (<month> <year> audit):` или `Block X — ...`. Не штрафуй себя за длину — этот стиль был установлен с первых коммитов сессии и должен сохраняться.

---

## ✅ Что готово (full итог сессии)

**12 коммитов · 115 файлов · +14,048 / −645 строк · 6 блоков (Sprint 2 + A–F) · 3 hotfix'а**

### 💸 Денежные пути
- **AI tool** — OpenRouter (`anthropic/claude-haiku-4.5`, override через `OPENROUTER_MODEL`), 3.5с генерация, 3 варианта на запрос
- **Newsletter** — Beehiiv + Supabase mirror + Turnstile-gate (active)
- **Contact form** — пишет в `contact_submissions` table; Resend ждёт пока юзер добавит API key
- **Affiliate** — `/go/[slug]` + UTM overlay + click logging в `affiliate_clicks`
- **PostHog** — 9 типизированных событий (через `lib/analytics/events.ts`): tool_started, tool_completed, affiliate_clicked, newsletter_subscribed, contact_submitted, sign_in_completed, comparison_viewed, review_scrolled_50, search_performed
- **Plausible** — script инжектится (env `NEXT_PUBLIC_PLAUSIBLE_ENABLED=true`)

### 🌐 SEO + социальный шеринг
- Sitemap: ~42 URL с hreflang (после `supabase/seed.sql` reload станет ~52)
- JSON-LD на homepage: Organization + WebSite + SearchAction + EntryPoint
- Article + Review + HowTo + BreadcrumbList + ItemList на нужных страницах
- OG fallback через `/api/og` — все страницы шарятся с картинкой
- `/logo.svg`, `/icon`, `/apple-icon` — все 200, transparent canvas
- Pagefind static index (~700KB) под Cmd+K, регенерится в postbuild

### 📚 Контент
- **6 EN reviews**: klaviyo, gorgias, tidio, mailchimp, omnisend, postscript (~1.3-1.4k слов)
- **4 EN guides**: AI product descriptions, email automation, support automation, SMS tool decision
- **10 RU переводов** (все 8 новых EN + 2 manual'но переведённых)
- **`/alternatives/[slug]`** для каждого published tool (7 сейчас → 12 после seed reload)
- **Husky pre-commit hook авто-переводит EN→RU на каждом коммите** (см. секцию «Авто-перевод» ниже)

### 🌍 RU локализация
~22 RU маршрута живых: homepage, tools (catalog + 3 calculators + /[slug]), compare, reviews (с переводами), guides (с переводами), alternatives, all legal, about, methodology, contact, login/dashboard/saved, auth callback

### 🏛 Trust signals (TZ § 16 полностью)
8 legal/trust pages: privacy, terms, affiliate-disclosure, cookie-policy, disclaimer, methodology, about, contact

### 🔍 + 🛡 Infrastructure
- Pagefind search (Cmd+K) — индекс собирается postbuild, ~12 RU + 24 EN страниц
- Turnstile widget на newsletter + contact — gate active
- 2 weekly Vercel cron'a (refresh-tool-data, digest-affiliate-clicks)

### ⚙️ Dev experience
- `.env.example` зачекинен с группами + комментариями
- Type-safe env через `@t3-oss/env-nextjs`
- 25 unit-тестов на Vitest (`npm test`) — green
- Playwright scaffolding документирован в `tests/e2e/README.md`
- Supabase types-gen команда задокументирована (handwritten остаются по дизайну)

---

## 🛠 TODO на пользователе (опционально, не блокирует)

| # | Что | Команда / шаг |
|---|---|---|
| 1 | **Re-run `supabase/seed.sql`** — добавит 5 новых tools (recharge, loox, judge-me, smile-io, yotpo). После этого `/tools/recharge` 200 и `/alternatives/[slug]` ранжирует на 12 tools | Supabase Dashboard → SQL Editor → paste + Run. Идемпотентно (`ON CONFLICT DO UPDATE`). |
| 2 | **Решить про Resend** — если хочешь welcome-emails + auto-reply, заведи аккаунт + `npx vercel env add RESEND_API_KEY production`. Если нет — оставь как есть, helper'ы no-op'ятся. **Важно**: Beehiiv тоже шлёт welcome email (`send_welcome_email: true`), отключи один из двух чтобы избежать double-send. | resend.com → API Keys → New Key |
| 3 | **Реальные social URLs** — когда заведёшь @botapolis на X/LinkedIn/GitHub, обнови `lib/seo/schema.ts` `generateOrganizationSchema().sameAs` (там пока хардкоженные placeholder URL `https://x.com/botapolis` и `https://github.com/botapolis` — они в JSON-LD только, не в Footer markup). Также раскомментировать Footer-блок | edit lib/seo/schema.ts + components/nav/Footer.tsx |

---

## 🌀 Operational phase (после Block F)

Engineering scope **закрыт**. Дальше — то, что не кончается:

- 📝 **Контент-каденс** — TZ закладывал 20-30 reviews + 100-200 pSEO. Сейчас 6+4. Чтобы добить — 2-4 статьи в неделю. Пишешь EN — husky-хук на коммите сам сгенерит RU-twin.
- 📈 **PostHog/GSC мониторинг** — раз в неделю смотреть funnel конверсии + impressions. PostHog dashboard, GSC Performance.
- 🧪 **A/B тесты** на homepage hero, OG copy, CTA-варианты. PostHog feature flags.
- 🔁 **Quarterly review-refresh** по нашей же methodology — пересмотр rating'ов когда меняются tool'ы.
- 🤝 **Affiliate outreach** — submit заявки в Recharge/Loox/Smile.io/Yotpo по мере того как пишутся обзоры.
- 🚀 **Promo / launch** — Indie Hackers, Product Hunt, r/shopify Reddit posts, Hacker News Ask HN.

Engineering инструменты для всего этого готовы.

---

## ⚠️ Подводные камни и quirks

### Vercel CLI env pull возвращает пустые значения
На этом аккаунте `npx vercel env pull .env.local` НЕ записывает реальные значения encrypted-секретов (возвращает `KEY=""`). Это известная проблема с проектом. Workaround: inline-env через shell:
```bash
OPENROUTER_API_KEY="..." node --experimental-strip-types scripts/foo.ts
```
Если делаешь локальный билд и видишь `Supabase service client requires NEXT_PUBLIC_SUPABASE_URL` — это та же проблема. На проде Vercel вкатывает env правильно. Локальный билд можно пропустить — TSC + tests достаточно, прод билд это разрулит.

### `.env.local` НЕ загружается Node автоматически
Поэтому скрипты `translate` и `search:index` идут с флагом `--env-file=.env.local`. Если пишешь новый скрипт, добавляй тот же флаг.

### Pagefind output gitignored
`/public/pagefind/` НЕ в репо — генерится в postbuild (`npm run search:index`). На Vercel это запускается автоматически. Локально — после `npm run build`.

### Footer social SVG функции «unused»
`TwitterMark`, `LinkedinMark`, `GithubMark` в `components/nav/Footer.tsx` определены, но не рендерятся (Block F убрал placeholder URLs). ESLint может предупредить — это OK, не блокирует. Когда юзер даст реальные URL, расщёлкни закомментированный блок в Footer + удалит warning.

### Inner hollow на favicon
`#0A0A0B` solid fill внутри правого node — это намеренно (см. комменты в `app/icon.tsx`). На transparent canvas в 32×32 favicon выглядит как точка размером ~3px — индистинг от полной прозрачности, но дешевле в реализации через next/og (нет mask support).

### MDX `blockJS: false` обязательно
В `lib/content/mdx.ts`. Без этого MDX стрипает JSX-prop expressions типа `pros={[...]}` и компоненты падают на `.length` undefined. Не трогай эту настройку.

### Vercel cron не активен в Hobby tier (если такой)
Если деплой на Hobby plan — crons из `vercel.json` могут не выполняться. На Pro+ работает. Проверить через Vercel Dashboard → Settings → Crons.

---

## 📋 Cheat sheet команд

```bash
# Локальная разработка
npm run dev                              # next dev на 3000
npm run build                            # next build + pagefind index
npm test                                 # vitest run (25 tests)
npm run test:watch                       # vitest watch mode
npx tsc --noEmit                         # typecheck

# Контент
npm run translate:missing                # все EN без RU twin (manual fallback — обычно husky-хук делает это сам на коммите)
npm run translate -- --type reviews --slug klaviyo-review-2026  # один файл
npm run translate -- --type reviews --slug X --force            # перезаписать

# Pagefind
npm run search:index                     # перестроить индекс /public/pagefind/

# Vercel
npx vercel ls --scope alf-unit-bot1                # last deploys
npx vercel env ls --scope alf-unit-bot1 production  # list env
npx vercel env add KEY production                  # добавить
npx vercel env rm KEY production --yes             # удалить
npx vercel logs <deployment-url>                   # runtime logs

# Git
git push origin main                     # триггер Vercel deploy
git log --oneline -15                    # последние коммиты
```

---

## 📜 Коммиты этой сессии (12 штук, базовый коммит — `65380d0`)

```
784ffde feat(block-F): Resend + Vitest scaffolding + supabase types doc
ef4bb45 feat(block-F): Footer social cleanup, +5 seed tools, /alternatives/[slug] pSEO
aa8273e feat(translate): CLI for EN→RU MDX + 8 RU translations of Block E content
0c89adb fix(block-E): MDX parser crashes on bare '<digit' in prose
5c3b5d8 feat(block-E): content wave — 5 new EN reviews + 3 EN guides + 2 RU translations
79b654b feat(block-D): Pagefind search + Turnstile widget + Vercel crons + .env.example
06db876 fix(polish): transparent favicon, doubled-newsletter on mobile, login viewport drag
a9e3719 feat(block-C): PostHog event capture across 8 surfaces + homepage JSON-LD
ee69bd6 feat(block-B): brand assets, /methodology, 2 legal pages, /contact
b47a166 fix(block-A): RU stubs for the three static /tools/* calculator routes
8feb3b6 feat(block-A): unblock money — OpenRouter migration, Plausible on, OG fix, RU stubs
e336372 feat(sprint-2): MDX pipeline + reviews & guides routes + finalize May audit
```

Каждый коммит имеет подробный body. `git log -1 <hash>` если нужны детали.

---

## 🔄 TZ-2-code.md vs реальность — главные расхождения

TZ написан ДО начала работы. На момент `HEAD`:

| TZ говорит | Реальность |
|---|---|
| `middleware.ts` | `proxy.ts` (Next 16 переименовал) |
| `/compare/[...slug]` catch-all | `/compare/[slug]` single (Next 16 не даёт colocated `opengraph-image.tsx` в catch-all) |
| `/directory` отдельный | 308 redirect на `/tools` (sprint 1 решение) |
| Anthropic API direct | OpenRouter gateway (Block A migration) |
| `lib/supabase/types.ts` через `supabase gen` | Handwritten type aliases (constraint от PostgREST) |
| 50 tools в seed | 7 (после `seed.sql` reload — 12) |
| 100+ comparisons | 3 (klaviyo-vs-mailchimp, omnisend-vs-klaviyo, gorgias-vs-tidio) |
| Route groups `(marketing)/*` | Не используются — пути плоские |
| `/best/[slug]`, `/prompts/`, `/news/`, `/blog/` | НЕ реализованы (намеренно, не в scope MVP) |
| Giscus comments | НЕ реализованы (TZ § 7.5) |
| `/api/like`, `/api/feedback` | НЕ реализованы (TZ § 5.4 — таблица `content_likes` есть, endpoint'ов нет) |

Если будешь имплементировать что-то из «не реализовано» — иди по уже работающим паттернам (compare/[slug], tools/[slug], legal/privacy). Не изобретай.

---

## 🚦 Первые шаги в новой сессии

1. **Прочитай этот файл (HANDOFF.md) полностью** — ты делаешь это сейчас. ✅
2. Прочитай `TZ-2-code.md` и `INSTRUCTIONS.md` (загружены в чат) — общий контекст ТЗ.
3. Сверь `git log --oneline -3` с разделом «Коммиты этой сессии» выше — убедись что репо актуальный.
4. Если пользователь говорит «продолжай / делай дальше / следующий блок» — спроси КОНКРЕТНО что. Engineering scope закрыт; следующий блок это либо контент, либо новая feature.
5. **НЕ нарушай идиомы** из раздела «Критические идиомы». Особенно RU re-export pattern, типы-aliases в Supabase, и BUG-FIX комменты на любых правках.

### Что попросит пользователь скорее всего
- «Напиши новый review/guide» → пиши только EN MDX. **На `git commit` husky pre-commit hook авто-сгенерит RU-twin и подмешает его в коммит** — никакой ручной команды. Все 7 tools в seed имеют слаги для AffiliateButton (12 после seed reload).
- «Добавь новый tool в каталог» → SQL INSERT в Supabase (либо append в `seed.sql` и попросить пользователя re-run). После этого `/tools/<slug>` и `/alternatives/<slug>` появятся автоматически.
- «Почему статья на /ru/X показывает английский?» → Нет RU MDX файла (значит pre-commit hook не отработал — обычно потому что коммитили без `OPENROUTER_API_KEY` в env). Проверь `content/reviews/ru/<slug>.mdx`. Если нет — `npm run translate -- --type reviews --slug <slug>` и закоммить.
- «Авто-перевод затёр мои ручные правки RU» → добавь `manuallyTranslated: true` в frontmatter этой RU-статьи. Pre-commit hook её больше не тронет даже на правках EN.
- «Расширь функционал X» → проверь "TZ-2 vs реальность" таблицу выше, нет ли это уже отложенного пункта. Если нет — обсуди с пользователем scope.

---

**Удачи. Сайт в хорошей форме. Не сломай.**
