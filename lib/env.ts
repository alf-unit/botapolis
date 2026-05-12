/**
 * Type-safe env access via @t3-oss/env-nextjs + zod.
 * ----------------------------------------------------------------------------
 * Server-only secrets live under `server`; anything safe to ship to the
 * browser must be prefixed `NEXT_PUBLIC_` and listed under `client`.
 *
 * The first time this module is imported it validates `process.env` and
 * throws a readable error if anything's missing or wrong. Optional services
 * (Beehiiv, Turnstile, PostHog, Resend, Anthropic) are intentionally lenient
 * — set them later without blocking dev.
 *
 * Usage:
 *   import { env } from "@/lib/env"
 *   env.NEXT_PUBLIC_SUPABASE_URL  // typed string
 *
 * Skip validation locally (e.g. for `next lint`) with SKIP_ENV_VALIDATION=1.
 */
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// Helper: optional() but treat empty-string from .env as undefined.
const optionalString = () =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))

export const env = createEnv({
  server: {
    // ----- Supabase --------------------------------------------------------
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // ----- Upstash (rate limit + caches) ----------------------------------
    UPSTASH_REDIS_REST_URL:   optionalString(),
    UPSTASH_REDIS_REST_TOKEN: optionalString(),

    // ----- AI tools (sprint 4) --------------------------------------------
    ANTHROPIC_API_KEY: optionalString(),

    // ----- Newsletter (sprint 5) ------------------------------------------
    BEEHIIV_API_KEY:        optionalString(),
    BEEHIIV_PUBLICATION_ID: optionalString(),

    // ----- Transactional email --------------------------------------------
    RESEND_API_KEY: optionalString(),

    // ----- Bot protection -------------------------------------------------
    TURNSTILE_SECRET_KEY: optionalString(),

    // ----- ISR webhook ----------------------------------------------------
    REVALIDATE_SECRET: z.string().min(16),

    // Node sets this automatically.
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL:        z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY:   z.string().min(1),

    NEXT_PUBLIC_SITE_URL:            z.string().url(),

    NEXT_PUBLIC_PLAUSIBLE_DOMAIN:    optionalString(),
    // Sprint 6 — boolean-ish opt-in flag for the Plausible script tag.
    // Treated as truthy only when set to literally "true". Anything else
    // (unset, "false", "0", "no") means the script is not injected.
    NEXT_PUBLIC_PLAUSIBLE_ENABLED:   optionalString(),
    NEXT_PUBLIC_POSTHOG_KEY:         optionalString(),
    NEXT_PUBLIC_POSTHOG_HOST:        optionalString(),

    NEXT_PUBLIC_TURNSTILE_SITE_KEY:  optionalString(),
  },

  // Next.js ≥13.4.4 only statically analyzes client side env — server-side
  // process.env values must be passed explicitly here.
  runtimeEnv: {
    NODE_ENV:                        process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY:       process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL:          process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN:        process.env.UPSTASH_REDIS_REST_TOKEN,
    ANTHROPIC_API_KEY:               process.env.ANTHROPIC_API_KEY,
    BEEHIIV_API_KEY:                 process.env.BEEHIIV_API_KEY,
    BEEHIIV_PUBLICATION_ID:          process.env.BEEHIIV_PUBLICATION_ID,
    RESEND_API_KEY:                  process.env.RESEND_API_KEY,
    TURNSTILE_SECRET_KEY:            process.env.TURNSTILE_SECRET_KEY,
    REVALIDATE_SECRET:               process.env.REVALIDATE_SECRET,

    NEXT_PUBLIC_SUPABASE_URL:        process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL:            process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN:    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_PLAUSIBLE_ENABLED:   process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED,
    NEXT_PUBLIC_POSTHOG_KEY:         process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST:        process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },

  emptyStringAsUndefined: true,
  skipValidation:         process.env.SKIP_ENV_VALIDATION === "1",
})
