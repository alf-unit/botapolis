# Operating rules — SCOUT

## Every session
1. Read MEMORY.md
2. Read /config/vendor-feeds.json (via GitHub API) — list of RSS sources
3. Check Supabase tools table for tools to monitor
4. Check Supabase agent_logs for any tasks assigned by CHIEF

## content_opportunities — schema for INSERT (READ BEFORE EVERY WRITE)

SCOUT writes to public.content_opportunities via service_role. Use these exact columns — do not invent new ones. If a column you need does not exist, log severity='error', event_type='schema_mismatch' and notify CHIEF; do not retry.

### Required
- `source` — one of: `'rss'` | `'reddit'` | `'producthunt'` | `'serp_change'` | `'vendor_blog'` | `'sitemap_diff'` | `'changelog_scrape'` | `'manual'`
- `topic` — short human-readable title (≤80 chars)

### Set on every insert
- `tool_slug` text — vendor slug from /config/vendor-feeds.json (e.g. `'gorgias'`, `'recharge'`, `'klaviyo'`). NULL only if no tracked vendor matches.
- `category` text — one of: `'pricing-change'` | `'feature-launch'` | `'acquisition'` | `'news'`. If your classifier returns `'unrelated'`, **do not insert** — skip the item entirely.
- `source_url` text — canonical URL of the original item
- `urgency` text — derive from category:
  - `acquisition`, `pricing-change` → `'hot'`
  - `feature-launch` → `'warm'`
  - `news` → `'warm'` if tracked vendor, `'evergreen'` otherwise
- `opportunity_score` integer (0-100) — use this ladder:
  - `acquisition` (tracked vendor): 85-95
  - `pricing-change` (tracked vendor): 75-90
  - `feature-launch` (tracked vendor): 55-75
  - `news` (tracked vendor): 35-55
  - Sitemap-derived signals: 25-50 (supplementary; pricing-change=50, feature-launch=40, news=35, documentation=30, other=25)
  - Changelog-derived signals: 60-80 (explicit feature releases)
  - Below 30 → do not insert

### Optional
- `description` text — 1-2 sentences of context for CHIEF
- `recommended_action` text — what CHIEF should do (e.g. `'add to writer queue'`, `'refresh existing review'`, `'add_to_catalog'`)
- `evidence` jsonb — unstructured supporting data: operator quotes, original feed summary, announcement date, screenshots. This is your free-form bucket — use it liberally.
- `estimated_window_days` integer — how long the opportunity stays hot (~30 for hot, ~90 for warm, NULL for evergreen)
- `related_keywords` text[] — semantic-core keywords this maps to (NULL if uncertain — CHIEF resolves)

### Never set
- `id`, `created_at` — defaults handle them
- `status` — defaults to `'pending'`
- `chief_decision`, `chief_decided_at`, `spawned_semantic_entry_id` — CHIEF writes these after review
- `related_tools` uuid[] — leave NULL; `tool_slug` covers vendor linkage. Do not do a slug→UUID lookup against the tools table.

### Worked example — Recharge-Skio acquisition (one of the 2026-05-22 failed inserts)

```sql
INSERT INTO content_opportunities (
  source, topic, tool_slug, category, source_url, urgency,
  opportunity_score, description, recommended_action, evidence
) VALUES (
  'rss',
  'Recharge acquires Skio — subscription platform consolidation',
  'recharge',
  'acquisition',
  'https://rechargepayments.com/blog/skio-acquisition',
  'hot',
  90,
  'Recharge buys Skio. Migration path matters to operators on both platforms; existing Skio→Loop guide may need a Recharge angle.',
  'add to writer queue: how-to migration guide + comparison refresh',
  '{"original_summary": "...", "announcement_date": "2026-05-22"}'::jsonb
);
```

### On INSERT failure
- Column-not-found / constraint violation → log to agent_logs (severity='error', event_type='schema_mismatch'), notify CHIEF in the same log row. Do NOT retry. Wait for operator to fix schema.
- Network / transient → retry 2x with exponential backoff, then defer to next cycle.

## Standard data flows

### Sitemap diff monitoring (daily 05:30 America/Los_Angeles) — PRIMARY
Universal channel that works for all 50+ vendors including RSS-less ones (Klaviyo, Postscript, Loop, Triple Whale). Also works for news sites (TechCrunch, ModernRetail, RetailDive) that exist in `/config/vendor-feeds.json` but not in tools table.

**Sitemap URL discovery (first cycle for each vendor):**
If `tools.sitemap_url` is NULL, try patterns in order until one returns valid XML with `<urlset>` or `<sitemapindex>`:
1. `{website_url}/sitemap.xml`
2. `{website_url}/sitemap_index.xml`
3. `{website_url}/sitemap.xml.gz`
4. `{website_url}/sitemap/sitemap.xml`
5. Parse `/robots.txt` for `Sitemap:` directive

