import Link from "next/link"
import { ArrowRight, BarChart3, Mail, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Navbar } from "@/components/nav/Navbar"
import { Footer } from "@/components/nav/Footer"
import { NewsletterForm } from "@/components/marketing/NewsletterForm"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from "@/lib/seo/schema"

export default async function HomePage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const localePrefix = locale === "ru" ? "/ru" : ""

  // Featured-tool icon map. Keys MUST mirror `dict.tools.items` and the
  // slug map below — three calculators we actually ship today (Email ROI,
  // AI Cost Comparator, AI Product Description Generator).
  const toolIcons = {
    emailRoi:           Mail,
    aiCostComparator:   BarChart3,
    productDescription: Sparkles,
  } as const

  return (
    <>
      <Navbar
        strings={dict.nav}
        localePrefix={localePrefix as "" | "/ru"}
      />

      <main className="flex flex-col">
        {/* =========================================================
            HERO
            Two-column layout on desktop. Left: copy + CTAs +
            social proof. Right: live Email-ROI demo widget.
            Background: mint + violet radial glows for depth.
           ========================================================= */}
        <section className="relative overflow-hidden pt-12 lg:pt-20 pb-16 lg:pb-24">
          {/* Atmospheric glows — hidden from a11y tree */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -right-40 size-[700px] rounded-full opacity-50 blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.22), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-60 left-1/3 size-[600px] rounded-full opacity-40 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.18), transparent 60%)",
            }}
          />

          <div className="container-default relative">
            <div className="grid gap-12 lg:gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              {/* Left column */}
              <div className="flex flex-col gap-6 max-w-xl">
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {dict.hero.eyebrow}
                </span>

                <h1 className="text-display font-semibold tracking-[-0.04em] text-[var(--text-primary)] [text-wrap:balance]">
                  {dict.hero.headline}
                </h1>

                <p className="text-lg leading-[1.6] text-[var(--text-secondary)]">
                  {dict.hero.lede}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Link
                    href={`${localePrefix}/tools`}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-12 px-5 text-base text-white border-0",
                    )}
                    style={{
                      background:
                        "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                    }}
                  >
                    {dict.hero.ctaPrimary}
                    <ArrowRight className="size-4" data-icon="inline-end" />
                  </Link>
                  <Link
                    // Was /reviews until the May 2026 audit — that route
                    // doesn't exist yet (sprint 2 / MDX pipeline pending).
                    // /compare is the closest editorial surface we ship.
                    href={`${localePrefix}/compare`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-12 px-5 text-base border-[var(--border-base)]",
                    )}
                  >
                    {dict.hero.ctaSecondary}
                  </Link>
                </div>

                {/* Social proof row */}
                <div className="flex flex-wrap items-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      <span className="size-6 rounded-full border-2 border-[var(--bg-base)] bg-[#A7F3D0]" />
                      <span className="size-6 rounded-full border-2 border-[var(--bg-base)] bg-[#C4B5FD] -ml-1.5" />
                      <span className="size-6 rounded-full border-2 border-[var(--bg-base)] bg-[#FCD34D] -ml-1.5" />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {dict.hero.social}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-[var(--text-secondary)]">
                    <span className="text-[var(--brand)]">★★★★★</span>
                    <span className="font-mono">4.9</span>
                    <span>·</span>
                    <span>{dict.hero.rating}</span>
                  </div>
                </div>
              </div>

              {/* Right column: demo widget */}
              <DemoWidget strings={dict.hero.widget} />
            </div>
          </div>
        </section>

        {/* =========================================================
            FEATURED TOOLS
           ========================================================= */}
        <section className="pb-16 lg:pb-20">
          <div className="container-default">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <h2 className="text-h2 font-semibold tracking-[-0.02em]">
                  {dict.tools.title}
                </h2>
                <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
                  {dict.tools.subtitle}
                </p>
              </div>
              <Link
                href={`${localePrefix}/tools`}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
              >
                {dict.tools.viewAll}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(["emailRoi", "aiCostComparator", "productDescription"] as const).map((key) => {
                const item = dict.tools.items[key]
                const Icon = toolIcons[key]
                // Each featured-tool key maps to its actual /tools/{slug}
                // route. Audit (May 2026) confirmed all three resolve to 200.
                const slug =
                  key === "emailRoi"
                    ? "email-roi-calculator"
                    : key === "aiCostComparator"
                    ? "ai-cost-comparator"
                    : "product-description"
                return (
                  <Link
                    key={key}
                    href={`${localePrefix}/tools/${slug}`}
                    className={cn(
                      "group flex flex-col gap-4 rounded-xl p-6",
                      "bg-[var(--bg-surface)] border border-[var(--border-base)]",
                      "shadow-[var(--shadow-sm)]",
                      "transition-all duration-200 ease-[var(--ease-out-expo)]",
                      "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
                    )}
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

                    <h3 className="text-[18px] font-semibold leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-[1.6]">
                      {item.desc}
                    </p>

                    <div className="mt-1 flex items-baseline justify-between rounded-md border border-[var(--border-base)] bg-[var(--bg-muted)] px-3 py-2.5">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                        {item.metric}
                      </span>
                      <span className="font-mono text-[18px] font-medium text-[var(--brand)]">
                        {item.value}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-base)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                        {item.category}
                      </span>
                      <ArrowRight
                        className="size-4 text-[var(--text-tertiary)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            NEWSLETTER CTA (homepage feature card — full version
            lives in the Footer)
           ========================================================= */}
        <section className="pb-20">
          <div className="container-default">
            <div
              id="newsletter-hero"
              className="relative overflow-hidden mx-auto max-w-2xl rounded-3xl border border-[var(--border-base)] bg-[var(--bg-surface)] px-6 py-12 md:px-10 md:py-14 text-center shadow-[var(--shadow-md)]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-1/4 -top-1/2 h-[200%] pointer-events-none opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse, rgba(16,185,129,0.10), transparent 60%)",
                }}
              />
              <div className="relative">
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  {dict.newsletter.eyebrow}
                </span>
                <h2 className="mt-3 text-h2 font-semibold tracking-[-0.02em]">
                  {dict.newsletter.title}
                </h2>
                <p className="mt-3 text-[15px] text-[var(--text-secondary)] max-w-md mx-auto">
                  {dict.newsletter.subtitle}
                </p>
                <NewsletterForm
                  strings={dict.newsletter}
                  source="homepage_hero"
                  language={locale}
                  className="mt-6 max-w-md mx-auto"
                />
                <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">
                  {dict.newsletter.footnote}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer
        strings={{
          tagline: dict.footer.tagline,
          copyright: dict.footer.copyright,
          columns: dict.footer.columns,
          links: dict.footer.links,
          newsletter: dict.newsletter,
        }}
        localePrefix={localePrefix as "" | "/ru"}
      />

      {/* Block C — Organization + WebSite JSON-LD. Emit on both EN and RU
          homepages (RU re-exports this same module). The WebSite node ships
          a SearchAction so Google's sitelinks search box can surface our
          search modal once block D wires Pagefind. Until then the URL
          template still resolves — Google just won't render the box. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateOrganizationSchema()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateWebSiteSchema()),
        }}
      />
    </>
  )
}

/* ----------------------------------------------------------------------------
   Hero · DemoWidget — Email ROI calculator preview (visual only on homepage;
   the live calculator lives at /tools/email-roi-calculator).
---------------------------------------------------------------------------- */
function DemoWidget({
  strings,
}: {
  strings: {
    badge: string
    title: string
    try: string
    subscribers: string
    openRate: string
    aov: string
    resultLabel: string
    resultMeta: string
  }
}) {
  const rows = [
    { label: strings.subscribers, value: "12,500", fill: 42 },
    { label: strings.openRate,    value: "28.4%",  fill: 56 },
    { label: strings.aov,         value: "$84",   fill: 34 },
  ]

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-x-6 -bottom-2 h-12 rounded-full blur-2xl opacity-40"
        style={{ background: "var(--brand)" }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]">
        {/* Head */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[var(--bg-muted)] border-b border-[var(--border-base)]">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ background: "var(--gradient-hero)" }}
            >
              {strings.badge}
            </span>
            <span className="text-sm font-semibold">{strings.title}</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {strings.try}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-5">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-2">
              <label className="flex items-center justify-between text-[13px] font-medium">
                <span>{row.label}</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {row.value}
                </span>
              </label>
              <div className="relative h-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-base)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand)]"
                  style={{ width: `${row.fill}%`, top: -1, bottom: -1 }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--brand)] shadow-[0_0_0_6px_var(--focus-ring)]"
                  style={{ left: `${row.fill}%` }}
                />
              </div>
            </div>
          ))}

          <div
            className="mt-2 flex flex-col gap-1 rounded-md border p-4"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklch, var(--brand) 8%, transparent), transparent)",
              borderColor:
                "color-mix(in oklch, var(--brand) 22%, transparent)",
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--brand)]">
              {strings.resultLabel}
            </span>
            <span className="font-mono text-[36px] font-medium leading-none tracking-[-0.02em]">
              $18,420
            </span>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {strings.resultMeta}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
