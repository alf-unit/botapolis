---
research_id: YYYY-MM-DD-topic-slug                # e.g. 2026-05-25-klaviyo-customer-agent-roi
topic: "Specific question this research answers"   # e.g. "Klaviyo Customer Agent ROI for $50k+ MRR Shopify stores BFCM 2026"
requested_by: CHIEF
requested_at: YYYY-MM-DDTHH:MM:SSZ
completed_at: YYYY-MM-DDTHH:MM:SSZ
research_depth: deep                                # deep | shallow
source_count: 0                                     # actual count of distinct URLs cited below
estimated_article_count: 0                          # how many writer-queue packets this can feed
keywords_covered:
  - primary keyword from semantic_core_entries
  - secondary keyword 1
  - secondary keyword 2
---

<!--
HOW TO USE THIS FILE
====================
This is a FORMAT EXAMPLE, not a real research file. The bracketed
placeholders below show the EXACT shape Web Chat / Deep Research should
emit. Do NOT invent data to fill these slots — leave a section sparse
rather than hallucinate.

The naming convention deliberately starts with an underscore
(`_example-format.md`) so it sorts above real dated files like
`2026-05-25-...` and is obviously not a deliverable.

When you (operator + Web Chat) produce a real research file, follow
research/_template.md for the unannotated version of this layout.
-->

## 1. Executive Summary

[2-3 paragraphs. Sentence one: the headline finding. Sentence two:
the unique angle this enables that competitors miss. Sentence three:
what an article using this research should claim that the SERP top-10
does not.]

Example placeholder text (delete when filling in):
> "[Vendor]'s [feature] saves $X/month for operators above $Y MRR but
> inverts to a loss below that. The break-even isn't in any vendor doc.
> Our angle: ship the calculator with operator-verified numbers."

## 2. SERP Landscape Analysis

### Top 10 results for primary keyword

[Pull live SERP from Google. Number 1-10 with: URL — DR (Domain Rating
0-100) — content type — angle in 3-5 words.]

1. [URL] — DR XX — [review | listicle | guide | comparison | vendor-blog] — [angle, e.g. "vendor-positive, light on data"]
2. [URL] — DR XX — [content type] — [angle]
3. [URL] — DR XX — [content type] — [angle]
4. [...]
5. [...]
6. [...]
7. [...]
8. [...]
9. [...]
10. [...]

### Content gaps identified

