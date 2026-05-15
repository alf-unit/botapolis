# Botapolis — Handoff для следующей сессии

> **Это твой первый файл для чтения. Загрузи также `TZ-2-code.md` и `INSTRUCTIONS.md` для общего контекста ТЗ. Этот документ — карта реальности на момент `HEAD` (`771c2d4`, май 2026), и приоритет у него ВЫШЕ, чем у TZ-2, потому что TZ был написан до начала работы.**

> ⚠ **Источник правды по дизайну — папка `New_Design/`.** Это финальная версия дизайн-проекта v.026. **Любые правки по дизайну/структуре сайта берёшь оттуда, не из TZ-2.** Первый файл для чтения внутри: [New_Design/README.md](New_Design/README.md). Дальше по необходимости:
> - [New_Design/app/globals.css](New_Design/app/globals.css) — токены (mint+violet OKLCH ramp, typography, motion, containers)
> - [New_Design/app/components/](New_Design/app/components/) — 32 reference-компонента (Navbar / Footer / HeroSection / Button / Card / etc.)
> - [New_Design/mockups/](New_Design/mockups/) — HTML мокапы всех страниц (homepage / tool-email-roi / compare / review-klaviyo / directory / guide / edge-states / methodology / about-contact / emails)
> - [New_Design/docs/motion-specs.md](New_Design/docs/motion-specs.md) — easings / durations / per-component motion
> - [New_Design/docs/brand-book.html](New_Design/docs/brand-book.html) — brand voice + applications

---

## 🎯 Состояние одной строкой

**Сайт инженерно готов, отполирован, забэкаплен, локализован end-to-end, выровнен по дизайну v.026. Инженерное ТЗ закрыто. Sprint 2 + Blocks A–F + 4 волны live-аудита + i18n+UX + полный дизайн-аудит май 2026 (Wave 1-5) + Wave 6 mobile audit + LiveNumbers + scroll-reveal (15 мая). Прод на `https://botapolis.com` стабильный. Дальше — operational phase (контент + monitoring), не engineering.**

Спроси пользователя конкретно что нужно (контентная статья? новый UI-блок? фикс конкретной страницы?).

---

## 🆕 Что добавилось после первого HANDOFF (`4a1a058` → `69965a5`)

Три волны полировки после live-аудита прода:

### Волна 1 — аудит 5 багов (коммит `698b46d`)
- **#3 Рейтинги MDX↔DB** · MDX — source of truth. `lib/content/rating.ts` helper в `/tools/[slug]` и каталоге. Миграция 003 синканула DB (omnisend 8.5, tidio 8.2, postscript 8.6). `scripts/sync-ratings.ts` + `scripts/content-validator.ts` (pre-commit gate) — больше не разойдутся.
- **#1 Canonical slug** для comparisons. `lib/content/slug.ts` + Migration 004 (мерж дубликатов + BEFORE INSERT/UPDATE trigger + CHECK constraint). `redirect()` 301 non-canonical → canonical в `app/compare/[slug]/page.tsx`. 7 unit-тестов в `tests/unit/slug.test.ts`.
- **#2 Compare page expansion**. Раньше рендерил почти пустую шелуху; теперь всегда видны 9 секций. `lib/content/pseo.ts` с детерминированными авто-нарративами (At a glance / Pricing / Verdict fallback / Integrations Venn). RelatedComparisons fetch через PostgREST `.or()`.
- **#4 Email ROI Calculator**. Слайдер «Click rate 2.4%» → «Click-to-open rate 12%» (range 5-30%). Open 20% default. ROI рендерится как `230%` (не `2.3×`). Новый блок «Revenue per subscriber» + бенчмарк $0.82. `?embed=1` mode + iframe-snippet в конце страницы. CSP-override для `frame-ancestors` через `next.config.ts`.
- **#5 Homepage hero**. Битая математика «$18,420» → честные `$4,410` (`12500·4·.28·.15·.025·84` сходится). Бейдж «AI · live» → «Sample · Email ROI».

### Волна 2 — поиск был полностью разломан + UX-передел
- **CSP блокировал WASM** — Pagefind тихо падал на init. Добавил `'wasm-unsafe-eval'` в `script-src`. Это была root cause «ничего не ищет».
- **Модалка убита**. Был Cmd+K палет; стала отдельная страница `/search` с инлайн-формой. Файлы `SearchModal.tsx`/`SearchTrigger.tsx` удалены, новый `components/shared/SearchPageClient.tsx`.
- **Amazon-style форма** в навбаре (`components/nav/NavbarSearch.tsx`) — input 280px фиксированной ширины + зелёная лупа-кнопка в правом углу поля. Никакого focus-expand (ломал layout). На мобиле (`<lg`) — fallback на иконку-ссылку.
- **Submit-only**. Поиск стартует только при submit (Enter / клик по лупе). Auto-fire на каждый символ убран.
- **Vercel CDN кешировал stale `pagefind-entry.json`** → manifest указывал на хэши шардов из старого билда → 404 на `.pf_meta`. Через `next.config.ts` прибил `Cache-Control: no-store` на `entry.json` + `pagefind.js` + `pagefind-worker.js`. Хэшированные шарды (`.pf_meta`/`.pf_index`) кешируются долго по дефолту — их имя меняется с контентом.
- **iOS auto-zoom-on-focus**. Input `text-[15px]` < 16px → Safari зумит → viewport съезжает → страница «таскается пальцем». Поднял input до `text-[16px]` mobile / `text-[17px]` lg. Плюс защитный `overflow-x: clip` на `<html>` и `<body>` в `globals.css`.

### Волна 3 — Backup + CTA + Base UI fix + i18n + UX (`f16bdb7` → `69965a5`, ~22 коммита)

Большая сессия конца мая 2026 которая закрыла последние слабые места. **Все восемь под-блоков независимо коммитнуты** — каждое изменение можно ревьювнуть и откатить отдельно.

**A) Backup-инфраструктура** (см. [BACKUP.md](BACKUP.md) и секцию «🛡 Backup & Recovery» ниже).
- `stable-2026-05-13` git-тэг как точка возврата для кода + MDX
- `.github/workflows/backup-db.yml` — еженедельный `pg_dump` Supabase в GitHub artifact (90 дней retention). PG client 17 ставится из APT, вызывается по абсолютному пути `/usr/lib/postgresql/17/bin/pg_dump` (pg_wrapper иначе резолвит к старшей предустановленной версии — гарантированный bug на ubuntu-latest).
- `BACKUP.md` документирует четыре failure-сценария + ровно одну команду на каждый. **Branch-protection / PR-flow намеренно НЕ настроены** — для соло-флоу оба тормозят без выгоды (решение owner'а).

**B) CTA-кнопка получает фирменный mint-glow + shimmer** (`components/ui/button.tsx` variant `cta` + `app/globals.css §7`).
- **Что включает variant `cta`**: mint-градиент (`var(--gradient-cta)`), белый текст 600, hover-lift `-1px`, диагональный shimmer-sweep слева-направо 900ms через `::before` псевдо-элемент.
- **Эволюция параметров shimmer задокументирована inline-комментарием v1/v2/v3** в `.btn-cta::before` (band 30→50%, alpha 0.32→0.48, duration 600→900ms). Если попросят покрутить — три «ручки» там же.
- **Что было выкинуто после live-теста**: same-color outer glow (читался как блюр), violet contrast ring (overshoot), физический squish на press (juser сказал «лишнее»), Material-style ripple (конфликтовал с shimmer — две белые motion-primitive в одном цвете).
- **Раскатано на 17 primary CTA** в 13 файлах: Subscribe / Send / Generate / Save / Try Tool / affiliate-CTAs / Sign in. **НЕ применять** к utility-кнопкам типа NavbarSearch submit и SearchPageClient submit — они «приварены» к input через общую границу и lift отрывает их визуально.

**C) Base UI 1.4 совместимость** — три отдельных правки, одна причина (1.4 ввёл строгие runtime-валидации). **Шаблоны на запомнить:**
- `<DropdownMenuTrigger render={<CustomButton>}>` → throws Base UI #31 («not rendered as a native <button>»). Фикс: `nativeButton={false}` prop на Trigger/Item/Close. **Везде в коде где `render={<...>}` теперь стоит этот opt-out** — UserMenu (3 места), Navbar SheetTrigger + SheetClose (4), DialogPrimitive.Close (2), SheetPrimitive.Close (1).
- `<DropdownMenuLabel>` (= `MenuPrimitive.GroupLabel`) **требует** обёртки `<DropdownMenuGroup>` иначе throws #31. Это **другой** код 31 (тот же formatErrorMessage helper) — оба ошибочно идентичны в production-mode. Источник в `node_modules/@base-ui/react/esm/menu/group/MenuGroupContext.js`. Если когда-нибудь #31 снова — копать в эту сторону.
- CSP добавлен `https://us-assets.i.posthog.com` в `script-src` + `connect-src` — PostHog перенёс свой config/recorder CDN. Без этого PostHog снippet ловит unhandled rejection → каскад ошибок в Console (не блокирует, но грязно).

**D) Browser auto-translate site-wide off** (`app/layout.tsx`).
- `<html translate="no">` (W3C, для Safari/Firefox/Yandex) + `<meta name="google" content="notranslate">` (Chrome/Edge через Metadata `other`).
- Причина: у нас своя RU-локализация через `/ru/*`. Без opt-out Chrome у RU-юзеров с EN-страницей запускает translate-iframe `flexible?lang=auto` который конфликтует с нашим строгим CSP — каскад TrustedHTML/TrustedScript/xr-spatial-tracking errors в Console (не блокирует, но шумит). И **двойной перевод** UX-кашу даёт.
- Notranslate **НЕ меняет** default-язык сайта (он по-прежнему EN на `/`).

