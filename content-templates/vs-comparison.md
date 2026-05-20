# Template: vs-comparison

Use when the keyword pattern is `<tool A> vs <tool B>` and the intent is
commercial-investigation — the reader is choosing between two products and
expects an opinionated, data-backed verdict.

## Frontmatter

```yaml
---
title: "<Tool A> vs <Tool B>: Which Wins for <Audience> in <Year>?"
description: "Side-by-side breakdown of pricing, features, and real-store outcomes. We tested both and recommend <winner> for <segment>."
slug: <tool-a>-vs-<tool-b>
locale: en                            # 'en' or 'ru'
template: vs-comparison
datePublished: YYYY-MM-DD
dateModified: YYYY-MM-DD
author: editorial
tools:
  - <tool-a-slug>
  - <tool-b-slug>
primaryKeyword: "<tool A> vs <tool B>"
relatedKeywords:
  - "<tool A> or <tool B>"
  - "<tool B> alternatives"
verdict:
  winner: <tool-a-slug>            # nullable when truly tied
  best_for_a: "<segment>"
  best_for_b: "<segment>"
faq:
  - q: "Is <Tool A> cheaper than <Tool B>?"
    a: "<one-paragraph answer>"
  - q: "Can I migrate from <Tool A> to <Tool B>?"
    a: "<one-paragraph answer>"
schema:
  type: ComparisonArticle           # rendered to JSON-LD via lib/seo
---
```

## Structure (don't deviate without reason)

```
# <Tool A> vs <Tool B>: Which Wins for <Audience> in <Year>?

> TL;DR (3–4 sentences with the verdict and the "if you're X, pick Y" rule)

## Quick verdict
[Comparison table: pricing entry tier, best for, integration depth, support, our pick]

## Pricing showdown
- <Tool A> pricing (verified YYYY-MM-DD)
- <Tool B> pricing (verified YYYY-MM-DD)
- Total cost of ownership at 1k / 10k / 50k subscribers (or relevant scale unit)

## Feature comparison
- Category 1 (e.g., Automations): winner + why
- Category 2 (e.g., Segmentation): winner + why
- Category 3 (e.g., Deliverability): winner + why
- Category 4 (e.g., Integrations): winner + why
- Category 5 (e.g., Support): winner + why

## What operators actually say
- 2–4 verbatim quotes from the research packet (Reddit, podcast, G2)
- Attribute every quote (handle + date)

## Migration & switching cost
What it actually takes to move from one to the other. List concrete steps,
data export limitations, deliverability ramp-up time.

## Our recommendation
- Choose <Tool A> if: <3 bullet conditions>
- Choose <Tool B> if: <3 bullet conditions>
- Tie-breaker: <the one thing that flips the decision>

## FAQ
(JSON-LD FAQPage — keep questions short, answers ≤80 words)
```

## JSON-LD required

The site emits these schemas automatically when frontmatter is correct —
do NOT hand-write `<script type="application/ld+json">` blocks in MDX:

- `ComparisonArticle` (article-level — pulled from frontmatter)
- `Product` × 2 (one per tool — pulled from tools[] in frontmatter)
- `FAQPage` (pulled from faq[] in frontmatter)

## Quality gates

- [ ] 1,500+ substantive words (comparisons need depth)
- [ ] Comparison table within first 200 words
- [ ] Pricing claims dated for both tools
- [ ] Verdict not weasel-worded — pick a side per segment
- [ ] 2–5 internal links to standalone reviews of each tool
- [ ] FAQ has 4–6 entries
- [ ] Mobile preview: comparison table doesn't horizontal-scroll on iPhone SE
