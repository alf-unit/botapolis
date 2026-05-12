import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/analytics/PostHogProvider"
import { PlausibleScript } from "@/components/analytics/PlausibleScript"

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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
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