**E) i18n-волна — три источника контента, три скрипта** (большой блок, см. секцию «🌍 i18n регламент» ниже).
- `app/guides/page.tsx` + `app/reviews/page.tsx` swap'нули hardcoded `getAllMdxFrontmatter("guides", "en")` → `(...., locale)`. RU MDX уже был на диске — просто не читался.
- `locales/ru.json` — «AI Cost Comparator» → «Калькулятор стоимости AI» (две локации, footer + featured tool tile).
- **Tools DB**: migration **005** добавила `name_ru` / `tagline_ru` / `description_ru` / `pros_ru[]` / `cons_ru[]` / `best_for_ru`. Read-side helper `lib/content/tool-locale.ts` (`localizeTool` / `localizeToolPartial`) — единая точка fallback `tool.name_ru ?? tool.name`. Подключён в `tools/page`, `tools/[slug]/page`, `alternatives/[slug]/page`, `compare/[slug]/page`, `AffiliateButton`.
- **Comparisons DB**: migration **006** свапнула UNIQUE(slug) на UNIQUE(slug, language) — один slug может жить в двух языковых строках. `app/compare/[slug]/page.tsx` теперь принимает locale через `fetchComparison(slug, locale)` + `fetchRelatedComparisons(..., locale)`. **Новый файл `app/ru/compare/[slug]/page.tsx`** thin re-export — до волны 3 этого route вообще НЕ существовало, /ru/compare/<slug> возвращал 404.
- **Скрипты**: `npm run translate:tools` и `npm run translate:comparisons` (как husky-хук переводит MDX, так эти переводят tools / comparisons). Запущены один раз → 7 tools + 6 comparisons переведены в БД. Регламент: после нового insert юзер запускает соответствующий npm-скрипт.
- Все три translation-скрипта идемпотентны — без `--force` пропускают уже переведённое.

**F) Subscribe-кнопка теперь модалка, не якорь** (`components/marketing/NewsletterDialog.tsx`).
- Раньше: клик в навбаре → scroll к `<div id="newsletter">` в footer'е → юзер видит **ещё одну Subscribe-кнопку рядом с формой**. Два клика чтобы дойти до одного действия.
- Теперь: клик → Dialog с тем же `<NewsletterForm>` поверх любой страницы. Footer-форма **остаётся** как long-form копия + JS-disabled fallback.
- `source` в Supabase теперь `navbar_modal` vs `footer` — funnel-attribution.
- Mobile (внутри SheetClose) **намеренно** оставлен на scroll-to-footer — модалка-поверх-sheet на iOS Safari фигачит с virtual keyboard z-index.

**G) Smooth-scroll + anchor offset** (`app/globals.css §4`).
- `html { scroll-behavior: smooth }` + `[id] { scroll-margin-top: 80px }` (64px navbar + 16px breathing). Глобально на все anchor-targets — будущие TOC heading IDs, /#faq, etc. бесплатно получают offset под navbar.
- Reduced-motion override в §5 (`scroll-behavior: auto !important`) уже был, остаётся честным.

**H) NewsletterForm wait-for-Turnstile** (`components/marketing/NewsletterForm.tsx`).
- Раньше: submit до того как Turnstile выдал token → fail-fast toast «we're verifying you're human». Особенно плохо в навбар-модалке где widget mount'ится только при open Dialog.
- Теперь: при submit без токена → button → «Subscribing…» → ref-polling каждые 100ms до 5 sec → отправка. **Ref** (`turnstileTokenRef`) вместо state — closure handleSubmit'a иначе видит stale value.
- ⚠ **Welcome email не приходит** — отдельная проблема. См. «🛠 TODO» ниже.

### Активация Волны 3 — что юзер должен был сделать (и сделал)

1. ✅ Применить migration 005 в Supabase Dashboard SQL Editor
2. ✅ Применить migration 006 там же
3. ✅ Восстановить значения в `.env.local` после того как `vercel env pull` затёр их пустыми кавычками (см. «⚠ Подводные камни» ниже — задокументировано)
4. ✅ Сгенерить `OPENROUTER_API_KEY` и положить в `.env.local`
5. ✅ Запустить `npm run translate:tools` (7 tools переведены) и `npm run translate:comparisons` (6 RU comparisons созданы)
6. ✅ **Сделано (14 мая 2026)**: `BEEHIIV_API_KEY` получен, установлен в `.env.local` + Vercel prod env, welcome automation сконфигурирован в Beehiiv UI. End-to-end newsletter pipeline работает.

---

## 🆕 Дизайн-аудит май 2026 (`69965a5` → `771c2d4`, 17 коммитов) — Wave 1-5

Большая сессия 14 мая 2026 по полному выравниванию сайта с новым дизайном (`New_Design/` v.026). Дизайн-проект завершили, в репо положили папку `New_Design/` как источник правды. Сайт прошли пятью волнами + хотфиксами + копи-полировкой.

### Стартовая разведка
- Прочитан `New_Design/README.md`, `app/globals.css`, `app/page.tsx`, `app/layout.tsx`, ключевые компоненты (Navbar / Footer / HeroSection / Button), все 12 mockup'ов, motion-specs, TZ-2-engineering, brand-book.
- **Locked-by-owner элементы** (не трогать): CTA shimmer animation (variant `cta` в `components/ui/button.tsx`), inline `NavbarSearch` + `/search` page, `LanguageSwitcher` mint-active state, `NewsletterDialog` modal (вместо scroll-to-footer).
- **Дизайн-токены УЖЕ совпадают** между `app/globals.css` и `New_Design/app/globals.css` (одинаковые OKLCH ramps mint+violet, surfaces, text, borders, shadows, gradients, motion). Token-слой не трогали.

### Волна 1 — Homepage (коммиты `12439ce`, `79a59ba`)
Главная страница была сильно «беднее» дизайна — отсутствовали 3 секции.

- **Hero secondary CTA** возвращён на `/reviews` (был на `/compare` как placeholder пока Sprint 2 не доехал).
- **Demo widget** свёлся с 4 ползунков до 3 (убран CTO row), `dict.hero.widget.cto` оставлен в словаре для live-калькулятора.
- **Новая секция «Head-to-head comparisons»** — 4 карточки через `ComparisonCard`. Locale-filtered fetch из Supabase, скрывается если данных нет.
- **Новая секция «Latest deep reviews»** — 3 карточки из MDX, стиль матчит /reviews index.
- **Новая секция «Browse by category»** — 6 плиток с lucide иконками, ссылки `/tools?category=<slug>`.
- **Footer social-иконки** возвращены с `href="#"` placeholder'ами (X / LinkedIn / GitHub).
- Hero CTA `dict.ctaSecondary` обновлён в `locales/en.json` + `locales/ru.json`.
- **ISR `revalidate = 3600`** добавлен на homepage (раньше был implicit).
- Параллельный fetch `Promise.all([fetchHomeComparisons, fetchLatestReviews])` чтобы wait был `max(supabase, fs)`.

### Волна 2 — Tool pages (коммиты `371840e`, `477410b`)
Все 3 калькулятора (`/tools/email-roi-calculator`, `/tools/ai-cost-comparator`, `/tools/product-description`) получили доп. секции после виджета.

- **Новый компонент `components/tools/RecommendedTools.tsx`** — 3-card affiliate row с editorial «why» note, опциональным «Our pick» badge (mint border + gradient pill). Bulk-fetch tools по slug через `.in()`, локализация через `localizeToolPartial`, CTA через `TrackedAffiliateLink` (PostHog + `/go/<slug>`).
- **Новый компонент `components/tools/ToolFaq.tsx`** — Base UI Accordion (single-open) с eyebrow + title. Скрывается если items пустой.
- **email-roi-calculator**: 3-card Recommended (Klaviyo pick / Omnisend / Mailchimp) + 5-вопросный FAQ + FAQPage JSON-LD.
- **ai-cost-comparator**: только FAQ (Anthropic/OpenAI/Google не в affiliate-программе — Recommended не имеет смысла) + JSON-LD.
- **product-description**: только FAQ + JSON-LD (Anthropic affiliate уже встроен в виджет).
- **EN+RU копи FAQ** живут inline в page.tsx — калькулятор-specific, словари не раздувают.

### Волна 3 — Editorial pages (коммиты `f46f48d`, `943cf5d`, `b6158e5`)
`/reviews/[slug]`, `/guides/[slug]`, `/compare/[slug]` доравняны до дизайн-мокапов.

- **ToolStickyCard на /reviews/[slug]** обогащён: добавлен **rating chip + pricing line** strip между brand row и CTA. Editorial rating (frontmatter) > catalog rating (DB).
- **Новый компонент `components/content/RelatedArticles.tsx`** — server component, 3 newest other articles того же типа (reviews/guides), фильтр по локали. Скрывается если empty.
- **/reviews/[slug] + /guides/[slug]** получили `<RelatedArticles>` секцию под body.
- **/compare/[slug] sticky TOC sidebar** — refactor: `Section` primitive получил `bare` prop (skip container-default). Тело страницы обёрнуто в `<div className="container-default"><div grid lg:grid-cols-[1fr_220px]>...`. TOC entries сделаны вручную (9 секций + опциональный use-cases).

