/**
 * POST /api/agents/article-published — git post-commit signal
 * ----------------------------------------------------------------------------
 * Called by .husky/post-commit when a commit adds or modifies an MDX file
 * under content/{reviews,comparisons,alternatives,guides,best,news}/{en,ru}/.
 * The hook posts one entry per affected file; we flip the matching
 * semantic_core_entries row to status='published' and revalidate its path.
 *
 * Auth: same REVALIDATE_SECRET as /api/revalidate. We deliberately reuse
 *       it rather than minting a new env var — both webhooks are the same
 *       trust class (Vercel-hosted, write-after-deploy).
 *
 * Body shape:
 *   {
 *     "files": [
 *       { "path": "content/reviews/en/klaviyo.mdx", "primary_keyword": "klaviyo review" }
 *     ],
 *     "commit_sha": "abcdef1"
 *   }
 *
 * The hook resolves `primary_keyword` by reading frontmatter; we then key
 * the row update on that. If frontmatter is missing the keyword we fall
 * back to deriving a slug-based match against published_article_path.
 */
import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"

import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface FileEntry {
  path: string
  primary_keyword?: string
  slug?: string
}

interface Payload {
  files?: FileEntry[]
  commit_sha?: string
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** content/reviews/en/klaviyo.mdx → /reviews/klaviyo (en) or /ru/reviews/klaviyo (ru) */
function repoPathToPublicUrl(p: string): string | null {
  const m = p.match(/^content\/([^/]+)\/(en|ru)\/(.+)\.mdx$/)
  if (!m) return null
  const [, type, locale, slug] = m
  const base = `/${type}/${slug}`
  return locale === "ru" ? `/ru${base}` : base
}

export async function POST(req: NextRequest) {
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

  let body: Payload = {}
  try { body = (await req.json()) as Payload } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 })
  }

  const files = body.files ?? []
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const results: Array<{ path: string; matched: boolean; reason?: string }> = []
  const revalidated: string[] = []

  for (const f of files) {
    const publicUrl = repoPathToPublicUrl(f.path)
    if (publicUrl) {
      revalidatePath(publicUrl)
      revalidated.push(publicUrl)
    }

    // Try keyword match first (most reliable), then path-suffix fallback.
    let rowId: string | null = null
    let matchReason = ""
    if (f.primary_keyword) {
      const { data } = await supabase
        .from("semantic_core_entries")
        .select("id")
        .eq("keyword", f.primary_keyword.toLowerCase())
        .maybeSingle()
      if (data) { rowId = data.id; matchReason = "by_keyword" }
    }
    if (!rowId && f.slug) {
      const { data } = await supabase
        .from("semantic_core_entries")
        .select("id")
        .ilike("published_article_path", `%/${f.slug}.mdx`)
        .maybeSingle()
      if (data) { rowId = data.id; matchReason = "by_slug" }
    }

    if (!rowId) {
      results.push({ path: f.path, matched: false, reason: "no_semantic_core_match" })
      continue
    }

    const { error: updErr } = await supabase
      .from("semantic_core_entries")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_article_path: `/${f.path}`,
      })
      .eq("id", rowId)

    if (updErr) {
      results.push({ path: f.path, matched: true, reason: `update_failed:${updErr.message}` })
      continue
    }

    await supabase.from("agent_logs").insert({
      agent_name: "CLAUDE_CODE",
      event_type: "task_completed",
      severity: "info",
      message: `article published: ${f.path}`,
      context: { commit_sha: body.commit_sha, match: matchReason, public_url: publicUrl },
      related_entity_type: "semantic_core_entries",
      related_entity_id: rowId,
    })

    results.push({ path: f.path, matched: true })
  }

  return NextResponse.json({
    ok: true,
    revalidated,
    files: results,
  })
}
