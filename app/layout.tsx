import type { Metadata, Viewport } from "next"

/* ----------------------------------------------------------------------------
   Root layout — pass-through only.
   ----------------------------------------------------------------------------
   The document shell (<html>/<body>, fonts, providers) lives in
   `app/[locale]/layout.tsx` so the `lang` attribute can be locale-driven.
   This root layout exists only to (a) satisfy Next's required root layout
   slot and (b) carry the site-wide default metadata (metadataBase, title
   template, OG defaults, the Google notranslate opt-out). Metadata exports
   are collected from every layout regardless of what the component renders,
   so keeping them here applies them globally while the component itself
   renders nothing but its children. The matching `translate="no"` HTML
   attribute is set on <html> in the locale layout.

   This is the standard next-intl dual-layout shape; confirmed building as
   Static on Next 16.
---------------------------------------------------------------------------- */

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
    description: "The AI operator's manual for Shopify-native commerce.",
  },
  // Suppress browser auto-translate. We ship native EN + RU; the EN/RU chip
  // in the navbar is the single source of truth for locale. `<meta name=
  // "google" content="notranslate">` is the Google-specific opt-out; the
  // HTML `translate="no"` attribute (set on <html> in the locale layout)
  // covers Safari / Edge / Yandex and any W3C-compliant browser.
  other: {
    google: "notranslate",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
