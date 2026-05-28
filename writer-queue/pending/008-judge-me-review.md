---
packet_id: 008-judge-me-review
template: deep-review
priority: high
cluster: reviews-ugc
language: en
prepared_by: CLAUDE_CODE-as-OPS
prepared_at: 2026-05-27T22:55:00Z
target_publish_date: 2026-05-30
status: research_blocked

# Primary target
primary_keyword: "judge me review"
secondary_keywords:
  - "judge.me review 2026"
  - "judge me shopify review"
  - "judge me free forever"
  - "judge me vs loox"
  - "judge me pricing"
search_intent: commercial-investigation
volume_estimate: 0
difficulty: 0
priority_score: 343

# File linkages
semantic_core_entry_id: db0b9d0b-28b8-4b1e-97e9-4f9cd01f816b
research_file: /research/TBD-reviews-ugc-loox-vs-judge-me.md   # NOT YET CREATED — shares research with packet 006
output_path: /content/reviews/en/judge-me-review.mdx

# Tool references (UUIDs from Supabase tools table)
tools:
  - id: b0ad680c-fdbb-4ea3-90f5-af59f1ad01a9
    slug: judge-me
    status: published
    affiliate_route: /go/judge-me

# Internal linking suggestions
internal_links:
  - path: /content/comparisons/en/loox-vs-judge-me.mdx
    suggested_anchor: Loox vs Judge.me head-to-head
    suggested_url: /compare/loox-vs-judge-me
    # Note: this is packet 006's output, may not exist when 008 is written. Use only if 006 is shipped first.

screenshots: []

banned_phrases_reference: /config/banned-phrases.json
affiliate_url_rule: "Use /go/judge-me only; never direct vendor affiliate URLs."
pricing_verification_date: TBD-on-research
quality_gates_reference: CLAUDE.md
---

<!--
WRITER BRIEF — research-blocked packet. DO NOT WRITE YET.
This packet shares its research file with packet 006-loox-vs-judge-me.md.
ONE Deep Research session in /research/ unblocks BOTH packets.
See packet 006 for the Block B paste-ready prompt — do not re-run it.
-->

## Research dependency (BLOCKER)

This packet **cannot be written yet** because the reviews-ugc cluster has no research file. See packet `006-loox-vs-judge-me.md` for the Block B paste-ready Web Chat prompt that creates the research covering BOTH packets.

Once `/research/2026-MM-DD-reviews-ugc-loox-judge-me.md` is committed:
1. Owner updates this packet's `research_file` frontmatter to point at the actual filename.
2. Owner flips `semantic_core_entries.status` queued → research_ready for `judge me review`.
3. Writer picks up this packet.

The research covers ~6-8 reviews-ugc articles; both 006 and 008 (this one) are the first two to consume it.

## Why this article (the angle)

The Judge.me angle is the **revenue-band switching threshold**: when does the Forever Free tier become a real value win vs Loox $12.99/mo? Most reviews bury this — they either rave about Free or pitch Awesome ($15/mo) without modeling the value at specific store sizes.

The math from `semantic_core_entries.content_angle`: free forever vs Loox $12.99 at $200k+ GMV. Verify on the research that the threshold actually lands at $200k GMV or whether it's higher/lower. Lead with the threshold finding because that's what an operator at $50k-$500k GMV actually wants to know.

## Required claims (must appear, verbatim or close — populate after research)

- Pricing claim: "Judge.me Forever Free includes [verify on judge.me/pricing 2026-MM-DD]."
- Pricing claim: "Judge.me Awesome plan is $15/mo and unlocks [verify features 2026-MM-DD]."
- Pricing claim: "Loox starts at $9.99/mo for Beginner ([verify if still current 2026-MM-DD])."
- Feature claim: "Judge.me handles [core capabilities] on Free; for [advanced features], the Awesome plan or paid add-ons are required."
- Honest caveat: "Judge.me's Free tier monetizes via add-ons (Q&A, Reels, Curation) — bundle the realistic add-on cost into any 'free vs Loox' comparison."
- Honest caveat: "Submission-rate claims (Judge.me 2-3% vs Loox 7%) are vendor-published and unaudited by any third party (per the reviews-ugc research)."

## Key facts to integrate (after research saved)

