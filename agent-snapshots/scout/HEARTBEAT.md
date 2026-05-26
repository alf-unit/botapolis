# Schedule — SCOUT

## Daily

### 05:30 America/Los_Angeles — Sitemap diff + RSS + Reddit (parallel batch)
Two cron jobs fire at this time:
- RSS monitoring cycle (db2ed8be) — fetch 17 verified RSS feeds + sitemap diff for 50+ vendors (PRIMARY signal channel per AGENTS.md "Standard data flows → Sitemap diff monitoring" + "RSS monitoring")
- Reddit daily scan (30df8977) — top posts from r/shopify, r/ecommerce, r/dropship

Both write findings to content_opportunities per AGENTS.md schema section.

### 06:00 America/Los_Angeles — Affiliate URL health check (3b51684d)
HEAD requests on all /go/[slug] URLs to verify links live (200/302). Alert CHIEF on first failure.

## Weekly

### Sunday 03:00 LA — Memory cleanup (aa6382e2, added 2026-05-26)
Archive memory/YYYY-MM-DD.md files older than 60 days into memory/archive/YYYY-MM/. Update MEMORY.md index of archived ranges.

### Sunday 03:30 LA — Pattern distillation (9705def8, added 2026-05-26)
Review last 7 days of memory/ files. Extract recurring vendor-behavior patterns, reliable CSS selectors, captcha encounters, RSS quirks. Append to MEMORY.md under appropriate sections. Goal: long-term knowledge preservation before daily files are archived.

### Sunday 06:00 LA — Full pricing scrape (da2266d6)
Visit pricing pages for all tools where status='published'. Take screenshot, save to Supabase Storage. Diff vs stored pricing_data. Update tools.last_verified_at OR tools.pricing_data on change. Alert CHIEF on changes.

### Monday 06:00 LA — SERP check (2efea558)
Pull top 30 keywords from semantic_core_entries WHERE status='published'. Run query via Playwright. Compare to last SERP snapshot. Flag rank drops to CHIEF.

### Wednesday 05:30 LA — Changelog page scraping (7bca35d5, added 2026-05-26)
For tier-1 vendors without RSS, fetch HTML changelog pages from /config/changelog-sources.json (Klaviyo Developers, Stripe Updates, Recharge Changelog, etc. — create file if missing with starter list). Diff vs previous snapshot. For structural changes → INSERT content_opportunities per AGENTS.md "Changelog page scraping" section (source='changelog_scrape', category='feature-launch', opportunity_score 60-80).

### Friday 06:00 LA — Product Hunt scan (ff3b3e6d, added 2026-05-26)
Pull last 7 days launches in E-commerce, Productivity, AI categories. Filter for Shopify relevance + min 3-month-old company. Qualified candidates → INSERT content_opportunities per AGENTS.md "Product Hunt scan" section (source='producthunt', category='feature-launch', tool_slug=NULL, recommended_action='add_to_catalog').

## On demand (CHIEF requests)
- When file appears in /agent-snapshots/chief/scout-requests/: process via Every-session check on next wake (within 24h worst case; typically same day given multiple daily wakes).

## Silent intervals
- N/A — 24/7 background ops, no human-facing communication

## Removed 2026-05-26 (per cron architecture review)
- "Daily 14:00 LA vendor news roundup" phantom — was listed in old HEARTBEAT.md but no separate cron; rolled into 05:30 RSS+Reddit batch via vendor-aware classification.
