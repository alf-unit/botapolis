# Template: how-to

Use for instructional / transactional intent: "how to <do X> in <tool>",
"set up <X>", "fix <error>". Reader wants a working result, fast.

## Frontmatter

```yaml
---
title: "How to <Do X> in <Tool>: <Time> Step-by-Step Guide"
description: "Working walkthrough with screenshots, tested on a live Shopify store. Includes the 3 gotchas every <audience> hits."
slug: how-to-<verb>-<object>-in-<tool>
locale: en
template: how-to
datePublished: YYYY-MM-DD
dateModified: YYYY-MM-DD
author: editorial
tools:
  - <tool-slug>
primaryKeyword: "how to <do X> in <tool>"
relatedKeywords:
  - "<tool> <X> setup"
  - "<tool> <X> not working"
totalTime: PT15M                      # ISO 8601 duration — JSON-LD HowTo
prerequisites:
  - "<Tool> account on Plus plan or higher"
  - "Shopify Admin access"
  - "An order to test against"
faq:
  - q: "How long does this take to set up?"
    a: "<answer>"
schema:
  type: HowTo
---
```

## Structure

```
# How to <Do X> in <Tool>: <Time> Step-by-Step Guide

> Before you start: prereqs (3 bullets) + estimated time + skill level.

## Why bother
2–3 sentences on the concrete outcome (saves $X/mo, prevents Y, unlocks Z).
This is not filler — it's where commercial-investigation readers convert.

## Before you start
- Prereq 1
- Prereq 2
- Prereq 3

## Step 1: <verb + object>
Concise instructions. Screenshot annotated with arrows (not raw vendor UI).
Common mistake at this step: <gotcha>.

## Step 2: <verb + object>
…

## Step 3: <verb + object>
…

(typically 4–8 steps total)

## Verify it's working
- Test 1: <what to do, what you should see>
- Test 2: <what to do, what you should see>

## Troubleshooting
- Error: "<message>" — fix: <one line>
- Symptom: "<thing>" — fix: <one line>
- Symptom: "<thing>" — fix: <one line>

## What to do next
2–3 internal-link suggestions for related setups or integrations.

## FAQ
(3–5 entries)
```

## JSON-LD required

- `HowTo` (emitted from frontmatter — steps pulled from H2 sections that
  start with "Step N:" — keep the prefix consistent)
- `FAQPage`

## Quality gates

- [ ] 800+ substantive words (how-tos can be shorter than reviews)
- [ ] Every step has either a screenshot OR a code/config block
- [ ] Screenshots have non-trivial alt text (describe what's circled)
- [ ] Troubleshooting section non-empty
- [ ] Tested on a real Shopify store within last 90 days (note date)
- [ ] No "click here" — link text is the destination
- [ ] 2–4 internal links to related setups
