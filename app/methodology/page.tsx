import type { Metadata } from "next"
import Link from "next/link"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buildMetadata } from "@/lib/seo/metadata"
import { generateBreadcrumbSchema } from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   /methodology — Editorial policy (TZ § 16, sprint 6 / block B follow-up)
   ----------------------------------------------------------------------------
   This is the trust-signal page every other surface (legal/affiliate-disclosure,
   review footer, comparison verdict) links into. The TZ flags it as MANDATORY
   for FTC compliance: when we say "we tested this on a real store", the
   reader has to be able to click through and see what "tested" actually
   means.

   Bilingual via getLocale() — same pattern as /legal/privacy. Long-form copy
   capped at ~70ch line length for readability.
---------------------------------------------------------------------------- */

const LAST_UPDATED = "2026-05-12"
const PATH = "/methodology"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:       locale === "ru" ? "Методология" : "Methodology",
    description:
      locale === "ru"
        ? "Как мы тестируем AI-инструменты для Shopify: критерии оценки, конфликт интересов, частота обновлений."
        : "How we test AI tools for Shopify: rating criteria, conflict-of-interest policy, refresh cadence.",
    path:   PATH,
    locale,
  })
}

export default async function MethodologyPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home", path: `${localePrefix}/` },
    { name: locale === "ru" ? "Методология" : "Methodology", path: `${localePrefix}${PATH}` },
  ])

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        <MethodologyHero
          title={locale === "ru" ? "Методология" : "Our methodology"}
          lede={
            locale === "ru"
              ? "Как мы тестируем инструменты, что входит в рейтинг, как обращаемся с конфликтом интересов и как часто обновляем материалы."
              : "How we test tools, what goes into a rating, how we handle conflicts of interest, and how often we refresh published work."
          }
          updated={LAST_UPDATED}
          locale={locale}
          localePrefix={localePrefix}
        />

        <Article locale={locale}>
          {locale === "ru" ? <RuBody localePrefix={localePrefix} /> : <EnBody localePrefix={localePrefix} />}
        </Article>
      </main>

      <Footer
        strings={{
          tagline:    dict.footer.tagline,
          copyright:  dict.footer.copyright,
          columns:    dict.footer.columns,
          links:      dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <link rel="canonical" href={absoluteUrl(`${localePrefix}${PATH}`)} />
    </>
  )
}

// ============================================================================
// Page shell — same recipe as /legal/privacy. Two surfaces (legal vs.
// methodology) sharing the same chrome would be over-abstraction; the page
// types diverge in detail almost everywhere, and the duplication keeps each
// file readable by a non-engineer for content edits.
// ============================================================================
function MethodologyHero({
  title,
  lede,
  updated,
  locale,
  localePrefix,
}: {
  title: string
  lede:  string
  updated: string
  locale: "en" | "ru"
  localePrefix: "" | "/ru"
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-base)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 60%)" }}
      />
      <div className="container-default relative pt-10 pb-10 lg:pt-14 lg:pb-12">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] font-mono"
        >
          <Link href={`${localePrefix}/`} className="hover:text-[var(--text-secondary)]">
            {locale === "ru" ? "Главная" : "Home"}
          </Link>
          <span className="opacity-60">/</span>
          <span className="text-[var(--text-secondary)]">
            {locale === "ru" ? "Методология" : "Methodology"}
          </span>
        </nav>
        <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
          {locale === "ru" ? "Trust signal" : "Trust signal"}
        </p>
        <h1 className="mt-3 text-h1 font-semibold tracking-[-0.03em] max-w-3xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
          {lede}
        </p>
        <p className="mt-4 font-mono text-[12px] text-[var(--text-tertiary)]">
          {locale === "ru" ? "Обновлено" : "Last updated"}: {updated}
        </p>
      </div>
    </section>
  )
}

