# Template: guide

Use for informational long-form content covering a topic (not a single
product, not a single task). Reader wants to understand a landscape or
decide a strategy. Example: "ecommerce email marketing for Shopify".

## Frontmatter

```yaml
---
title: "<Topic>: The <Year> Guide for Shopify Operators"
description: "<Topic> explained without the vendor fluff. We cover what works at <segment>, what to skip, and the specific tools that solve each piece."
slug: <topic-slug>
locale: en
template: guide
datePublished: YYYY-MM-DD
dateModified: YYYY-MM-DD
author: editorial
tools:                                # tools recommended within the guide
  - <slug-1>
  - <slug-2>
primaryKeyword: "<topic>"
relatedKeywords:
  - "<topic> for shopify"
  - "best <topic> tools"
sections:                              # for TOC + JSON-LD Article schema
  - "What <topic> actually is"
  - "When to invest in <topic>"
  - "The 4 pieces of a working <topic> stack"
  - "Tools we recommend (and why)"
  - "Common failure modes"
faq:
  - q: "Is <topic> worth it for stores under $X/mo revenue?"
    a: "<answer>"
schema:
  type: Article
---
```

## Structure

```
# <Topic>: The <Year> Guide for Shopify Operators

> TL;DR — 3-sentence overview + who this guide is for + who should skip.

## Who this is for
- Profile 1 (e.g., $50k–$500k/mo Shopify stores)
- Profile 2
- Not for: <anti-profile>

## What <topic> actually is
Strip the jargon. 1–2 paragraphs of plain language. Anchor it to a concrete
operator scenario.

## When to invest in <topic>
The break-even rule of thumb. Specific revenue / volume / team-size signal.

## The N pieces of a working <topic> stack
- Piece 1 — what it does, what it doesn't
- Piece 2 — what it does, what it doesn't
- Piece 3 — what it does, what it doesn't
- (3–6 pieces total)

## Tools we recommend (and why)
- For piece 1: <tool> — one-line why — internal link to review
- For piece 2: <tool> — one-line why — internal link to review
- For piece 3: <tool> — one-line why — internal link to review

## What operators get wrong
- Mistake 1 — the cost
- Mistake 2 — the cost
- Mistake 3 — the cost

## How to know it's working
The 2–3 metrics that matter and where to find them. Specific numbers and
thresholds, not "track KPIs".

## What to read next
- Internal link 1
- Internal link 2
- Internal link 3

## FAQ
(4–6 entries)
```

## JSON-LD required

- `Article`
- `FAQPage`
- Each recommended tool gets a `Product` mention (auto from tools[])

## Quality gates

- [ ] 1,500+ substantive words (guides need depth)
- [ ] At least one specific dollar/percent/time threshold (not vibes)
- [ ] Recommends specific tools, not "consider an email platform"
- [ ] 5–8 internal links to deeper resources (reviews, how-tos, comparisons)
- [ ] No top-of-funnel "what is email marketing" filler if intent is decision
- [ ] Author voice is opinionated, not encyclopedic
