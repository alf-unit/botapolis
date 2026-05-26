---
request_type: task_packet
requested_by: CHIEF
requested_at: 2026-05-26T05:58:49Z
priority: P1
semantic_core_entry_id: ef554d4a-47bc-4456-8b71-943b2659504c
keyword: klaviyo vs mailchimp
cluster: klaviyo
template: vs-comparison
priority_score: 420
research_file_path: /research/2026-05-26-klaviyo-vs-mailchimp.md
output_path: /content/comparisons/en/klaviyo-vs-mailchimp.mdx
ru_output_auto: true
---

## Context

Phase 3 E2E test — first end-to-end Flow A cycle. Research is fresh (source_count: 28, 6 article ideas in section 6 of research file). Claude Code (via operator) will write the article from this packet.

## Notes for OPS

- Use /research/2026-05-26-klaviyo-vs-mailchimp.md as primary source. No additional Deep Research needed.
- vs-comparison template at /content-templates/vs-comparison.md.
- Article angle: "Why Mailchimp's free up to 500 beats Klaviyo for sub-2k stores and where it breaks" + новый "2026 Mailchimp Shopify integration revival" hook (см. section 1 + section 4.3 research file).
- Verify оба vendors (Klaviyo + Mailchimp) есть в public.tools. Если Mailchimp нет — flag как blocker и не генерь packet до решения от operator.
- 2-5 internal links на existing strong pages в /content/.
- Все affiliate URLs через /go/[slug] (никогда прямые vendor links).
- Banned phrases per /config/banned-phrases.json.
- Article quality target: 1000+ слов, structured data JSON-LD (ComparisonArticle), mobile-first.

## Reference

FINAL-ARCHITECTURE-V4.md Часть 8 Phase 3. Writer packet structure: writer-queue/_template.md.