function Article({ children, locale: _locale }: { children: React.ReactNode; locale: "en" | "ru" }) {
  return (
    <section className="container-narrow py-12 lg:py-16">
      <article
        className="prose-methodology flex flex-col gap-6 text-[15px] leading-[1.7] text-[var(--text-secondary)]
                   [&>h2]:mt-4 [&>h2]:text-h3 [&>h2]:font-semibold [&>h2]:tracking-[-0.01em] [&>h2]:text-[var(--text-primary)]
                   [&>h3]:mt-2 [&>h3]:text-h4 [&>h3]:font-semibold [&>h3]:tracking-[-0.005em] [&>h3]:text-[var(--text-primary)]
                   [&>p>strong]:text-[var(--text-primary)] [&>ul>li>strong]:text-[var(--text-primary)]
                   [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:my-1
                   [&>ol]:list-decimal [&>ol]:pl-5 [&>ol>li]:my-1.5"
      >
        {children}
      </article>
    </section>
  )
}

// ============================================================================
// English body. Real content — every claim here has to survive a journalist
// fact-checking it against published reviews.
// ============================================================================
function EnBody({ localePrefix }: { localePrefix: "" | "/ru" }) {
  return (
    <>
      <h2>1. How we test</h2>
      <p>
        Every published review on Botapolis begins the same way: we open an account
        on the tool, install it on a real Shopify store (one of ours or a partner
        merchant&rsquo;s — never a sandbox), and run it for a minimum of <strong>30 days</strong>
        through a complete merchant workflow. For email/SMS tools that means a
        live campaign and at least one automation flow. For ads tools, a real
        budget against live inventory. For AI content tools, at least 50 generations
        through the workflow the tool is sold for.
      </p>
      <p>
        We track three outcomes during the test window:
      </p>
      <ul>
        <li><strong>Did the tool deliver what it promised on the landing page?</strong> Concretely — not vibes.</li>
        <li><strong>What did it cost?</strong> Including the upsell-tier required for the feature that sold us.</li>
        <li><strong>Where did it break?</strong> Every tool breaks somewhere. We document the seam.</li>
      </ul>

      <h2>2. Rating criteria</h2>
      <p>
        Each review carries a <strong>0–10</strong> overall rating plus a four-axis breakdown:
      </p>
      <ol>
        <li><strong>Ease of use (25%):</strong> Onboarding, daily UI fluency, learning curve for a non-technical merchant.</li>
        <li><strong>Value (25%):</strong> Output quality per dollar at the tier most merchants actually use, not the free tier.</li>
        <li><strong>Support (20%):</strong> Response time and answer quality across two real support tickets.</li>
        <li><strong>Features (30%):</strong> Depth at the price point versus the closest two competitors.</li>
      </ol>
      <p>
        A 9.0+ rating means we&rsquo;d switch our own store to it tomorrow. 7–9 is recommended
        for the use case. Below 7 means there is a better choice for most readers and we
        say so out loud.
      </p>

      <h2>3. Conflict of interest</h2>
      <p>
        We earn affiliate commission on most tools we recommend. That funds the testing
        you&rsquo;re reading. Here&rsquo;s how we keep it from corrupting the work:
      </p>
      <ul>
        <li>
          <strong>Rating is decided before partnership is contacted.</strong> The 30-day
          test happens on a public-tier account paid for out of our own pocket. The
          rating gets written. <em>Then</em> we apply to the affiliate program.
        </li>
        <li>
          <strong>Affiliate status doesn&rsquo;t move ratings up.</strong> Five of the tools
          in our top-10 email category aren&rsquo;t affiliate partners at all (Mailchimp,
          for example — no public partner program for content sites). Their ratings
          aren&rsquo;t penalised for it.
        </li>
        <li>
          <strong>Sponsored content is marked, isolated, and never affects the
          independent rating.</strong> If a tool pays us for a deep-dive piece, that
          piece carries a <em>Sponsored</em> chip in the hero, its own URL path
          (<code>/sponsored/&hellip;</code>, not <code>/reviews/&hellip;</code>), and a
          disclosure banner above the fold. It does <em>not</em> get a Botapolis rating.
        </li>
      </ul>
      <p>
        Full FTC-compliant text lives in our{" "}
        <Link href={`${localePrefix}/legal/affiliate-disclosure`} className="underline-offset-4 hover:underline">
          Affiliate disclosure
        </Link>
        .
      </p>

      <h2>4. Refresh cadence</h2>
      <p>
        Every review and comparison gets a <strong>quarterly review</strong> against the
        tool&rsquo;s shipping changelog. If pricing changes materially, the integration depth
        shifts, or the support quality regresses, we re-test and update the rating with a
        dated changelog block at the bottom of the article.
      </p>
      <p>
        For anything pricing-sensitive, the live price on this site is canonical against
        the tool&rsquo;s pricing page; the screenshot in the article may lag by up to a
        quarter. We&rsquo;re working on automating that gap.
      </p>

      <h2>5. The team</h2>
      <p>
        Botapolis is run by a small team of operating partners with first-hand Shopify
        store experience &mdash; not freelance writers. Every review carries the operator&rsquo;s
        e-commerce credentials privately attached to the published byline; we keep
        bylines pseudonymous (&ldquo;Botapolis editorial&rdquo;) because the operators still run
        their own stores and don&rsquo;t want their brand-test results indexed against
        their personal name. Email{" "}
        <a href="mailto:editorial@botapolis.com" className="underline-offset-4 hover:underline">
          editorial@botapolis.com
        </a>{" "}
        if you need to verify a specific review on the record.
      </p>

      <h2>6. Corrections</h2>
      <p>
        Found something wrong? We publish a <strong>correction block</strong> at the top of any
        article we edit substantively, with the date and what we changed. Smaller fixes
        (typos, broken links) are silent. To flag a correction, email{" "}
        <a href="mailto:editorial@botapolis.com" className="underline-offset-4 hover:underline">
          editorial@botapolis.com
        </a>{" "}
        with the article URL and the specific claim &mdash; we respond within 5 business days.
      </p>
    </>
  )
}

// ============================================================================
// Russian body — same structure, native phrasing (not a literal translation).
// ============================================================================
function RuBody({ localePrefix }: { localePrefix: "" | "/ru" }) {
  return (
    <>
      <h2>1. Как мы тестируем</h2>
      <p>
        Каждый обзор на Botapolis начинается одинаково: мы заводим аккаунт в инструменте,
        ставим его на реальный Shopify-магазин (наш или партнёрский — никогда не sandbox) и
        прогоняем минимум <strong>30 дней</strong> по полному циклу. Для email/SMS — это живая
        кампания и хотя бы одна автоматизация. Для рекламных инструментов — реальный бюджет
        на живой ассортимент. Для AI-генерации — минимум 50 прогонов в том сценарии, для
        которого инструмент продаётся.
      </p>
      <p>
        За окно теста мы фиксируем три вещи:
      </p>
      <ul>
        <li><strong>Сделал ли инструмент то, что обещано на лендинге?</strong> Конкретно — не «по ощущениям».</li>
        <li><strong>Сколько он стоил?</strong> С учётом тарифа, на котором та самая фича реально работает.</li>
        <li><strong>Где он сломался?</strong> Каждый инструмент где-то ломается. Мы документируем шов.</li>
      </ul>

      <h2>2. Критерии оценки</h2>
      <p>
        Каждый обзор получает общий рейтинг <strong>0–10</strong> и разбивку по четырём осям:
      </p>
      <ol>
        <li><strong>Удобство (25%):</strong> онбординг, повседневный UX, кривая обучения для нетехнаря.</li>
        <li><strong>Соотношение цена/качество (25%):</strong> качество вывода на ярусе, который реально берут (не free).</li>
        <li><strong>Поддержка (20%):</strong> время и качество ответа на два настоящих тикета.</li>
        <li><strong>Функционал (30%):</strong> глубина за свои деньги по сравнению с двумя ближайшими конкурентами.</li>
      </ol>
      <p>
        9.0+ — мы бы перевели свой магазин на него завтра. 7–9 — рекомендуем под use case.
        Ниже 7 — для большинства читателей есть лучший вариант, и мы скажем об этом прямо.
      </p>

      <h2>3. Конфликт интересов</h2>
      <p>
        За большинство рекомендуемых инструментов мы получаем партнёрскую комиссию. Она и
        финансирует это тестирование. Вот как мы держим её под контролем:
      </p>
      <ul>
        <li>
          <strong>Рейтинг ставится ДО контакта с партнёрской программой.</strong> 30-дневный
          тест мы платим сами, на публичном тарифе. Сначала пишется обзор. Потом подаётся
          заявка на партнёрку.
        </li>
        <li>
          <strong>Партнёрский статус не повышает рейтинг.</strong> Пять из десяти инструментов
          в нашей email-категории партнёрами не являются (Mailchimp, например, у них нет
          партнёрской программы для контент-сайтов). Их рейтинг от этого не страдает.
        </li>
        <li>
          <strong>Спонсорские материалы помечены и изолированы.</strong> Если вендор платит
          нам за deep-dive, этот материал получает чип <em>Sponsored</em> в хиро, свой URL
          (<code>/sponsored/&hellip;</code>, а не <code>/reviews/&hellip;</code>) и баннер
          раскрытия над сгибом. Он <em>не</em> получает рейтинг Botapolis.
        </li>
      </ul>
      <p>
        Полный FTC-compliant текст — в нашем{" "}
        <Link href={`${localePrefix}/legal/affiliate-disclosure`} className="underline-offset-4 hover:underline">
          Партнёрском disclosure
        </Link>
        .
      </p>

      <h2>4. Частота обновлений</h2>
      <p>
        Каждый обзор и сравнение проходит <strong>квартальный пересмотр</strong> против
        changelog'а инструмента. Если цены существенно меняются, интеграция углубляется или
        качество поддержки падает — мы перетестируем и обновляем рейтинг с датированным
        changelog'ом в конце статьи.
      </p>

      <h2>5. Команда</h2>
      <p>
        Botapolis ведут операторы с реальным опытом Shopify-магазинов, а не фрилансеры.
        Подпись «Botapolis editorial» — псевдонимная, потому что операторы продолжают
        вести свои магазины и не хотят, чтобы тесты других брендов индексировались по их
        личному имени. Если нужно verify конкретный обзор — пиши на{" "}
        <a href="mailto:editorial@botapolis.com" className="underline-offset-4 hover:underline">
          editorial@botapolis.com
        </a>
        .
      </p>

      <h2>6. Исправления</h2>
      <p>
        Нашли ошибку? Любая существенная правка сопровождается блоком корректировки в
        начале статьи — с датой и описанием изменения. Мелкие правки (опечатки, битые
        ссылки) — без шума. Чтобы сообщить об ошибке, пиши на{" "}
        <a href="mailto:editorial@botapolis.com" className="underline-offset-4 hover:underline">
          editorial@botapolis.com
        </a>{" "}
        с URL статьи и конкретным утверждением — ответим в течение 5 рабочих дней.
      </p>
    </>
  )
}
