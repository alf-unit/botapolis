import "server-only"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/* ----------------------------------------------------------------------------
   Rate limiters
   ----------------------------------------------------------------------------
   Upstash REST works in every runtime (Node, Workers, the Next.js proxy).
   We expose typed `limit(identifier)` helpers per use-case so call-sites stay
   readable and we don't accidentally share a window across endpoints.

   If Upstash creds aren't configured locally, every limiter degrades to an
   always-allow shim — the dev loop keeps working, only prod enforces.
---------------------------------------------------------------------------- */

type Limiter = Pick<Ratelimit, "limit">

let cachedRedis: Redis | null = null
function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  cachedRedis = new Redis({ url, token })
  return cachedRedis
}

/** Identity limiter: never blocks. Returned when Upstash isn't configured. */
const allowAlwaysLimiter: Limiter = {
  // Matches Ratelimit['limit'] enough for our usage (success + remaining).
  limit: async () => ({
    success: true,
    limit: Number.POSITIVE_INFINITY,
    remaining: Number.POSITIVE_INFINITY,
    reset: Date.now(),
    pending: Promise.resolve(),
  }),
} as unknown as Limiter

function makeLimiter(prefix: string, rule: Ratelimit["limiter"]): Limiter {
  const redis = getRedis()
  if (!redis) return allowAlwaysLimiter
  return new Ratelimit({
    redis,
    prefix: `botapolis:${prefix}`,
    limiter: rule,
    analytics: true,
  })
}

/**
 * `/api/newsletter` — TZ § 12: 3 attempts per IP per hour (loose enough
 * for honest correction typos, tight enough to block scripted churn).
 */
export const newsletterLimit = makeLimiter(
  "newsletter",
  Ratelimit.slidingWindow(3, "1 h"),
)

/**
 * `/go/[slug]` — TZ § 5.3 implies generous: 10 affiliate redirects per IP
 * per hour. Real users hit one or two; bots scraping us get throttled.
 */
export const affiliateLimit = makeLimiter(
  "affiliate",
  Ratelimit.slidingWindow(10, "1 h"),
)

/**
 * AI tool API endpoints — TZ § 11.3: 3 generations per IP per day (guests).
 * Authenticated users get 20/day, handled by a separate identifier.
 */
export const aiToolGuestLimit = makeLimiter(
  "ai-tool-guest",
  Ratelimit.slidingWindow(3, "24 h"),
)
export const aiToolAuthLimit = makeLimiter(
  "ai-tool-auth",
  Ratelimit.slidingWindow(20, "24 h"),
)

/**
 * Generic catch-all: 60 req/min. Use sparingly; specific limiters above
 * give better signal in logs and analytics.
 */
export const genericLimit = makeLimiter(
  "generic",
  Ratelimit.slidingWindow(60, "1 m"),
)
