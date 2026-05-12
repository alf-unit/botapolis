/**
 * POST /api/revalidate — ISR cache buster
 * ----------------------------------------------------------------------------
 * Called by the Supabase Database Webhook on INSERT/UPDATE/DELETE of
 * `tools` and `comparisons`. It re-renders the affected static pages so the
 * caller doesn't have to wait for the next time-based revalidation tick.
 *
 * Auth: shared secret in the `?secret=` query param OR `x-revalidate-secret`
 *       header. Constant-time comparison prevents timing oracles.
 *
 * Body shapes accepted:
 *   { path: "/tools/klaviyo" }
 *   { paths: ["/tools/klaviyo", "/directory/klaviyo"] }
 *   { tag: "tools" }                                  (revalidateTag)
 *   Supabase webhook payload (auto-derives the path from record/table/event)
 */
import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

// Supabase webhook payloads have this shape (the relevant subset).
interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE"
  table: string
  record?: { slug?: string }
  old_record?: { slug?: string }
}

function derivePathsFromSupabaseWebhook(payload: SupabaseWebhookPayload): string[] {
  const slug = payload.record?.slug ?? payload.old_record?.slug
  if (!slug) return []
  switch (payload.table) {
    case "tools":
      // /directory is a permanent redirect to /tools and has no [slug]
      // route; the tool detail page is /tools/{slug}. Listing the old
      // /directory paths was a no-op (revalidatePath silently ignores
      // unknown paths) but cluttered logs — dropped in the May 2026 audit.
      return [`/tools/${slug}`, "/tools", "/"]
    case "comparisons":
      return [`/compare/${slug}`, "/compare", "/"]
    default:
      return []
  }
}

export async function POST(req: NextRequest) {
  // ----- Auth ---------------------------------------------------------------
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) {
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 })
  }
  const supplied =
    new URL(req.url).searchParams.get("secret") ??
    req.headers.get("x-revalidate-secret") ??
    ""

  if (!supplied || !safeEqual(supplied, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // ----- Parse payload ------------------------------------------------------
  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    // Body might be empty — fall through and use ?path query.
  }

  const querySinglePath = new URL(req.url).searchParams.get("path")

  let pathsToRevalidate: string[] = []
  const tagsToRevalidate: string[] = []

  if (typeof body.path === "string") {
    pathsToRevalidate.push(body.path)
  }
  if (Array.isArray(body.paths)) {
    pathsToRevalidate.push(
      ...body.paths.filter((p): p is string => typeof p === "string"),
    )
  }
  if (typeof body.tag === "string") {
    tagsToRevalidate.push(body.tag)
  }
  if (querySinglePath) {
    pathsToRevalidate.push(querySinglePath)
  }
  if ("type" in body && "table" in body) {
    pathsToRevalidate.push(...derivePathsFromSupabaseWebhook(body as unknown as SupabaseWebhookPayload))
  }

  // De-dupe and filter to safe in-app paths.
  pathsToRevalidate = Array.from(new Set(pathsToRevalidate)).filter(
    (p) => p.startsWith("/"),
  )

  if (pathsToRevalidate.length === 0 && tagsToRevalidate.length === 0) {
    return NextResponse.json(
      { error: "nothing_to_revalidate", hint: "supply path | paths | tag" },
      { status: 400 },
    )
  }

  for (const p of pathsToRevalidate) revalidatePath(p)
  // Next.js 16: `revalidateTag` now requires a `cacheLife` profile name as
  // its second argument. `"max"` = stale-while-revalidate, which is what we
  // want for catalog data (readers see stale content, fresh loads in BG).
  for (const t of tagsToRevalidate) revalidateTag(t, "max")

  return NextResponse.json({
    revalidated: true,
    now: Date.now(),
    paths: pathsToRevalidate,
    tags: tagsToRevalidate,
  })
}

// GET stays explicit-405 — no leaking endpoint existence via redirects.
export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 })
}
