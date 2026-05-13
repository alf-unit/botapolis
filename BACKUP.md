# Botapolis — Бэкапы и восстановление

> Документ-шпаргалка «на чёрный день». Цель: чтобы и ты, и любой новый агент в стрессовой ситуации **за минуту** поняли что делать.
>
> Принцип: **не предотвращаем, а откатываем.** Branch protection / PR-флоу намеренно НЕ настроены — решение владельца. Вместо этого — точки возврата для каждого слоя.

---

## 🗺 Карта точек возврата

| Слой | Где хранится точка возврата | Срок жизни | Как создаётся |
|---|---|---|---|
| **Код + MDX контент** | git tag `stable-*` в `origin` | вечно | вручную, командой ниже |
| **Билд / деплой** | Vercel Deployments | вечно (Hobby хранит много, Pro — все) | автоматически при каждом push в `main` |
| **БД Supabase** | GitHub Actions artifact `db-backup-*` | 90 дней | автоматически каждый понедельник 04:00 UTC + ручной запуск |
| **Доступы (env vars)** | менеджер паролей пользователя | бессрочно | вручную, разово |

---

## 🆘 Сценарии аварии и как откатиться

### Сценарий 1 — «Сломал код / контент, на проде 500»

**Симптом:** Vercel показывает ошибку билда, или сайт открывается, но половина страниц упала.

