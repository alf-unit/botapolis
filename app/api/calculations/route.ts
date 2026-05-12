/**
 * POST /api/calculations — save a calculator run for the current user
 * ----------------------------------------------------------------------------
 * Sprint 5 (TZ § 10 + § 4.5). Auth is cookie-based via the SSR Supabase
 * client; if no user, we return 401 so the calling widget can route the
 * visitor to `/login?next=…`.
 *
 * RLS policy `saved: owner insert` already enforces `user_id = auth.uid()`
 * at the DB layer (see migrations/001), so we set `user_id` from the
 * resolved session here too — defence in depth, not defence by repetition.
 *
 * Body shape:
 *   {
 *     tool_slug: "email-roi-calculator",
 *     inputs:    { … any jsonb-safe object … },
 *     results?:  { … },
 *     name?:     string  // optional user-supplied label
 *   }
 */
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// --------------------------------------------------------------------------
// Schema — keep `inputs` and `results` permissive (record of unknowns); we
// don't want to bake every tool's shape into the API layer.
// --------------------------------------------------------------------------
const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
)

const bodySchema = z.object({
  tool_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "lowercase-kebab"),
  inputs:    z.record(z.string(), jsonValue),
  results:   z.record(z.string(), jsonValue).optional().nullable(),
  name:      z.string().trim().min(1).max(120).optional().nullable(),
})

export async function POST(req: NextRequest) {
  // 1. Parse + validate
  let body: z.infer<typeof bodySchema>
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:   "invalid_input",
          message: "Check the request body.",
          issues:  parsed.error.issues.map((i) => i.message),
        },
        { status: 400 },
      )
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  // 2. Auth — cookie-backed Supabase client; getUser() also refreshes the
  // session if it's within its rotation window.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to save calculations." },
      { status: 401 },
    )
  }

  // 3. Insert (RLS confirms user_id = auth.uid() at the DB level)
  const { data, error } = await supabase
    .from("saved_calculations")
    .insert({
      user_id:   user.id,
      tool_slug: body.tool_slug,
      inputs:    body.inputs as Record<string, unknown>,
      results:   (body.results ?? null) as Record<string, unknown> | null,
      name:      body.name ?? null,
    })
    .select("id, created_at")
    .single()

  if (error) {
    console.error("[/api/calculations] insert failed:", error.message)
    return NextResponse.json(
      { error: "save_failed", message: "Couldn't save right now — try again." },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, id: data.id, created_at: data.created_at })
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 })
}
