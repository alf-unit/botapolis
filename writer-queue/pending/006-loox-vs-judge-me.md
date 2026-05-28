---
packet_id: 006-loox-vs-judge-me
template: vs-comparison
priority: high
cluster: reviews-ugc
language: en
prepared_by: CLAUDE_CODE-as-OPS
prepared_at: 2026-05-27T22:55:00Z
target_publish_date: 2026-05-30
status: research_blocked

# Primary target
primary_keyword: "loox vs judge me"
secondary_keywords:
  - "loox or judge me"
  - "judge me vs loox shopify"
  - "loox vs judge me submission rate"
  - "loox judge me pricing"
search_intent: commercial-investigation
volume_estimate: 0
difficulty: 0
priority_score: 420

# File linkages
semantic_core_entry_id: 3aa82cf8-7ec1-4eb3-b098-e60ba6360027
research_file: /research/TBD-reviews-ugc-loox-vs-judge-me.md   # NOT YET CREATED — see "Research dependency" below
output_path: /content/comparisons/en/loox-vs-judge-me.mdx

# Tool references (UUIDs from Supabase tools table)
tools:
  - id: 847ed1f6-35d9-4ab8-aa9f-962d87030332
    slug: loox
    status: published
    affiliate_route: /go/loox
  - id: b0ad680c-fdbb-4ea3-90f5-af59f1ad01a9
    slug: judge-me
    status: published
    affiliate_route: /go/judge-me

# Internal linking suggestions
internal_links: []   # No reviews-ugc reviews exist yet; will populate after 008-judge-me-review.md ships

screenshots: []

banned_phrases_reference: /config/banned-phrases.json
affiliate_url_rule: "Use /go/loox and /go/judge-me only; never direct vendor affiliate URLs."
pricing_verification_date: TBD-on-research
quality_gates_reference: CLAUDE.md
---

<!--
WRITER BRIEF — research-blocked packet. DO NOT WRITE YET.
Writer should skip this packet until research_file appears at the path above.
Owner must run the Block B prompt below in Claude.ai Web Chat (Deep Research mode)
to unblock this packet AND packet 008-judge-me-review.md — one research covers both.
-->

## Research dependency (BLOCKER)

This packet **cannot be written yet** because the reviews-ugc cluster has no research file. The keyword `loox vs judge me` requires:

- Verified submission-rate data (Loox claims 7%, Judge.me claims 2-3% — neither audited by third party)
- Verified pricing tiers as of 2026-05 (Loox $9.99-$299/mo by order volume, Judge.me $0 free forever + $15/mo Awesome, paid add-ons)
- Operator quotes from r/shopify and r/ecommerce on submission rate honesty
- App Store rating + review counts (Loox 4.9/5 ~22k reviews; Judge.me 5.0/5 ~30k reviews as of May 2026 — verify)
- Honest take on Loox photo-review bias (incentivized) vs Judge.me's lighter incentive model

**Architecture rule (Часть 6):** one research file covers ~6-8 articles in a cluster. The reviews-ugc research below covers BOTH `loox vs judge me` (this packet) AND `judge me review` (packet 008-judge-me-review.md). Future packets in this cluster (loox review, yotpo vs loox, okendo vs judge-me) will also reuse it.

---

## Block A — operator-facing summary (owner reads this)

**Priority:** High
**Topic:** "Loox vs Judge.me — submission rates, pricing, and reviews-cluster anchors for Shopify operators 2026"
**Reason:** reviews-ugc cluster (2 keywords in semantic_core top-4 by priority_score: 420 + 343) has zero research file. Blocks ≥2 packets in writer-queue. Single Deep Research session unblocks the entire cluster (~6-8 future articles).

**Brief:**
- Verify Loox 7% submission-rate claim and Judge.me 2-3% counter-claim — find any third-party audit, agency case study, or operator self-report data.
- Pull pricing tiers from loox.io/pricing and judge.me/pricing (May 2026 snapshot, dated verification).
- Reddit r/shopify, r/ecommerce, r/dropship — verbatim operator quotes on which UGC tool actually drives more reviews per 100 orders.
- Shopify App Store — count of installs, rating, recent review themes (last 90 days).
- Independent reviews on G2 / Software Advice / Capterra — aggregated themes, not just star ratings.
- Honest take on Loox photo-incentive bias (free product/discount for photo review) vs Judge.me lighter model.
- Revenue band where Loox $12.99/mo becomes irrelevant vs Judge.me's $0 free tier (target: $200k+ GMV cutoff).

