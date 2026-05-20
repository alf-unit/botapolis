---
packet_id: 001-skio-to-loop-migration
template: how-to
priority: critical                                  # event-driven; relevance window closes as Recharge consolidates
cluster: recharge-skio-acquisition
language: en
prepared_by: operator                               # OPS not yet live; operator hand-prepared this packet
prepared_at: 2026-05-20T21:00:00Z
target_publish_date: 2026-05-27                     # 7-day window — Skio cancellation deadline pressure is real

# Primary target
primary_keyword: "migrate skio to loop"
secondary_keywords:
  - "skio to loop migration"
  - "skio cancellation what to do"
  - "skio subscribers transfer loop"
search_intent: transactional
volume_estimate: 1100
difficulty: 30
priority_score: 147

# File linkages
semantic_core_entry_id: "0fc1752d-1dc3-45ef-be4f-41d799e1c759"
research_file: null                                  # NO RESEARCH FILE YET — see "Source material" section below
output_path: /content/guides/en/how-to-migrate-skio-to-loop.mdx

# Tool references
tools:
  # Recharge — IS in Supabase tools table; safe to use /go/recharge
  - slug: recharge
    name: Recharge
    in_db: true
    website_url: "https://www.rechargepayments.com"
    affiliate_url: "https://www.rechargepayments.com/partners?utm_source=botapolis"
    affiliate_partner: partnerstack
    category: upsell
    pricing_model: subscription
    pricing_min: 99
    pricing_max: 499
    pricing_notes: "Standard plan from $99/mo + 1.25% transaction fee. Pro $499/mo drops the per-transaction fee to 1% and unlocks the Flow engine."
    rating: 8.3
    role_in_article: "Default destination if subscriber stays in Recharge ecosystem post-acquisition; benchmark for fee comparison."
  # Loop Subscriptions — NOT IN Supabase tools table yet
  - slug: loop-subscriptions
    name: Loop Subscriptions
    in_db: false
    website_url: "https://www.loopwork.co"
    affiliate_url: null
    affiliate_partner: null
    role_in_article: "Primary recommendation in title. CANNOT use /go/loop-subscriptions until operator adds this to tools table."
  # Skio — NOT IN Supabase tools table; included for context only (acquired, sunsetting)
  - slug: skio
    name: Skio
    in_db: false
    website_url: "https://www.skio.com"
    affiliate_url: null
    affiliate_partner: null
    role_in_article: "Origin platform. No affiliate — write factually, do not promote."
  # Stay AI — NOT IN Supabase tools table; mentioned as alternative
  - slug: stay-ai
    name: Stay AI
    in_db: false
    website_url: "https://stay.ai"
    affiliate_url: null
    affiliate_partner: null
    role_in_article: "Secondary alternative if merchant wants AI-retention focus over Loop's broader feature set."

# Internal linking suggestions
internal_links:
  status: thin
  available_now:
    # Nothing in /content/ directly covers subscriptions yet — leaving stub.
    - { path: null, anchor_idea: "Recharge review", note: "DOES NOT EXIST YET — do not link until /content/reviews/en/recharge-review-2026.mdx is published" }
  link_strategy: "Article will be a hub for the recharge-skio-acquisition cluster. When sibling articles ship (loop vs recharge 2026, skio acquisition recharge, recharge alternatives), retro-link them. For now, link OUT to vendor docs + the Recharge tool detail page /tools/recharge."

# Screenshots from Supabase Storage
screenshots:
  status: none
  needed:
    - "Skio admin → Export Subscribers screen (operator must screenshot during a live migration)"
    - "Loop admin → Import Subscribers screen"
    - "Loop subscriber portal vs Skio subscriber portal side-by-side (what visually breaks)"
  upload_target: "Supabase Storage path: screenshots/skio-to-loop-migration/"
---

# WRITER BRIEF

## ⚠ Data dependency status (READ FIRST)

This packet has **three known gaps**. The writer must decide before drafting how to handle each:

1. **No research file.** No Deep Research has been done for this topic. Two paths:
   - **Path A (deeper):** Stop and request operator to run Deep Research in Web Chat first (target ~30 min). The semantic_core_entries.content_gap is *"No step-by-step with screenshots of token-export failures"* — research should surface real operator accounts on Reddit r/shopify of what actually broke during migrations.
   - **Path B (faster, shallower):** Write from publicly-verifiable vendor docs only + the Recharge data in Supabase. Skip the operator-quote section. Article will be thinner but ships within the 7-day window. **Recommended for first ship**, refresh later.

