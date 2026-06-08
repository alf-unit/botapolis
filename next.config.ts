import type { NextConfig } from "next"

/* ----------------------------------------------------------------------------
   Security headers — TZ § 15.1 (May 2026 audit)
   ----------------------------------------------------------------------------
   Up until this audit `next.config.ts` was the stock boilerplate, which
   means the deployed site shipped with zero security headers (CSP, X-Frame-
   Options, etc.) and would score F on securityheaders.com. This config
   brings the site to an A-grade baseline.

   The CSP intentionally keeps `'unsafe-inline'` on script-src and style-src
   for now — next-themes injects an inline pre-paint script to set the
   theme class (avoiding FOUC), and Sonner / next/font / Next 16 hydration
   all use inline styles. Migrating to a nonce-based CSP is a follow-up
   (would require a request-time nonce flowing through proxy.ts).

   Domains allowlisted, with justification each:
     - plausible.io                     — TZ § 13.1, web analytics script
     - us.i.posthog.com                 — TZ § 13.2, event-capture endpoint
     - challenges.cloudflare.com        — TZ § 15.4, Turnstile widget+verify
     - *.supabase.co  (https + wss)     — TZ § 4, DB/auth REST + realtime
     - api.beehiiv.com                  — TZ § 12, newsletter API
   No third-party image hosts are pinned — `img-src https:` is broad because
   Supabase Storage URLs are dynamic and we'd rather serve a working logo
   than block a tool card. Tighten later if a CSP-violation report shows abuse.
---------------------------------------------------------------------------- */

