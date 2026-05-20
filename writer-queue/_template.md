---
packet_id: NNN-<slug>                    # e.g. 042-klaviyo-vs-mailchimp
template: vs-comparison                   # vs-comparison | deep-review | how-to | guide | news | best-for-segment | alternatives
priority: high                            # high | medium | low
cluster: klaviyo
language: en                              # en | ru (ru-only when explicitly a /ru/ original)
prepared_by: OPS
prepared_at: YYYY-MM-DDTHH:MM:SSZ
target_publish_date: YYYY-MM-DD

# Primary target
primary_keyword: "klaviyo vs mailchimp shopify"
secondary_keywords:
  - "klaviyo or mailchimp"
  - "mailchimp alternatives shopify"
search_intent: commercial-investigation    # transactional | commercial-investigation | informational
volume_estimate: 0
difficulty: 0
priority_score: 0

# File linkages
semantic_core_entry_id: <uuid>
research_file: /research/YYYY-MM-DD-topic.md
output_path: /content/comparisons/en/klaviyo-vs-mailchimp.mdx

# Tool references (UUIDs from Supabase tools table)
tools:
  - id: <uuid>
    slug: klaviyo
  - id: <uuid>
    slug: mailchimp

# Internal linking suggestions (existing strong pages)
internal_links:
  - /reviews/klaviyo
  - /reviews/mailchimp
  - /guides/email-marketing-shopify

# Screenshots already in Supabase Storage (paths)
screenshots:
  - screenshots/klaviyo/pricing-2026-05.webp
  - screenshots/mailchimp/pricing-2026-05.webp
---

<!--
WRITER BRIEF — read this whole block before opening the template.
This packet is the only context Claude Code needs to write the article.
Everything below is curated by OPS; if something seems wrong, ping CHIEF
via /agent-snapshots/chief/ops-requests/ rather than guessing.
-->

## Why this article (the angle)

One paragraph: what unique thing this article says that no top-10 SERP result
says. This is the only thing that justifies the article ranking.

## Required claims (must appear, verbatim or close)

- Pricing claim: "$X/mo at Y subscribers, verified YYYY-MM-DD"
- Feature claim: "<vendor> handles <feature>, fails on <edge case>"
- Honest caveat: "<the trust-building admission>"

## Key facts to integrate

- Fact 1 (with source URL from research)
- Fact 2 (with source URL from research)
- Fact 3 (with source URL from research)

## Operator quotes worth using

- "<verbatim quote>" — <attribution>, <date>
- "<verbatim quote>" — <attribution>, <date>

## Banned phrases for this packet

Beyond the global banned list in /config/banned-phrases.json:
- Phrase 1 (e.g. vendor marketing slogans)
- Phrase 2

## Structure to follow

Use `/content-templates/<template>.md` as the structural skeleton. Don't
deviate from H2 hierarchy without reason — internal linking and JSON-LD
schemas depend on it.

## Quality gates before commit

- [ ] 1,000+ words substantive content (filler doesn't count)
- [ ] JSON-LD per template type (see content-templates/<type>.md)
- [ ] 2–5 internal links to existing strong pages from `internal_links` above
- [ ] All affiliate links via `/go/[slug]` — never direct vendor URLs
- [ ] Pricing claims dated (verified YYYY-MM-DD)
- [ ] Frontmatter complete: title, description, slug, datePublished, tools[]
- [ ] No banned phrases (global + packet-specific)
- [ ] Image alt text non-trivial (no "screenshot of pricing page")
- [ ] Mobile preview checked if any custom JSX is added

## When done

1. `git add content/<type>/en/<slug>.mdx`
2. `git commit` — husky pre-commit auto-translates EN → RU
3. `git push` — Vercel deploys; post-commit hook updates Supabase status
4. OPS moves this packet from `pending/` → `done/` within ~5 min
