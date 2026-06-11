/**
 * /robots.txt
 * ----------------------------------------------------------------------------
 * - Search engines: index everything except internal/auth/redirect routes.
 * - AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are
 *   explicitly NOT blocked — AI Overviews and Perplexity citations are a
 *   meaningful traffic source for our content (TZ § 8.4).
 */
import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/utils"

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    "/go/",
    // Locale-prefixed affiliate redirector. RU pages emit `/ru/go/{slug}`
    // CTAs (now rewritten to the bare /go/ route in next.config); keep Google
    // out of them the same way it's kept out of bare /go/. Add /es/go/ etc.
    // when those locales ship.
    "/ru/go/",
    // Sprint 5 — account surface. /account/ is the legacy /(account)/ group
    // hint; /dashboard/ and /saved/ are the real URLs. Keep both: search
    // engines occasionally fish for the segment-name path even when the
    // route group doesn't expose it.
    "/account/",
    "/dashboard/",
    "/saved/",
    // Sign-in and OAuth callback — soft sensitive: no PII leak, but no
    // search value either; let the noindex meta on the pages do the rest.
    "/login/",
    "/auth/",
    "/_next/",
  ]

  return {
    rules: [
      { userAgent: "*",                allow: "/", disallow },

      // Explicit allow for major AI crawlers — kept verbose so a future
      // pass through SEO tooling doesn't accidentally tighten them up.
      { userAgent: "GPTBot",           allow: "/" },
      { userAgent: "ClaudeBot",        allow: "/" },
      { userAgent: "anthropic-ai",     allow: "/" },
      { userAgent: "PerplexityBot",    allow: "/" },
      { userAgent: "Google-Extended",  allow: "/" },
      { userAgent: "CCBot",            allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host:    absoluteUrl("/").replace(/\/$/, ""),
  }
}
