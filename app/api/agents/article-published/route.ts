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

import matter from "gray-matter"

import { createServiceClient } from "@/lib/supabase/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface FileEntry {
  path: string
  primary_keyword?: string
  slug?: string
  /**
   * Base64-encoded MDX body. Sent by the local post-commit hook for
   * comparison files so the webhook can bridge into public.comparisons
   * without an outbound raw.githubusercontent fetch. Optional for
   * back-compat with manual webhook calls.
   */
  content_b64?: string
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

/** content/reviews/en/klaviyo.mdx → /reviews/klaviyo (en) or /ru/reviews/klaviyo (ru).
 *  Note: file path uses /content/comparisons/ but URL path is /compare/ (different
 *  segment). Same for any future content type with non-1:1 file-to-URL mapping. */
function repoPathToPublicUrl(p: string): string | null {
  const m = p.match(/^content\/([^/]+)\/(en|ru)\/(.+)\.mdx$/)
  if (!m) return null
  const [, type, locale, slug] = m
  // Map repo content type → public URL segment. Comparisons use /compare/<slug>,
  // not /comparisons/<slug> (Phase 3 finding 2026-05-26).
  const urlSegment = type === "comparisons" ? "compare" : type
  const base = `/${urlSegment}/${slug}`
  return locale === "ru" ? `/ru${base}` : base
}