### Волна 3 hotfixes (коммиты `6238431`, `233de51`, `e6dfef0`, `0a90636`, `3d24275`, `1babb71`)
После live-проверки юзер отметил 4 косяка + 2 follow-up:

- **`6238431` — RU TOC якоря не работали.** `slugify` (используется в `lib/content/toc.ts`) транслитерирует кириллицу (`Генерируй` → `generiruj`), а `rehype-slug` использует `github-slugger` который **сохраняет кириллицу**. Анкоры не совпадали → клик скроллил наверх. Установлен `github-slugger` как direct dep, `extractToc` переписан на него. EN не пострадало (ASCII слаги одинаковые в обеих библиотеках). **КРИТИЧЕСКАЯ идиома: rehype-slug и extractToc должны использовать одинаковый slugger — иначе TOC ломается на не-ASCII.**
- **`233de51` — два sticky-блока наезжали на /reviews/[slug].** Правая колонка содержала TOC и ToolStickyCard, оба с `lg:sticky lg:top-24`. CSS sticky пинит оба на одной viewport-offset → второй перекрывает первый. Фикс: TableOfContents получил `sticky?: boolean` prop (default true), ToolStickyCard сбросил свой sticky, оба обёрнуты в один `<aside lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto>`.
- **`e6dfef0` — TOC слева на /compare vs справа на /reviews+/guides → переход дёргает глаз.** Юзер захотел consistency. Grid на /compare/[slug] перевёрнут: TOC выставлен в col 2 через `lg:col-start-2 lg:row-start-1`, контент в col 1. Source order сохранён (TOC первый) — на mobile аккордеон появляется в начале body.
- **`0a90636` — гайды gap до TOC шире чем у reviews.** На `<article>` стоял `max-w-[68ch]` (~620px), но grid column был `1fr` — slack между текстом и TOC читался как огромный пустой шов. Снят `max-w` — article теперь заполняет колонку как на /reviews.
- **`3d24275` — клик по логотипу на текущей странице ничего не делает.** App Router NO-OP на same-URL. `Logo` стал client-component с `usePathname` + onClick → `preventDefault` + `window.scrollTo({top:0})` если `pathname === href`. Modifier keys (Cmd/Ctrl/middle-click) не перехватываем — open-in-tab работает. `prefers-reduced-motion` уважается через глобальное CSS правило (omitted `behavior: smooth` явно).
- **`1babb71` — gap на /compare/[slug] чуть меньше чем у reviews+guides.** Был `lg:gap-12` (48px). Стал `gap-10 lg:gap-14` (40/56px) — матчит /reviews и /guides. Mobile gap-10 тоже добавлен (раньше между TOC accordion и первой секцией ничего не было).

### Волна 4 — Edge states + Methodology (коммиты `19dba21`, `e9f628e`)

- **Новый файл `app/not-found.tsx`** — фирменный 404 (server component). Mint→violet gradient text «4·0·4» glyph, warning-yellow status pill, 2 CTA (Back home + Search), 4-card suggestions grid под dashed rule (Email ROI / Klaviyo vs Mailchimp / Latest reviews / Guides). Полный Navbar + Footer. Metadata: `robots: noindex,nofollow`. Locale-aware через `getLocale()`.
- **Новый файл `app/error.tsx`** — фирменный 500 (client component, Next требует для `reset()`). Red→amber gradient «5·0·0», danger pill, Retry button (вызывает reset()) + Back-to-home, optional Reference ID из `error.digest`. Navbar inherited, Footer пропущен (минимум зависимостей в degraded state). Inline EN/RU словарь (нельзя `getDictionary` в client).
- **/methodology rubric** перевёрстан из `<ol>` в 3-колоночную таблицу `Criterion / What it measures / Weight`. EN + RU оба обновлены, weights mint mono right-aligned, header row на bg-muted.

### Волна 5 — Cover image + 404 copy (коммиты `8c3cbb8`, `74ce7e7`, `7a449f1`)

- **Новый компонент `components/content/ArticleCover.tsx`** — 21:9 декоративный gradient strip между ArticleHero и body на /reviews/[slug] и /guides/[slug]. **БЕЗ реальных картинок** — дизайн mockup'а сам по себе gradient-only. Slug-hashed выбор из 6 вариантов (djb2-style hash) даёт каждой статье стабильную color identity между деплоями. Диагональный stripe overlay для текстуры. Pure server component. Когда захочется реальных картинок — добавляется опциональный `imageUrl` prop.
- **404 копи** переписан дважды по фидбеку юзера: финальная версия — `Whoops — looks like somebody took a wrong turn. / Dead link, typo, or a page still stuck in drafts. Here's what's actually live — or search our tools, reviews, and guides 👇`. Emoji 👇 намеренно (точка зрения на CTA-кластер ниже).

### Post-Wave-5 микро-фикс (коммит `771c2d4`)
- **PricingBadge overflow на /tools/[slug] hero.** Pill был `h-7 inline-flex` (одна строка), а `tool.pricing_notes` для judge-me содержит 2 предложения — переполнялось. Hero badge перестал принимать `notes`, длинная заметка рендерится отдельным `<p>` под tagline. Pricing-секция дальше по странице не пострадала (там notes уже отдельным абзацем).

### Операционные таски этой сессии (вне коммитов)

- **BEEHIIV_API_KEY установлен** в `.env.local` + Vercel prod env (старый пустой удалён, новый добавлен, prod деплой redeployed чтобы env подхватился).
- **Beehiiv welcome automation сконфигурирован owner'ом** через Beehiiv UI. Без этой настройки `send_welcome_email: true` в нашем API silent-ignore'ится. Тестовая подписка `rylitlexa@gmail.com` подтверждена через Beehiiv API (status: active).
- **`supabase/seed.sql` ON CONFLICT bug** обнаружен и пофикшен (коммит `fb5fd5f`). Migration 006 поменяла `comparisons.UNIQUE(slug)` → `UNIQUE(slug, language)`, но seed-файл остался на старой схеме → Postgres 42P10 на comparisons-вставках → транзакция полностью rollback (даже tools не садились). Все 3 INSERT'а в секции comparisons теперь `on conflict (slug, language)`.
- **Seed выполнен в Supabase Dashboard SQL Editor** owner'ом. БД теперь содержит **12 tools** (было 7): добавлены recharge / loox / judge-me / smile-io / yotpo.
- **`npm run translate:tools` запущен из сессии** — все 5 новых tools переведены через OpenRouter (claude-haiku-4.5). RU coverage: 12/12.

### Memory pointer (cross-session)

Добавлен файл [memory/project_contact-form-notifications.md](C:\Users\sandeysco\.claude\projects\d--Projects-botapolis\memory\project_contact-form-notifications.md). Контекст: owner намеренно НЕ ставит Resend (1 email-сервис достаточно). Когда дойдёт до /contact feedback flow — настроить Supabase webhook → Telegram/Discord на insert в `contact_submissions`. Не email-нотификация, а чат-пинг.

### Что НЕ сделано намеренно (с обоснованием)

| Что | Почему отложили |
|---|---|
| Resend для transactional email | Beehiiv покрывает newsletter; /contact уведомления на потом через Supabase webhook → Telegram (не email). Не плодить 2 email-сервиса. |
| Real social URLs в Footer (вместо `href="#"`) | Нет @botapolis аккаунтов на X/LinkedIn/GitHub. Одно-строчный fix когда заведёшь. |
| Google OAuth Consent Screen branding | OAuth технически работает; «unverified app» warning не блокирует. Google Cloud Console когда руки дойдут. |
| Stats strip на /methodology (Tools tested 156 / Hours per review ~42h / Stores involved 8 / Vendor edits 0) | Наши реальные числа (6 обзоров) смотрелись бы плохо рядом с дизайн-моковыми «156 tools tested». Вернёмся когда накопится контент. |
| Team grid + Timeline на /about | HANDOFF фиксирует «anonymous operators» политику. Timeline не имеет реальных вех (проект запущен май 2026). |
| Real cover images поверх gradient'а на /reviews + /guides | ArticleCover сейчас generates per-slug gradient (визуально матчит mockup). Реальные фото — контентная работа на потом; ArticleCover примет опциональный `imageUrl` prop. |

### Backup tags сессии 14 мая 2026

Все pushed в origin:
- `stable-2026-05-14-pre-wave1` — состояние до Wave 1 (homepage секции)
- `stable-2026-05-14-pre-wave2` — до Wave 2 (tool pages Recommended+FAQ)
- `stable-2026-05-14-pre-wave3` — до Wave 3 (editorial pages)
- `stable-2026-05-14-pre-hotfix1` — до Wave 3 hotfix'ов
- `stable-2026-05-14-post-wave3-hotfix` — после hotfix'ов, до Wave 4
- `stable-2026-05-14-pre-wave4` — до Wave 4 (edge states + methodology)
- `stable-2026-05-14-pre-mobile-fix` — до Wave 6 (mobile audit)

Откат любого блока: `git reset --hard <tag> && git push --force-with-lease origin main`.

---

## 🆕 Wave 6 — Mobile audit + LiveNumbers + Scroll reveal (`771c2d4` → `75be74a`, 15 мая 2026)

Сессия по жалобам с iPhone Safari: дёрганый скролл, двойные тапы по карточкам, мёртвые CTA на тач, тёмная тема грузится у Light-Mode пользователя. Параллельно — две давно отложенные фичи дизайна: LiveNumber для калькуляторов и Scroll Reveal для секций homepage. 11 коммитов, все в проде.