**Save to:** `/research/2026-MM-DD-reviews-ugc-loox-judge-me.md` (use today's date in YYYY-MM-DD)
**Reply in Telegram with:** `research ready: 2026-MM-DD-reviews-ugc-loox-judge-me.md`

**Estimated effort:** 45-60 min Deep Research session.

---

## Block B — paste-ready Web Chat prompt (copy ENTIRE block below into Claude.ai)

```
Topic: Loox vs Judge.me UGC review apps for Shopify stores — submission rates, pricing, and value-band breakpoints (May 2026).

Conduct Deep Research on the topic above. Output will be used to write a vs-comparison article AND a Judge.me deep-review for botapolis.com (audience: Shopify operators at $50k-$2M annual GMV).

## RESEARCH TASKS

1. **Submission-rate verification.** Find any third-party audit, agency case study, or operator self-report data on:
   - Loox's published 7% review-submission rate claim (per 100 orders).
   - Judge.me's published 2-3% counter-claim (or whatever they currently publish).
   - Any operator quote on r/shopify, r/ecommerce, or Shopify Community contradicting or confirming these rates.
   - Specifically: does Loox's photo-incentive (free product / discount for photo review) drive submissions, or does it just shift incentive cost from review acquisition to product giveaway?

2. **Pricing (verified May 2026):**
   - loox.io/pricing — all tiers, order-volume bands, free-trial terms.
   - judge.me/pricing — Forever Free terms, Awesome plan ($15/mo) feature delta, any paid add-ons (Q&A, Reels, Curation).
   - Date-stamp every dollar figure. Capture the page URL.

3. **Operator perspectives:**
   - Reddit r/shopify and r/ecommerce — verbatim quotes on which app drives more revenue per review, photo vs text review value, and incentive cost honesty.
   - Shopify Community forum threads on UGC ROI.
   - Verifiable Reddit URLs (`/r/<sub>/comments/<id>`).

4. **Vendor app store data:**
   - Shopify App Store — install counts, rating (out of 5, with verified review count), recent review themes (last 90 days). Both apps.
   - G2 / Software Advice / Capterra — aggregated themes, top complaints, top praise.

5. **Statistical findings to surface:**
   - Effective cost per submitted review at $200k vs $1M vs $5M annual GMV for each app (modeled if vendor data permits).
   - Photo-review % share for Loox (incentive-driven) vs Judge.me (organic).
   - Time-to-first-review benchmarks if anyone published them.

6. **Article ideas this research should enable:**
   - "Loox vs Judge.me: submission rates and the $200k GMV switching point"
   - "Judge.me review: Forever Free vs Loox $12.99 math for Shopify stores"
   - "Loox review: when the photo-incentive ROI actually works"
   - "Yotpo vs Loox vs Judge.me: enterprise UGC stack 2026"
   - "Okendo vs Judge.me: when premium UGC pays off"

## OUTPUT FORMAT

Follow `/research/_template.md` from the botapolis repo — 8 sections (Executive Summary → SERP Landscape → Operator Perspectives → Vendor Data → Statistical Findings → Recommendations → Caveats → Source List).

Frontmatter:
```yaml
---
research_id: 2026-MM-DD-reviews-ugc-loox-judge-me   # use today's date YYYY-MM-DD
topic: "Loox vs Judge.me UGC review apps for Shopify stores — submission rates, pricing, and value-band breakpoints (May 2026)"
requested_by: CLAUDE_CODE-as-CHIEF-fallback
requested_at: 2026-05-27T22:55:00Z
completed_at: <ISO timestamp on save>
research_depth: deep
source_count: <count>
estimated_article_count: 6
keywords_covered:
  - loox vs judge me
  - judge me review
  - loox review
  - yotpo vs loox
  - okendo vs judge me
  - shopify ugc app comparison
---
```

## CONSTRAINTS

- Every pricing claim must include a date stamp and source URL.
- Every operator quote must include verifiable Reddit URL or App Store review attribution.
- Flag any submission-rate claim that traces only to vendor marketing (not independent verification) — do not present those as third-party data.
- Disclose incentive bias: Loox is Klaviyo-Elite-Partner-tier prominent in Shopify ecosystem; Judge.me is owned by Methodical Inc. Note any partnership disclosures.
- Sections 3 (operator quotes) and 5 (statistics) are highest-leverage. Invest most effort there.
- Verbatim quotes preferred over paraphrase wherever possible.
- Do NOT cite figures you cannot trace to a verifiable URL.
```

---

## After research is saved

Once `/research/2026-MM-DD-reviews-ugc-loox-judge-me.md` is committed to the repo:

1. Owner replies in Telegram: `research ready: 2026-MM-DD-reviews-ugc-loox-judge-me.md`
2. CHIEF (or CLAUDE_CODE fallback) updates this packet's `research_file` frontmatter to point at the actual filename.
3. CHIEF updates packet 008-judge-me-review.md frontmatter the same way (same research file).
4. CHIEF flips `semantic_core_entries.status` queued → research_ready for `loox vs judge me` and `judge me review`.
5. Writer picks up this packet — at that point all "TBD" fields below should be replaceable with real research-backed values.

## Why this article (the angle) — placeholder, refine after research

The submission-rate claim is the core hook. Loox publishes 7%, Judge.me publishes 2-3%, and no third-party has audited either. The article either confirms one (with evidence) or admits both are vendor-self-reported and pivots to a value-band analysis: at what annual GMV does Loox $12.99/mo stop being worth it vs Judge.me's Forever Free? The angle decision waits on what the research finds.

## Quality gates before commit

- [ ] research_file frontmatter updated to point at actual research file (not "TBD-...")
- [ ] 1,500+ substantive words for this vs-comparison.
- [ ] ComparisonArticle schema emitted from frontmatter.
- [ ] FAQPage emitted from frontmatter (4-6 entries).
- [ ] Pricing claims dated 2026-MM-DD per actual research verification.
- [ ] No banned phrases.
- [ ] All affiliate links via `/go/loox` and `/go/judge-me`.
- [ ] Operator quotes traced to verifiable URLs (no invented Reddit links).
- [ ] Internal links: link to 008-judge-me-review.md once published; otherwise link the cluster review pages once they exist.

## When done

1. Write the article to `/content/comparisons/en/loox-vs-judge-me.mdx`.
2. `git add content/comparisons/en/loox-vs-judge-me.mdx`.
3. `git commit` — husky pre-commit auto-translates EN to RU.
4. `git push` — Vercel deploys; post-commit hook updates Supabase status.
5. OPS (or after-publish.sh) moves this packet from `pending/` to `done/`.