/* ============================================================================
   Comparison MDX → public.comparisons bridge (Phase 3 finding 2026-05-26)
   ----------------------------------------------------------------------------
   Reviews/guides are served from MDX directly. Comparisons however are
   DB-driven (`app/compare/[slug]/page.tsx` reads from public.comparisons).
   So committing a comparison MDX alone doesn't make /compare/<slug> work —
   you need a matching row in the table too.

   This bridge auto-creates the row when an MDX is committed and a row for
   (slug, language) doesn't exist yet. We DO NOT overwrite existing rows —
   editorial may have hand-tuned verdict / custom_intro / comparison_data
   beyond what frontmatter encodes, and the bridge must never clobber that.
   For row updates: editorial UPDATEs the row directly (Supabase Studio or
   SQL). The webhook only "touches" updated_at to nudge ISR.
============================================================================ */
async function resolveMdxBody(
  filePath: string,
  inlineB64: string | undefined,
): Promise<string | null> {
  // Preferred path: caller (the post-commit hook) inlined the MDX body as
  // base64 in the payload. Decode and return — no outbound HTTP needed.
  // This is the CPU-friendly route added 2026-05-30 after the Vercel
  // Active CPU audit; the GitHub raw fetch fallback below stays for
  // manual webhook calls / scripted backfills that don't carry the body.
  if (inlineB64) {
    try {
      const decoded = Buffer.from(inlineB64, "base64").toString("utf-8")
      if (decoded.length > 0) return decoded
    } catch {
      // Bad base64 → fall through to raw fetch.
    }
  }
  // Fallback: public raw URL — no auth needed since the repo is public.
  // Cache-bust so the webhook always sees the just-committed file.
  const url = `https://raw.githubusercontent.com/alf-unit/botapolis/main/${filePath}`
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

interface ComparisonFrontmatter {
  title?:           string
  description?:     string
  slug?:            string
  locale?:          string
  tools?:           string[]
  primaryKeyword?: string
  verdict?:         { winner?: string; best_for_a?: string; best_for_b?: string }
  schema?:          { type?: string }
}

interface BridgeResult {
  bridged: "created" | "touched" | "skipped"
  reason?: string
  comparison_id?: string
}

async function bridgeComparison(
  filePath: string,
  language: "en" | "ru",
  slug:     string,
  supabase: ReturnType<typeof createServiceClient>,
  inlineB64: string | undefined,
): Promise<BridgeResult> {
  const raw = await resolveMdxBody(filePath, inlineB64)
  if (!raw) return { bridged: "skipped", reason: "fetch_failed" }

  const parsed = matter(raw)
  const fm = parsed.data as ComparisonFrontmatter

  const toolSlugs: string[] = Array.isArray(fm.tools) ? fm.tools.slice(0, 2) : []
  if (toolSlugs.length !== 2) {
    return { bridged: "skipped", reason: "frontmatter_missing_two_tools" }
  }

  // Check existing row first — never overwrite editorial fields.
  const { data: existing } = await supabase
    .from("comparisons")
    .select("id")
    .eq("slug", slug)
    .eq("language", language)
    .maybeSingle()

  if (existing) {
    // Row exists. Touch updated_at to nudge ISR; leave editorial fields alone.
    await supabase
      .from("comparisons")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id)
    return { bridged: "touched", reason: "row_exists_editorial_preserved", comparison_id: existing.id }
  }

  // New row — resolve tool slugs to UUIDs, then INSERT.
  const { data: toolRows } = await supabase
    .from("tools")
    .select("id, slug")
    .in("slug", toolSlugs)

  const toolA = toolRows?.find(t => t.slug === toolSlugs[0])
  const toolB = toolRows?.find(t => t.slug === toolSlugs[1])
  if (!toolA || !toolB) {
    return { bridged: "skipped", reason: `tool_uuid_lookup_failed:${toolSlugs.join(",")}` }
  }

  // Derive a simple verdict text from frontmatter when present. Anything
  // richer (custom_intro, comparison_data JSONB) is left null — editorial
  // can fill it in later without the bridge overwriting on next commit.
  let derivedVerdict: string | null = null
  if (fm.verdict && (fm.verdict.best_for_a || fm.verdict.best_for_b)) {
    const winnerName =
      fm.verdict.winner === toolSlugs[0] ? toolA.slug :
      fm.verdict.winner === toolSlugs[1] ? toolB.slug :
      "no clear winner"
    derivedVerdict =
      `Winner: ${winnerName}. ` +
      `Choose ${toolA.slug} when: ${fm.verdict.best_for_a ?? "—"}. ` +
      `Choose ${toolB.slug} when: ${fm.verdict.best_for_b ?? "—"}.`
  }

  const { data: inserted, error: insErr } = await supabase
    .from("comparisons")
    .insert({
      slug,
      language,
      status:              "published",
      tool_a_id:           toolA.id,
      tool_b_id:           toolB.id,
      meta_title:          fm.title ?? null,
      meta_description:    fm.description ?? null,
      verdict:             derivedVerdict,
      // Leave editorial fields null on auto-bridge — fill in via Studio
      // or SQL after authoring. The bridge will not overwrite them later.
      winner_for:          null,
      comparison_data:     null,
      custom_intro:        null,
      custom_methodology:  null,
    })
    .select("id")
    .single()

  if (insErr) return { bridged: "skipped", reason: `insert_failed:${insErr.message}` }
  return { bridged: "created", comparison_id: inserted.id }
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
  const results: Array<{ path: string; matched: boolean; reason?: string; bridged?: string }> = []
  const revalidated: string[] = []

  for (const f of files) {
    const publicUrl = repoPathToPublicUrl(f.path)
    if (publicUrl) {
      revalidatePath(publicUrl)
      revalidated.push(publicUrl)
    }

    // Comparison bridge: if path is content/comparisons/<lang>/<slug>.mdx, ensure
    // a matching row exists in public.comparisons (the table /compare/[slug]
    // actually reads from). Never overwrites existing rows.
    let bridgeNote: string | undefined
    const cmpMatch = f.path.match(/^content\/comparisons\/(en|ru)\/(.+)\.mdx$/)
    if (cmpMatch) {
      const [, language, slug] = cmpMatch
      const br = await bridgeComparison(f.path, language as "en" | "ru", slug, supabase, f.content_b64)
      bridgeNote = `bridge:${br.bridged}${br.reason ? `(${br.reason})` : ""}`
      // Log bridge action explicitly so audit trail exists alongside the
      // standard task_completed entry that follows.
      await supabase.from("agent_logs").insert({
        agent_name: "CLAUDE_CODE",
        event_type: "comparison_bridge",
        severity: br.bridged === "skipped" ? "warning" : "info",
        message: `comparison_bridge=${br.bridged} for ${f.path}${br.reason ? ` (${br.reason})` : ""}`,
        context: {
          file:           f.path,
          slug,
          language,
          bridge_result:  br.bridged,
          bridge_reason:  br.reason ?? null,
          comparison_id:  br.comparison_id ?? null,
          commit_sha:     body.commit_sha,
        },
      })
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
      results.push({ path: f.path, matched: false, reason: "no_semantic_core_match", bridged: bridgeNote })
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
      results.push({ path: f.path, matched: true, reason: `update_failed:${updErr.message}`, bridged: bridgeNote })
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

    results.push({ path: f.path, matched: true, bridged: bridgeNote })
  }

  return NextResponse.json({
    ok: true,
    revalidated,
    files: results,
  })
}