### Mobile UX + perf round 1 (коммит `ab29a9e`)
Три симптома, один пакет фиксов в `globals.css`:

- **Двойные тапы** — Tailwind v4 ship'ит `hover:` как голый `&:hover`, на тач первый тап «прилипает» hover-state'ом, второй кликает. Переопределил variant: `@custom-variant hover (@media (hover: hover) and (pointer: fine) { &:hover });` — одна строка чинит 49 файлов. Native CSS `:hover` правила (CTA shimmer в §7) ЭТО НЕ задевает — там нужно вручную гейтить или дублировать через `:active`.
- **Глобальный `touch-action: manipulation`** + `-webkit-tap-highlight-color: transparent` для `a, button, [role="button"], input, select, textarea, label` — снимает iOS legacy 300 ms click delay и убирает синюю вспышку, заменяя на наш `:active`.
- **CTA «мёртвая» на тач** — shimmer триггерился только на `:hover/:focus-visible`. Добавил `:active` к селектору `.btn-cta::before` и к hover-lift'у, плюс `filter: brightness(1.08)` на `:active` для tactile pop под 100 ms. `transition` теперь учитывает `filter`.
- **Scroll lag в Safari**: `transition: backdrop-filter` на header — дорогущая анимация blur на каждом scroll-trigger, убрана из transition-списка в `Navbar.tsx`. `scroll-behavior: smooth` на html гейтнут к `@media (min-width: 768px) and (hover: hover)` — на iOS native momentum не дерётся со smooth re-targeting.
- **Hero atmospheric blobs** — `transform: translateZ(0)` + `will-change: transform`, размер ужат с 700 px → 420 px на mobile (blur 100 → 60 px).

### Mobile perf round 2 (коммит `e866338`)
После round 1 в Safari остался лёгкий residual stutter — добил тем что снял **все** backdrop-filter и большие blur'ы с touch-viewport'ов:

- `.surface-glass` на mobile теперь полностью **opaque** (`background: var(--bg-base)`), без `backdrop-filter` вообще. Богатый blur(16) saturate(1.5) восстановлен только в `@media (min-width: 1024px) and (hover: hover)` — desktop с реальным pointer'ом.
- Hero blobs → `hidden lg:block`. На 375 px они и так едва читались из-за `overflow: hidden` clip'а, профита 0, GPU-цена была.

После этого homepage на iPhone Safari едет на нативном refresh-rate.

### Theme: defaultTheme="system" + revert workaround (`f47ce47` → `27e7db4`)
- Owner спросил «почему у меня тёмная грузится». Корень: `defaultTheme="dark"` в [layout.tsx](app/layout.tsx) — `enableSystem` сам по себе только добавляет «system» как выбираемую опцию, дефолт не меняет. Поменял на `defaultTheme="system"`.
- Возникла аномалия: Chrome iOS incognito на Light-Mode iPhone стабильно возвращал `matchMedia('(prefers-color-scheme: dark)').matches = true`. Параллельный замер на Safari Private того же устройства показал корректный `light=true`. Stable across t0/t250/t1000 — не race, не a11y override. UA отличается (Chrome подсовывает `iPhone OS 26_4_2`, Safari — реальный `18_7`). **Это поведение Chrome iOS в incognito** (likely anti-fingerprint mask), не наш баг.
- Сначала добавил targeted CriOS workaround в inline-script (cd275bf), потом owner-decided **откатил** (27e7db4): «если браузер врёт про prefers-color-scheme, это его проблема». Сайт остаётся на pure `defaultTheme="system"` без особых случаев. Для owner'а лично — у него в обычном Chrome iOS storage уже сохранён `theme=light`, так что эту аномалию он видит только в incognito.
- Диагностический оверлей `<ThemeDebugger />` создан, использован, удалён. Если когда-то опять — восстановить из git show `884764b:components/shared/ThemeDebugger.tsx`. Активируется через `?debug-theme=1`.

### Phase 4 — LiveNumber primitive (коммит `a9d21f7`)
Новый универсальный компонент `components/ui/LiveNumber.tsx`. Порт из `New_Design/` + расширение:

- API: `value`, `prefix`, `suffix`, `duration` (default 400 ms), `decimals`, `locale`, `formatter` (escape hatch), **`startOnView`** (IntersectionObserver-based — анимация запустится только когда элемент попадёт в viewport, нужно для hero ниже fold на мобилке).
- Поведение: при изменении `value` tween'ит от previous → new значению через `requestAnimationFrame` + ease-out-expo. Reduced-motion users получают snap-to-final.
- `tabular-nums` по умолчанию — ширина не дёргается между digits.
- Подключён в трёх местах:
  - **Hero DemoWidget** (`app/page.tsx`) — `$4,410` count-up'ит от $0 за 1000 ms при попадании в viewport (`startOnView`).
  - **EmailRoiCalculator** — 5 чисел tween'ятся на каждый slider-change (monthly revenue, annual, platform cost, ROI%, revenue per subscriber). Метрика `Metric` принимает теперь `React.ReactNode` вместо `string`, чтобы пропускать `<LiveNumber/>` как value.
  - **AiCostComparator** — monthly cost per model в bar chart + per-item recommended cost. Decimal precision flips на $10 ($0.42 vs $47).
- Намеренно НЕ применён в `ProductDescriptionGenerator` (выход текст, не число) и в Featured Tools / Tools index (`item.value` — статичные шаблонные строки типа «Up to $50k/mo», не реальные числа).

### Phase 5 — Scroll Reveal (5 коммитов, v1 → v4)

Долгая эволюция:

- **v1 (`cfac35c`)** — CSS `animation-timeline: view()` с `@supports` фолбеком. На Safari iOS 18 не работает (Apple обещают в 26), на Chrome desktop — должно было. По факту owner-test показал что **нигде не работает заметно** — корень в browser inconsistencies.
- **v2 (`2dc58de`)** — переключение на JS IntersectionObserver через `components/shared/ScrollRevealController.tsx`. Один observer на всю страницу (mounted в layout), `.scroll-reveal` → `.in-view` flip с `transition: opacity, transform 600ms`. CSS гейтнут на `.js-scroll-reveal-ready .scroll-reveal` через inline-script в `<body>` (anti-flash до hydration).
- **v3.1 (`0ee8c3d`)** — usability tune: 24 px → 56 px translate, 600 ms → 1000 ms duration. Меньшие значения были «технически работают, но глазом не считываются».
- **v3.2 (`5e138e1`)** — критичный фикс: браузер пропускал transition когда invisible state и `.in-view` оказывались в одном frame. Решение: убрал `.js-scroll-reveal-ready` ancestor-гейт (теперь invisible state на `.scroll-reveal` напрямую, SSR уже отдаёт скрытое состояние), плюс **double-rAF** в controller'е (`requestAnimationFrame(() => requestAnimationFrame(...))`) — гарантирует один paint frame в invisible state перед flip'ом. No-JS users защищены через `<noscript><style>` в layout.tsx (force `opacity: 1`).
- **v4 (`75be74a`)** — фикс «пол страницы не подгружается при переходе на homepage через логотип». Корень: layout (и controller внутри) **не перемонтируется** при client-side навигации в Next App Router, useEffect с `[]` запускался ровно один раз на первой странице. На последующих route swap'ах новые `.scroll-reveal` секции оставались `opacity: 0` навсегда. Решение: `usePathname()` + dep на pathname в useEffect — observer перестраивается на каждом route change. Selector `:not(.in-view)` — чтобы возврат через browser back не перезапускал fade.

### Tooling: tsconfig exclude (`6bc8267`)
Добавил `"New_Design"` в `tsconfig.json` exclude. До этого `npx tsc --noEmit` сыпался на ошибках из reference-папки (`Github`/`Linkedin`/`Twitter` не экспортируются из текущей lucide-react; `geist/font/*` нет в наших deps). Build Next.js эту папку игнорил и так — это был чисто dev-experience fix.

### Новые идиомы / locked items (Wave 6)