**Быстрый фикс (30 секунд):** откатить деплой через Vercel UI.
1. [vercel.com/alf-unit/botapolis/deployments](https://vercel.com/alf-unit/botapolis/deployments)
2. Найти последний рабочий deployment (зелёный кружок + до момента когда сломалось).
3. Кликнуть `⋯` справа → **Promote to Production**.
4. Через 30 секунд старая версия снова на проде.

**Полный откат (если хочешь и main в git вернуть):**
```bash
git fetch --tags
git reset --hard stable-2026-05-13   # или другой stable-* тэг
git push --force-with-lease origin main
```
Vercel пересоберёт. Всё что было между tag'ом и поломкой — потеряно.

**Чтобы НЕ потерять промежуточные правки** — перед reset положи их на бранч:
```bash
git branch backup-broken-state
git reset --hard stable-2026-05-13
git push --force-with-lease origin main
# Теперь у тебя есть ветка backup-broken-state с тем что было
```

---

### Сценарий 2 — «Удалил MDX-файл / случайно перезаписал статью»

**Симптом:** статья пропала или ссодержит чушь после `git commit`.

**Если ещё не запушено:**
```bash
git checkout HEAD~1 -- content/reviews/en/имя-файла.mdx
# Откатит конкретный файл к версии прошлого коммита
```

**Если уже запушено и слилось в main:**
```bash
git log --oneline content/reviews/en/имя-файла.mdx   # найди коммит до поломки
git checkout <SHA> -- content/reviews/en/имя-файла.mdx
git commit -m "restore: rollback к рабочей версии"
git push origin main
```

---

### Сценарий 3 — «БД развалилась: DROP таблицы, потеря данных, кривая миграция»

**Симптом:** `/tools` пустой, `affiliate_clicks` потерян, или `psql` показывает что таблиц нет.

**Откат из бэкапа (самый свежий из GitHub Actions):**

1. Открой [github.com/alf-unit/botapolis/actions/workflows/backup-db.yml](https://github.com/alf-unit/botapolis/actions/workflows/backup-db.yml)
2. Кликни на последний успешный run (зелёная галочка).
3. Внизу — секция **Artifacts** → скачай `db-backup-<id>` (zip-файл).
4. Распакуй; внутри `botapolis-YYYY-MM-DD.sql.gz`.
5. Восстанавливай:

```bash
# Распаковать
gunzip botapolis-YYYY-MM-DD.sql.gz

# Получи Session-mode connection string из Supabase Dashboard
# (Settings → Database → Connection string → Session pooler)
export DB_URL="postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Восстанови (dump использует --clean --if-exists, поэтому таблицы будут пересозданы)
psql "$DB_URL" < botapolis-YYYY-MM-DD.sql
```

**Что восстанавливается:** только наша схема `public` — `tools`, `comparisons`, `affiliate_clicks`, `subscribers`, `saved_calculations`, `likes`, `contact_submissions`, `featured_listings`.

**Что НЕ восстанавливается из этого дампа:**
- `auth.users` (пользователи) — управляется Supabase, отдельная зона.
- Supabase Storage файлы — не используются в этом проекте.
- Edge Functions — нет.

> ⚠ Между последним бэкапом (понедельник) и моментом аварии возможна потеря данных. Если это критично — увеличь частоту бэкапов в `.github/workflows/backup-db.yml` (`cron: "0 4 * * *"` = ежедневно).

---

### Сценарий 4 — «Потерял доступ к Vercel / Supabase / GitHub»

**Симптом:** аккаунт забанили, утратили 2FA-устройство, и т.п.

**План:**
1. **GitHub** — у тебя есть локальный клон. Создай новый аккаунт / восстанови старый, создай новый репо, `git remote set-url origin <new>`, `git push origin --all --tags`. Всё на месте.
2. **Vercel** — создай новый проект, импортируй репо, **заново вписать env vars из менеджера паролей** (см. чеклист ниже). Поэтому env vars в менеджере паролей — критично.
3. **Supabase** — самое больное. Если потерял доступ к проекту:
   - Создай новый проект.
   - Применить миграции: `supabase/migrations/001_initial.sql`, `002_contact_submissions.sql`, `003_sync_tool_ratings.sql`, `004_canonical_compare_slugs.sql` (в порядке номеров).
   - Применить `supabase/seed.sql` (базовые tools).
   - Восстановить пользовательские данные из последнего `db-backup-*` (см. Сценарий 3).
   - Обновить `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` в Vercel и GitHub Secret `SUPABASE_DB_URL`.

---

## 🔐 Чеклист env vars для менеджера паролей

Список собран из [lib/env.ts](lib/env.ts) и [.env.example](.env.example). Зайди в [Vercel → Settings → Environment Variables](https://vercel.com/alf-unit/botapolis/settings/environment-variables), скопируй значения каждого ключа в свой менеджер паролей (1Password / Bitwarden / Proton Pass).

### Критичные (без них проект мёртв)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (server-only, секрет)
- [ ] `REVALIDATE_SECRET` — секрет для Supabase webhook → ISR

### Внешние сервисы (без них падают конкретные фичи)
- [ ] `OPENROUTER_API_KEY` — AI tool generator (`/tools/product-description`)
- [ ] `OPENROUTER_MODEL` — обычно `anthropic/claude-haiku-4.5` (необязательный override)
- [ ] `BEEHIIV_API_KEY` — newsletter
- [ ] `BEEHIIV_PUBLICATION_ID` — newsletter
- [ ] `TURNSTILE_SECRET_KEY` — анти-бот серверная часть
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — анти-бот фронт
- [ ] `UPSTASH_REDIS_REST_URL` — rate-limit
- [ ] `UPSTASH_REDIS_REST_TOKEN` — rate-limit
- [ ] `RESEND_API_KEY` — опционально, transactional email
- [ ] `RESEND_FROM_ADDRESS` — опционально, override адреса отправителя
- [ ] `RESEND_ADMIN_INBOX` — опционально, куда падают /contact submissions

### Публичные (не секреты, но удобно сохранить)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://botapolis.com`
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` = `botapolis.com`
- [ ] `NEXT_PUBLIC_PLAUSIBLE_ENABLED` = `true`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` — public ingest key
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com`

### Auto-provisioned (Vercel сам ставит, бэкапить не надо)
- `CRON_SECRET` — генерится Vercel для cron-проектов
- `NODE_ENV` — auto

### Отдельно — GitHub Secrets (не Vercel env)
- [ ] `SUPABASE_DB_URL` — Session-mode connection string для GitHub Actions backup workflow. [github.com/alf-unit/botapolis/settings/secrets/actions](https://github.com/alf-unit/botapolis/settings/secrets/actions)

> ⚠ `npx vercel env pull .env.local` на этом проекте отдаёт пустые строки — известный баг (см. [HANDOFF.md](HANDOFF.md) «Подводные камни»). Поэтому копируешь руками из Vercel UI.

---

## 🛠 Команды-шпаргалка

```bash
# Создать новую точку возврата для кода
git tag -a stable-$(date +%Y-%m-%d) -m "<что зафиксировано>"
git push origin stable-$(date +%Y-%m-%d)

# Список всех известных stable-точек
git tag -l "stable-*" -n1

# Откат кода к stable-точке
git reset --hard stable-YYYY-MM-DD
git push --force-with-lease origin main

# Откат деплоя через Vercel (когда git ещё ок, а билд кривой)
# → делается в браузере: Vercel Dashboard → Deployments → Promote to Production

# Триггер бэкапа БД вручную (когда хочется свежий дамп прямо сейчас)
# → браузер: github.com/alf-unit/botapolis/actions/workflows/backup-db.yml
#           → Run workflow → main → Run
# Или через gh CLI (требует gh auth login):
gh workflow run backup-db.yml --ref main
gh run watch                                    # смотрим прогресс
gh run download --name "db-backup-<run-id>"     # скачиваем

# Восстановление БД из дампа
gunzip botapolis-YYYY-MM-DD.sql.gz
psql "$DB_URL" < botapolis-YYYY-MM-DD.sql
```

---

## 📅 Регламент

| Когда | Что делать |
|---|---|
| Перед каждой большой правкой | `git tag -a stable-<date> ...` — точка отката кода |
| Раз в неделю | Бэкап БД работает автоматически (понедельник 04:00 UTC). Иногда заглядывать в Actions tab — убедиться что зелёное |
| Раз в месяц | Скачать последний artifact и положить в локальную папку — на случай если GitHub упадёт |
| После смены любого env var в Vercel | Обновить значение в менеджере паролей |
| После добавления нового env var | Дописать в [lib/env.ts](lib/env.ts), [.env.example](.env.example) и этот чеклист |

---

**Конец документа.** Если что-то непонятно — спроси агента; пусть пройдёт по этому файлу как чек-листу.