If found → `UPDATE tools SET sitemap_url = <discovered_url> WHERE slug = <slug>`
If not found after all patterns → log to memory/YYYY-MM-DD.md as `needs-manual-override`
For news sources not in tools table → store discovered sitemap_url in `content_opportunities.evidence` for first opportunity from that source.

**Per-cycle workflow:**
For each tool in Supabase tools where `sitemap_url IS NOT NULL` + news sources from `/config/vendor-feeds.json` with type='news':
1. Fetch sitemap.xml
2. Parse: extract list of URLs + `lastmod` timestamps
3. Compare to previous snapshot in `scout_sitemap_snapshots` table
4. Detect:
   - NEW URLs (not in previous snapshot) — potential new content
   - MODIFIED `lastmod` on existing URLs (esp. `/pricing`, `/features`, `/changelog`) — potential change
5. For each detected change → INSERT into content_opportunities per schema:
   - `source = 'sitemap_diff'`
   - `source_url` = the new/modified URL
   - `tool_slug` = vendor slug
   - `category` = inferred from URL pattern:
     - URL contains `/pricing/` or `/plans/` → `'pricing-change'`
     - URL contains `/blog/` or `/news/` → `'news'`
     - URL contains `/changelog/`, `/releases/`, `/updates/` → `'feature-launch'`
     - URL contains `/docs/` → `'news'` (documentation update, but use existing category)
     - else → skip (do not insert)
   - `opportunity_score` per ladder (sitemap-derived: 25-50)
   - `urgency = 'warm'` (sitemaps lag actual events by hours/days)
   - `estimated_window_days = 7-14`
   - `evidence` JSONB:
     ```json
     {
       "added_urls": ["https://..."],
       "modified_urls": [{"url": "...", "old_lastmod": "...", "new_lastmod": "..."}],
       "category_inferred_from": "URL pattern: /pricing/",
       "vendor_sitemap_url": "https://..."
     }
     ```
6. Save **diff only** (not full URL set) to `scout_sitemap_snapshots`:
   - `urls = {"added": [...], "removed": [...]}`
   - Full URL-set reconstructable from diff history if ever needed
7. Log activity to memory/YYYY-MM-DD.md

### RSS monitoring (daily 05:30 America/Los_Angeles) — SUPPLEMENTARY
Downgraded from PRIMARY on 2026-05-22 after RSS audit. Only 17 of 39 monitored vendors had working RSS; modern marketing stacks (Webflow/Framer/Next.js) don't publish RSS. Was every 4 hours, now daily — supplementary signal does not justify frequent polling.

For each RSS feed in `/config/vendor-feeds.json` where `tracked=true`:
1. Fetch feed via curl -L
2. Verify content: grep `<item>` or `<entry>` tags exist
3. Check freshness: latest `pubDate` within 90 days
4. Identify items published since last check (track in memory)
5. For each new item:
   - Extract title, URL, summary, date
   - Categorize: pricing-change | feature-launch | acquisition | news | unrelated
   - If category == `'unrelated'`: skip, do not insert
   - Resolve vendor: take the feed entry's `slug` from vendor-feeds.json → use as `tool_slug`
   - INSERT into content_opportunities per the schema section above:
     - `source = 'rss'`
     - `evidence = {"original_summary": <feed summary>, "announcement_date": <item pubDate>}`
     - `urgency` and `opportunity_score` per schema mapping
6. Log activity to memory/YYYY-MM-DD.md

**Feed verification protocol** (when adding/checking feeds):
1. curl -I (status check)
2. curl -L (follow redirects, get body)
3. grep `<?xml` on body (catches content-type lies like yotpo)
4. grep item/entry count (catches empty skeletons like nofraud)
5. grep latest pubDate (catches stale feeds like cogsy with 2023 last post)
6. If dead: mark in vendor-feeds.json with `dead_as_of` + `dead_reason`

### Changelog page scraping (weekly Wednesday 05:30 America/Los_Angeles) — SECONDARY
For tier-1 vendors with public changelogs (HTML, not RSS):
- Klaviyo Developers releases page
- Stripe Updates page
- Recharge Changelog page
- (others added to `/config/changelog-sources.json` as discovered)

For each:
1. Fetch HTML page
2. Diff vs previous snapshot
3. If structural change detected → INSERT into content_opportunities:
   - `source = 'changelog_scrape'`
   - `category = 'feature-launch'` (default for changelogs)
   - `opportunity_score` per ladder (60-80, explicit feature releases)
   - `evidence` JSONB with `{"changelog_url": ..., "diff_summary": ...}`

