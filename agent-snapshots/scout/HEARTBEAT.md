# Schedule — SCOUT

## Daily (05:30 America/Los_Angeles — единое окно)
- Sitemap diff monitoring (all vendors with sitemap_url + news sources) — PRIMARY
- RSS feed monitoring (17 verified feeds from `/config/vendor-feeds.json` where tracked=true) — SUPPLEMENTARY (was every 4 hours before 2026-05-22 RSS pivot)
- Reddit monitoring (3 subreddits: r/shopify, r/ecommerce, r/dropship)
- Affiliate URL health check (all tools with affiliate_url)
- Vendor news roundup (compile findings into a single agent_logs summary entry for CHIEF's afternoon check-in)

## Daily (other times)
- 06:00 America/Los_Angeles: Affiliate URL health check

## Weekly
- Sunday 06:00 America/Los_Angeles: Full pricing scrape (all 50+ tools)
- Monday 06:00 America/Los_Angeles: SERP check for top 30 priority keywords
- Wednesday 05:30 America/Los_Angeles: Changelog page scraping (tier-1 vendors without RSS) — SECONDARY
- Friday 06:00 America/Los_Angeles: Product Hunt new launches scan

## On demand (triggered by GitHub file watcher / CHIEF request)
- New file in `/agent-snapshots/chief/scout-requests/`: process within 1 hour

## Maintenance
- Sunday 03:00 America/Los_Angeles: cleanup `memory/` files older than 60 days (move to memory/archive/YYYY-MM/)
- Sunday 03:30 America/Los_Angeles: distill recurring patterns to MEMORY.md (vendor behavior, selectors, captcha sites)

## Silent intervals
- Operate 24/7 — no quiet hours (no human-facing communication anyway)
