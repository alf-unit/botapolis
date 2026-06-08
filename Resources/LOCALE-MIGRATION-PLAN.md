# LOCALE-MIGRATION-PLAN.md — переезд на `app/[locale]/` (native rewrites)

> ## СТАТУС на 2026-06-07: подготовка завершена.
> Спайк revalidate-под-rewrites **✅ зелёный** (native жизнеспособен, next-intl fallback
> НЕ нужен). Контроль на ветке `feat/locale-isr` (стор + get-locale + 2 обёртки + search
> Suspense). **СЛЕДУЮЩИЙ ШАГ:** полный переезд 60–80 файлов по узлам **§1** свежей сессией
> → чек-лист доказательств §3 → cutover. **НЕ начат.**
>
> **Почему пауза:** переезд = многосессионный блок; начинать с исчерпанным контекстом =
> риск зависнуть в полумигрированном состоянии (часть `[locale]`, часть нет, капля
> подвешена, SEO живых на кону) после компакта. Спайк доказал жизнеспособность — окно
> (116 свежих в индексе) не закроется за день-два. Начать СВЕЖЕЙ сессией целым заходом.
>
> **Точка старта для следующей сессии:** §1 (статус-трекер узлов, все `[ ]` = не начато).
> Сначала спайк уже сделан (§2 ✅) — переходить сразу к узлам §1.

**Ветка:** `feat/locale-isr`. **Дата:** 2026-06-07.
**Решение:** переезд на `[locale]`-роутинг **обязателен** при многоязычном будущем
(оператор планирует `es`, далее ещё). Текущая схема `app/` + `app/ru/*` = O(языки ×
route-типы) ручных зеркал; `[locale]` = O(1) на язык (+1 строка в config + переводы).
**Развилка исполнения:** **native `next.config rewrites`** (выбрано — максимум экономии
CPU, убивает middleware-46m) с **fallback на next-intl**, если спайк revalidate-под-
rewrites красный.

> **Окно:** 116 страниц свежие в индексе, SEO ещё не поднялось. Позже (400–500 страниц)
> переезд практически невозможен. Делаем сейчас, безопасно, на ветке/preview, с полным
> доказательством ДО cutover.

---

## 0. ПОРЯДОК РАБОТ (жёсткий)

1. **Этот файл-план** (сделано).
2. **🔴 СПАЙК revalidate-под-rewrites** — make-or-break, ПЕРВЫМ, до любого переезда
   (~час). Изолированный throwaway-роут + временный rewrite. Доказать, что
   `revalidatePath(внутренний /en/X)` пробивает ISR-кэш страницы, отдаваемой на bare
   `/X`. **Зелёный → продолжаем native. Красный → fallback next-intl (план узлов тот
   же, bare-EN/hreflang/revalidate решает либа).**
3. Только после зелёного спайка — переезд (узлы ниже), всё на ветке/preview.
4. Полный чек-лист доказательств на preview.
5. Cutover (merge → Production) только после всех галочек. Откат — Vercel «Promote»
   предыдущего деплоя (секунды).

**НЕ трогать 60–80 файлов переезда до зелёного спайка.**

> **Коммиты на ВЕТКУ `feat/locale-isr` — почекпойнтно МОЖНО и нужно** (durable точки на
> случай компакта/обрыва между стадиями). **Cutover в `main` — ТОЛЬКО цельным merge'ем
> ПОСЛЕ полного зелёного чек-листа §3.** Никакой промежуточной полумиграции в `main`:
> `main` либо старая схема, либо полностью переехавшая — третьего состояния в проде нет.

---

## 1. УЗЛЫ ПЕРЕЕЗДА (СТАТУС-ТРЕКЕР — `[ ]` = не начато)

> Следующая сессия: отмечай `[x]` по мере выполнения. Все узлы ниже сейчас НЕ начаты.