### Reddit monitoring (daily 05:30 America/Los_Angeles)
1. For each subreddit [r/shopify, r/ecommerce, r/dropship]:
   - Pull top 25 posts of last 7 days via Reddit API
   - For each post:
     - Check if topic relates to tracked vendors (Klaviyo, Gorgias, etc.)
     - If yes: INSERT into content_opportunities per schema section
       - `source = 'reddit'`
       - `tool_slug = <matched vendor slug>`
       - `category =` best fit (`'pricing-change'` if discussion is about pricing, `'feature-launch'` if debating a new feature, `'news'` for general discussion)
       - `evidence = {"operator_quote": <verbatim quote>, "post_url": <full URL>, "upvotes": <int>}`
     - Count topic frequency: if same theme appears 3+ times in a week, raise `opportunity_score` by 10
2. Track recurring questions across weeks (in MEMORY.md)

### SERP check (weekly Monday 06:00 America/Los_Angeles)
1. Pull top 30 keywords from semantic_core_entries where status='published'
2. For each:
   - Run query in browser (via Playwright)
   - Capture top 10 results
   - Compare to last SERP snapshot
   - If our page dropped >5 positions: flag for CHIEF
   - If new competitor in top 10: log for review
3. Save SERP snapshots to memory/serps-YYYY-WNN.md

### Pricing scrape (weekly Sunday 06:00 America/Los_Angeles)
For each tool in Supabase tools table with status='published':
1. Visit vendor /pricing/ page via Playwright
2. Take screenshot, save to Supabase Storage /screenshots/[tool-slug]/pricing-YYYY-MM.webp
3. Extract pricing tiers using CSS selectors first, LLM fallback
4. Compare to stored data:
   - If unchanged: just update tools.last_verified_at
   - If changed: update tools.pricing_data, log to agent_logs, notify CHIEF
5. Special case: if page returns 404 or 500, flag tool for review

### Affiliate URL health check (daily 06:00 America/Los_Angeles)
For each tool with affiliate_url:
1. curl with HEAD request, check status
2. If not 200/302: log error, notify CHIEF immediately
3. Update tools.affiliate_health_checked_at

### Product Hunt scan (weekly Friday 06:00 America/Los_Angeles)
1. Pull last 7 days launches in [E-commerce, Productivity, AI] categories
2. Filter: relevance to Shopify operators, minimum 3-month-old company
3. If qualified candidates found: INSERT into content_opportunities per schema section
   - `source = 'producthunt'`
   - `category = 'feature-launch'` (new vendor in market)
   - `tool_slug = NULL` if the launch is a vendor not yet in our tools table (CHIEF decides whether to add)
   - `recommended_action = 'add_to_catalog'`
   - `evidence = {"launch_url": <PH URL>, "company_age_months": <int>}`

### Screenshot on demand (triggered by CHIEF request file)
When file appears in /agent-snapshots/chief/scout-requests/:
1. Parse request: URL, purpose (pricing|feature|dashboard|other)
2. Visit URL via Playwright
3. Take screenshot, optimize (WebP, <200KB)
4. Upload to Supabase Storage with structured path
5. Update request file: mark complete, add asset URL
6. Notify CHIEF via agent_logs

## Memory rules
- Each scraping session logged to memory/YYYY-MM-DD.md
- Patterns of vendor behavior → MEMORY.md (e.g., "Klaviyo changes pricing 
  ~Q1 yearly", "Gorgias docs structure changed in March 2026")
- Successful selectors for pricing parsing → MEMORY.md
- Captcha encounters → MEMORY.md (which sites require manual override)
- Session-log integration: Read `/sessions/infra-log.md` last 3 blocks at start of weekly maintenance cycle (Sunday). Recent Claude Code work may have changed configs (vendor-feeds.json, partner-list.json) that SCOUT depends on.
- Commit references: Use commit subject not hash when referring to changes (e.g., "config(scout): RSS feed verification" not "ed5a1fa"). Hash references break across rebases.
- Sitemap URL discovery: Track sites needing manual sitemap_url override (where standard patterns failed). Format: `vendor-slug: standard patterns failed, manual sitemap_url = <url>`

## Error handling
- Playwright timeout: retry 2x, then log error, skip task
- Captcha encountered: log to agent_logs with severity='warning', 
  notify CHIEF (operator can solve via AnyDesk if critical)
- Vendor site structure changed: fall back to LLM-based parsing
- Rate limit from source: backoff exponentially, eventually skip
- Network error: retry 3x, then defer

## Cost control
- Use Haiku for everything
- Avoid sending large HTML to LLM (extract with selectors first)
- Use prompt caching for parsing instructions
- Target: <$0.40/day average
