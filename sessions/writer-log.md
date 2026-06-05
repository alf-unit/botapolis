# Writer session log

Append-only diary of content-writing work — packets shipped, refresh passes, RU translation hand-offs, post-mortems on structure / quality / publishing flow. Newest entries on top. One block per session, separated by `---`. Owner: operator + Claude Code (writer mode).

---

## 2026-05-20 — Packet 001 skio-to-loop migration shipped

### Commits

- [`7e71a0c`](https://github.com/alf-unit/botapolis/commit/7e71a0c3859ffdb38d6661ea1218046bbc6130cc) — feat(tools): add Loop Subscriptions and Skio for skio-to-loop content cluster (DB prep before the article — see infra-log)
- [`7487e0e`](https://github.com/alf-unit/botapolis/commit/7487e0e22141cb190cca521046cb747f93de62db) — content(guides): add Skio→Loop migration how-to (cluster anchor) — 2 files (EN + auto-translated RU), +401 lines
- [`03e6031`](https://github.com/alf-unit/botapolis/commit/03e603182d01d2d4444a99381ecbf384b0859f8a) — chore(writer-queue): move 001-skio-to-loop-migration to done/
- [`d3af1cf`](https://github.com/alf-unit/botapolis/commit/d3af1cf52cd8702ad4c483b7af755944bd71c24a) — fix(scripts): use literal union for table names in validate-infra (unrelated to content but blocked the deploy — see infra-log)

### Packet

`writer-queue/pending/001-skio-to-loop-migration.md`. Type: `how-to`. Primary keyword: `migrate skio to loop` (volume 1100, intent transactional). Priority 147 (critical, event-driven). Cluster anchor for `recharge-skio-acquisition` — 6 sibling articles depend on this as their anchor.

### Path choice and why

**Path B (vendor docs + Supabase data + WebFetch).** Operator's decision after pre-flight diagnostic:

- `/research/` had no Deep Research file for this topic — Path A would require a 30-min Web Chat round-trip
- 7-day event-relevance window from packet's target_publish_date 2026-05-27 — every day of delay was real cost
- Cluster anchor needed to exist so 6 sibling articles could be queued
- Refresh is the natural recourse — Path A will replace the troubleshooting section with real operator quotes in 2-3 weeks once Deep Research drops

Trade-off accepted: troubleshooting section closes the content_gap from platform-doc patterns rather than r/shopify testimony. Refresh strengthens it later.

### content_gap closure

Gap from semantic core entry `0fc1752d`: *"No step-by-step with screenshots of token-export failures"*.

How the article closes it:

- 8 numbered Step sections (1-3 Skio export prep, 4-7 Loop import, 8 verification) — every step has concrete instructions, not generic guidance
- Troubleshooting section with 6 named failure modes that don't exist together in any SERP competitor: payment token transfer failures, subscriber portal login confusion, custom-pricing rules not migrating cleanly, Klaviyo/Postscript event silence, in-flight cancellation collisions, bundle SKU schema differences
- Each troubleshooting item has both Symptom and Fix lines — actionable, not just descriptive

Screenshots intentionally skipped (operator hasn't done a live migration to capture them; packet flagged this). Refresh pass with Deep Research should add at minimum: Skio export screen, Loop import screen, Loop portal vs Skio portal side-by-side.

### Structure decisions

- **Front-loaded the event context.** $105M acquisition and consolidation-timeline-unknown framing in para 1, not buried. Reader landing from "skio cancellation what to do" SERP needs the *why* before the *how*.
- **4-phase migration table from Loop docs as a contract.** Operators making this decision want to know the time cost up front; Loop's own kickoff/build/test/go-live phases verified 2026-05-20 anchor expectations to vendor's documentation.
- **Step 5 (token transfer) got the most word-budget.** It's the highest-anxiety step — payment token transfer is where recurring revenue dies if mishandled. Compressed elsewhere, expanded here.
- **"Should you stay on Recharge?" as required honest-caveat.** Packet mandated it; placed near the end with concrete fee math (Loop Starter $99 + 1%, Loop Pro $399 + 0.75%, Recharge Standard $99 + 1.25%, Recharge Pro $499 + 1%, all dated 2026-05-20). At <200 active subscribers, migration math doesn't pay back — said explicitly.
- **AffiliateButton placed inside the "stay on Recharge" decision section, not at top.** Reader who reaches that section has read the honest math, has the framework, and is at the genuine decision point. Top-of-page CTAs on this topic would feel like a vendor sales page.

### Intentionally skipped

- **No operator-quote section.** Packet said: "If writing Path B, skip the quote section entirely rather than fabricate." Adhered. No "u/ShopifyOp said..." or "operators we surveyed..." anywhere.
- **No retro-links into existing articles.** CONTENT-WRITING.md workflow Step 3 wants 1-2 links FROM existing articles TO the new one. Existing /content/ has zero subscription-cluster adjacent articles (email/SMS/support reviews + 4 unrelated guides) — forcing links would be unnatural. Packet explicitly says "cluster siblings will retro-link when they ship." Documented in commit message.
- **No /go/skio anywhere.** Skio's tools row is status='archived', so /go/skio redirector routes to /tools (per [app/go/[slug]/route.ts:59-61](app/go/[slug]/route.ts#L59-L61)). Mentioning Skio without affiliate link is intentional — we don't send traffic to a sunsetting platform.
- **No `<AffiliateDisclosure>` MDX tag.** Doesn't exist in this project's MDX namespace (verified [components/content/mdx-components.tsx](components/content/mdx-components.tsx)). FTC disclosure is rendered at page-template level via `<ArticleHero showAffiliateNotice={true}>` ([app/guides/[slug]/page.tsx:151-157](app/guides/[slug]/page.tsx#L151-L157)). CONTENT-WRITING.md gate is outdated — separate PR to clean.

### Build issues encountered

- **Vercel deploys silently failed for 4-5 pushes** before content surfaced. Root cause: TS error `Unused '@ts-expect-error' directive` in [scripts/validate-infra.ts:209](scripts/validate-infra.ts#L209) from commit `2bda175` (pre-existing). Local `tsc --noEmit` passed because of Supabase types resolution; Vercel strict mode flagged it. Three subsequent pushes (`7e71a0c`, `7487e0e`, `03e6031`) never deployed — the new MDX was on remote but Vercel's last successful build artifact didn't know about it.
- **Detection:** EN + RU URLs returned 404 even 8+ minutes after push, while existing article + /guides index returned 200. Hypothesis check via local `npm run build` reproduced the failure verbatim.
- **Fix:** commit `d3af1cf` replaced `@ts-expect-error` over `supabase.from(<string>)` with an `as const` literal-tuple. Local full build then completed (Pagefind index built reviews:12 guides:10). Push triggered Vercel rebuild; 200 caught at **75 seconds** (5th 15-s poll iteration) on both EN and RU URLs.

### Final URLs

- EN: <https://botapolis.com/guides/how-to-migrate-skio-to-loop> — `HTTP/1.1 200 OK`
- RU: <https://botapolis.com/ru/guides/how-to-migrate-skio-to-loop> — `HTTP/1.1 200 OK`

Auto-translation via pre-commit hook ran clean. Post-commit webhook `[post-commit] webhook OK` — `semantic_core_entries.status` for entry `0fc1752d` should now be `published`.

### Quality gate results

- `npm run validate:content` — schema ✓
- Banned phrases (global 35 patterns + per-packet 3) — 0 matches
- Word count prose-only: 1988 (~10% over 1400-1800 target; operator accepted as dense substance)
- Required claims all present: $105M acquisition (TechCrunch), Recharge pricing dated 2026-05-20, honest "stay on Recharge" caveat
- Internal links: 4 (`/guides/how-to-set-up-shopify-email-automation`, `/guides/support-automation-for-shopify-stores`, `/tools/recharge` ×2)
- AffiliateButton slug: `loop-subscriptions` — falls back to `loopwork.co` via `/go/` redirector (Loop affiliate_url=NULL until Partner Program approval)

### Open follow-ups

- **Refresh pass in 2-3 weeks** once Path A Deep Research drops. Specifically: replace the troubleshooting section's "based on platform documentation and the patterns visible in Shopify subscription migrations generally" framing with quoted operator testimony from r/shopify migrations. Update `updatedAt` frontmatter.
- **Screenshots TODO** — Skio export screen, Loop import screen, Loop vs Skio portal side-by-side. Operator captures during a live migration (or sources from vendor onboarding); upload target `screenshots/skio-to-loop-migration/` per packet.
- **Stay AI** still not in `tools` table. Packet 001 noted it as secondary alternative; cluster siblings (e.g. "best subscription alternatives for shopify") will need it as an entity. Migration `010_add_stay_ai_tools.sql` is the next infra task before those siblings ship.
- **CONTENT-WRITING.md outdated gate** — quality-gate line "AffiliateDisclosure component на любой странице с /go/ ссылками" references a component that doesn't exist in MDX namespace. Update in a separate PR to read "Affiliate disclosure rendered by ArticleHero with showAffiliateNotice; no MDX-level component needed."
- **Cluster siblings ready to anchor.** With this article live, the following packets can be drafted by OPS (or operator) using this URL as the cluster root:
  - `loop vs recharge 2026` (comparison)
  - `skio acquisition recharge` (news-explainer)
  - `recharge alternatives 2026` (best-list)
  - `loop subscriptions review` (deep-review — once we've used the platform OR have enough vendor docs + Reddit testimony to write honestly)
- **Packet 002 (klaviyo-review-refresh)** still in `writer-queue/pending/` — surgical refresh of the existing klaviyo-review-2026 article. Light dependency: just the latest klaviyo.com/pricing snapshot. Next priority when content session resumes.

---

## 2026-05-27 — Packets 005 (klaviyo pricing) + 007 (klaviyo vs omnisend) shipped post writer-queue-gap incident

### Commits

- content(reviews): klaviyo pricing — Customer Agent jump + active-profiles trap
- fix(content): add primaryKeyword to klaviyo-pricing + trim index Next up
- content(comparisons): klaviyo vs omnisend — MCP, Customer Agent, sub-25k math
- fix(content): remove <AffiliateDisclosure /> from klaviyo-pricing

### Packets

`005-klaviyo-pricing` (template: pricing → wrote with deep-review skeleton since no pricing template exists) and `007-klaviyo-vs-omnisend` (template: vs-comparison). Both materialized earlier same session during infra phase (see infra-log 2026-05-27 block); both pointed at existing research file `/research/2026-05-26-klaviyo-vs-mailchimp.md` (Phase 3 research, `estimated_article_count: 6` — these were articles #2 and #3 from that research's coverage list, after 003-klaviyo-vs-mailchimp).

### Path choice and why

**Path A (research-backed) for both.** Existing klaviyo-vs-mailchimp research covered:
- Klaviyo pricing tiers at 500/1,500/5,000 contacts (verified 2026-05-26)
- Feb 18, 2025 active-profiles billing shift + Appreciation Discount mechanics
- Customer Agent intro $140/mo through March 31, 2026 + regular $200/mo from April 1
- K:AI Marketing Agent included on Email plan; Customer Agent separate
- Klaviyo One 20% surcharge above $10k/mo standard spend
- 4 sourced operator quotes (Shopify Community, Capterra customer, Nudgify aggregate, Omnisend's Bernatavičiūtė)

For 007, Omnisend side was thinner — research has competing-ESP Omnisend pricing analyses cited + one Omnisend-employee quote + explicit flags on unverifiable cross-platform claims. Filled Omnisend pricing tier table from vendor pricing analyses in research's source list, stamped `verified 2026-05-26`, and explicitly admitted in the article that operator-verified MCP outcomes are still thin (research itself doesn't have them).

### Wrote / shipped

- **`/reviews/klaviyo-pricing`** — 2,623 words. Bottom-line-up-front structure, full-stack cost at 25k profiles, 3 Customer Agent feature framings (with honest caveat that vendor-verified scope needs separate review), 4 operator quotes with attribution + bias disclosure. Rating 8.7 matches Supabase tools.rating (sync:ratings clean). Live: https://botapolis.com/reviews/klaviyo-pricing
- **`/compare/klaviyo-vs-omnisend`** — 2,598 words MDX (dead-weight per /compare/[slug] DB-driven architecture) + manually populated `public.comparisons (en)` row with rich verdict + custom_intro + 4-segment comparison_data JSONB + 5 quickStats. Verdict explicitly `winner: it-depends` (both win in different bands). Operator-facing AI (Omnisend MCP) vs shopper-facing AI (Klaviyo Customer Agent) framing — surfaces the architectural difference most SERP results miss. Live: https://botapolis.com/compare/klaviyo-vs-omnisend

### Quality gates passed

- Schema validator (`scripts/content-validator.ts`) — reviews schema clean; comparisons silent (validator doesn't cover that type — flagged in infra-log).
- Banned phrases check vs `config/banned-phrases.json` — both files clean after 1 fix each (klaviyo-pricing: "leverage" as noun → "bargaining room"; klaviyo-vs-omnisend: "best-in-class" → "category-leading").
- Internal links: 005 has 4 links (klaviyo-review, klaviyo-vs-mailchimp, mailchimp-review, omnisend-review); 007 has 4 (klaviyo-review, klaviyo-pricing, klaviyo-vs-mailchimp, mailchimp/postscript reviews).
- Affiliate routing — both use `<AffiliateButton tool="<slug>" />` only, no direct vendor URLs.
- Pricing claims date-stamped `verified 2026-05-26` consistently (research's verification date — writer doesn't browse for fresh verification).
- FAQ frontmatter — 6 entries each (within 4-6 gate).
- EN→RU auto-translate fired for 005 (klaviyo-pricing.ru.mdx created); for 007 the translate-script can't handle comparisons (`--type must be 'reviews' or 'guides'`) — RU row in DB already existed from 2026-05-13 stub creation.

### Обнаружено

- **`<AffiliateDisclosure />` in MDX 500s the review page** — component isn't registered in `mdx-components.tsx`. Detected post-deploy when owner curled the URL. Removed from both EN + RU, closed the doc drift in CONTENT-WRITING.md (see infra-log). This was flagged in this same log on 2026-05-20 as an open follow-up — finally addressed today.
- **`primaryKeyword` field is required for post-commit webhook to flip status** to `published`. Deep-review template doesn't list it. Klaviyo-pricing initially shipped without it → webhook returned 200 but silently no-matched → status stayed at `in_writer_queue`. Fix commit added the field; on the second commit webhook matched cleanly. Worth surfacing in template.
- **Comparison MDX is dead-weight** — `/compare/[slug]` reads `public.comparisons` table. Existing row from 2026-05-11 was a thin stub (meta + 1-line verdict, all editorial JSONB null). Bridge would only `touch` it (never overwrite editorial), so the only way to get the new article content live was direct DB update. Same Phase 3 pattern. Klaviyo-vs-omnisend EN row UPDATE'd manually, ISR revalidate fired, page live in <1s.
- **CONTENT-WRITING.md was untracked** since at least session start — finally brought under git tracking today. Documentation that drifts silently between machines is the same anti-pattern that bit OPS in TOOLS.md vs AGENTS.md on 2026-05-26 (logged in infra-log).
- **Tone in pricing/comparison articles vs reviews** — both articles use third-person analytical framing ("Klaviyo's headline event in 2026 was…") instead of the existing klaviyo-review-2026.mdx fake-hands-on framing ("We bought a Klaviyo Standard plan… ran it for 90 days"). CONTENT-WRITING.md prohibits fake hands-on (line 152-153) but the existing review uses it. Conservative path: didn't use it in new articles. Future writer should resolve whether the rule or the existing article's voice is canonical.

### Open follow-ups

- **Reviews-ugc cluster research needed** (packets 006 + 008 still pending, both research-blocked). Block B prompts inside the packets — owner runs one Web Chat session, both unblock.
- **`primaryKeyword` in deep-review template** — add to `content-templates/deep-review.md` frontmatter example.
- **Author voice resolution** — pricing/analysis articles vs hands-on reviews; CONTENT-WRITING.md rule vs existing klaviyo-review-2026 framing. Choose one canonical.
- **content-validator.ts comparison schema coverage** — currently silent on `content/comparisons/`. Surface as warning or add the schema.


---

## 2026-06-03 — указатель: метод генерации и структурный фундамент — детали в infra-log.md

Сегодняшняя крупная работа была **в инфра-сессии**, не в контентной. Здесь короткий pointer для следующей контентной сессии (CONTENT_WRITING_02 / Content writing). Детали — в [`/sessions/infra-log.md`](./infra-log.md), блок `2026-06-03 (session 2)`.

### Кратко что произошло

- **Структура сайта здорова** (на main): tools+reviews слиты в `/tools/[slug]`, навигация Resources, хабы `/best` + `/alternatives` живые, перелинковка спутник→центр working.
- **Метод генерации контента выбран и зафиксирован**: data-first база (`tools` row + Research 02/05) + realtime веб-добор (WebFetch вендора + WebSearch top third-party + fresh operator quotes) + синтез в MDX. **Полная инструкция — в обновлённом [`CONTENT-WRITING.md`](../CONTENT-WRITING.md) — прочитай его на старте, это обязательно**. Файл переписан полностью под текущую модель; старая packets/SCOUT/reviews workflow удалена.
- **Шаблон `/pricing/[slug]` полный**: deep MDX (1500-2500 слов) + tier tables + 6 FAQ + Related блок (alternatives + compares + best-of) + PartnerAlternatives cards strip + sticky card с CTA. JSON-LD: Article + SoftwareApplication + Breadcrumb + FAQPage.
- **5 контрольных pricing-страниц на проде**: `/pricing/klaviyo` + `mailchimp` + `attentive` + `gorgias` + `recharge`. Все опираются на baseline (Research 02 + DB row) + realtime веб per article.

### СЛЕДУЮЩЕЕ для контентной сессии

1. **Догенерить ~46 оставшихся pricing-страниц** методом из `CONTENT-WRITING.md`. Приоритет — топ-volume: `manychat` / `omnisend` / `yotpo` / `triple-whale` / `tidio` / `signifyd` / `inventory-planner`, далее остальные. Плюс `gorgias pricing` (210 vol) и `postscript pricing` (480 vol) из 1st-wave queued.
2. После pricing — остальные buckets 2-й волны: 33 guide + 29 comparison + 29 best-for + 20 alternatives editorial + 6 review + 1 how-to. Discount (44) deferred до партнёрок.
3. **Программная `/compare/` → `/pricing/` перелинковка** — через `scripts/pricing-compare-backlinks.ts`. Расширяй BACKLINKS array, `--apply` после deploy. Идемпотентно. НЕ руками по одной.
4. **Realtime веб-добор может находить расхождения с базой** — обновляй существующие поля БД (не предлагай миграции). В commit summary перечисляй "тул: было→стало, источник". Пример этой сессии: `recharge.pricing_min` 25→99 (vendor TODAY publicly lists $99; $25 — hidden offer для new merchants only).
5. После всего пула готов — Этап H (нумерация) → передача CHIEF → Этап I (капельная публикация 4/день).

### Полезное окружение

- 5 готовых pricing MDX в `/content/pricing/en/` — reference templates для bulk-генерации
- `scripts/pricing-compare-backlinks.ts` готов к расширению (production tool, не one-off)
- `lib/content/related-blocks.ts` — shared helpers `fetchRelatedComparisons` + `fetchBestMentions`
- `/pricing/` hub + Resources nav sub-item НЕ создан, но **порог 5+ страниц достигнут** — можно делать
- DB-driven `/compare/` rows: при content session edit MDX, но **финальные правки live verdict делай через loader, не через MDX edit** (webhook не overwrite'ит existing rows)

---

## 2026-06-04 — 2-я волна старт: pricing-bucket ЗАКРЫТ (14 скрытыми) + инфра-фиксы

### Commits
- `content: pricing wave 1 — loop-returns, loyaltylion, loox, pencil` (6c7c1a7)
- `content: pricing wave 2 — judge-me, skio, loop-subscriptions, polar-analytics` (9fc26c4)
- `content: pricing wave 3 — stay-ai, limespot, flair-ai, shopify-sidekick` (abbb113)
- `fix(drip): gate hidden pricing pages' OG image (leak audit)` (cec797e)
- `fix(drip): make article-published webhook drip-gate-aware` (2011a43)
- `feat(drip): fixed 01:00 LA year-round via two UTC slots + DST guard` (d17175e)

(Идентификация по subject, не по hash — см. CLAUDE.md.)

### Задача
Стартовать 2-ю волну наполнения. Закрыть pricing-bucket: написать все реально новые pricing-страницы СКРЫТЫМИ в drip-очередь (НЕ live разом), методом data-first + realtime web. Контроль-first на 2 страницах, затем пачка.

### Сделано
- **Pricing-bucket ЗАКРЫТ: 14 новых pricing-страниц (EN+RU) написаны СКРЫТЫМИ** методом data-first+web, в drip-очереди pool **#1-14** (`visible_at=NULL`, 404 на проде, ждут капельной публикации). Тулза: adcreative-ai, smile-io, loop-returns, loyaltylion, loox, pencil, judge-me, skio, loop-subscriptions, polar-analytics, stay-ai, limespot, flair-ai, shopify-sidekick.
- **16 дублей-ключей зареконсилены** (вторичные ключи к существующим pricing: mailchimp cost→/pricing/mailchimp, klaviyo sms pricing→/pricing/klaviyo, attentive sms/mobile/cost→/pricing/attentive ×3, и т.д.) → `published` со ссылкой на существующую live-страницу, **НЕ переписаны**.
- **База освежена** (офиц.цены разошлись): smile-io min 49→79 (Starter снят→Standard), loox 9.99→14 (Scale-тариф убран), limespot 18→150 (перешёл на единый Max revenue-tiered), flair-ai 10→8 (Pro entry) + pricing_notes/_ru. Остальные 10 — офиц.совпали с базой, без изменений.
- **`second_wave` pricing-ключей = 0** — bucket закрыт (16 оригиналов published + 16 дублей published + 21 ключ новых тулзов ready_to_publish).
- Каждая страница: валидатор `--strict-pairing` зелёный, banned-phrases чисто, /go/ где affiliate (loox), judge-me carve-out (нет партнёрки — честно без CTA), honest framing.

### Инфра-фиксы
- **OG-роут скрытых страниц светился 200 → починен (cec797e):** `isSlugVisible` guard → `notFound()`, теперь 404 для скрытых, динамически следует за гейтом (EN+RU). Полный аудит утечек: скрытое НЕ палится нигде — sitemap исключает (gated на генерации), generateStaticParams не пререндерит, внутренние ссылки/хаб/Pagefind/feed/OG чисто. Sitemap-латентность опубликованного (до 24ч/деплоя) — НЕ утечка, оставлена (24ч revalidate ради CPU).
- **Webhook post-commit стал drip-aware (2011a43):** помечает semantic_core `published` ТОЛЬКО если страница видима (`page_publications.visible_at IS NOT NULL`); скрытая/нет gate-строки → `ready_to_publish`. `published_article_path` нормализован в канонический `/{seg}/{slug}` (cron-sync матчит). Comparison-bridge НЕ тронут (там `comparisons.status='published'` нужен чтобы роут рендерил, видимость гейтится отдельно). **Систематический drift устранён — ручной reconcile каждую волну больше НЕ нужен, покроет и comparisons.**

### Обнаружено
- **post-commit webhook исторически флипал semantic_core в `published` при КОММИТЕ, игнорируя drip-гейт** — каждый коммит скрытого контента создавал drift (14 primary-ключей новых тулзов ушли в published с RU-путём). Это неавторитетный drift (гейт `page_publications` — истина видимости, страницы 404), но искажал трекинг. Пофикшено №2 выше.
- OG-роут метадата (как и sitemap) НЕ пробивается `revalidatePath` промптно через CDN Vercel — догоняет на деплое/24ч ISR. Для скрытия это безопасно (гейт применяется на генерации). Логика гейта в OG/sitemap корректна (видимая klaviyo OG=200, скрытая=404 — доказано флип-тестом).
- Cron 01:00 LA круглый год: два UTC-слота `0 8`+`0 9` + DST-guard `laHour()===1` в хендлере + 20ч дубль-защита (d17175e).

### Fixes
- `app/pricing/[slug]/opengraph-image.tsx` — `isSlugVisible("pricing", slug)` → `notFound()` для скрытых (RU ре-экспортит default, наследует).
- `app/api/agents/article-published/route.ts` — `isPageVisibleNow()` guard перед status-флипом; helpers `parseRepoPath` / `canonicalPublicPath` / `GATED_TYPES`; fail-open на transient DB error (гейт всё равно контролирует реальную видимость).

### Open follow-ups / ТОЧКА ВХОДА — следующая сессия (наполнение 2-й волны)
**СЛЕДУЮЩИЙ BUCKET — vs-comparison** (29 ключей, `template='vs-comparison'` `status='second_wave'`). DB-driven, роут `/compare/` существует.
- **Контроль-first:** СНАЧАЛА 1-2 контрольные comparison → проверить связку MDX→`public.comparisons` bridge + gate-строку `content_type='comparisons'` + **RU-row ВРУЧНУЮ** (translate-script comparisons НЕ покрывает — писать RU сразу как часть DoD) + страница скрыта (404). Потом пачка.
- **СКРЫТЫМИ:** `visible_at=NULL` + `pool_number` продолжать **от 15** (pricing занял 1-14), по `priority_score`.
- Метод data-first+web, definition-of-done (EN+RU, навигация, sitemap, перелинковка, валидатор, gate-строка).
- **webhook-drift уже пофикшен — reconcile НЕ нужен.**

**Дальше по порядку:** best-for (29, `/best/` гибрид) → guide+how-to (34, `/guides/` MDX) → alternatives (20, `/alternatives/` DB jsonb) → review (6, `/tools/` DB). Все СКРЫТЫМИ в очередь, нумерация сквозная по `priority_score`, капают 4/день (мес1) → 7 (мес2) → 10 (мес3).

**КРИТИЧНО:** весь новый контент СКРЫТЫМ в drip-очередь, НЕ live разом.

Пауза НЕ ставится — drip капает штатно 4/день, #1/#2 (adcreative-ai, smile-io) выйдут ближайшей ночью 01:00 LA.

---

## 2026-06-05 — 2-я волна ЧАСТЬ 1 ЗАКРЫТА (best-for + guide/how-to + alternatives + review)

### Commits
- `fix(best): dynamicParams=true so drip reveals best pages without redeploy`
- `content(best): 2 control best-for listings — subscription + review apps (EN+RU, hidden/drip)`
- `content(best): 7 best-for-segment listings batch (EN+RU, hidden/drip pool 17-23)`
- `fix(guides): dynamicParams=true so drip reveals guides without redeploy`
- `content(guides): 2 control guides — Yotpo Loyalty + Klaviyo for Shopify (EN+RU, hidden/drip)`
- `content(guides): 22 guide+how-to pages batch (EN+RU, hidden/drip pool 26-47)`
- `docs(session): writer-log — Часть 1 2-й волны закрыта` (this commit)

(alternatives + review — DB-only, без коммитов: editorial jsonb + semantic_core reconcile.)

### Задача
Закрыть Часть 1 второй волны: best-for-segment (29 ключей), guide+how-to (34), alternatives (20), review (6). Контроль-first на каждом новом типе, потом пачка. Всё новое — СКРЫТЫМ в drip-очередь; alternatives/review — особый случай (страницы уже live).

### Сделано — ЧАСТЬ 1 ЗАКРЫТА
- **best-for-segment: 9 страниц написано СКРЫТЫМИ** (EN+RU), drip pool **#15-23**. 29 ключей: 12 → 7 новых + 2 контрольных (multi-keyword поглощение), 11 → существующие 8 best (published), 4 → 2 контрольных (ready). `second_wave best-for = 0`.
- **guide+how-to: 24 страницы написано СКРЫТЫМИ** (EN+RU), drip pool **#24-47**. 34 ключа: 32 → 22 страницы (2 контроль + 22 батч... = 24 страницы; multi-keyword: loyalty 4, sidekick 3, и т.д.). `second_wave guide/how-to = 0`. Метод: tool rows + vendor docs (Klaviyo/AfterShip/Yotpo/Sidekick help-centers) + WebSearch.
- **alternatives: 14 страниц ОБОГАЩЕНО editorial (enrich-in-place, остались LIVE)**. 20 ключей → published. `tools.alternatives_editorial` jsonb (intro/verdict EN+RU + perCardContext на 6). Честность: partner-first грид, но verdict честно ставит бесплатное/нативное #1 по фиту где правда (yotpo/loox→judge-me, mailchimp→omnisend free tier) с явной оговоркой про комиссию. `second_wave alternatives = 0`.
- **review: 6 ключей РЕКОНСИЛЕНО → published** на существующие live /tools/ обзоры. «is X worth it» варианты для mailchimp/triple-whale/adcreative-ai/klaviyo/yotpo — уже полные обзоры, writing не требовался. `second_wave review = 0`.

### Drip-очередь итого
`pool total=47, visible=4, hidden=43`: pricing #1-14 (4 visible), best #15-23, guides #24-47 — все hidden, капают 4/день 01:00 LA. alternatives+review — live (не в очереди).

### Сверка second_wave (по всем типам Части 1 = 0)
`SELECT template,count(*) WHERE status='second_wave'`: остаток **только** `vs-comparison 29` (Часть 3, не делали) + `discount 44` (deferred до партнёрок). Все типы Части 1 (pricing/best-for/guide/how-to/alternatives/review) = 0. ✓

### Фиксы сессии
- **dynamicParams=false → true на `/best/[slug]` + `/guides/[slug]`** (оба + RU mirror). Был баг: `getAllMdxSlugs` фильтрует скрытые слаги из `generateStaticParams`, при `dynamicParams=false` drip-флип не раскрыл бы страницу (404 до деплоя, т.к. revalidatePath не перезапускает generateStaticParams). Доказано на проде: флип visible+revalidate → 200 без редеплоя. pricing/tools/alternatives уже были true.
- **recharge `pricing_min` 25→99** (публичный Starter; скрытый $25-тариф для new merchants ≤50 подписчиков описан в pricing_notes/_ru как off-page sandbox, $99 = устойчивый пол). Vendor TODAY (getrecharge.com 2026-06-05) публично показывает $99.

### Обнаружено
- **alternatives тонкие-категории грид-fallback (CODE-ДОЛГ).** 8 из 14 alternatives-страниц (manychat, tidio, aftership, attentive, adcreative-ai, signifyd, loyaltylion, pencil) имеют категорию из 1-2 тулзов → `fetchAlternatives` падает в fallback на топ-по-рейтингу ЛЮБОЙ категории (показывает judge-me/loop-subscriptions/loox вместо релевантных). Editorial intro/verdict честно это обрабатывают (называют реальную альтернативу + помечают broad list), но грид нерелевантен. **Фикс на потом:** при `pool.length===1` показывать единственного category-mate + «closest in category», не cross-category по рейтингу; либо `alternatives_to` для пина.
- **alternatives + review — НЕ drip-юниты.** Страницы уже live с Etap F (auto-grid/обзоры), pool_number нет. 2-я волна для них = enrich/reconcile-in-place (правка живого, не новая публикация → velocity-риска нет). Не прятать. Та же логика что 116 первой волны.
- **Multi-keyword поглощение** (как best-for): несколько ключей про один тул → одна страница. guide: loyalty(4)/sidekick(3)/omnisend,attentive,manychat,recharge,smile-io,aftership,loop-subs,loop-returns(2). alternatives: mailchimp(4)/adcreative-ai(3)/omnisend(2). Объясняет «недостачу» при наивном счёте страниц.

### Fixes
- `app/best/[slug]/page.tsx` + `app/ru/best/[slug]/page.tsx` — dynamicParams=true.
- `app/guides/[slug]/page.tsx` + `app/ru/guides/[slug]/page.tsx` — dynamicParams=true.
- `tools.alternatives_editorial` для 14 тулзов (mailchimp, yotpo, omnisend, northbeam, loox, judge-me, manychat, tidio, aftership, attentive, adcreative-ai, signifyd, loyaltylion, pencil).
- `tools.pricing_min`/`pricing_notes`/`pricing_notes_ru` для recharge (25→99 + hidden-$25 framing).

### Open follow-ups / ТОЧКА ВХОДА — следующая сессия (Content writing)

**ЧАСТЬ 2 — залить 19 внешних туллов в каталог:**
- Источник Deep Research: `/mnt/user-data/uploads/Extra_Tools.md` (19 внешних конкурентов из Часть-2-анализа). Отдать Claude Code → INSERT 19 `tools`-строк (БЕЗ миграций, существующие поля).
- **affiliate_url где партнёрка есть:** Constant Contact, ActiveCampaign, Brevo, Hyros, Chatfuel, LiveChat, Help Scout, ShipStation, Bazaarvoice.
- **carve-out (нет CTA, /go/→/tools) где нет:** Zendesk, Intercom, Riskified, ParcelLab, Route, Google Analytics, Rockerbox, Stamped + слабые Bold Subscriptions, Returnly.

**ЧАСТЬ 3 — генерация по новым туллам:**
- (6) **19 tool-страниц** новых туллов → `/tools/` СКРЫТЫМИ, pool продолжать **от 48**, по priority внешнего (Constant Contact → Bazaarvoice → ActiveCampaign → Hyros → Chatfuel → Brevo → Stamped → хвост). Контроль-first.
- (7) **24 vs-comparison** → `/compare/` DB-driven СКРЫТЫМИ, по priority ключа (`mailchimp vs constant contact` ps1170 первый). **Контроль-first для comparison** (DB-bridge MDX→`public.comparisons` + gate-строка `content_type='comparisons'` + **RU-row ВРУЧНУЮ** — translate-script comparisons НЕ покрывает). webhook drip-aware уже пофикшен — reconcile не нужен.

**CODE-долги (когда дойдём до кода):**
1. alternatives тонкие-категории грид (`pool.length===1` → closest-in-category вместо cross-category по рейтингу).

**КРИТИЧНО:** весь НОВЫЙ контент (tool-страницы, comparisons) — СКРЫТЫМ в drip-очередь, pool продолжать от 48. alternatives/review-паттерн (enrich/reconcile live) — только для уже-существующих страниц.