[Bullet what the top-10 collectively miss. These are the openings.
Be specific — "no comparison" is weak; "no comparison at $50k MRR
including hidden integration costs" is the gap.]

- [Gap 1 — what no top-10 result covers]
- [Gap 2]
- [Gap 3]

### Our competitive angle

[One sentence. The promise an article using this research will make to
the reader that no top-10 result delivers.]

> "[Specific promise tied to a gap above.]"

## 3. Source Material — Operator Perspectives

### Reddit threads

[The richest source. Pull VERBATIM quotes — never paraphrase.
Format strictly:
- URL (permalink)
- "verbatim quote" — author handle, post date
- Key insight in one sentence (the gold this quote unlocks)
]

- [URL — e.g. https://reddit.com/r/shopify/comments/abc123/title/]:
  "[exact verbatim quote, including any typos or vernacular]"
  — [u/AuthorHandle], [YYYY-MM-DD]
  Key insight: [the one thing this quote proves]

- [URL]:
  "[verbatim quote]"
  — [u/AuthorHandle], [YYYY-MM-DD]
  Key insight: [...]

### Forum / community discussions

[Shopify community forum, Indie Hackers, Discord screenshots if
public-link-able. Same format as Reddit.]

- [URL]:
  "[verbatim quote]"
  — [author], [YYYY-MM-DD]
  Key insight: [...]

### YouTube reviews / podcasts

[Time-stamped quotes work better than summaries. Format:
- Title (view count, verdict in 2-3 words)
- HH:MM:SS — "[verbatim quote]"
]

- "[Video / podcast title]" ([NN]k views, [verdict: positive | mixed | negative])
  - [HH:MM:SS] — "[verbatim quote from creator or guest]"
  - [HH:MM:SS] — "[another quote, optional]"

## 4. Source Material — Vendor Data

### Pricing breakdown

[Verify on the vendor pricing page on a specific date. Stamp the
date. This is the section operators / Claude Code will reference most.]

Verified [YYYY-MM-DD]:

- [Plan name 1]: $[X]/mo
  - [Feature/limit bullet]
  - [Feature/limit bullet]
- [Plan name 2]: $[X]/mo
  - [Feature/limit bullet]
- Hidden costs:
  - Onboarding fee: $[X] / [free]
  - Overage: $[X] per [unit]
  - Integration / API access: $[X] or [included in plan Y+]

### Feature comparison

[Honest. Auto-handles X means it works without operator intervention.
Requires human handoff means an operator must complete the flow.]

- Auto-handles: [feature, feature, feature]
- Requires human handoff: [feature, feature]
- Native integrations: [Shopify, Klaviyo, ...]
- Setup time: [estimate in hours/days]

### Recent announcements / changes

[Sourced from the vendor blog/RSS in last 90 days. Date-stamp each.]

- [YYYY-MM-DD]: [change in one sentence] — [vendor blog URL]
- [YYYY-MM-DD]: [change] — [URL]

## 5. Statistical / Quantitative Findings

[Numbers that survive scrutiny. Each line: the number + source URL.
Distinguish vendor self-reports from independent data — operators
will discount the former.]

- [Specific statistic with number, e.g. "73% of operators on Reddit
  report >$1k/mo savings (n=23 self-reports)"] — Source: [URL]
- [Another statistic] — Source: [URL]
- [Another statistic] — Source: [URL]

### Verbatim quotes worth integrating

[Hand-pick the 3-5 best quotes from Section 3. These are the ones
the writer should literally drop into the article.]

- "[verbatim quote]" — [attribution], [date]
- "[verbatim quote]" — [attribution], [date]
- "[verbatim quote]" — [attribution], [date]

## 6. Recommendations for Content

### Article ideas this research enables

[Each line: title + primary keyword from semantic_core_entries + the
specific angle in one sentence.]

1. **[Article title]**
   - Primary keyword: `[keyword from core]`
   - Template: [review | vs-comparison | how-to | guide | news]
   - Angle: [one sentence specific enough to write to]

2. **[Article title]**
   - Primary keyword: `[keyword from core]`
   - Template: [...]
   - Angle: [...]

3. **[Article title]**
   - Primary keyword: `[keyword from core]`
   - Template: [...]
   - Angle: [...]

### Key facts to integrate in every article

[The non-negotiables. Every article that uses this research must
include these claims, date-stamped.]

- [Fact] — verified [YYYY-MM-DD]
- [Fact] — verified [YYYY-MM-DD]
- [Honest caveat — the trust-builder] — based on [source]

## 7. Caveats and Open Questions

[What this research couldn't verify. Be explicit — these become
flags for the writer and update prompts for the next research cycle.]

- [What was searched for but not found, e.g. "Vendor doesn't publish
  formal SLA on response time"]
- [What might change soon, e.g. "Pricing migration scheduled for
  YYYY-MM-DD per vendor blog"]
- [Where we're relying on self-reports, e.g. "ROI claims based on
  vendor case studies, no independent audit found"]

## 8. Source List

[Group by source type. Count must match `source_count` in frontmatter.]

### Reddit (n=N)
- [URL]
- [URL]
- [...]

### YouTube / podcasts (n=N)
- [URL]
- [...]

### Vendor official (n=N)
- [URL]
- [...]

### Independent reviews (n=N)
- [URL]   # G2
- [URL]   # Trustpilot
- [URL]   # Capterra
- [...]

### Documentation / industry research (n=N)
- [URL]
- [...]