- Forever Free terms (verbatim from judge.me/pricing) — date stamp.
- Awesome plan delta (the actual features unlocked beyond Free) — date stamp.
- Real operator quotes from r/shopify and r/ecommerce on Judge.me vs Loox in production stores (sourced URLs).
- Shopify App Store rating + verified review count (last 90 days theme analysis).
- Submission-rate honest take (third-party data or "both vendors self-report" admission).
- Revenue-band switching analysis: at what monthly GMV does Loox's $12.99 actually pay off vs Judge.me Free + selective add-ons?

## Operator quotes worth using

To be filled from research file once available. Do NOT invent.

## Banned phrases for this packet

Beyond the global banned list in `/config/banned-phrases.json`:
- "best Shopify review app"
- "must-have"
- "game-changer"
- "the only review app you need"
- "set it and forget it"
- "industry-leading"

## Structure to follow

Use `/content-templates/deep-review.md` as the structural skeleton. H2 hierarchy:

1. `# Judge.me Review 2026: The Free Forever Math vs Loox at $200k+ GMV`
2. TL;DR with the GMV-band verdict, dated `verified 2026-MM-DD`.
3. `## The revenue-band switching point` — at what GMV does Free stop being the right answer?
4. `## What Forever Free actually includes` — feature-by-feature, source from judge.me/pricing visit.
5. `## When you need Awesome ($15/mo)` — the specific features that justify the upgrade.
6. `## Add-on cost honesty` — Q&A, Reels, Curation pricing (none are free, model realistic stack cost).
7. `## Submission rates: vendor claims vs reality` — explicitly call out that 2-3% is vendor-published, not audited.
8. `## Judge.me vs Loox at three store sizes` — $50k / $200k / $1M GMV comparison.
9. `## Operator perspectives` — sourced quotes only.
10. `## When Loox actually wins` — honest scenarios where $12.99/mo Loox beats Free Judge.me.
11. `## FAQ` — 4-6 entries (frontmatter only).

## Frontmatter expectations for output article

```yaml
---
title: "Judge.me Review 2026: The Free Forever Math vs Loox at $200k+ GMV"
description: "Judge.me Forever Free review for Shopify stores in 2026, with add-on cost honesty, submission-rate caveat, and the revenue-band switching point vs Loox $12.99/mo — pricing verified 2026-MM-DD."
slug: judge-me-review
locale: en
template: deep-review
datePublished: 2026-MM-DD
dateModified: 2026-MM-DD
author: editorial
tools:
  - judge-me
primaryKeyword: "judge me review"
relatedKeywords:
  - "judge.me review 2026"
  - "judge me shopify review"
  - "judge me free forever"
  - "judge me vs loox"
  - "judge me pricing"
rating: 4.6     # placeholder — refine based on App Store + G2 + research aggregate
verdict:
  best_for: "Shopify stores up to ~$200k annual GMV that want a no-cost UGC backbone with optional paid add-ons."
  not_for: "Stores prioritizing photo-incentive review acquisition at scale where Loox's incentive engine pays off."
schema:
  type: Review
---
```

## Internal links to use

- `/content/comparisons/en/loox-vs-judge-me.mdx` — anchor: "Loox vs Judge.me head-to-head" (live URL `/compare/loox-vs-judge-me`). Use ONLY if packet 006 is published first.
- Once more reviews-ugc articles exist (loox review, yotpo vs loox), add them here.

## Affiliate URL reminder

All Judge.me CTAs must go through `/go/judge-me`. Direct `judge.me/affiliates` URLs are banned per `affiliate_url_rule`.

## Quality gates before commit

- [ ] research_file frontmatter updated to point at actual research file (not "TBD-...")
- [ ] 1,200+ substantive words for this deep-review.
- [ ] Review schema emitted from frontmatter.
- [ ] FAQPage emitted from frontmatter (4-6 entries).
- [ ] Every pricing dollar figure stamped with verified date.
- [ ] 2-5 internal links (or fewer if only loox-vs-judge-me exists).
- [ ] All affiliate links via `/go/judge-me` only.
- [ ] Frontmatter complete.
- [ ] No banned phrases.
- [ ] Submission-rate claims explicitly flagged as vendor-published unless research found third-party audit.
- [ ] Add-on costs honestly modeled in any "Free vs Loox" comparison (not just sticker price).
- [ ] Operator quotes traced to verifiable URLs.

## When done

1. Write the article to `/content/reviews/en/judge-me-review.mdx`.
2. `git add content/reviews/en/judge-me-review.mdx`.
3. `git commit` — husky pre-commit auto-translates EN to RU.
4. `git push` — Vercel deploys; post-commit hook updates Supabase status.
5. OPS (or after-publish.sh) moves this packet from `pending/` to `done/`.
