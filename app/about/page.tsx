import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, BarChart3, Beaker, ScanSearch } from "lucide-react"

import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { buildMetadata } from "@/lib/seo/metadata"
import { generateBreadcrumbSchema } from "@/lib/seo/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getLocale } from "@/lib/i18n/get-locale"
import { absoluteUrl, cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/* ----------------------------------------------------------------------------
   /about — TZ § 16 (sprint 6)
   ----------------------------------------------------------------------------
   Mission + positioning page. Short on purpose — the catalog and the
   reviews do the heavy lifting. Three pillars (build, test, publish) anchor
   the "operator for operators" claim with verifiable detail rather than
   marketing fluff. The CTA tail funnels back into the calculators since
   they're the highest-intent surfaces we have.
---------------------------------------------------------------------------- */

const PATH = "/about"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return buildMetadata({
    title:
      locale === "ru"
        ? "О Botapolis"
        : "About Botapolis",
    description:
      locale === "ru"
        ? "Botapolis — operator's manual для Shopify-продавцов. Сделано оператором для операторов."
        : "Botapolis — an operator's manual for Shopify merchants. Built by a Shopify operator for Shopify operators.",
    path: PATH,
    locale,
  })
}

export default async function AboutPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix: "" | "/ru" = locale === "ru" ? "/ru" : ""

  const breadcrumb = generateBreadcrumbSchema([
    { name: locale === "ru" ? "Главная" : "Home",  path: `${localePrefix}/` },
    { name: locale === "ru" ? "О нас"   : "About", path: `${localePrefix}${PATH}` },
  ])

  const pillars = [
    {
      icon:  Beaker,
      title: locale === "ru" ? "Тестируем сами"      : "We run them ourselves",
      body:  locale === "ru"
        ? "Каждый инструмент перед обзором живёт на реальном Shopify-магазине минимум 30 дней. Никаких рецензий по пресс-релизу."
        : "Every tool runs on a real Shopify store for at least 30 days before we review it. No press-release reviews.",
    },
    {
      icon:  BarChart3,
      title: locale === "ru" ? "Считаем, не угадываем" : "We do the math",
      body:  locale === "ru"
        ? "Калькуляторы используют те же формулы, что и операторы каждый понедельник в Sheets — только без копипасты."
        : "The calculators use the same formulas operators rebuild in Sheets every Monday — just without the copy-paste tax.",
    },
    {
      icon:  ScanSearch,
      title: locale === "ru" ? "Сравниваем, не нянчим" : "We pick a winner",
      body:  locale === "ru"
        ? "На каждой странице сравнения внизу — конкретный вердикт под конкретный сценарий. Никаких «оба отличные»."
        : "Every comparison page ends with a verdict tied to a scenario. None of that 'they're both great' fence-sitting.",
    },
  ]

  return (
    <>
      <Navbar strings={dict.nav} localePrefix={localePrefix} />

      <main>
        {/* =================================================================
            HERO — centered, brand gradient sweep behind the headline
            ================================================================= */}
        <section className="relative overflow-hidden border-b border-[var(--border-base)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-32 size-[640px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.22), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-32 size-[640px] rounded-full opacity-35 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.22), transparent 60%)",
            }}
          />

          <div className="container-default relative pt-14 pb-16 lg:pt-24 lg:pb-20 text-center">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {locale === "ru" ? "О нас" : "About"}
            </p>
            <h1 className="mt-3 mx-auto max-w-3xl text-h1 lg:text-display font-semibold tracking-[-0.04em]">
              {locale === "ru"
                ? "Operator's manual для Shopify."
                : "An operator's manual for Shopify."}
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-[16px] lg:text-lg leading-[1.6] text-[var(--text-secondary)]">
              {locale === "ru"
                ? "Сделано Shopify-оператором для Shopify-операторов. Без нянек, без воды, без аффилиатных рейтингов."
                : "Built by a Shopify operator for Shopify operators. No hand-holding, no filler, no affiliate-driven rankings."}
            </p>

            <div className="mt-8 inline-flex items-center gap-3">
              <Link
                href={`${localePrefix}/tools`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 px-5 text-base text-white",
                )}
                style={{
                  background:
                    "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                }}
              >
                {locale === "ru" ? "Открыть инструменты" : "See the tools"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href={`${localePrefix}/compare`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-5 text-base",
                )}
              >
                {locale === "ru" ? "Сравнения" : "Comparisons"}
              </Link>
            </div>
          </div>
        </section>

        {/* =================================================================
            MISSION — single block, narrow column for readability
            ================================================================= */}
        <section className="container-narrow py-14 lg:py-20">
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
            {locale === "ru" ? "Миссия" : "Mission"}
          </p>
          <h2 className="mt-3 text-h2 font-semibold tracking-[-0.02em] [text-wrap:balance]">
            {locale === "ru"
              ? "Меньше шума, больше денег у магазина."
              : "Less noise, more revenue in the store's pocket."}
          </h2>
          <div className="mt-6 flex flex-col gap-5 text-[17px] leading-[1.7] text-[var(--text-secondary)]">
            <p>
              {locale === "ru"
                ? "Каждый Shopify-оператор знает чувство: открываешь подборку «Top 25 AI-инструментов для эком в 2026» и понимаешь, что это рекламные карточки с одинаковыми пятёрками. Никакого реального теста, никакой конкретики, никакой ответственности."
                : "Every Shopify operator knows the feeling: you open another 'Top 25 AI tools for ecom in 2026' listicle and realise it's affiliate boilerplate with identical five-star scores. No real test, no specifics, nobody on the hook."}
            </p>
            <p>
              {locale === "ru"
                ? "Botapolis собран как анти-листикл. Мы запускаем инструменты на реальных магазинах, считаем экономику, отслеживаем за месяцами и пишем то, что хотел бы прочитать сам перед покупкой."
                : "Botapolis is built as the anti-listicle. We run tools on real stores, measure the economics, track them over months, and write the thing we'd have wanted to read before buying."}
            </p>
            <p>
              {locale === "ru"
                ? "Если инструмент плох — мы это пишем. Даже если у нас с ним партнёрский договор."
                : "If a tool is bad, we say it. Partner deal or not."}
            </p>
          </div>
        </section>

        {/* =================================================================
            PILLARS — 3-up
            ================================================================= */}
        <section className="container-default pb-14 lg:pb-20">
          <ul role="list" className="grid gap-4 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon
              return (
                <li
                  key={p.title}
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6"
                >
                  <span
                    className="inline-flex size-10 items-center justify-center rounded-md"
                    style={{
                      background:
                        "color-mix(in oklch, var(--brand) 12%, transparent)",
                      color: "var(--brand)",
                    }}
                  >
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <h3 className="text-h4 font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                    {p.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                    {p.body}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        {/* =================================================================
            CONTACT / TAIL
            ================================================================= */}
        <section className="container-default pb-20">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)]",
              "p-8 lg:p-12 shadow-[var(--shadow-md)]",
            )}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 -top-1/2 h-[200%] pointer-events-none opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(16,185,129,0.12), transparent 60%)",
              }}
            />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {locale === "ru" ? "Контакты" : "Contact"}
                </p>
                <h3 className="mt-2 text-h3 font-semibold tracking-[-0.02em]">
                  {locale === "ru"
                    ? "Нашёл ошибку в обзоре? Запусти нас в Lyro своего магазина?"
                    : "Spot a factual error? Want us to test a tool we've missed?"}
                </h3>
                <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                  <Link href="mailto:editorial@botapolis.com" className="underline-offset-4 hover:underline">
                    editorial@botapolis.com
                  </Link>
                </p>
              </div>
              <Link
                href={`${localePrefix}/methodology`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-5 text-base",
                )}
              >
                {locale === "ru" ? "Методология" : "Methodology"}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
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
