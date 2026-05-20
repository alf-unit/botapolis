# Semantic Core — Exclusions

Keywords explicitly NOT pursued, with reason. The importer skips any
keyword listed below even if present in `full-core.csv`.

## Format

One bullet per excluded keyword. Format:

```
- `<exact keyword>` — <reason in one line>
```

## Excluded — existing tools (not article production)

These are calculator/tool pages already live on the site. They sit
outside the article workflow that `semantic_core_entries` is meant
to track (no template enum slot fits them either — adding one
requires a schema migration). Refresh them via direct edits, not
via the writer-queue pipeline.

- `email roi calculator shopify` — existing calculator at `/tools/email-roi`, refresh in place
- `ai cost comparator` — existing calculator at `/tools/ai-cost`, refresh in place
- `ai product description generator` — existing tool at `/tools/ai-product-description`, refresh in place

## Excluded — out of niche

(from the semantic_core report "Clusters considered and excluded" section)

- `how to start a shopify store` — Shopify-101 beginner content, wrong audience
- `shopify themes free` — Shopify-101 beginner content, wrong audience
- `autods review` — dropshipping AI tools cluster excluded except the single risk-framed faceless-stores piece
- `spocket review` — dropshipping cluster, SERP dominated by affiliate spam
- `zendrop review` — dropshipping cluster, low operator value
- `hyros review` — declining query, attribution market consolidating around Triple Whale/Northbeam/Polar

## Excluded — relationship risk

- `klaviyo cancel` — SERP is competitor-as-reviewer, reflects badly on affiliate relationship
- `klaviyo refund` — same as above
- `returnly alternative` — SERP is a graveyard (Loop wholly owns the migration story); only the migration how-to is worth keeping