- [ ] **git mv ~28 EN route-папок → `app/[locale]/`.**
      Внутрь `[locale]`: `page.tsx` (home), `about/`, `contact/`, `methodology/`,
      `search/`, `tools/`, `tools/[slug]/`, `tools/{ai-cost-comparator,
      email-roi-calculator,product-description}/`, `pricing/`, `pricing/[slug]/`,
      `compare/`, `compare/[slug]/`, `guides/`, `guides/[slug]/`, `best/`,
      `best/[slug]/`, `alternatives/`, `alternatives/[slug]/`, `legal/*`,
      `(auth)/login/`, `(account)/dashboard/`, `(account)/saved/`, и связанные
      `opengraph-image.tsx` детальных типов.
- [ ] **ОСТАЮТСЯ СНАРУЖИ `[locale]`** (без локали): `app/api/*`, `app/go/[slug]/`,
      `app/sitemap.ts`, `app/robots.ts`, корневой `app/opengraph-image.tsx`,
      `app/icon`, `app/apple-icon`, `app/(auth)/auth/callback/`.
- [ ] **Удалить все 27 `app/ru/*` зеркал** (список — секция 6). Их роль берёт
      `[locale]=ru` автоматически.
- [ ] **Root `app/layout.tsx` → passthrough** (`return children`, без `<html>`).
      `<html lang={locale}>` + `setLocale(params.locale)` уезжают в
      **`app/[locale]/layout.tsx`** (новый). Переиспользуем `lib/i18n/locale-store.ts`
      (стор из контроля). Layout также валидирует `locale ∈ i18n.locales` → иначе
      `notFound()`.
- [ ] **`app/[locale]/layout.tsx` ОБЯЗАН экспортировать `generateStaticParams`** →
      `return i18n.locales.map((locale) => ({ locale }))` = `[{locale:'en'},{locale:'ru'}]`.
      **Это ЯДРО ISR:** без него `[locale]`-сегмент не получает статический набор значений
      и роуты не пререндерятся (всё валится в on-demand). Не пропустить — отдельный узел.
- [ ] **Каждая `generateMetadata({ params })`: +1 строка** `setLocale((await params).locale)`
      в самом верху (ordering: metadata резолвится не гарантированно после layout, поэтому
      ставим локаль в самой функции). Тела страниц продолжают звать `getLocale()`.
      Затрагивает ~28 страниц — механически.
- [ ] **`next.config.ts`:**
  - [ ] `rewrites()` для bare-EN: `/((?!ru|es|api|go|_next|.*\..*).*) → /en/$1`
        (исключить локали-префиксы, api, go, internals, файлы с расширением). Routing-
        слой → **ноль Active-CPU**.
  - [ ] `outputFileTracingIncludes`: `/guides/**`→`/[locale]/guides/**`,
        `/pricing/**`→`/[locale]/pricing/**`, `/sitemap.xml` остаётся (снаружи locale).
  - [ ] **Аудит существующих redirects** `/reviews→/tools` + `klaviyo-pricing` +
        `-review-2026`: source-пути видимые (bare/`/ru`), destination резолвятся через
        rewrite — проверить, что не ломаются и не дают цепочек.
- [ ] **`app/sitemap.ts`: цикл по локалям** вместо хардкода en/ru. Сейчас `alternates()`
      хардкодит `en`+`ru`, и три RU-цикла (`ruGuideSlugs`/`ruPricingSlugs`/`ruBestSlugs`)
      — заменить на цикл `for (const loc of i18n.locales)`. bare-EN (`absoluteUrl(path)`)
      + `/${loc}${path}` для не-дефолтных. Comparisons остаются language-pegged (DB-строки
      по `language`).
- [ ] **`lib/seo/metadata` + `absoluteUrl`/canonical/hreflang: локаль-driven** по ВСЕМ
      локалям. canonical = bare для EN, `/${loc}/...` для прочих; `alternates.languages`
      перечисляет все локали + `x-default` → bare-EN. Аудит всех `absoluteUrl(...)`
      вызовов на хардкод `/ru`.