const csp = [
  // Everything defaults to same-origin unless overridden by a more
  // specific directive below.
  "default-src 'self'",

  // Scripts: 'unsafe-inline' covers next-themes' pre-paint script + Next's
  // hydration payload. Plausible / PostHog / Turnstile are explicit allow.
  // 'wasm-unsafe-eval' is required by Pagefind: the /pagefind/pagefind.js
  // module compiles a per-language WASM blob to drive the search index.
  // Chrome 95+, Edge, and Safari 17+ block WebAssembly.compile() under
  // strict CSP without this directive — that's what was silently making
  // the search modal return zero results post-launch. Adding the token
  // only loosens WASM compilation, not JS eval, so no XSS surface gain.
  //
  // us-assets.i.posthog.com (May 2026 audit fix): PostHog moved its
  // client config + recorder shards to a separate assets CDN. The main
  // ingest host (us.i.posthog.com) keeps receiving events, but the
  // initial array/<key> fetch and the lazy-loaded feature bundles now
  // load from us-assets — without it, the snippet hits a CSP wall mid-
  // init and emits a chain of unhandled rejections that we've observed
  // cascade into renderer crashes on some pages.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://plausible.io https://us.i.posthog.com https://us-assets.i.posthog.com https://challenges.cloudflare.com",

  // Styles: Sonner + next/font + Tailwind inline-critical all need 'unsafe-inline'.
  "style-src 'self' 'unsafe-inline'",

  // Images: any HTTPS host (tool logos can live on Supabase Storage or
  // partner CDNs). `data:` for inline SVG fallbacks (ToolLogo initial-letter
  // chip), `blob:` for any client-side generated previews.
  "img-src 'self' data: blob: https:",

  // Fonts: next/font self-hosts Geist under `_next/static`; data: for any
  // base64-embedded font in CSS.
  "font-src 'self' data:",

  // Connect (fetch/XHR/WebSocket): API endpoints we POST to + Supabase realtime.
  // openrouter.ai is server-to-server (the AI route fetches from our Node
  // runtime, not the browser), so technically CSP wouldn't block it. We
  // keep it allowlisted anyway for honesty — if we ever expose direct
  // client calls (streaming UI?), the header is already correct.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://plausible.io https://us.i.posthog.com https://us-assets.i.posthog.com https://api.beehiiv.com https://openrouter.ai",

  // Frames: only Turnstile renders a child frame today.
  "frame-src https://challenges.cloudflare.com",

  // Frame-ancestors: replaces X-Frame-Options DENY semantics. Botapolis is
  // never meant to be iframed; embeds happen the other way around (we ship
  // tool snippets people embed in their blogs, not vice versa).
  "frame-ancestors 'none'",

  // Forms can only submit to same-origin endpoints. Even if a misconfigured
  // <form action="https://evil.com"> sneaks into the markup, the browser
  // blocks it.
  "form-action 'self'",

  // <base> tag hijack guard.
  "base-uri 'self'",

  // No <object> / <embed> / <applet> — no legitimate use, large XSS surface.
  "object-src 'none'",

  // Auto-promote any leftover http:// links to https:// at fetch time.
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy",   value: csp },
  // Belt-and-suspenders alongside the CSP frame-ancestors directive — old
  // browsers respect X-Frame-Options when they don't speak CSP frame-ancestors.
  { key: "X-Frame-Options",           value: "DENY" },
  // Stops content-type sniffing that can turn a .txt into JavaScript.
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Send origin only on cross-site navigations; full URL on same-origin.
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Disable platform sensors we never use; ` ` keeps the directive empty
  // ("()") which is the spec's way of saying "no origin allowed".
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // 2-year HSTS with subdomain + preload eligibility. Vercel also sets this
  // automatically; pinning it here makes the policy explicit and survives
  // a hosting migration.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

// ----------------------------------------------------------------------------
// Embed-friendly CSP for /tools/email-roi-calculator (May 2026 audit · TZ #4)
// ----------------------------------------------------------------------------
// The Email ROI Calculator ships an "Embed this calculator" snippet — an
// iframe pointing at `/tools/email-roi-calculator?embed=1`. The default
// `frame-ancestors 'none'` + `X-Frame-Options: DENY` block that embed.
// We override to `frame-ancestors *` (anywhere) and drop X-Frame-Options
// for the calculator path only — every other page keeps the strict
// no-iframe policy. The headers config below re-emits ALL security
// headers for this route; same-named keys later in the array override
// earlier ones in Next.js, so this entry sits beneath the catch-all.
const embedCsp = csp.replace(
  "frame-ancestors 'none'",
  "frame-ancestors *",
)
const embedHeaders = [
  { key: "Content-Security-Policy",   value: embedCsp },
  // Setting X-Frame-Options to ALLOWALL is non-standard; the modern way
  // to permit embedding is to simply omit X-Frame-Options entirely. But
  // because the catch-all sets DENY, we need to *override* it. The
  // browser-compatible choice is to omit X-Frame-Options from this
  // response, which Next.js does by NOT including it in the entry's
  // header array — same-named keys in later entries replace earlier
  // values, but absent keys leave the earlier value in place. So we
  // explicitly set the header to an empty string to nullify it.
  { key: "X-Frame-Options",           value: "" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

// ----------------------------------------------------------------------------
// /reviews/ → /tools/ canonicalisation (Phase 2 of merge, 2026-06-03)
// ----------------------------------------------------------------------------
// The /reviews/[slug] route absorbed into /tools/[slug] (single canonical
// surface for tool editorial). Three redirect families below, all 308 (which
// Google treats identically to 301 for link-equity transfer):
//
//   1. The 12 legacy `-review-2026` MDX slugs collapse DIRECTLY to
//      /tools/{slug} — single hop, no chain through /reviews/{slug}. Google
//      penalises chained 301s, so we resolve the final destination here.
//   2. /reviews/{slug} → /tools/{slug} (current canonical URL).
//   3. /reviews → /tools (hub redirect).
//
// RU mirrors get the same treatment under the /ru prefix.
// ----------------------------------------------------------------------------
const LEGACY_REVIEW_SLUGS = [
  "klaviyo",
  "gorgias",
  "mailchimp",
  "omnisend",
  "postscript",
  "tidio",
] as const

const legacyReviewRedirects = LEGACY_REVIEW_SLUGS.flatMap((slug) => [
  {
    source: `/reviews/${slug}-review-2026`,
    destination: `/tools/${slug}`,
    permanent: true,
  },
  {
    source: `/ru/reviews/${slug}-review-2026`,
    destination: `/ru/tools/${slug}`,
    permanent: true,
  },
])

const reviewsToToolsRedirects = [
  // Order matters: more-specific [slug] patterns first, then the hub.
  // Next.js evaluates redirects() top-to-bottom and stops at the first
  // match — without this order the hub regex would swallow detail-page
  // paths before the [slug] rule could fire.
  { source: "/reviews/:slug", destination: "/tools/:slug", permanent: true },
  { source: "/ru/reviews/:slug", destination: "/ru/tools/:slug", permanent: true },
  { source: "/reviews", destination: "/tools", permanent: true },
  { source: "/ru/reviews", destination: "/ru/tools", permanent: true },
]

// ----------------------------------------------------------------------------
// klaviyo-pricing relocation (Etap J-generate, 2026-06-03)
// ----------------------------------------------------------------------------
// klaviyo-pricing was the proof-of-concept for the /pricing/ route added
// in Etap J-generate. Originally /reviews/klaviyo-pricing (legacy MDX
// route), then 2026-06-03 Phase 3 moved it to /guides/klaviyo-pricing as
// a holding pen, and now it's at its canonical home /pricing/klaviyo.
//
// All four legacy URL families collapse to /pricing/klaviyo in a SINGLE
// hop — Google penalises redirect chains, so the destinations are pinned
// to the final canonical, not to the intermediate /guides/ holding pen.
//
// These rules MUST sit BEFORE the catch-all /reviews/:slug below —
// Next.js stops at the first match, so a less-specific catch-all that
// fires first would shadow these slug-specific rules.
// ----------------------------------------------------------------------------
const klaviyoPricingRedirects = [
  // Legacy /reviews/ MDX URL family — original 2026-05 home.
  { source: "/reviews/klaviyo-pricing", destination: "/pricing/klaviyo", permanent: true },
  { source: "/ru/reviews/klaviyo-pricing", destination: "/ru/pricing/klaviyo", permanent: true },
  // Phase 2 cache hangovers (/reviews/ → /tools/ catch-all sent some
  // readers here before Phase 3). Single direct hop to the canonical.
  { source: "/tools/klaviyo-pricing", destination: "/pricing/klaviyo", permanent: true },
  { source: "/ru/tools/klaviyo-pricing", destination: "/ru/pricing/klaviyo", permanent: true },
  // Phase 3 holding pen — promote any reader still landing on the
  // /guides/ URL to the /pricing/ canonical.
  { source: "/guides/klaviyo-pricing", destination: "/pricing/klaviyo", permanent: true },
  { source: "/ru/guides/klaviyo-pricing", destination: "/ru/pricing/klaviyo", permanent: true },
]

// ----------------------------------------------------------------------------
// Bare-EN routing (LOCALE-MIGRATION-PLAN — native rewrites)
// ----------------------------------------------------------------------------
// EN is the default locale and lives at the bare path (`/tools`), RU under
// `/ru/*`. The app tree is `app/[locale]/*`, so a bare request must be
// rewritten INTERNALLY to `/en/...` for the [locale] segment to match. This
// rewrite is the entire routing layer — it runs at the edge with ZERO Active
// CPU (no per-request middleware Supabase calls), which is the whole point of
// the migration (kills the middleware-46m CPU bottleneck).
//
// Top-level public URL segments that live under app/[locale]/. Route groups
// ((account), (auth)) add no URL segment, so their children are listed flat.
// A bare request to one of these is rewritten to /en/<seg>/... so the
// [locale] segment receives a valid locale prefix.
//
// Why an explicit alternation instead of a negative-lookahead catch-all
// (`/((?!en|ru|api|...).*)`): under Next 16 + Turbopack the lookahead `source`
// form does NOT reliably fire from `beforeFiles` — bare paths fell through to
// the greedy `/[locale]` dynamic match and 404'd, even for paths with no
// competing route. A literal-segment alternation compiles to a plain
// path-to-regexp matcher that fires correctly. Cost: adding a new top-level
// route means adding one entry here (top-level routes are rare).
//
// NON-default locales ('ru', 'es') and the out-of-[locale] routes (api, go,
// auth/callback, sitemap.xml, robots.txt, og/icon image routes, _next) are
// simply NOT listed, so they're never rewritten. A leaked external `/en/*`
// URL renders the page directly (200) and is deduped to the bare URL by the
// page canonical (buildMetadata maps EN → bare); no /en redirect (it would
// loop with the rewrite under beforeFiles).
const EN_SEGMENTS = [
  "about",
  "alternatives",
  "best",
  "compare",
  "contact",
  "directory",
  "guides",
  "legal",
  "methodology",
  "pricing",
  "search",
  "tools",
  "dashboard",
  "login",
  "saved",
].join("|")

const nextConfig: NextConfig = {
  async rewrites() {
    // `beforeFiles`: run before filesystem/dynamic route matching so a bare
    // path is rewritten to /en/... before the greedy `/[locale]` segment can
    // claim it (e.g. `/tools` → locale="tools" → guard 404).
    return {
      beforeFiles: [
        // Home: bare `/` → `/en`.
        { source: "/", destination: "/en" },
        // Bare top-level segment, no sub-path (`/tools`, `/pricing`, …).
        { source: `/:seg(${EN_SEGMENTS})`, destination: "/en/:seg" },
        // Bare segment + sub-path (`/pricing/klaviyo`, `/tools/[slug]`, …).
        { source: `/:seg(${EN_SEGMENTS})/:path*`, destination: "/en/:seg/:path*" },
      ],
    }
  },
  async redirects() {
    // Order: slug-specific klaviyo-pricing first (so it wins over the
    // catch-all /reviews/:slug), then legacy -review-2026 collapse, then
    // the generic /reviews/{*,hub} → /tools/{*,hub} family.
    return [...klaviyoPricingRedirects, ...legacyReviewRedirects, ...reviewsToToolsRedirects]
  },
  async headers() {
    return [
      {
        // Default: strict no-iframe policy for the whole site.
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Embed-friendly override for the Email ROI Calculator. Same-named
        // keys here override the catch-all (Next.js applies later entries
        // last). Both /tools/... and /ru/tools/... are covered.
        source: "/:locale(ru)?/tools/email-roi-calculator",
        headers: embedHeaders,
      },
      {
        // Pagefind: the search index is rebuilt every deploy and the
        // entry.json file points at content-addressed shard files
        // (pagefind.en_<hash>.pf_meta). When Vercel's edge cache holds
        // a stale entry.json from the previous build, it references
        // shard hashes that no longer exist → every search returns
        // "Couldn't load the search index".
        //
        // Fix: explicitly forbid CDN caching of the entry file (and the
        // loader JS) so each request hits the deployment that owns the
        // current shard set. The shards themselves carry a hash in
        // their filename and are safe to cache long-term (Vercel does
        // by default; nothing more to do here).
        source: "/pagefind/pagefind-entry.json",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/pagefind/pagefind.js",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        // Same for the worker bundle — it's small and gets rebuilt
        // alongside the index.
        source: "/pagefind/pagefind-worker.js",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ]
  },
  // Sprint 2: the MDX loader reads `content/{type}/{lang}/{slug}.mdx` from
  // disk at request time. Without an explicit trace include, Turbopack's
  // NFT can't tell which files the dynamic path.join needs and either
  // (a) traces the whole repo (bloats the function bundle) or (b) ships
  // without the content directory entirely (404s on every review/guide
  // route). Pinning the trace to `content/**` is the documented fix:
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
  outputFileTracingIncludes: {
    // Route keys now carry the [locale] segment — the MDX loader reads
    // content/{type}/{lang}/{slug}.mdx at request time for /[locale]/guides/
    // [slug] and /[locale]/pricing/[slug]. /sitemap.xml stays outside [locale].
    "/[locale]/guides/**":  ["./content/guides/**"],
    "/[locale]/pricing/**": ["./content/pricing/**"],
    "/[locale]/best/**":    ["./content/best/**"],
    "/sitemap.xml":         ["./content/**"],
  },
}

export default nextConfig