2. **Loop and Skio not in `tools` table.** Affiliate URLs unavailable. Options:
   - Operator adds Loop to `tools` table first (with real affiliate_url from Loop's partner program once signed), THEN write — clean path, ~1 hr lead time.
   - Or write without affiliate to Loop — article still publishes, monetization gap is acceptable for a high-relevance event piece. Skio gets no affiliate either way (acquired, no longer accepting new affiliates likely).

3. **No internal links available.** This is the first subscription-cluster article. Article will be the cluster anchor; later siblings link back to it.

## Why this article (the angle)

Recharge acquired Skio for $105M on April 30, 2026. Skio merchants face a forced platform decision: stay in the Recharge ecosystem (Skio→Recharge consolidation timeline unclear) or migrate elsewhere within the operator-friendly window. **No top-10 SERP result walks through what actually breaks during the migration** — that's our gap.

This article positions botapolis as the operator-first reference for the recharge-skio-acquisition cluster. Six more articles depend on this one as their anchor (see cluster in semantic_core_entries).

## Required claims (must appear, verbatim or close)

- "Recharge acquired Skio for $105 million on April 30, 2026" — source: TechCrunch
- "[N]-day window before [specific Skio sunsetting event]" — pull the actual number from Loop's migration page once writing
- Recharge pricing dated: "Standard $99/mo + 1.25% transaction fee, verified [YYYY-MM-DD]" — sourced from Supabase `tools.recharge.pricing_notes`
- Honest caveat: explicit acknowledgement that staying on Recharge post-Skio is a defensible choice for low-volume subscribers — don't only promote the migration

## Key facts to integrate

(All from BOTAPOLIS-PLAYBOOK-V2.md and semantic_core_entries.notes for sibling entries in the same cluster)

- Recharge pricing tiers (from Supabase `tools.recharge`)
- Skio → Loop migration triggered the rising-query pattern post-2026-04-30 (per semantic_core notes)
- Loop tripled ARR to $33M+ in 12 months (ARR Club source, per Playbook context)
- Loop pricing — operator must verify from loopwork.co before writing; do NOT invent

## Operator quotes worth using

⚠ **None available in this packet.** If writing Path B (no Deep Research), skip the quote section entirely rather than fabricate. If Path A, pull from Web Chat output.

## Banned phrases for this packet

Beyond the global banned list in `/config/banned-phrases.json`:
- "Skio is dead" — too cavalier given operators have real money on the line
- "seamless migration" — every migration breaks something; lying about it kills trust
- Anti-vendor language about Skio or Recharge — both are still operating businesses

## Structure to follow

Use `/content-templates/how-to.md`. Specific deviations for this article:
- Prereqs section must mention "Loop Subscriptions account on at least the [tier] plan" — verify tier from Loop docs
- Steps 1-3 cover Skio export; Steps 4-7 cover Loop import; Step 8 covers verifying subscriber portal works
- Troubleshooting section is critical — the content_gap is specifically *what breaks*. Cover at minimum: payment token transfer failures, subscriber portal login confusion, custom-pricing rules not migrating cleanly

## Quality gates before commit

(Plus the global gates from `CLAUDE.md`)

- [ ] Decided Path A vs Path B and noted in PR/commit message
- [ ] 800+ words substantive (how-tos can be shorter; quality > word count)
- [ ] JSON-LD `HowTo` schema correct (steps detected from H2 "Step N:" prefixes per template)
- [ ] No /go/loop-subscriptions in the MDX — that route doesn't exist yet. Link to https://www.loopwork.co directly with rel="sponsored noopener" if monetizing; or no link at all.
- [ ] /go/recharge usable — Recharge IS in tools table
- [ ] Pricing claims dated: "Recharge Standard $99/mo + 1.25% — verified [YYYY-MM-DD]"
- [ ] Troubleshooting section non-empty (this is the content_gap — must deliver)
- [ ] Frontmatter `cluster: recharge-skio-acquisition` matches semantic_core_entries
- [ ] After publish: ping operator to add Loop Subscriptions + Stay AI to `tools` table so cluster siblings can use `/go/[slug]`

## When done

1. `git add content/guides/en/how-to-migrate-skio-to-loop.mdx`
2. `git commit` — husky pre-commit will auto-translate to RU
3. `git push` — Vercel deploys; post-commit hook updates Supabase status
4. `sh scripts/claude-code-helpers/after-publish.sh 001-skio-to-loop-migration.md` to move this packet to `done/`
5. Ping operator: "shipped 001 on Path [A|B]. Loop tool entry needed in DB before sibling article 'loop vs recharge 2026' can ship cleanly."
