/**
 * One-off: populate Klaviyo's row in `tools` with the reference Etap E
 * payload — honest analyst verdict (EN + RU), the six *_ru twins added by
 * migration 016, and a rewritten EN meta_description that drops the legacy
 * "we tested 90 days" fake-hands-on framing.
 *
 * Owner-locked 2026-05-31 (Option A): verdict and all editorial copy must
 * be analyst-voice (conclusions from aggregated data + verified operator
 * quotes) — NEVER first-person fabricated test claims. See content-flags.md
 * for Klaviyo-specific framing rules (commission-source-uncertainty,
 * pricing-gotcha at $10K/mo).
 *
 * Run with:
 *   npx tsx scripts/seed-klaviyo-reference.ts --apply
 *
 * Delete this file after Klaviyo reference ships and owner approves.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

// ============================================================================
// Editorial payload
// ============================================================================

const META_DESCRIPTION_EN =
  "Honest analyst review of Klaviyo for Shopify and Shopify Plus. Pricing inflection points, AI-feature ROI, external ratings, and when the active-profile bill stops paying back."

const META_TITLE_RU =
  "Klaviyo: обзор 2026 — стоит ли всё ещё для Shopify?"

const META_DESCRIPTION_RU =
  "Честный аналитический обзор Klaviyo для Shopify и Shopify Plus. Ценовые пороги, окупаемость AI-функций, сторонние рейтинги и когда счёт за активные профили перестаёт оправдывать себя."

const NOT_FOR_RU =
  "Рассылочные малые магазины, B2B/услуги и совсем маленькие магазины, которым нужен простой email-инструмент — цена растёт агрессивно с размером списка."

const PRICING_NOTES_RU = `Тарифы: Free $0 (250 активных профилей, 500 писем/мес, 150 SMS-кредитов); Email от $20/мес за 251-500 активных профилей; масштабируется с числом активных профилей до ~$2,300/мес на 250K профилях; Klaviyo One (enterprise) становится обязательным выше ~$10K/мес расхода и добавляет 20% к общей сумме

Подводные камни биллинга: тарифицируется по АКТИВНЫМ ПРОФИЛЯМ, а не отправленным письмам (по Klaviyo Help Center FAQ, изменение вступило в силу 18 февраля 2025, клиенты уведомлены 14 января 2025: «customers will be required to be on an email plan that matches or exceeds their active profile count»); отписавшиеся, но не помещённые в suppress контакты продолжают тарифицироваться; 90-дневная блокировка suppress не даёт переключиться; авто-апгрейд при пересечении тира (авто-даунгрейд по умолчанию ВЫКЛЮЧЕН); SMS использует Klaviyo-кредиты со страновыми множителями (UK=5×, AU=4×, CA=3×, MMS=3×); Reviews, Customer Hub, Data Platform — отдельные add-on с собственной ценой; лимит «25% Appreciation Discount» сжимается с каждым даунгрейдом и исчезает по достижении нуля; на self-serve годовой скидки нет

Free-план: да — 250 профилей / 500 писем / 150 SMS-кредитов; email-поддержка только первые 60 дней

Проверено 2026-05-30`

const SHOPIFY_NATIVE_NOTES_RU =
  "Да — глубокая нативная интеграция со Shopify; присутствие в Shopify App Store; статус Built-for-Shopify; синхронизация клиентов, товаров, заказов и событий близкая к реальному времени; нативный Customer Hub для Shopify-витрин; поддержка Klaviyo SMS; встроенные формы и попапы."

const FEATURES_RU = [
  {
    name: "Предиктивная аналитика (CLV / риск оттока / дата следующего заказа)",
    is_ai: true,
    ai_kind: "ML на исторических данных покупок",
    description: "Прогнозирует customer lifetime value, вероятность оттока и ожидаемую дату следующего заказа на уровне профиля",
    plan_availability: "Email от $20/мес и выше (требуется 500+ заказов / 180 дней данных)",
  },
  {
    name: "Klaviyo AI (генеративный контент)",
    is_ai: true,
    ai_kind: "LLM, дообученный на данных перформанса писем Klaviyo",
    description: "Генерирует subject-line, тексты писем, SMS и форм в голосе бренда",
    plan_availability: "Платные планы (Email / Email+SMS)",
  },
  {
    name: "Klaviyo Data Platform (Advanced KDP)",
    is_ai: false,
    description: "Слой CDP с продвинутым ingest данных, identity resolution и сегментацией",
    plan_availability: "Advanced KDP — отдельно тарифицируемый ADD-ON ($4,765/мес на 1M профилей по Klaviyo Help Center)",
  },
  {
    name: "Customer Hub",
    is_ai: false,
    description: "Брендированный self-service портал клиента: заказы, лояльность, рекомендации",
    plan_availability: "Платный add-on, тарифицируется по числу активных профилей",
  },
  {
    name: "Marketing Analytics",
    is_ai: false,
    description: "Кросс-канальная атрибуция и продвинутая маркетинговая отчётность",
    plan_availability: "Marketing Analytics — отдельно тарифицируемый ADD-ON",
  },
  {
    name: "Helpdesk / Customer Agent",
    is_ai: true,
    ai_kind: "AI-агент, решающий support-тикеты",
    description: "Нативный helpdesk с AI Customer Agent для разрешения тикетов",
    plan_availability: "Helpdesk и Customer Agent — отдельные consumption-based продукты",
  },
  {
    name: "Flexible Sending",
    is_ai: false,
    description: "Приостановка отправок в slow-сезон, чтобы снизить стоимость по активным профилям",
    plan_availability: "Все платные планы (ручное включение)",
  },
  {
    name: "Mobile Push Marketing",
    is_ai: false,
    description: "Отправка брендированных push-уведомлений пользователям мобильного приложения",
    plan_availability: "Все платные планы (Email и выше)",
  },
  {
    name: "Klaviyo One (enterprise-тир)",
    is_ai: false,
    description: "Auto-триггер enterprise-аккаунта при расходе $10,000+/мес с 20% надбавкой и выделенным TAM",
    plan_availability: "ENTERPRISE-ONLY (Klaviyo One)",
  },
]

const VERDICT_EN = `The data points to one straightforward profile: Shopify and Shopify Plus DTC brands above roughly $50K/mo who will actually run the segmentation engine, flow library, and predictive analytics. Klaviyo's deep native Shopify integration, near-real-time event sync, and CLV / churn models (which require 500+ orders and ~180 days of data to calibrate) only earn their keep when list growth and per-subscriber revenue justify the active-profile billing curve.

Two pricing inflections matter more than the entry tier. Above roughly $10K/mo total spend, Klaviyo One becomes mandatory and adds 20% on top — not optional, not negotiable on self-serve. Customer Agent is priced per conversation ($0.70/conv), billed separately from your email plan, so high-volume support stacks land outside your contact-count budget.

For newsletter-only shops, B2B / services, or stores under roughly $15K MRR, Klaviyo is structurally over-built for the use case — pricing scales aggressively with list size and you will pay for capability you will not run. G2 (4.6 / 1,352 reviews) and the Shopify App Store (4.8 / 3,000+ reviews) corroborate the capability story; Trustpilot is mixed and skews toward billing complaints rather than product feedback.`

const VERDICT_RU = `Данные складываются в один профиль: Shopify и Shopify Plus DTC-бренды с выручкой свыше примерно $50K/мес, которые реально будут пользоваться движком сегментации, библиотекой флоу и предиктивной аналитикой. Глубокая нативная интеграция со Shopify, синхронизация событий близкая к реальному времени и модели CLV / churn (для калибровки нужны 500+ заказов и ~180 дней данных) окупаются только когда рост базы и выручка на подписчика оправдывают кривую биллинга по активным профилям.

Два ценовых порога важнее стартового тарифа. При суммарном расходе свыше ~$10K/мес Klaviyo One становится обязательным и добавляет 20% сверху — это не опция и в self-serve не обсуждается. Customer Agent тарифицируется за разговор ($0.70/conv), отдельно от email-плана — большие support-нагрузки уходят за пределы бюджета по количеству контактов.

Для рассылочных магазинов, B2B / услуг, либо магазинов с выручкой ниже ~$15K MRR Klaviyo структурно избыточен — цена растёт агрессивно с размером списка, и вы будете платить за возможности, которые не используете. G2 (4.6 / 1352 отзыва) и Shopify App Store (4.8 / 3000+ отзывов) подтверждают функциональную сторону; Trustpilot смешан и склоняется к жалобам на биллинг, а не к продуктовым отзывам.`

// ============================================================================
// Apply
// ============================================================================

const PAYLOAD = {
  meta_description: META_DESCRIPTION_EN,
  meta_title_ru: META_TITLE_RU,
  meta_description_ru: META_DESCRIPTION_RU,
  not_for_ru: NOT_FOR_RU,
  pricing_notes_ru: PRICING_NOTES_RU,
  features_ru: FEATURES_RU,
  shopify_native_notes_ru: SHOPIFY_NATIVE_NOTES_RU,
  verdict: VERDICT_EN,
  verdict_ru: VERDICT_RU,
}

const FIELD_LABELS: Record<keyof typeof PAYLOAD, string> = {
  meta_description: 'meta_description (EN, rewritten)',
  meta_title_ru: 'meta_title_ru',
  meta_description_ru: 'meta_description_ru',
  not_for_ru: 'not_for_ru',
  pricing_notes_ru: 'pricing_notes_ru',
  features_ru: 'features_ru (9 items)',
  shopify_native_notes_ru: 'shopify_native_notes_ru',
  verdict: 'verdict (EN)',
  verdict_ru: 'verdict_ru',
}

async function main() {
  const apply = process.argv.includes('--apply')

  console.log(`\nKlaviyo reference seed — ${apply ? 'APPLY' : 'DRY-RUN'}\n`)
  for (const [k, label] of Object.entries(FIELD_LABELS)) {
    const v = (PAYLOAD as Record<string, unknown>)[k]
    const preview =
      typeof v === 'string' ? `${v.length} chars` :
      Array.isArray(v) ? `array(${v.length})` :
      typeof v
    console.log(`  ${label.padEnd(34)} → ${preview}`)
  }

  if (!apply) {
    console.log('\nRe-run with --apply to write to Supabase.')
    return
  }

  const { data, error } = await sb
    .from('tools')
    .update(PAYLOAD)
    .eq('slug', 'klaviyo')
    .select('slug, meta_title, meta_title_ru, meta_description, meta_description_ru, verdict, verdict_ru, not_for_ru, pricing_notes_ru, shopify_native_notes_ru')
    .maybeSingle()

  if (error) {
    console.error('\nFATAL', error.message)
    process.exit(1)
  }
  if (!data) {
    console.error('\nNo klaviyo row found — UPDATE matched zero rows')
    process.exit(2)
  }

  console.log('\nUPDATE successful. Selected snapshot:\n')
  console.log(JSON.stringify({
    slug: data.slug,
    meta_title: data.meta_title,
    meta_title_ru: data.meta_title_ru,
    meta_description_chars: data.meta_description?.length ?? 0,
    meta_description_ru_chars: data.meta_description_ru?.length ?? 0,
    verdict_chars: data.verdict?.length ?? 0,
    verdict_ru_chars: data.verdict_ru?.length ?? 0,
    not_for_ru_chars: data.not_for_ru?.length ?? 0,
    pricing_notes_ru_chars: data.pricing_notes_ru?.length ?? 0,
    shopify_native_notes_ru_chars: data.shopify_native_notes_ru?.length ?? 0,
  }, null, 2))
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
