import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/analytics/PostHogProvider"
import { PlausibleScript } from "@/components/analytics/PlausibleScript"

/* ----------------------------------------------------------------------------
   Chrome-iOS prefers-color-scheme workaround
   ----------------------------------------------------------------------------
   May 2026 mobile audit found a stable anomaly on Chrome iOS:
   `window.matchMedia('(prefers-color-scheme: dark)').matches` returns
   `true` in incognito on devices where iOS is in Light Mode. Same
   page, same iPhone, opened in Safari Private returns `light=true`
   correctly — proving the device preference is Light and only Chrome
   iOS is reporting otherwise (likely an anti-fingerprint mask Chrome
   applies in private browsing). The query is stable across t0 / 250 /
   1000 ms, so it isn't a hydration race we can wait out.

   Fix: pre-fill `localStorage.theme = "light"` before next-themes
   reads it, but ONLY when the UA contains `CriOS` (Chrome iOS) AND
   storage is empty (= first paint, no user override yet). Every
   other browser falls through to the standard `defaultTheme="system"`
   pipeline unchanged. Returning visitors who've explicitly clicked
   the toggle keep their persisted choice because we never overwrite
   a non-empty value.

   The script is delivered inline as the first child of <body> so it
   runs synchronously during HTML parsing — before React hydrates,
   before next-themes' own script reads storage, before any visible
   paint. This is the same pattern next-themes itself uses for its
   anti-flash boot script.
---------------------------------------------------------------------------- */
const chromeIOSThemeBootstrap = `
;(function(){
  try {
    if (/CriOS/.test(navigator.userAgent) && !localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'light');
    }
  } catch (_) { /* private mode storage exceptions — fail silent */ }
})();
`

/* ----------------------------------------------------------------------------
   Geist (Sans + Mono) via next/font.
   Cyrillic subset is required for the RU locale.
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
  metadataBase: new URL("https://botapolis.com"),
  title: {
    default: "Botapolis — The AI operator's manual for Shopify",
    template: "%s · Botapolis",
  },
  description:
    "Calculators that show real ROI. Reviews tested on real stores. Comparisons that pick a winner — not a draw.",
  applicationName: "Botapolis",
  authors: [{ name: "Botapolis" }],
  openGraph: {
    type: "website",
    siteName: "Botapolis",
    title: "Botapolis — The AI operator's manual for Shopify",
    description:
      "Calculators that show real ROI. Reviews tested on real stores. Comparisons that pick a winner — not a draw.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Botapolis",
    description:
      "The AI operator's manual for Shopify-native commerce.",
  },
  // Suppress browser auto-translate. We ship native EN + RU via the
  // /ru/... routes and the EN/RU chip in the navbar is the single source
  // of truth for locale. Chrome's auto-translate iframe (`flexible?lang=
  // auto`) layers on top, fights our CSP loudly in the console, and
  // delivers a double-translated UX for users who already have a RU
  // build available one click away. `<meta name="google" content=
  // "notranslate">` is the Google-specific opt-out; the HTML
  // `translate="no"` attribute below covers Safari / Edge / Yandex
  // and any other browser that respects the W3C standard.
  other: {
    google: "notranslate",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)",  color: "#0A0A0B" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        {/* Chrome-iOS prefers-color-scheme workaround. MUST be the first
            child of <body> so it runs before next-themes' own boot
            script reads localStorage. See the chromeIOSThemeBootstrap
            comment above for the diagnostic that led here. */}
        <script
          dangerouslySetInnerHTML={{ __html: chromeIOSThemeBootstrap }}
        />
        <ThemeProvider
          attribute="class"
          // Spec: follow OS preference for first-time visitors, remember
          // their pick once they touch the toggle. The CriOS-targeted
          // bootstrap script above patches the one browser that lies
          // about its system preference; every other agent flows through
          // here unchanged.
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
