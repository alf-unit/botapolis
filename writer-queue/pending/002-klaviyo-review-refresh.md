---
packet_id: 002-klaviyo-review-refresh
template: deep-review
priority: high                                       # highest priority_score in core (583); also our highest-volume affiliate
cluster: klaviyo
language: en
prepared_by: operator                                # OPS not yet live; operator hand-prepared this packet
prepared_at: 2026-05-20T21:00:00Z
target_publish_date: 2026-05-25
type: refresh                                        # NOT a new article — refresh in place

# Primary target
primary_keyword: "klaviyo review"
secondary_keywords:
  - "is klaviyo worth it 2026"
  - "klaviyo review shopify"
  - "klaviyo customer agent worth it"
search_intent: commercial-investigation
volume_estimate: 14000
difficulty: 72
priority_score: 583

# File linkages
semantic_core_entry_id: "83362c29-d052-4eaf-8247-ed01ef963e81"
research_file: null                                   # Refresh draws from Supabase + sibling semantic_core entries, no Deep Research needed
output_path: /content/reviews/en/klaviyo-review-2026.mdx    # SAME file — edit in place
existing_article:
  path: /content/reviews/en/klaviyo-review-2026.mdx
  publishedAt: 2026-05-12
  updatedAt: 2026-05-12                              # bump to refresh date when shipping
  current_rating: 8.7
  current_word_count_approx: 2200
  current_gaps:
    - "No Customer Agent ($0.70/conv) coverage — feature launched after publish"
    - "Pricing section dated 2026-05-12 — verify still accurate as of refresh date"
    - "No 'cost after 6 months' table — semantic_core content_angle specifically calls this out"

# Tool references
tools:
  - slug: klaviyo
    name: Klaviyo
    in_db: true
    website_url: "https://www.klaviyo.com"
    affiliate_url: "https://www.klaviyo.com/partner/signup?utm_source=botapolis"
    affiliate_partner: partnerstack
    category: email
    pricing_model: freemium
    pricing_min: 0
    pricing_max: 1700
    pricing_notes: "Free up to 250 contacts / 500 monthly emails. Paid tiers scale with contact count."
    rating: 8.7
    role_in_article: "Subject of the review. /go/klaviyo is live and tested."

# Sibling articles in cluster (do NOT swallow their scope; LINK to them)
cluster_siblings:
  - keyword: "klaviyo pricing"
    priority_score: 514
    template: pricing
    status: queued
    expected_path: /content/reviews/en/klaviyo-pricing-2026.mdx
    treatment: "Mention pricing pressure briefly; link to this dedicated article when it ships. Until then, the review carries the pricing weight."
  - keyword: "klaviyo customer agent review"
    priority_score: 96
    template: review
    status: queued
    expected_path: /content/reviews/en/klaviyo-customer-agent-review.mdx
    treatment: "Add 2-3 paragraph section in main review. Set up internal link target with a placeholder anchor for the dedicated review."
  - keyword: "klaviyo bill jumped active profile"
    priority_score: 65
    template: how-to
    status: queued
    expected_path: /content/guides/en/klaviyo-bill-jumped-active-profile.mdx
    treatment: "Mention the Feb 2025 active-profile switch in pricing section; link out to dedicated how-to when shipped."
  - keyword: "klaviyo vs mailchimp"
    priority_score: 420
    template: vs-comparison
    status: queued
    treatment: "Sub-$2k stores section already mentions Mailchimp/Omnisend — link to the vs-comparison once it ships."

# Internal linking suggestions (existing content)
internal_links:
  status: ok
  available_now:
    - { path: /reviews/omnisend-review-2026, anchor: "Omnisend", note: "Currently linked in 'notFor' line — keep" }
    - { path: /reviews/mailchimp-review-2026, anchor: "Mailchimp", note: "Same — currently in 'notFor' line; keep" }
    - { path: /reviews/postscript-review-2026, anchor: "Postscript", note: "Email builder comparison line — keep, currently active" }
  add_during_refresh:
    - "When Customer Agent section is added, link to /tools/klaviyo for the canonical product page"
    - "Update internal-link discovery once cluster_siblings publish"

# Screenshots
screenshots:
  status: existing
  current:
    - "Hero screenshot at top — keep unless visibly stale"
    - "Pricing tier breakdown — VERIFY against current klaviyo.com/pricing; replace if changed"
  needed:
    - "Customer Agent admin screen (NEW for refresh) — operator must capture from a live Klaviyo account or pull from vendor docs"
---

# WRITER BRIEF — REFRESH

## Scope (READ CAREFULLY — refresh, not rewrite)

This is a **refresh of an existing review** (rating 8.7, ~2,200 words, published 2026-05-12). The article is sound. We are NOT rebuilding it from scratch.

The semantic_core entry's `content_angle` is: *"What actually changes on your bill 90 days after the Feb 2025 active-profile switch, with real receipts from 3 stores"* and `content_gap`: *"Top 10 is competitors-as-reviewer; no honest cost-after-6-months table"*.