- [ ] **🔴 КРИТИЧНЫЙ УЗЕЛ — `app/api/cron/drip-publish/route.ts`:** `revalidatePath`
      переучить на **внутренние пути по всем локалям** — цикл `локали × типы`:
      сейчас `touch('/${seg}/${slug}')` + `touch('/ru/${seg}/${slug}')`; станет
      `for (const loc of i18n.locales) touch('/${loc}/${seg}/${slug}')` плюс хабы
      `'/${loc}/${seg}'` и глобальные `'/${loc}'`. Точная форма пути (внутренний `/en/...`
      vs bare) — **определяется СПАЙКОМ** (секция 2). Тот же разбор для
      `app/api/revalidate/route.ts` (`derivePathsFromSupabaseWebhook`).
- [ ] **`proxy.ts`: matcher сузить до auth** (`/dashboard`,`/saved`, `+/ru/…`,`+/es/…`)
      или **удалить** и гейтить прямо в `(account)` layout. Локаль-детект больше не нужен
      (берётся из `params`). **Middleware-46m умирает.** `x-locale`/`x-pathname` хедеры
      больше никто не читает (get-locale читает стор) — убрать установку.
- [ ] **Навигация/`localePrefix` в компонентах:** сохранить bare-EN (`""` для en,
      `"/ru"`, `"/es"`). Аудит хардкод-путей в `Navbar`/`Footer`/`LanguageSwitcher`/
      related-блоках/`PartnerAlternatives`/любых `Link href` с `/ru`.
- [ ] **301-сеть** в `next.config redirects`: `{ source: '/en/:path*', destination:
      '/:path*', permanent: true }`. Страховка от протечки `/en/*` наружу (баг ссылки /
      внешний линк). Redirect срабатывает до rewrite, петли нет.
- [ ] **`app/layout.tsx` `<html>` метаданные** (`metadataBase`, `google:notranslate`)
      — перенести/сохранить корректно при split на root-passthrough + `[locale]`-layout.
- [ ] **Контент-слой:** MDX (`content/{type}/{lang}/`) и DB (`*_ru`/будущие `*_es`,
      comparisons-строки по `language`) переезжают **одинаково** — lang берётся из
      `params.locale`, не из хедера. Лоадеры (`lib/content/mdx.ts`, `localizeTool`,
      `getDictionary`) не меняют сигнатуру — им и так передаётся locale.

---

## 2. 🔴 СПАЙК revalidate-под-rewrites — ✅ ЗЕЛЁНЫЙ (2026-06-07)

> **РЕЗУЛЬТАТ:** native подтверждён. На изолированном `app/[locale]/spike` (on-demand,
> generateStaticParams=[], как скрытый drip-slug) + временный rewrite `/spike`→`/en/spike`:
> - bare `/spike` = 404 пока hidden; остаётся 404 до revalidate (кэш доказан);
> - **`revalidatePath('/en/spike')` → bare `/spike` 404→200** ✅ (MAKE-OR-BREAK);
> - `revalidatePath('/ru/spike')` → `/ru/spike` 404→200 ✅; обратно 200→404 ✅.
> - **`revalidatePath('/spike')` (bare) НЕ пробивает** (остаётся 404).
>
> **ВЫВОДЫ → в план:**
> 1. **Native rewrites сохраняют каплю.** Fallback на next-intl НЕ нужен.
> 2. **Узел 🔴 (drip-крон):** revalidate'ить ТОЛЬКО внутренние locale-префиксные пути
>    `/en/{seg}/{slug}` + `/ru/{seg}/{slug}` (+`/es/...`), **НЕ bare** `/{seg}/{slug}` —
>    bare-путь до rewritten-роута не достаёт. То же для `/api/revalidate` webhook.
> 3. **Gotcha зафиксирован:** route-папка НЕ должна начинаться с `_` (Next: `_`-папка =
>    private/non-routable → тихий 404; первый спайк на `__spike` был фантомом).
>
> Спайк-артефакты удалены (`app/[locale]/spike`, временный rewrite, sentinel, скрипт).

### Дизайн спайка (как воспроизвести)

