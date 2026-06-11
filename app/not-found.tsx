import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/analytics/PostHogProvider"
import { ScrollRevealController } from "@/components/shared/ScrollRevealController"
import LocaleNotFound from "./[locale]/not-found"

/* ----------------------------------------------------------------------------
   Root 404 — branded not-found for URLs that never enter the [locale] tree.
   ----------------------------------------------------------------------------
   Two 404 surfaces exist in this app, and until 2026-06-11 they looked
   different:

   1. `app/[locale]/not-found.tsx` (branded) — fires for URLs that DID enter
      the locale tree: a known top-level segment (EN_SEGMENTS rewrite) or a
      /ru/* path whose page then calls notFound() (e.g. a typo'd slug under
      /guides/). It renders inside the locale layout, so it gets the full
      chrome for free.
   2. An unknown top-level segment (`/best-upsell-app-shopify`) is NOT in the
      EN_SEGMENTS rewrite, so Next matches it as `[locale]` with
      locale="best-upsell-app-shopify" and the locale layout's validity guard
      throws notFound() FROM THE LAYOUT — which is handled by the boundary
      ABOVE it (the root). With no root not-found.tsx, Next shipped its bare
      built-in "This page could not be found" stub.

   This file closes #2 by rendering the SAME branded component at the root.
   Because the root layout is a deliberate pass-through (the locale layout
   owns <html> so `lang` can be locale-driven), this boundary must bring its
   own document shell — that's the documented dual-layout pattern for root
   error files. Locale is not pinned here: an unknown segment carries no
   locale signal, and `readLocale()` falls back to EN, so the component
   renders English. /ru/* typos still get the RU branded 404 via surface #1.

   The body mirrors `app/[locale]/layout.tsx` 1:1 (ThemeProvider →
   PostHogProvider → TooltipProvider, plus ScrollRevealController + its
   noscript fallback and the Toaster portal) — NOT a trimmed subset. First
   ship omitted ScrollRevealController as "no .scroll-reveal nodes here",
   which was wrong: the Footer's newsletter CTA carries `scroll-reveal`
   (invisible-by-default per globals.css §8), so the subscribe block
   reserved its space but never faded in on this surface. NewsletterForm
   also reports via sonner toasts, so the Toaster portal is required for
   subscribe feedback. Only PlausibleScript stays out — no analytics value
   in counting crawler-junk URLs.
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

export const metadata: Metadata = {
  title:       "404 — page not found",
  description: "The page you requested doesn't exist on Botapolis.",
  robots:      { index: false, follow: false },
}

export default function RootNotFound() {
  return (
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        {/* No-JS fallback for scroll-reveal — same as the locale layout:
            without it, JS-off visitors stare at an invisible newsletter CTA. */}
        <noscript>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <style>{`.scroll-reveal{opacity:1!important;transform:none!important;}`}</style>
        </noscript>
        <ScrollRevealController />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            <TooltipProvider delay={150}>
              <LocaleNotFound />
            </TooltipProvider>
          </PostHogProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
