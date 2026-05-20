# Template: deep-review

Use for a single-product deep review when intent is commercial-investigation
or transactional ("klaviyo review", "is gorgias worth it"). Builds trust by
acknowledging weaknesses; ranks via depth, not vendor cheerleading.

## Frontmatter

```yaml
---
title: "<Tool> Review (<Year>): Honest Take After <N> <Audience> Stores"
description: "We dug into pricing, real-store outcomes, and the edge cases vendor docs don't admit. Here's when <Tool> is worth it — and when it isn't."
slug: <tool-slug>
locale: en
template: deep-review
datePublished: YYYY-MM-DD
dateModified: YYYY-MM-DD
author: editorial
tools:
  - <tool-slug>                       # MUST match a row in Supabase tools
primaryKeyword: "<tool> review"
relatedKeywords:
  - "is <tool> worth it"
  - "<tool> pricing"
  - "<tool> alternatives"
rating:
  overall: 0.0                        # 0-5, must match Supabase tools.rating (sync:ratings enforces)
  pricing: 0.0
  features: 0.0
  ease_of_use: 0.0
  support: 0.0
verdict:
  best_for: "<segment>"
  avoid_if: "<anti-segment>"
faq:
  - q: "How much does <Tool> cost for a Shopify store?"
    a: "<answer>"
  - q: "What's <Tool>'s biggest weakness?"
    a: "<answer>"
schema:
  type: Review
---
```

## Structure

```
# <Tool> Review (<Year>): Honest Take After <N> <Audience> Stores

> TL;DR (verdict + one-line "best for" + one-line "avoid if")

## Bottom line up front
- Best for: <segment>
- Avoid if: <anti-segment>
- Standout strength: <one thing>
- Biggest weakness: <one thing>

## Pricing breakdown (verified YYYY-MM-DD)
- Tier-by-tier table
- Hidden costs (onboarding, overage, integrations)
- Total cost at common Shopify revenue brackets

## What it actually does well
3–5 features explained with concrete examples (not marketing copy).

## What it doesn't do well
2–4 honest weaknesses. This is the section that builds trust.

## Real operator outcomes
- Quote 1 (verbatim, attributed, dated)
- Quote 2 (verbatim, attributed, dated)
- Aggregate Reddit/G2 sentiment trend if data supports

## Setup & onboarding
What it takes to go live. Hours, prerequisites, common gotchas.

## Integrations that matter for Shopify
Native vs third-party vs none. Webhook quality. Klaviyo/Gorgias/Recharge
parity where relevant.

## Alternatives worth considering
2–3 alternatives with one-line "pick this instead if …" verdicts.
Internal-link to standalone reviews.

## Final verdict
- Score: X/5 (must match frontmatter rating)
- Best for: <segment>
- Skip if: <conditions>

## FAQ
(4–6 entries)
```

## JSON-LD required

Emitted automatically from frontmatter:
- `Review` (with `itemReviewed: Product`)
- `Product` (with `aggregateRating` from Supabase tools row)
- `FAQPage`

## Quality gates

- [ ] 1,200+ substantive words
- [ ] Both strengths AND weaknesses sections (no all-positive reviews)
- [ ] Rating in frontmatter matches Supabase tools.rating (sync:ratings)
- [ ] Pricing dated
- [ ] 3+ verbatim operator quotes
- [ ] 2–5 internal links (alternatives, comparisons, related guides)
- [ ] All affiliate CTAs via `/go/<tool-slug>`