**Вопрос:** под `next.config rewrites` (bare `/X` → внутренний `/en/X`) — какой аргумент
`revalidatePath` пробивает ISR-кэш страницы, отдаваемой на bare-адресе? Внутренний
`/en/X` или bare `/X`? И пробивает ли вообще?

**Изолированный спайк (throwaway, не часть переезда):**
- `app/[locale]/__spike/page.tsx`: `generateStaticParams → [{locale:'en'},{locale:'ru'}]`,
  `revalidate=3600`, `dynamicParams=true`. Страница читает **sentinel-файл** (например
  `.__spike-state` через `fs`) и рендерит его содержимое (или `notFound()` если
  `hidden` — имитация drip-гейта). Без БД, без прод-данных.
- `next.config rewrites`: `{ source: '/__spike', destination: '/en/__spike' }` (bare→en);
  `/ru/__spike` матчит `[locale]=ru` сам.
- Тест: build → start → curl bare `/__spike` (state=A, кэш). Поменять sentinel на B.
  - curl bare `/__spike` без revalidate → ожидаем всё ещё A (доказывает кэш).
  - `POST /api/revalidate` c `paths:['/en/__spike']` → curl bare → **B = native РАБОТАЕТ.**
  - Если A: пробуем `paths:['/__spike']` → если B, крон использует bare-путь.
  - Если оба не пробивают → **native красный → fallback next-intl.**
- Зафиксировать в этом файле: какой путь сработал → таким и учим drip-крон (узел 🔴).
- После спайка — удалить `app/[locale]/__spike/`, временный rewrite, sentinel.

**Изоляция:** `app/[locale]/__spike` создаёт только роут `/[locale]/__spike`; существующие
static-роуты (`/about`,`/tools`,…) выигрывают приоритет над `[locale]` — не задеты.

---

## 3. ДОКАЗАТЕЛЬСТВА ПЕРЕД CUTOVER (чек-лист)

- [x] **🔴 спайк revalidate-под-rewrites зелёный** (ПЕРВЫМ, make-or-break). ✅ 2026-06-07 — см. §2.
- [ ] **bare-EN curl-свип по ВСЕМ ~198 URL** → 200 на тех же bare-адресах; `/en/*` →
      301 на bare; ноль `/en/*` в canonical/sitemap/внутренних ссылках.
- [ ] **drip 404→200 reverted-тест по КАЖДОМУ типу**: tools, compare, pricing, guides,
      best, alternatives (как rockerbox-тест в контроле — flip→revalidate→200→revert→404,
      БД откатить).
- [ ] **116 live + 82 hidden целы** — перечислить из `page_publications`, curl-сэмпл
      `тип × язык` (live=200, hidden=404).
- [ ] **build все Static/SSG** (route-table ○/●, не ƒ), **язык** (кириллица на `/ru/*`,
      латиница на bare), **cache HIT** (`x-vercel-cache: HIT` на preview / `x-nextjs-cache`
      локально + `s-maxage`, не `no-store`).
- [ ] **КОНТЕНТ реально отрендерился (не пустой шаблон)** — на 2-3 страницах КАЖДОГО типа
      проверить наличие тела, не только «200 + язык верный»: `/tools/klaviyo` → текст
      обзора + цены + рейтинги; `/pricing/{X}` → тарифы; `/compare/{X}` → таблица сравнения;
      `/guides/{X}`,`/best/{X}`,`/alternatives/{X}` → основной текст. **Зачем:** переезд
      меняет, как локаль доезжает до data-fetch (из `params`, не из заголовка) — убедиться
      что DB-fetch + MDX-загрузка работают на новой схеме.
- [ ] **RU-КОНТЕНТ настоящий (не EN-fallback)** — `/ru/*` реально тянет русский из БД
      (поля `*_ru`) + RU MDX (`content/{type}/ru/`), НЕ показывает английский fallback.
      **Критично — суть переезда в рабочем RU.** Проверить на reviews/pricing/compare RU-страницах.
