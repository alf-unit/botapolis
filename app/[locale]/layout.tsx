import { Geist, Geist_Mono } from "next/font/google"
import { notFound } from "next/navigation"
import "../globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/analytics/PostHogProvider"
import { PlausibleScript } from "@/components/analytics/PlausibleScript"
import { ScrollRevealController } from "@/components/shared/ScrollRevealController"
import { i18n, type Locale } from "@/lib/i18n/config"
import { setLocale } from "@/lib/i18n/locale-store"

/* ----------------------------------------------------------------------------
   Locale layout — owns <html>/<body> for the whole localised route tree.
   ----------------------------------------------------------------------------
   This is the segment that renders the document shell. The root
   `app/layout.tsx` is a bare pass-through (returns children, no <html>) so
   that the `lang` attribute can be locale-driven here — `<html lang="ru">`
   on /ru/* and `<html lang="en">` on the bare EN tree.

   ISR core: `generateStaticParams` pins the static set of locale values
   ({en, ru}). Without it the [locale] segment has no known params and every
   route falls back to on-demand rendering — the exact ISR-killer this
   migration exists to avoid.

   Locale resolution: we `setLocale(params.locale)` here BEFORE children
   render, so every server component downstream resolves `getLocale()` from
   the request-scoped store (never `headers()`, which would re-enable the
   site-wide Dynamic-API ISR bug). `generateMetadata` exports pin their own
   locale separately — metadata is not guaranteed to resolve after the
   layout, so each one calls `setLocale` at its own top.

   Geist ships a Cyrillic subset because the RU locale needs it.
---------------------------------------------------------------------------- */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

/** ISR core — the static locale set. Adding a language = +1 entry here. */
export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  // Guard: anything outside the configured locale set is a real 404, not a
  // silent EN fallback. Catches stray /xx/... and protects the bare-EN
  // rewrite regex from leaking an unsupported prefix into the tree.
  if (!i18n.locales.includes(locale as Locale)) {
    notFound()
  }

  // Pin locale for the whole render pass (see lib/i18n/locale-store.ts).
  setLocale(locale as Locale)

  return (
    <html
      lang={locale}
      translate="no"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        {/* No-JS fallback for scroll-reveal — invisible-by-default state
            (globals.css §8) would leave crawlers and JS-off visitors
            staring at blank sections. This style block is only honoured
            when JavaScript is disabled, forcing everything visible. */}
        <noscript>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <style>{`.scroll-reveal{opacity:1!important;transform:none!important;}`}</style>
        </noscript>
        <ScrollRevealController />
        <ThemeProvider
          attribute="class"
          // Spec: follow OS preference for first-time visitors, remember
          // their pick once they touch the toggle. Some browsers (notably
          // Chrome iOS in incognito) report `prefers-color-scheme: dark`
          // regardless of the iOS Display setting — owner-decided we
          // don't work around that here. If a browser misreports system
          // preference, that's between the browser and its user.
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* PostHog is a thin wrapper that initialises posthog-js on the
              client when NEXT_PUBLIC_POSTHOG_KEY is set; without a key, the
              provider becomes a pure pass-through and emits no requests. */}
          <PostHogProvider>
            <TooltipProvider delay={150}>{children}</TooltipProvider>
          </PostHogProvider>
          {/* Sonner toast portal — used by login flow, save-calculation
              actions, and any future async feedback. Placed outside the
              tooltip provider so toasts aren't constrained by its bounds. */}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
        {/* Plausible — server-rendered <Script> that no-ops unless
            NEXT_PUBLIC_PLAUSIBLE_ENABLED === "true". Sits outside the
            theme provider so theme flips don't re-mount the analytics tag. */}
        <PlausibleScript />
      </body>
    </html>
  )
}
