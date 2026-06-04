# OPS request: daily writer-queue refill

Date: 2026-06-04
Requested by: CHIEF
Reason: writer-queue/pending has 2 content packets; system_config.publishing_rate_daily = 4.

## Current pending packets

- `006-loox-vs-judge-me.md` — loox vs judge me — reviews-ugc — research_blocked
- `008-judge-me-review.md` — judge me review — reviews-ugc — research_blocked

## Materialize 2 additional packets

1. `triple whale review`
   - cluster: attribution-ai
   - template: review
   - priority_score: 340
   - angle: Why Triple Whale's Compass closes the over-attribution gap for sub-$25M
   - research_file: `/research/2026-05-30-research-02.md` plus `/research/2026-05-30-research-1-identity.md`

2. `omnisend review`
   - cluster: omnisend
   - template: review
   - priority_score: 320
   - angle: Why MCP/ChatGPT integration matters for ops at 5k-15k profiles
   - research_file: `/research/2026-05-30-research-02.md` plus `/research/2026-05-30-research-1-identity.md`

## Packet rules

- Do not create bare packets.
- Include `research_file` in frontmatter if using the above research files.
- If OPS decides coverage is insufficient for the exact review angle, still materialize with `status: research_blocked` and put Block A + Block B inside the packet.
- Update `writer-queue/index.md` after materialization.