- [ ] **hreflang + авто-перевод** — после переезда: (1) hreflang-разметка генерится по ВСЕМ
      локалям (`alternates.languages` + `x-default`→bare-EN); (2) Google-авто-перевод подавлен
      для поддерживаемых EN/RU (`<meta name="google" content="notranslate">` + `translate="no"`
      на `<html>` сохранены после split layout); (3) для НЕподдерживаемых языков Google волен
      предлагать перевод — это норм, не баг. Сверить, что текущее поведение (юзер переключает
      язык нашим свитчером, Google не переводит EN/RU автоматом) сохранилось.
- [ ] **🆕 es-тест масштабируемости:** `i18n.locales += 'es'` (+1 строка) + `locales/es.json`
      + 1 es-перевод/контент → `/es/<страница>` рендерит испанский, **Static**, **без
      единого нового route-файла**. Доказывает O(1)-на-язык.

---

## 4. ОБРАТИМОСТЬ

- **До cutover:** всё на ветке `feat/locale-isr`, `main` нетронут → «не мёржим» = ноль
  следов. Чекпойнт-коммиты на ветку приветствуются; **в `main` ничего не мёржим до
  полного зелёного §3** (без промежуточной полумиграции в проде).
- **После cutover:** **Vercel «Promote» предыдущего деплоя** (1 клик, секунды) или
  `git revert` merge-коммита + redeploy. **Миграций БД нет** — слаги, `page_publications`,
  гейт не меняются → откат чисто деплойный, без рассинхрона данных. Это и делает окно
  безопасным.

---

## 5. ОСТАТОЧНЫЕ РИСКИ (честно)

1. **revalidate-под-rewrites (#1) — ✅ СНЯТ спайком 2026-06-07.** Доказано:
   `revalidatePath('/en|/ru/...')` пробивает bare rewritten-URL 404↔200. Условие:
   крон/webhook revalidate'ят ВНУТРЕННИЕ locale-префиксные пути, не bare (см. §2).
   Fallback next-intl не нужен.
2. **Regex bare-EN, краевые случаи.** Slug, совпавший с кодом локали; путь, неверно
   исключённый regex → 404 живой страницы или протечка `/en/`. **Митигация:** полный
   curl-свип 198 + 301-сеть.
3. **Root-layout-без-`<html>`.** Паттерн стандартный (так делает next-intl), но на
   Next 16.2.6 **подтвердить сборкой** до переезда.
4. **Google заметит структурные/hreflang изменения.** Даже при байт-идентичных
   bare-URL+canonical риск ненулевой, но **минимальный**; окно сейчас (116 в индексе) —
   лучшее время, позже хуже.
5. **Поверхность 60–80 файлов** = шанс пропустить хардкод-путь в компоненте. Митигация:
   curl-свип по всем типам × язык + аудит `Link href`.

---

## 6. СПРАВКА — 27 RU-зеркал к удалению

Pattern A (тривиальные, 11): `about`, `contact`, `dashboard`, `login`, `methodology`,
`saved`, `legal/{affiliate-disclosure,cookie-policy,disclaimer,privacy,terms}`.
Pattern B (+revalidate, 10): `alternatives`, `best`, `guides`, `pricing`, `search`,
`tools/{ai-cost-comparator,email-roi-calculator,product-description}`, `compare`, `tools`.
Pattern C (+dynamicParams+gSP, 6): `alternatives/[slug]`, `best/[slug]`, `compare/[slug]`,
`guides/[slug]`, `pricing/[slug]`, `tools/[slug]`.

## 7. КОНТРОЛЬ НА ВЕТКЕ (сохранить, переиспользуется)

`lib/i18n/locale-store.ts` (стор + `withLocale`), `lib/i18n/get-locale.ts` (читает стор,
не `headers()`), `app/ru/{about,tools/[slug]}/page.tsx` (2 обёртки), `app/search/page.tsx`
(Suspense-фикс). Стор переиспользуется в `[locale]/layout.tsx`. Обёртки/`app/ru/*` будут
удалены при переезде, но контроль уже доказал: build Static + drip 404→200 + cache HIT +
язык. Search Suspense-фикс остаётся валиден.
