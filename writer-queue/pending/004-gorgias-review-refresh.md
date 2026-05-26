---
packet_id: 004-gorgias-review-refresh
template: deep-review
priority: high
cluster: gorgias
language: en
prepared_by: OPS
prepared_at: 2026-05-26T07:47:00Z
target_publish_date: 2026-05-28
type: refresh

# Primary target
primary_keyword: "gorgias review"
secondary_keywords:
  - "gorgias ai agent"
  - "gorgias pricing"
  - "gorgias shopify support"
  - "gorgias alternatives"
search_intent: commercial-investigation
volume_estimate: 0
difficulty: 0
priority_score: 388

# File linkages
semantic_core_entry_id: "a9e9aaff-c2fd-4eb5-b854-6a7dc317316e"
research_file: null
output_path: /content/reviews/en/gorgias-review-2026.mdx
existing_article:
  path: /content/reviews/en/gorgias-review-2026.mdx
  publishedAt: 2026-05-13
  updatedAt: 2026-05-13
  current_rating: 8.4
  current_gaps:
    - "Refresh AI Agent / Automate coverage with 2026 resolved-conversation pricing."
    - "Model billable-ticket math at 10k tickets/month and identify the Advanced plan trap."
    - "Add Trustpilot/G2 sentiment caveat only if independently verified before publication."

# Tool references
tools:
  - id: 4e332e89-3ab8-4c67-a02d-284878728c8d
    slug: gorgias
    status: published
    affiliate_route: /go/gorgias
    category: support
    pricing_notes: "Starter $10/mo (50 tickets); Basic $60; Pro $360; Advanced $900. Add-ons for AI usage past plan."
    best_for: "$20k+ MRR stores doing 200+ tickets/mo with multi-channel support."

# Internal linking suggestions
internal_links:
  - path: /content/reviews/en/tidio-review-2026.mdx
    suggested_anchor: Tidio review
    suggested_url: /reviews/tidio-review-2026
  - path: /content/reviews/en/klaviyo-review-2026.mdx
    suggested_anchor: Klaviyo review
    suggested_url: /reviews/klaviyo-review-2026
  - path: /content/reviews/en/omnisend-review-2026.mdx
    suggested_anchor: Omnisend review
    suggested_url: /reviews/omnisend-review-2026

# Screenshots already in Supabase Storage (paths)
screenshots: []

# Required references
content_template: /content-templates/deep-review.md
banned_phrases_reference: /config/banned-phrases.json
affiliate_url_rule: "Use /go/[slug] only; never link directly to vendor affiliate URLs."
pricing_verification_date: 2026-05-26
quality_gates_reference: CLAUDE.md
---

<!--
WRITER BRIEF — read this whole block before opening the template.
This packet is the only context Claude Code needs to refresh the article.
Everything below is curated by OPS. If something seems wrong, ping CHIEF
via /agent-snapshots/chief/ops-requests/ rather than guessing.
-->

## Why this article (the angle)

Refresh the existing Gorgias review around support economics, not generic helpdesk features. The useful angle is whether Gorgias AI/Automate lowers total support cost once resolved-conversation charges, billable tickets, and plan thresholds are modeled for real Shopify ticket volume. The article should keep the current Shopify-native integration verdict, but add a sharper 2026 warning: Gorgias can still be the right helpdesk for order-heavy support teams, yet the math breaks quickly when AI deflection is low or seasonal ticket spikes push a store into a higher tier.

## Required claims (must appear, verbatim or close)

- Pricing claim: "Gorgias Starter is $10/mo for 50 tickets, Basic is $60/mo, Pro is $360/mo, and Advanced is $900/mo, verified 2026-05-26."
- Pricing claim: "Gorgias AI Agent charges by automated resolution; model the cost separately from the helpdesk subscription, verified 2026-05-26."
- Feature claim: "Gorgias is strongest when Shopify order context is inside the ticket: refunds, address edits, WISMO, subscriptions, and customer LTV."
- Honest caveat: "Gorgias is not the cheapest support tool for stores below 100-200 monthly tickets; Tidio or Re:amaze-style setups can be cheaper if Shopify admin switching is tolerable."

## Key facts to integrate

- Existing article path is `/content/reviews/en/gorgias-review-2026.mdx`; refresh in place, do not create a new URL.
- Supabase tool row says Gorgias is best for `$20k+ MRR stores doing 200+ tickets/mo with multi-channel support` and not for tiny stores under 50 tickets/mo.
- Semantic core angle: "Billable-ticket math at 10k/month and the Advanced plan trap merchants describe on Trustpilot."
- Semantic core gap: top results miss the 2.5/5 Trustpilot pattern and billing dispute clusters. Verify this before publishing; do not repeat it unless the current source page supports it.
- Gorgias pricing row currently says: "Starter $10/mo (50 tickets); Basic $60; Pro $360; Advanced $900. Add-ons for AI usage past plan."

## Operator quotes worth using

- Pull fresh support-pricing sentiment from verified public sources before publication. Do not invent operator quotes.
- If Reddit, G2, Trustpilot, or Shopify App Store quotes are used, include source URL and date checked in an HTML comment near the quote.

## Banned phrases for this packet

Beyond the global banned list in `/config/banned-phrases.json`:
- "AI-powered customer experience platform"
- "deflect tickets effortlessly"
- "set it and forget it support"

## Structure to follow

Use `/content-templates/deep-review.md` as the structural skeleton, but treat this as a refresh of the existing article. Preserve any working sections from the current MDX and replace stale pricing, AI, and alternatives sections.

## Quality gates before commit

- [ ] Refresh existing file only: `/content/reviews/en/gorgias-review-2026.mdx`
- [ ] 1,200+ substantive words after refresh
- [ ] Pricing dated `verified 2026-05-26` or later
- [ ] Explicit cost model for 200, 1,000, and 10,000 monthly tickets
- [ ] AI Agent / Automate section separates subscription cost from resolved-conversation usage
- [ ] 2-5 internal links from `internal_links` above
- [ ] All affiliate links via `/go/gorgias` — never direct vendor URLs
- [ ] No banned phrases (global + packet-specific)
- [ ] Frontmatter rating still syncs with Supabase tool rating or is intentionally updated alongside tool data
- [ ] Mobile preview checked if custom JSX is added

## When done

1. Edit `/content/reviews/en/gorgias-review-2026.mdx` in place.
2. `git commit` with the refreshed article.
3. `git push` — Vercel deploys; post-commit hook updates Supabase status.
4. OPS moves this packet from `pending/` to `done/` after publish confirmation.