**Three additions, in priority order:**

1. **Add a "Cost after 6 months" section** — this is the unique angle that flips the top-10 result composition. Section should have a small table: monthly bill at month 1 vs month 6 for typical Shopify revenue brackets. Use the Supabase `tools.klaviyo.pricing_notes` as the anchor.

2. **Add a Customer Agent ($0.70/conv) sub-section** under features — 2-3 paragraphs. Note that the dedicated review at `klaviyo customer agent review` is queued (priority_score 96); set up an internal-link placeholder so the deep dive lives there. Verify the $0.70/conv pricing from klaviyo.com/pricing on the day of refresh.

3. **Acknowledge the Feb 2025 active-profile billing migration** in the pricing section — 1 paragraph max. The dedicated how-to (`klaviyo bill jumped active profile`, priority_score 65) covers the operator playbook; this article just flags the historical context.

**Do NOT add:**
- Long Customer Agent teardown — that's the dedicated review's job (cluster_siblings.expected_path)
- Mailchimp/Omnisend deep comparison — that's the vs-comparison's job
- New rating without justification — rating change requires `npm run sync:ratings:apply` and a paragraph explaining what shifted

## Required claims (must appear, verified on refresh date)

- "Free up to 250 contacts / 500 monthly emails" — sourced from `tools.klaviyo.pricing_notes`; verify still accurate
- "Customer Agent: $0.70 per conversation" — verify klaviyo.com/pricing on refresh date
- "Customer Agent intro pricing $140/mo expired 2026-03-31" — per semantic_core_entries `klaviyo pricing` notes (offer end date verbatim from klaviyo.com/pricing)
- Honest caveat preserved: existing "Email builder still feels dated" line — DON'T remove during refresh

## Key facts to integrate

- Customer Agent pricing model (per-conversation) — fundamental shift from per-contact
- The 25% cap on price increases after active-profile migration (per Omnisend's May 2026 post, captured in `klaviyo bill jumped active profile` notes)
- February 2025 active-profile billing switch (context only — full playbook is in the dedicated how-to)

## Operator quotes worth using

Existing article already cites a 12k-contact / $48k MRR test store. **Don't fabricate new operator quotes during refresh.** If Web Chat is run later for deeper operator perspectives, treat that as a second refresh cycle.

## Banned phrases for this packet

Beyond the global banned list in `/config/banned-phrases.json`:
- "Klaviyo is the only choice for serious operators" — preserved sub-$10k carve-out is what makes the existing article credible; keep the nuance
- "industry-leading email platform" — global banned phrase, just flagging

## Structure to follow

Existing article structure is fine. Insert points (relative to current MDX):
- New section "Cost after 6 months" → between "Pricing breakdown" and "What it actually does well"
- New sub-section "Customer Agent (AI customer service)" → inside "What it actually does well", after the "Predictive analytics" mention
- Active-profile migration note → 1 paragraph inside "Pricing breakdown", flagged as historical context

## Frontmatter updates required

- `updatedAt: 2026-05-25` (or actual refresh date)
- `pros` / `cons` / `rating` — review if Customer Agent shifts the calculus; if you adjust rating, run `npm run sync:ratings:apply` so Supabase `tools.klaviyo.rating` stays in lockstep (pre-commit content-validator will catch drift otherwise)
- `description` may need 1-line update to mention Customer Agent

## Quality gates before commit

(Plus the global gates from `CLAUDE.md`)

- [ ] `updatedAt` bumped, `publishedAt` UNCHANGED (this is a refresh, not a republish)
- [ ] All new pricing claims dated "verified [refresh date]"
- [ ] Customer Agent section added, but stays under ~400 words (deep dive lives in dedicated review)
- [ ] No removal of existing operator-quote credibility lines
- [ ] If rating changed: `npm run sync:ratings:apply` and the validator passes
- [ ] All affiliate CTAs still go through `/go/klaviyo` (existing path)
- [ ] 2-5 internal links to siblings — existing 3 (omnisend, mailchimp, postscript) kept; add `/tools/klaviyo` if not already linked
- [ ] Pre-commit hook auto-translates the EN delta to `/ru/reviews/klaviyo-review-2026.mdx` — verify the RU file got the same edits

## When done

1. `git add content/reviews/en/klaviyo-review-2026.mdx` (and any RU twin if auto-translation ran)
2. `git commit -m "refresh(reviews): klaviyo — add Customer Agent + cost-after-6mo angle"`
3. `git push` — Vercel deploys; post-commit hook updates Supabase
4. `sh scripts/claude-code-helpers/after-publish.sh 002-klaviyo-review-refresh.md` to move this packet to `done/`
5. Note for cluster planning: after this refresh ships, the sibling `klaviyo customer agent review` (priority_score 96) becomes higher-leverage — its dedicated article can now link back to a refreshed parent.
