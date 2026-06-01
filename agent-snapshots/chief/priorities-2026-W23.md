# OPS priorities — 2026-W23

Owner: CHIEF
Created: 2026-06-01 07:15 America/Los_Angeles
Publishing rate: 4/day
Weekly capacity: 28 packets

## Hard constraints

- Do not materialize a writer packet without either research_file or status: research_blocked.
- Keep existing pending packets 006 and 008 at the top until reviews-ugc research is supplied.
- If a keyword is already published or already in writer-queue/done, skip it and use the next candidate in the same cluster.
- Current focus clusters: attribution-ai, omnisend, postscript, gorgias, reviews-ugc.

## Immediate queue state

```
pending_real_files: 2
target_daily: 4
target_weekly: 28
blocked: 006-loox-vs-judge-me, 008-judge-me-review
blocker: one reviews-ugc Deep Research file
```

## Priority clusters

1. reviews-ugc
   - Keep 006-loox-vs-judge-me and 008-judge-me-review as research_blocked until /research/2026-06-01-reviews-ugc-loox-judge-me.md exists.
   - After research lands, add loox vs yotpo and yotpo vs judge.me if not already covered.

2. attribution-ai
   - triple whale review
   - triple whale vs northbeam
   - triple whale alternatives
   - northbeam review if needed for cluster completion

3. omnisend
   - omnisend review
   - omnisend vs mailchimp
   - omnisend pricing
   - best email marketing for shopify small store refresh/sibling if research coverage is sufficient

4. postscript
   - postscript review
   - postscript pricing
   - postscript vs klaviyo sms
   - postscript vs attentive
   - postscript shopper vs klaviyo customer agent

5. gorgias
   - gorgias pricing
   - gorgias vs zendesk
   - gorgias vs tidio
   - gorgias alternatives

## Secondary candidates if capacity remains

```
adcreative ai review | ad-creative-ai | priority 289
tidio review | tidio | priority 248
rebuy review | personalization-recs | priority 246
mailchimp review shopify | mailchimp | priority 213
loop returns review | returns-automation | priority 189
shopify sidekick review | shopify-sidekick-magic | priority 182
best ai product photography shopify | ai-product-photography | priority 167
smile io vs loyaltylion | loyalty-rewards | priority 156
```

## Research mapping guidance

Existing broad Phase 0 research files can support tool identity, pricing, affiliate-program, and rating facts for the 34-tool set. They are not a substitute for cluster-specific operator/Reddit/Deep Research when a packet requires lived operator testimony or SERP-specific angle coverage.

Use research_blocked rather than skipping if a selected keyword lacks cluster research.