| Что | Где | Почему locked |
|---|---|---|
| `@custom-variant hover (@media (hover: hover) and (pointer: fine) { &:hover });` | [globals.css:41](app/globals.css#L41) | Переопределяет дефолтное поведение `hover:` для всего проекта. Не убирай, иначе двойные тапы вернутся на iOS. |
| `touch-action: manipulation` на всех интерактивах | [globals.css](app/globals.css) §4 base | Снимает 300 ms tap delay на iOS. Без него — мёртвые кнопки на тач. |
| `.surface-glass` opaque на mobile | [globals.css](app/globals.css) §6 | Mobile audit показал что glass на mobile = scroll lag. Blur только на `(min-width: 1024px) and (hover: hover)`. |
| `.btn-cta:active::before` shimmer trigger | [globals.css](app/globals.css) §7 | CTA на тач без `:active` была мёртвой. Не убирай `:active` из селектора. |
| `<LiveNumber/>` primitive | [components/ui/LiveNumber.tsx](components/ui/LiveNumber.tsx) | Стандарт для числовых результатов в калькуляторах и hero. Используй везде где число меняется по input или count-up'ит при появлении. |
| `<ScrollRevealController/>` + `.scroll-reveal` class | [components/shared/ScrollRevealController.tsx](components/shared/ScrollRevealController.tsx) + [globals.css](app/globals.css) §8 | Один controller на всю app. `.scroll-reveal` ставится на secciи которые fade-in'ятся. Когда добавляешь новые `.scroll-reveal` — controller сам подхватит на следующем route change. |
| `defaultTheme="system"`, без workaround'ов для misreporting браузеров | [layout.tsx](app/layout.tsx) | Owner-decided: респектим то что говорит matchMedia. Если Chrome iOS incognito врёт — это его проблема. |
| `<noscript>` style block для scroll-reveal | [layout.tsx](app/layout.tsx) | No-JS users (включая crawlers) получают `opacity: 1` принудительно. Не удаляй, иначе боты видят скрытые секции. |

### Что НЕ сделано в Wave 6 (намеренно)

| Что | Почему |
|---|---|
| Stagger между карточками внутри секции для scroll-reveal | Принципиальное решение — section-level fade достаточно, per-card stagger требует N timeline instances + animation-delays, на homepage с 4-5 секциями это балон композитной работы. |
| LiveNumber в ProductDescriptionGenerator | Выход — текст, числовых результатов нет. Анимировать значение слайдера ради значения — мишура. |
| LiveNumber в Featured Tools / Tools index карточках | Значения там — статические шаблонные строки («Up to $50k/mo»), не реальные числа. |
| Hard Light theme default | Owner откатил variant cd275bf: spec остаётся «по системе», независимо от того что Chrome iOS отдаёт в incognito. |
| Targeted Chrome-iOS workaround (CriOS bootstrap script) | Owner-decided: 27e7db4 убрал. Меньше surface area, меньше special cases. |

### Коммиты Wave 6

```
75be74a fix(motion): re-run scroll-reveal observer on every client-side navigation
5e138e1 fix(motion): scroll-reveal v3 — drop ancestor gate, force rAF frame
0ee8c3d fix(motion): scale up scroll-reveal so it's actually visible
2dc58de fix(motion): switch scroll-reveal to JS IntersectionObserver
cfac35c feat(motion): CSS scroll-reveal for homepage sections
27e7db4 revert(theme): drop Chrome-iOS workaround — owner-decided
a9d21f7 feat(ui): LiveNumber primitive — count-up + tween for hero + calculators
e866338 perf(mobile): strip last GPU-heavy effects on touch viewports
f47ce47 fix(theme): honour OS preference for first-time visitors
ab29a9e fix(mobile): kill iOS scroll-lag + double-tap + dead CTA on touch
6bc8267 chore(tsconfig): exclude New_Design/ from typecheck
```

(плюс ныне-удалённые `7435bf4` ThemeDebugger v1, `884764b` ThemeDebugger v2, `494d373` Chrome-iOS workaround, `cd275bf` hard light default — все откачены или сняты)

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
│   ├── not-found.tsx, error.tsx  # branded 404 + 500 pages (Wave 4, май 2026)
│
├── components/
│   ├── analytics/             # PostHogProvider, PlausibleScript, PageViewEvent, ScrollMilestone
│   ├── auth/                  # LoginForm
│   ├── content/               # MDX + editorial components — Callout, ProsConsList, AffiliateButton, ArticleHero, ArticleCover, TableOfContents, RelatedArticles, TrackedAffiliateLink, mdx-components
│   ├── marketing/             # NewsletterForm, ContactForm
│   ├── nav/                   # Navbar, Footer, Logo, ThemeToggle, LanguageSwitcher
│   ├── shared/                # UserMenu, SearchPageClient, TurnstileGate
│   ├── nav/NavbarSearch.tsx   # Inline Amazon-style search в шапке (lg+)
│   ├── tools/                 # 3 calculator widgets + ToolCard, ToolLogo, ComparisonTable, RecommendedTools, ToolFaq, etc.
│   └── ui/                    # shadcn primitives (Button, Sheet, Dialog, ...)
│
├── content/                   # MDX источник
│   ├── reviews/{en,ru}/       # 6 EN + 6 RU
│   └── guides/{en,ru}/        # 4 EN + 4 RU
│
├── lib/
│   ├── analytics/events.ts    # типизированный track() helper для PostHog
│   ├── content/               # MDX loader, TOC, reading-time, slug.ts (canonical),
│   │                          # rating.ts (MDX→DB resolver), pseo.ts (compare narratives)
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
├── next.config.ts             # CSP (+ wasm-unsafe-eval), security headers, route-specific
│                              # cache-control для /pagefind/*, embed-friendly headers для
│                              # email-roi-calculator, outputFileTracingIncludes для content/
├── scripts/
│   ├── build-search-index.ts  # Pagefind index builder (runs postbuild)
│   ├── translate-content.ts   # EN→RU MDX translator (OpenRouter)
│   ├── sync-ratings.ts        # MDX rating → DB sync (волна 1)
│   └── content-validator.ts   # pre-commit schema + rating drift check (волна 1)
├── supabase/
│   ├── migrations/            # 001 initial, 002 contact_submissions,
│   │                          # 003 sync_tool_ratings, 004 canonical_compare_slugs
│   └── seed.sql               # 12 tools + 3 comparisons (после reload)
├── tests/
│   ├── unit/                  # Vitest: utils.test, content.test, slug.test — 32 tests
│   └── e2e/README.md          # Playwright план (не установлен — см. README)
├── vercel.json                # 2 weekly crons
├── .env.example               # template — реальные значения в Vercel encrypted
│
└── New_Design/                # 🎨 АКТУАЛЬНЫЙ дизайн-проект v.026 (источник правды)
    ├── README.md              # ← Читай ПЕРВЫМ если делаешь правки по дизайну
    ├── app/globals.css        # design tokens (mint+violet OKLCH, type, motion)
    ├── app/components/        # 32 reference React-компонента
    ├── mockups/               # HTML мокапы всех страниц + index.html
    └── docs/                  # motion-specs.md / brand-book.html / style-guide.html
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
- Pagefind static index (~700KB) — `/search` страница + inline-форма в навбаре (Cmd+K фокусит, не открывает модалку). Регенерится postbuild.

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
- Pagefind search — отдельная страница `/search` + inline-форма в шапке (Amazon-style), индекс собирается postbuild (~10 RU + 23 EN записей)
- Turnstile widget на newsletter + contact — gate active
- 2 weekly Vercel cron'a (refresh-tool-data, digest-affiliate-clicks)

### ⚙️ Dev experience
- `.env.example` зачекинен с группами + комментариями
- Type-safe env через `@t3-oss/env-nextjs`
- 25 unit-тестов на Vitest (`npm test`) — green
- Playwright scaffolding документирован в `tests/e2e/README.md`
- Supabase types-gen команда задокументирована (handwritten остаются по дизайну)

---

## 🛡 Backup & Recovery (май 2026 — настроено)

Полная карта точек возврата и сценарии восстановления — в [BACKUP.md](BACKUP.md). Кратко:

- **Код + контент** → git tag `stable-*` в origin. Якорные точки: `stable-2026-05-13` (до Волны 3), `stable-2026-05-14-pre-wave1` / `-pre-wave2` / `-pre-wave3` / `-pre-hotfix1` / `-post-wave3-hotfix` / `-pre-wave4` (волны дизайн-аудита 14 мая). Откат: `git reset --hard <tag> && git push --force-with-lease origin main`.
- **Билд** → Vercel Deployments hold all previous; rollback за 30 сек через Promote to Production в UI.
- **БД (Supabase public schema)** → `.github/workflows/backup-db.yml` гонит `pg_dump` через Docker каждый понедельник 04:00 UTC. Дампы лежат как artifacts 90 дней. Восстановление: скачать → `gunzip` → `psql $DB_URL < file.sql`. Исключены Supabase-managed схемы (auth/storage/realtime/vault/supabase_functions) — они часть их живой системы, restore сломал бы.
- **API ключи** → НЕ бэкапим. Они живут в своих сервисах-источниках (Supabase, OpenRouter, Cloudflare, etc.), это их естественный бэкап. Vercel хранит env vars как Sensitive — после сохранения значения недоступны даже владельцу (защита от компрометации Vercel-аккаунта). При восстановлении проекта берём ключ из источника. Карта «какой ключ → где взять» — в BACKUP.md.
- **Пароли + 2FA от аккаунтов сервисов** → в менеджере паролей пользователя. Это то, без чего к источникам ключей не подобраться. Recovery codes 2FA — отдельно сохранить.

**Branch protection / PR-flow намеренно НЕ настроены.** Это сознательное решение владельца: для соло-флоу agent+owner это тормоз без выгоды. Точки возврата заменяют процесс-перестраховку.

Регламент: перед большой правкой — новый stable-tag. Раз в месяц — скачать последний artifact локально (на случай если GitHub упадёт). После любого нового env var — дописать в [lib/env.ts](lib/env.ts), [.env.example](.env.example), [BACKUP.md](BACKUP.md).

---

## 🌍 i18n регламент (после mai 2026 audit)

Локализация — три источника контента + три скрипта, в одном паттерне.

### Где какой контент живёт

| Тип | Источник EN | Источник RU |
|---|---|---|
| UI-строки (nav, buttons, hero copy) | `locales/en.json` | `locales/ru.json` |
| Long-form articles (reviews, guides) | `content/{type}/en/*.mdx` | `content/{type}/ru/*.mdx` |
| Tool data (name, tagline, pros, cons) | `tools` table — колонки `name`, `tagline`, … | `tools` table — колонки `name_ru`, `tagline_ru`, … (migration 005) |
| Comparisons (verdict, custom_intro) | `comparisons` table — строки с `language='en'` | те же поля, но в строках с `language='ru'`. Один slug = две строки (composite unique slug+language, migration 006) |

### Скрипты (всё через OpenRouter / Claude Haiku 4.5)

```bash
# MDX — husky pre-commit hook делает это автоматом на каждый commit EN MDX
npm run translate -- --type reviews --slug klaviyo-review-2026     # один файл
npm run translate:missing                                          # все EN без RU twin

# DB · tools (migration 005)
npm run translate:tools                  # все tools у которых хоть одно _ru пусто
npm run translate:tools -- --slug X      # один tool
npm run translate:tools -- --force       # переписать существующие _ru

# DB · comparisons (migration 006)
npm run translate:comparisons            # клонирует EN-строки в RU twin
npm run translate:comparisons -- --slug klaviyo-vs-mailchimp
npm run translate:comparisons -- --force # переписать существующие RU
```

Все три скрипта **idempotent** — повторный запуск без `--force` пропустит уже переведённое.

### Что делать при добавлении нового контента

| Что добавляешь | Триггер перевода |
|---|---|
| Новый MDX review / guide | husky pre-commit hook сам сгенерит RU. Если нет — `npm run translate -- --type X --slug Y` |
| Новый tool в БД (SQL insert, seed.sql) | После insert: `npm run translate:tools` — переведёт только новые tools (у которых _ru пусто) |
| Новый comparison | После insert: `npm run translate:comparisons` — создаст RU twin |
| Новый UI-ключ | Дописать вручную в `locales/en.json` и `locales/ru.json` |

### Read-side fallback паттерн

В коде везде используется helper из `lib/content/tool-locale.ts`:

```typescript
const tool = localizeTool(rawTool, locale)   // ToolRow → ToolRow с подменёнными полями
// или для catalog cards с Pick<>:
const tool = localizeToolPartial(rawTool, locale)
```

Helper читает `tool.name_ru ?? tool.name`, `tool.pros_ru ?? tool.pros`, etc. Если `_ru` пусто — silently показываем EN. Это значит **новый tool без перевода** всё равно работает на RU-странице, просто текст останется EN до запуска `translate:tools`.

### Идиомы / соглашения переводов

В `scripts/translate-{content,tools,comparisons}.ts` SYSTEM_PROMPT задаёт стиль:
- Informal Russian, "ты"-form
- Brand names в EN (Klaviyo, Shopify, Mailchimp, ...)
- Acronyms в EN (SMS, AI, ROI, MRR, TCPA, ...)
- Числа и валюты verbatim ($48k, 8.4/10, 200ms)

Если AI-перевод оказался корявым — отредактируй RU MDX вручную и поставь `manuallyTranslated: true` в frontmatter (husky-хук уважает флаг). Для tool/comparisons rows — отредактируй `_ru` поля или RU-строку напрямую в Supabase SQL Editor; повторный `translate:tools` без `--force` их не тронет.

### Миграции БД к этому регламенту (запустить один раз)

| Migration | Что делает | Когда запускать |
|---|---|---|
| `005_tools_ru_columns.sql` | ALTER TABLE tools ADD COLUMN name_ru / tagline_ru / description_ru / pros_ru[] / cons_ru[] / best_for_ru | Один раз в Supabase Dashboard → SQL Editor |
| `006_comparisons_language_unique.sql` | Меняет UNIQUE(slug) на UNIQUE(slug, language) — позволяет двум compare-строкам делить slug если разные language | Один раз там же |

После обеих миграций — запустить `npm run translate:tools && npm run translate:comparisons` (нужны `.env.local` с `OPENROUTER_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`).

---

## 🛠 TODO на пользователе (опционально, не блокирует)

| # | Что | Статус / шаг |
|---|---|---|
| 1 | ~~**Re-run `supabase/seed.sql`** — добавит 5 новых tools~~ | ✅ **Сделано 14.05.2026**. БД содержит 12 tools, RU coverage 12/12. |
| 2 | ~~🔴 **Получить `BEEHIIV_API_KEY`** — welcome email pipeline~~ | ✅ **Сделано 14.05.2026**. Ключ установлен (`.env.local` + Vercel prod), welcome automation настроен через Beehiiv UI, тестовая подписка прошла. |
| 3 | **Decision про Resend** | ✅ **Решено 14.05.2026**: НЕ ставим. Beehiiv покрывает newsletter; /contact уведомления на потом → Supabase webhook → Telegram/Discord (см. memory `project_contact-form-notifications.md`). 1 email-сервис, 0 SMTP. |
| 4 | **Реальные social URLs** — когда заведёшь @botapolis на X/LinkedIn/GitHub | Footer уже рендерит иконки с `href="#"` placeholder (Wave 1 сделал это видимым). Когда URL появятся: правка `components/nav/Footer.tsx` (3 строки в массиве social). Бонусом — обнови `lib/seo/schema.ts` `generateOrganizationSchema().sameAs`. |
| 5 | **Google OAuth Consent Screen branding** | Не блокирует. OAuth работает. console.cloud.google.com → APIs & Services → OAuth consent screen + Google Search Console для domain verification. |
| 6 | **Stats strip на /methodology** (Tools tested / Hours per review / Stores involved / Vendor edits) | Дизайн просит, но наши реальные числа сейчас (6 reviews, 1-2 stores) смотрелись бы плохо. Вернуться когда накопится 20+ reviews. |
| 7 | **Real cover images** для /reviews и /guides | Сейчас работает `ArticleCover` с per-slug gradient'ом (визуально совпадает с дизайн-мокапом). Когда захочется реальных фото: добавить опциональный `imageUrl` prop в компонент + frontmatter поле + источник картинок. |
| 8 | **Supabase webhook → Telegram/Discord** для /contact form | Когда дойдёт до feedback flow. Инструкция в [memory/project_contact-form-notifications.md](.claude/projects/d--Projects-botapolis/memory/project_contact-form-notifications.md). 5 минут настройки, 0 нового кода. |

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

### Vercel CLI env pull ЗАТИРАЕТ значения пустыми кавычками
На этом аккаунте `npx vercel env pull .env.local` (и `vercel link`) переписывает `.env.local` форматом «по своему», подставляя `KEY=""` вместо реальных encrypted-секретов. Это известная проблема с проектом — **и реально срабатывала** в волне 3, когда юзеру пришлось восстанавливать ключи из бэкапа папки. **Не запускай эти команды без бэкапа `.env.local`.** Если уже случилось — восстанавливать руками из Vercel UI → Settings → Environment Variables → Reveal каждый ключ. Список ключей которые проект ожидает — в [BACKUP.md «Где живут ключи»](BACKUP.md).

Симптомы что это произошло: `OPENROUTER_API_KEY not set` при запуске скрипта; локальный билд жалуется на `NEXT_PUBLIC_SUPABASE_URL`. На проде Vercel вкатывает env правильно из своего UI — это **только** про локальные скрипты + локальный билд.

Workaround на одну команду (без переписывания `.env.local`):
```powershell
$env:OPENROUTER_API_KEY="..."
node --experimental-strip-types scripts/foo.ts
```
Но **БЕЗ `--env-file=.env.local`** — иначе пустой файл переопределит твой `$env:` обратно в `""`.

### `.env.local` НЕ загружается Node автоматически
Поэтому скрипты `translate` и `search:index` идут с флагом `--env-file=.env.local`. Если пишешь новый скрипт, добавляй тот же флаг.

### Pagefind output gitignored
`/public/pagefind/` НЕ в репо — генерится в postbuild (`npm run search:index`). На Vercel это запускается автоматически. Локально — после `npm run build`.

### Pagefind `entry.json` ОБЯЗАН быть `Cache-Control: no-store`
Раз в N деплоев Vercel CDN залипает на старом `pagefind-entry.json`. Этот manifest перечисляет имена шардов с хэшами в названии (`pagefind.en_<hash>.pf_meta`). Когда CDN отдаёт прошлый manifest, Pagefind идёт за шардами по старым хэшам → 404 → «Couldn't load the search index». Защита прибита в `next.config.ts` через явный `Cache-Control: no-store, must-revalidate` для `pagefind-entry.json`, `pagefind.js`, `pagefind-worker.js`. **НЕ убирай эти headers** — стандартный `max-age=0, must-revalidate` Vercel почему-то не уважает для `/public/`.

### iOS Safari зумит input если `font-size < 16px`
Любой `<input>` с computed font-size < 16px триггерит auto-zoom на iPhone при фокусе. Зум сдвигает viewport, и страница становится «панабельной» горизонтально. **Минимум 16px на все video-input'ах на мобиле.** На /search входной инпут `text-[16px] lg:text-[17px]`. Если будешь делать новые формы — соблюдай.

### Глобальный `overflow-x: clip` на html+body
В `globals.css`. Защитный слой против любого случайного горизонтального overflow. `clip` а не `hidden` — потому что `hidden` создаёт scroll container и ломает sticky-навбар. Не трогай.

### Footer social SVG функции «unused»
`TwitterMark`, `LinkedinMark`, `GithubMark` в `components/nav/Footer.tsx` определены, но не рендерятся (Block F убрал placeholder URLs). ESLint может предупредить — это OK, не блокирует. Когда юзер даст реальные URL, расщёлкни закомментированный блок в Footer + удалит warning.

### Inner hollow на favicon
`#0A0A0B` solid fill внутри правого node — это намеренно (см. комменты в `app/icon.tsx`). На transparent canvas в 32×32 favicon выглядит как точка размером ~3px — индистинг от полной прозрачности, но дешевле в реализации через next/og (нет mask support).

### MDX `blockJS: false` обязательно
В `lib/content/mdx.ts`. Без этого MDX стрипает JSX-prop expressions типа `pros={[...]}` и компоненты падают на `.length` undefined. Не трогай эту настройку.

### Vercel cron не активен в Hobby tier (если такой)
Если деплой на Hobby plan — crons из `vercel.json` могут не выполняться. На Pro+ работает. Проверить через Vercel Dashboard → Settings → Crons.

### Base UI 1.4 — два разных error #31
В production-mode оба throws показывают один и тот же `Base UI error #31; visit https://base-ui.com/production-error?code=31` (formatErrorMessage minified). На самом деле это **два разных source location**:
1. **`render` prop валидация** — Trigger / Item / Close требуют render-prop'а который резолвится в native `<button>`. Если у тебя `render={<CustomButton>}` или `render={<Link>}` — нужен `nativeButton={false}` рядом с `render`. Текущие места — UserMenu, Navbar Sheet, Dialog/Sheet Close-X.
2. **`GroupLabel` без `Group`** — `<DropdownMenuLabel>` (= `MenuPrimitive.GroupLabel`) обязан жить внутри `<DropdownMenuGroup>` (= `MenuPrimitive.Group`). Иначе context-provider null → throw. См. `node_modules/@base-ui/react/esm/menu/group/MenuGroupContext.js`.

Если когда-то #31 снова — копай в одну из этих сторон. Stack trace в minified bundle не покажет имена.

### PostHog ассеты на отдельном CDN — `us-assets.i.posthog.com`
В январе 2026 PostHog разделил ingest (`us.i.posthog.com`) и assets (`us-assets.i.posthog.com`). В нашем CSP **оба** должны быть в `script-src` + `connect-src`, иначе snippet падает в unhandled rejection прямо на init. Если в будущем посмотришь Console и увидишь «Refused to connect ... us-assets» — добавь домен в обе директивы next.config.ts.

### Cloudflare Turnstile iframe шумит в Console
Frame `flexible?lang=auto` от Cloudflare генерирует кучу TrustedHTML/TrustedScript/xr-spatial-tracking violations внутри **своего** sandbox iframe. Это **не наш код, не наш CSP**, sub-frame документ имеет свой policy. Юзеры этого не видят. В DevTools фильтруй `-flexible` в Console filter если мешает.

### NewsletterDialog vs NewsletterForm — две поверхности, один Form
Footer-форма (mounted с страницей) ловит Turnstile-token заранее. Navbar-modal mounts widget только при open Dialog → 500ms-2s race window. NewsletterForm v2 ждёт token до 5 sec через ref-polling (`turnstileTokenRef`), потом sends. Если правишь логику — используй **ref** для значений которые могут обновиться внутри async handler (state читается из stale closure).

### `app/ru/compare/[slug]/page.tsx` существует
До волны 3 этот файл отсутствовал — `/ru/compare/<slug>` возвращал 404, хотя `/ru/compare` index ссылался туда. Сейчас файл — thin re-export от `@/app/compare/[slug]/page`. Если будешь добавлять новые RU маршруты типа `/ru/blog/[slug]` — не забудь создать thin re-export файл, route group `(marketing)` не используется в этом проекте.

### Migration 005 и 006 — нужны на каждом Supabase environment
Если когда-то восстанавливаешь Supabase проект с нуля (или клонируешь в новый env) — обе миграции **обязательны**. Без 005 `translate:tools` упадёт на UPDATE неизвестных колонок; без 006 `translate:comparisons` упадёт на duplicate-key violation. См. порядок применения в [BACKUP.md «Сценарий 4»](BACKUP.md).

### Tailwind v4 `hover:` без media-gate (Wave 6)
Tailwind v4 ship'ит `hover:` как голый `&:hover`, **без** оборачивания в `@media (hover: hover)`. На тач-устройствах это значит первый тап вешает hover-state visible, второй кликает — двойные тапы. Override в [globals.css:41](app/globals.css#L41) (`@custom-variant hover ...`) гейтит ВСЕ `hover:*` утилиты к `(hover: hover) and (pointer: fine)`. **Не убирай.** Native CSS `:hover` правила (CTA shimmer, ad-hoc стили в компонентах) переопределение НЕ задевает — там либо гейти ручную через `@media`, либо дублируй через `:active`.

### `.btn-cta` shimmer / lift на тач — через `:active`
В Wave 6 CTA получил `:active` trigger на shimmer (`globals.css §7`) и `filter: brightness(1.08)` на active. Без этого CTA чувствовалась мёртвой на iPhone (hover не наступает на тач). Если правишь — не сноси `:active` из селекторов `.btn-cta::before` и `.btn-cta:active`. Hover-lift при этом гейтнут к `@media (hover: hover) and (pointer: fine)` — на тач он не нужен.

### `.surface-glass` на mobile полностью opaque
Wave 6 audit показал что glass-навбар (`backdrop-filter: blur(...)`) — главный источник scroll lag в Safari iOS. На mobile + tablet-portrait surface рендерится как solid `var(--bg-base)` без blur вообще. Богатый blur(16) saturate(1.5) восстанавливается только в `@media (min-width: 1024px) and (hover: hover)`. **Не верни blur на mobile без замеров perf** — это компромисс ради buttery скролла.

### `scroll-behavior: smooth` на html — только на desktop+hover
Wave 6 закрыл `scroll-behavior: smooth` к `@media (min-width: 768px) and (hover: hover)`. На iOS Safari он дерётся с нативным momentum scroll'ом — пользователь флик'ает, engine хочет coast'ить, но smooth re-targeting clamp'ит frame-by-frame → видимый stutter. Если когда-то нужен smooth scroll на mobile — делай imperative через `el.scrollIntoView({ behavior: 'smooth' })`, не возвращай глобально.

### ScrollRevealController re-runs на каждой client-side навигации
[components/shared/ScrollRevealController.tsx](components/shared/ScrollRevealController.tsx) использует `usePathname()` как dep в `useEffect`. Без этого `.scroll-reveal` секции, отрендеренные ПОСЛЕ первого mount layout'а (а это все client-side route swaps в App Router), оставались `opacity: 0` навсегда. Selector `:not(.in-view)` — чтобы возврат через browser back не перезапускал fade. **Не пиши IO в layout как `[]` dep** — половина страниц перестанет показываться.

### Scroll-reveal требует double-rAF перед `.in-view` flip
В controller'е есть `function reveal()` который оборачивает `classList.add("in-view")` в **два вложенных** `requestAnimationFrame`. Это потому что браузер skip'ает CSS transition если invisible state и target state наблюдаются в одном frame'е — нужно гарантировать что invisible state хоть раз paintнут. Без double-rAF на первом mount controller fade просто не виден. **Не упрощай до одного rAF** — был проверено experimentally, не работает.

### Theme: `defaultTheme="system"` без workaround'ов для misreporting браузеров (Wave 6)
Chrome iOS в incognito стабильно возвращает `prefers-color-scheme: dark` независимо от iOS Display settings (likely anti-fingerprint mask — Safari на том же устройстве возвращает правильное значение). Owner-decided: **не лечим в коде**. Сайт уважает то что говорит matchMedia, точка. Если будут жалобы от других пользователей — push back: «эта зависит от настроек Chrome iOS, не от сайта». Workaround есть в git history (`cd275bf` и `494d373`) если когда-то владелец изменит решение.

### `<noscript>` style block для scroll-reveal — не удаляй
В [layout.tsx](app/layout.tsx) есть `<noscript><style>.scroll-reveal{opacity:1!important;transform:none!important;}</style></noscript>`. Без него JS-off пользователи (включая некоторых crawlers / botов) видят blank секции на homepage — `.scroll-reveal` в дефолтном состоянии имеет `opacity: 0`. **Не удаляй**.

### LiveNumber `startOnView` — только для статичных значений
В [components/ui/LiveNumber.tsx](components/ui/LiveNumber.tsx) есть prop `startOnView` для отложенного count-up'а через IntersectionObserver. Используй ТОЛЬКО когда значение **статично** (как `$4,410` в hero DemoWidget). Для калькуляторов где `value` меняется на каждый slider-change — БЕЗ `startOnView`, иначе на первый change tween не сработает (controller ждёт viewport-входа, а пользователь уже двигает слайдер).

### ThemeDebugger удалён, но есть в истории
Wave 6 диагностировал iOS theme аномалию через `<ThemeDebugger />` overlay (активировался через `?debug-theme=1`). Удалён после диагноза. Если когда-то опять нужен — `git show 884764b:components/shared/ThemeDebugger.tsx > components/shared/ThemeDebugger.tsx`, плюс импорт + JSX в layout.

---

## 📋 Cheat sheet команд

```bash
# Локальная разработка
npm run dev                              # next dev на 3000
npm run build                            # next build + pagefind index
npm test                                 # vitest run (32 tests — utils + content + slug)
npm run test:watch                       # vitest watch mode
npx tsc --noEmit                         # typecheck

# Контент
npm run translate:missing                # все EN без RU twin (manual fallback — обычно husky-хук делает это сам на коммите)
npm run translate -- --type reviews --slug klaviyo-review-2026  # один файл
npm run translate -- --type reviews --slug X --force            # перезаписать

# Pagefind
npm run search:index                     # перестроить индекс /public/pagefind/

# Рейтинги MDX↔DB (новое в волне 1)
npm run sync:ratings                     # dry-run: показать расхождения MDX vs DB
npm run sync:ratings:apply               # пушнуть MDX → DB (нужны Supabase creds)
npm run validate:content                 # ручной запуск pre-commit validator

# Vercel
npx vercel ls --scope alf-unit-bot1                # last deploys
npx vercel env ls --scope alf-unit-bot1 production  # list env
npx vercel env add KEY production                  # добавить
npx vercel env rm KEY production --yes             # удалить
npx vercel logs <deployment-url>                   # runtime logs

# Git
git push origin main                     # триггер Vercel deploy
git log --oneline -15                    # последние коммиты
git tag -l "stable-*" -n1                # все известные точки восстановления

# Backups (см. BACKUP.md за деталями)
git tag -a stable-$(date +%Y-%m-%d) -m "..."  # новая точка для кода+MDX
git push origin --tags                          # запушить тэги
gh workflow run backup-db.yml --ref main        # триггер дамп БД (нужен gh auth)
```

---

## 📜 Коммиты (базовый `65380d0` → текущий `771c2d4`)

### Дизайн-аудит май 2026 (Wave 1-5 + hotfixes + ops, 17 коммитов)
```
771c2d4 fix(tools): pricing_notes no longer overflows the one-line pill
fb5fd5f fix(seed): comparisons ON CONFLICT now matches Migration 006's composite key
8c3cbb8 feat(content): decorative cover strip on /reviews + /guides slug pages
7a449f1 copy(404): owner-supplied rewrite — tighter, more declarative tone
74ce7e7 copy(404): warmer, playful tone in both EN and RU
e9f628e fix(methodology): rubric renders as a 3-column table, not an ordered list
19dba21 feat(edge): branded 404 + 500 error pages
1babb71 fix(compare): match TOC gap to /reviews + /guides for cross-page consistency
3d24275 feat(nav): logo click scrolls to top when already on the destination page
0a90636 fix(guides): drop article max-w so TOC sits flush like /reviews + /compare
e6dfef0 fix(compare): flip TOC from left to right column for cross-page consistency
233de51 fix(reviews): kill sticky overlap by collapsing two top:24 stacks into one
6238431 fix(toc): RU anchor IDs now match rendered heading IDs
b6158e5 feat(compare): sticky TOC sidebar over sections 01-10
943cf5d feat(content): RelatedArticles section on /reviews/[slug] + /guides/[slug]
f46f48d feat(reviews): sticky right rail gets rating chip + pricing line
477410b feat(tools): wire Recommended + FAQ sections across all three calc pages
371840e feat(tools): add RecommendedTools + ToolFaq reusable sections
79a59ba feat(footer): restore social icons as placeholders until real URLs land
12439ce feat(homepage): align with Wave 1 audit — Botapolis design v.026
```

### Волна 3 — Backup + CTA + Base UI fix + i18n + UX (22 коммита после второго HANDOFF)
```
69965a5 fix(newsletter): wait for Turnstile token instead of failing fast on submit
f74513f feat(nav): Subscribe button now opens an in-place modal instead of scrolling
6eacf5a fix(nav): smooth-scroll anchors so Subscribe button stops feeling dead
ce3b1c6 docs(handoff): i18n regimen after May 2026 audit — three locales, three scripts
1fa4b76 feat(i18n): comparisons get per-language rows + RU detail route + bulk script
967c296 feat(i18n): tools table gets Russian columns + helper + bulk-translation script
58665eb fix(i18n): RU index pages now read RU MDX + missing tool-name translations
0e780fd feat(i18n): opt out of browser auto-translate site-wide
3c76d3c fix(ui): wrap DropdownMenuLabel in Group — real source of Base UI #31
aa5baa9 fix(ui): every Base UI `render={<Custom>}` site gets nativeButton={false}
ab6973e fix(ui): UserMenu crash on Base UI 1.4 — opt out of native-button assertion
b4264b9 fix(nav): paint active locale chip brand-mint so Chrome-translate is distinguishable
78581f6 feat(ui): roll out CTA variant across all primary call-to-action buttons
76ae63b feat(ui): strip CTA down to two effects — hover lift + brighter shimmer
4f3d3a3 feat(ui): swap same-color glow → violet ring + replace ripple → physical squish
dfb205d fix(ui): CTA glow now actually visible + ripple beats Link navigation
2250b96 feat(ui): primary CTA gets mint glow + shimmer-on-hover + press ripple
fcd330a docs(backup): API keys live in their sources — don't bother backing them up
a796b3f fix(ci): pg_dump version mismatch — call PG 17 binary by absolute path
d9f88e7 docs: BACKUP.md + HANDOFF backup section
f709e8b chore(ci): weekly Supabase backup workflow → GitHub artifacts
a9a35bd docs(handoff): update HANDOFF.md for May 2026 audit + search overhaul
```

### Волна 2 — search overhaul + iOS fix (коммиты после первого HANDOFF)
```
f16bdb7 fix(mobile): kill horizontal pan on /search · 16px input to disarm iOS zoom
be86021 fix(search): force no-store on Pagefind entry.json + loader bundles
e9ceb42 fix(search): Amazon-style search bar — no left icon, no text button
80457f2 fix(search): inline navbar form + submit-only commit on /search
e5715ad fix(search): replace Cmd+K modal with /search page + unblock WASM in CSP
698b46d fix(audit-may-2026): 5 critical bugs from live-site audit
```

### Волна 1 — оригинальные 14 коммитов (Sprint 2 + Blocks A-F)
```
4a1a058 feat(translate): husky pre-commit hook auto-translates EN MDX to RU
2f9592a docs: HANDOFF.md — full session handoff for next agent
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
2. **Если пользователь просит правки по дизайну / структуре сайта** → сразу открывай `New_Design/README.md`, потом `New_Design/mockups/index.html` чтобы понять что где. Эта папка — источник правды по визуалу. TZ-2 устарел, не используй его для дизайн-решений.
3. Прочитай `TZ-2-code.md` и `INSTRUCTIONS.md` — общий контекст ТЗ (для **инженерных** деталей, не визуала).
4. **Прочитай [BACKUP.md](BACKUP.md)** — шпаргалка восстановления. Если что-то сломали — туда первым делом.
5. Сверь `git log --oneline -3` с разделом «Коммиты этой сессии» выше — убедись что репо актуальный.
6. Если пользователь говорит «продолжай / делай дальше / следующий блок» — спроси КОНКРЕТНО что. Engineering scope закрыт; следующий блок это либо контент, либо новая feature.
7. **НЕ нарушай идиомы** из раздела «Критические идиомы». Особенно RU re-export pattern, типы-aliases в Supabase, github-slugger для TOC, single sticky-wrapper на /reviews/[slug], BUG-FIX комменты на любых правках.
8. **НЕ трогай locked items** (полный перечень — в секции «Wave 6 → Новые идиомы / locked items» и оригинальный список «Стартовая разведка»): CTA shimmer (теперь с `:active` triggers — НЕ убирай active из селекторов), NavbarSearch + /search, LanguageSwitcher, NewsletterDialog, `@custom-variant hover` override в globals.css §pre-1, `.surface-glass` opaque-on-mobile, ScrollRevealController с `usePathname()` dep, `defaultTheme="system"` без workaround'ов, `<noscript>` style block для scroll-reveal.

### Что попросит пользователь скорее всего
- «Напиши новый review/guide» → пиши только EN MDX. **На `git commit` husky pre-commit hook авто-сгенерит RU-twin и подмешает его в коммит** — никакой ручной команды. В seed.sql 12 tools со слагами для `<AffiliateButton tool="..."/>`.
- «Добавь новый tool в каталог» → SQL INSERT в Supabase (либо append в `seed.sql` и попросить пользователя re-run). После этого `/tools/<slug>` и `/alternatives/<slug>` появятся автоматически. **После insert обязательно** `npm run translate:tools` чтобы новый tool получил `_ru` поля.
- «Почему статья на /ru/X показывает английский?» → Нет RU MDX файла (значит pre-commit hook не отработал — обычно потому что коммитили без `OPENROUTER_API_KEY` в env). Проверь `content/reviews/ru/<slug>.mdx`. Если нет — `npm run translate -- --type reviews --slug <slug>` и закоммить.
- «Авто-перевод затёр мои ручные правки RU» → добавь `manuallyTranslated: true` в frontmatter этой RU-статьи. Pre-commit hook её больше не тронет даже на правках EN.
- «Расширь функционал X» → проверь "TZ-2 vs реальность" таблицу выше + раздел «Что НЕ сделано намеренно» в дизайн-аудите. Если не запрещено политикой — обсуди scope.

### Памятки про дизайн (Wave 1-5 наследие)
- **TOC справа на всех editorial pages** (/reviews/[slug], /guides/[slug], /compare/[slug]) — owner так захотел для consistency. На /reviews/[slug] TOC + ToolStickyCard в одном `<aside lg:sticky lg:top-24>` чтобы не наезжали друг на друга.
- **github-slugger в `lib/content/toc.ts`** — обязательно. rehype-slug использует его же для генерации `<h2 id="...">`. Замена на slugify сломает RU TOC якоря.
- **ArticleCover на /reviews/[slug] и /guides/[slug]** — gradient-only, 6 slug-hashed вариантов. Реальные cover-фото когда-нибудь — через опциональный `imageUrl` prop.
- **404 / 500 страницы** — `app/not-found.tsx` (server) и `app/error.tsx` (client per Next). Owner-supplied копи для 404 (см. файл).
- **Footer social icons** — `href="#"` placeholder, готовы принять реальные URL'ы одной строкой когда они будут.

---

**Удачи. Сайт в хорошей форме. Не сломай.**
