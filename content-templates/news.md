# Template: news

Use for time-sensitive items: pricing changes, vendor announcements,
acquisitions, regulatory shifts. Window is days, not months. SCOUT
typically surfaces the opportunity; OPS prepares the packet within hours.

## Frontmatter

```yaml
---
title: "<Vendor> <Did X>: What It Means for Shopify Stores"
description: "Breaking down <vendor>'s <change> and the concrete impact on operators using <tool>. Short read, dated."
slug: <vendor>-<change>-<yyyy>-<mm>
locale: en
template: news
datePublished: YYYY-MM-DDTHH:MM:SSZ   # full ISO timestamp for NewsArticle
dateModified: YYYY-MM-DDTHH:MM:SSZ
author: editorial
tools:
  - <tool-slug>
primaryKeyword: "<vendor> <change>"
relatedKeywords:
  - "<vendor> pricing change"
  - "<vendor> news"
news_type: pricing-change             # pricing-change | feature-launch | acquisition | policy | outage
urgency: hot                          # hot | warm | evergreen
estimated_relevance_window_days: 30
schema:
  type: NewsArticle
---
```

## Structure (keep tight)

```
# <Vendor> <Did X>: What It Means for Shopify Stores

> One-paragraph summary: what changed, when, who's affected, what to do.

## What changed
2–3 sentences. Link to the official announcement (with date stamp).

## Who's affected
- Operators on plan X: <impact>
- Operators on plan Y: <impact>
- New signups vs existing accounts: <difference, if any>

## The numbers
Concrete before/after. Pricing deltas, feature deltas, timeline. If
applicable, an example calculation at a typical Shopify scale.

## What to do
- If you're <segment>: <action>
- If you're <segment>: <action>
- If you're <segment>: <action>

## Alternatives worth considering
2–3 named alternatives, one-line "switch if …" for each. Internal links.

## What we'll watch next
What's still unclear, when we'll update this article.
```

## JSON-LD required

- `NewsArticle` (note: `datePublished` must be a full timestamp, not date-only)
- Optional: `Product` mention for the affected tool

## Quality gates

- [ ] 500–900 words (news is short)
- [ ] Source link to the original announcement (vendor blog, status page, etc.)
- [ ] Full ISO timestamp in datePublished
- [ ] Concrete numbers, not "significantly more expensive"
- [ ] Alternatives section is not optional
- [ ] Re-check accuracy 48h after publish — vendors sometimes amend
- [ ] If story moves significantly, update dateModified and add a changelog note
