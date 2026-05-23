/**
 * Supabase · Database types
 * ----------------------------------------------------------------------------
 * Hand-written to match `supabase/migrations/001_initial_schema.sql`.
 *
 * IMPORTANT: every Row uses a `type` alias (not `interface`).
 * `@supabase/postgrest-js` constrains each table to `extends GenericTable`,
 * and `GenericTable.Row` is `Record<string, unknown>`. TS interfaces don't
 * satisfy that constraint because they're open-ended and can't claim an
 * unknown index signature — `type` aliases do. If we slip back to interfaces
 * here, every typed `.select()` collapses to `never`.
 *
 * When you want to regenerate from the live schema (block F decision: we
 * keep handwritten today because the schema is stable + only two
 * migrations have shipped — auto-gen would be heavier than the diff cost).
 * The manual command is:
 *
 *   # 1. Link the CLI to the Supabase project (one-time, stores .env-style
 *   #    creds in supabase/.temp/). Get the project ref from the URL of
 *   #    your dashboard: https://supabase.com/dashboard/project/<REF>/
 *   npx supabase link --project-ref <REF>
 *
 *   # 2. Pull types — output replaces this file:
 *   npx supabase gen types typescript --linked > lib/supabase/types.ts
 *
 *   # 3. Run `tsc --noEmit` immediately — the generated file uses Database
 *   #    interfaces with PostgREST GenericTable constraints, and a hand
 *   #    pass is needed to add back the typed enums (ToolStatus,
 *   #    ToolPricingModel, etc.) we use in our domain layer above.
 *
 * Call-sites in app/ don't change either way — the Row / Insert / Update
 * type names are stable.
 */

// ----------------------------------------------------------------------------
// Domain-level enums / discriminated literals
// ----------------------------------------------------------------------------
export type ToolStatus       = "draft" | "published" | "archived"
export type ToolPricingModel = "free" | "freemium" | "subscription" | "one_time" | "enterprise"
export type ToolCategory     =
  | "email" | "sms" | "support" | "chat"
  | "ads" | "content" | "analytics" | "inventory"
  | "reviews" | "upsell"
export type AffiliatePartner = "impact" | "partnerstack" | "rewardful" | "direct"
export type LanguageCode     = "en" | "ru"
export type ComparisonStatus = "draft" | "published" | "archived"
export type SubscriberStatus = "active" | "unsubscribed" | "bounced" | "pending"
export type ContentType      = "review" | "guide" | "tool" | "blog" | "best" | "comparison"
export type FeaturedTier     = "basic" | "premium" | "sponsor"

// Embedded JSONB shapes ------------------------------------------------------
export type ToolFeature = {
  name: string
  description?: string
  included: boolean
}

export type ToolRatingBreakdown = {
  ease_of_use?: number
  value?: number
  support?: number
  features?: number
}

export type ComparisonWinnerFor = {
  scenario: string
  winner_id: string
  reason: string
}

// ----------------------------------------------------------------------------
// Table rows
// ----------------------------------------------------------------------------
export type ToolRow = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  website_url: string
  affiliate_url: string | null
  affiliate_partner: AffiliatePartner | null
  // keep category open for new categories without a migration
  category: ToolCategory | (string & {})
  subcategories: string[]
  pricing_model: ToolPricingModel | null
  pricing_min: number | null
  pricing_max: number | null
  pricing_notes: string | null
  features: ToolFeature[]
  integrations: string[]
  rating: number | null
  rating_breakdown: ToolRatingBreakdown | null
  pros: string[]
  cons: string[]
  best_for: string | null
  not_for: string | null
  // Russian-locale columns (migration 005). Null = "not yet translated";
  // consumers fall back to the English column. Use the localizeTool helper
  // from @/lib/content/tool-locale so the fallback pattern is centralised
  // and every page applies it the same way.
  name_ru: string | null
  tagline_ru: string | null
  description_ru: string | null
  pros_ru: string[] | null
  cons_ru: string[] | null
  best_for_ru: string | null
  alternatives_to: string[]
  featured: number
  status: ToolStatus
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export type ToolInsert = Omit<ToolRow, "id" | "created_at" | "updated_at"> & {
  id?: string
  created_at?: string
  updated_at?: string
}
export type ToolUpdate = Partial<ToolInsert>

export type ComparisonRow = {
  id: string
  slug: string
  tool_a_id: string
  tool_b_id: string
  verdict: string | null
  winner_for: ComparisonWinnerFor[] | null
  comparison_data: Record<string, unknown> | null
  custom_intro: string | null
  custom_methodology: string | null
  language: LanguageCode
  status: ComparisonStatus
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}
export type ComparisonInsert = Omit<ComparisonRow, "id" | "created_at" | "updated_at"> & {
  id?: string
  created_at?: string
  updated_at?: string
}
export type ComparisonUpdate = Partial<ComparisonInsert>

export type AffiliateClickRow = {
  id: string
  tool_id: string | null
  source_path: string | null
  source_slug: string | null
  user_id: string | null
  ip_hash: string | null
  user_agent: string | null
  referer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  created_at: string
}
export type AffiliateClickInsert = Omit<AffiliateClickRow, "id" | "created_at"> & {
  id?: string
  created_at?: string
}

export type SubscriberRow = {
  id: string
  email: string
  source: string | null
  source_path: string | null
  language: LanguageCode
  beehiiv_id: string | null
  status: SubscriberStatus
  ip_hash: string | null
  created_at: string
}
export type SubscriberInsert = Omit<SubscriberRow, "id" | "created_at"> & {
  id?: string
  created_at?: string
}
export type SubscriberUpdate = Partial<SubscriberInsert>

export type SavedCalculationRow = {
  id: string
  user_id: string
  tool_slug: string
  inputs: Record<string, unknown>
  results: Record<string, unknown> | null
  name: string | null
  created_at: string
}
export type SavedCalculationInsert = Omit<SavedCalculationRow, "id" | "created_at"> & {
  id?: string
  created_at?: string
}

export type ContentLikeRow = {
  id: string
  user_id: string | null
  ip_hash: string | null
  content_type: ContentType
  content_slug: string
  created_at: string
}
export type ContentLikeInsert = Omit<ContentLikeRow, "id" | "created_at"> & {
  id?: string
  created_at?: string
}

// Contact-form inbox — see supabase/migrations/002_contact_submissions.sql
export type ContactSubmissionStatus = "new" | "read" | "replied" | "spam" | (string & {})

export type ContactSubmissionRow = {
  id: string
  name: string | null
  email: string
  subject: string | null
  message: string
  source: string | null
  ip_hash: string | null
  user_agent: string | null
  status: ContactSubmissionStatus
  created_at: string
}
// `status` and `source` carry DB defaults (`'new'` and `'contact_page'`), so
// inserts can omit them. Keep them optional in the Insert shape so the
// callsite doesn't have to spell out the default on every write.
export type ContactSubmissionInsert = Omit<ContactSubmissionRow, "id" | "created_at" | "status" | "source"> & {
  id?: string
  created_at?: string
  status?: ContactSubmissionStatus
  source?: string | null
}

export type FeaturedListingRow = {
  id: string
  tool_id: string
  tier: FeaturedTier
  starts_at: string
  ends_at: string
  amount_paid: number | null
  contact_email: string | null
  notes: string | null
  created_at: string
}
export type FeaturedListingInsert = Omit<FeaturedListingRow, "id" | "created_at"> & {
  id?: string
  created_at?: string
}

// Aggregate view -------------------------------------------------------------
export type ContentLikeCountRow = {
  content_type: ContentType
  content_slug: string
  likes: number
}

// ----------------------------------------------------------------------------
// Multi-agent tables — see supabase/migrations/008_multi_agent_tables.sql
// ----------------------------------------------------------------------------
export type SemanticCoreStatus =
  | "queued" | "researching" | "research_ready" | "in_writer_queue"
  | "drafting" | "ready_to_publish" | "published"
  | "refreshing" | "archived" | "excluded"

export type SemanticCoreTemplate =
  | "review" | "vs-comparison" | "alternatives" | "how-to"
  | "guide" | "pricing" | "best-for-segment" | "news"

export type SearchIntent = "transactional" | "commercial-investigation" | "informational"

export type SemanticCoreEntryRow = {
  id: string
  cluster: string
  template: SemanticCoreTemplate
  keyword: string
  search_intent: SearchIntent
  volume_estimate: number | null
  difficulty: number | null
  priority_score: number | null
  content_angle: string | null
  content_gap: string | null
  competitors_top3: unknown | null
  notes: string | null
  language: LanguageCode
  status: SemanticCoreStatus
  status_changed_at: string
  research_file_path: string | null
  writer_packet_path: string | null
  published_article_path: string | null
  queued_at: string
  research_requested_at: string | null
  research_completed_at: string | null
  publication_target_date: string | null
  published_at: string | null
  last_refreshed_at: string | null
  current_gsc_position: number | null
  current_monthly_impressions: number | null
  current_monthly_clicks: number | null
  current_affiliate_clicks: number | null
  created_at: string
  updated_at: string
}
export type SemanticCoreEntryInsert = Omit<
  SemanticCoreEntryRow,
  "id" | "created_at" | "updated_at" | "status_changed_at" | "queued_at"
> & {
  id?: string
  created_at?: string
  updated_at?: string
  status_changed_at?: string
  queued_at?: string
  status?: SemanticCoreStatus
}

export type ContentOpportunitySource =
  | "reddit" | "vendor_blog" | "producthunt" | "serp_change" | "rss" | "manual"
export type ContentOpportunityStatus =
  | "pending" | "reviewed_by_chief" | "accepted" | "rejected" | "expired"
export type ContentOpportunityUrgency = "hot" | "warm" | "evergreen"

// Category vocabulary per SCOUT's AGENTS.md classifier. Kept open with the
// `(string & {})` escape hatch since the DB column is intentionally un-CHECKed
// — SCOUT's vocab may add new buckets before we tighten the constraint.
export type ContentOpportunityCategory =
  | "pricing-change" | "feature-launch" | "acquisition" | "news" | "unrelated"

export type ContentOpportunityRow = {
  id: string
  source: ContentOpportunitySource
  source_url: string | null
  topic: string
  related_keywords: string[] | null
  related_tools: string[] | null
  // Migration 010 — denormalised slug + classifier (both nullable).
  tool_slug: string | null
  category: ContentOpportunityCategory | (string & {}) | null
  opportunity_score: number | null
  urgency: ContentOpportunityUrgency | null
  estimated_window_days: number | null
  description: string | null
  recommended_action: string | null
  evidence: unknown | null
  status: ContentOpportunityStatus
  chief_decision: string | null
  chief_decided_at: string | null
  spawned_semantic_entry_id: string | null
  created_at: string
}
export type ContentOpportunityInsert = Omit<ContentOpportunityRow, "id" | "created_at" | "status"> & {
  id?: string
  created_at?: string
  status?: ContentOpportunityStatus
}

export type AgentName = "CHIEF" | "SCOUT" | "OPS" | "CLAUDE_CODE" | "OPERATOR"
export type LogSeverity = "debug" | "info" | "warning" | "error" | "critical"

export type AgentLogRow = {
  id: string
  agent_name: AgentName
  event_type: string
  severity: LogSeverity
  message: string
  context: unknown | null
  related_entity_type: string | null
  related_entity_id: string | null
  duration_ms: number | null
  tokens_consumed: number | null
  cost_usd: number | null
  created_at: string
}
// Nullable columns are optional on insert (Postgres defaults to NULL).
export type AgentLogInsert = Omit<
  AgentLogRow,
  | "id" | "created_at" | "severity"
  | "context" | "related_entity_type" | "related_entity_id"
  | "duration_ms" | "tokens_consumed" | "cost_usd"
> & {
  id?: string
  created_at?: string
  severity?: LogSeverity
  context?: unknown | null
  related_entity_type?: string | null
  related_entity_id?: string | null
  duration_ms?: number | null
  tokens_consumed?: number | null
  cost_usd?: number | null
}

export type PerformanceSnapshotRow = {
  id: string
  snapshot_date: string
  total_sessions: number | null
  total_pageviews: number | null
  total_unique_visitors: number | null
  gsc_total_impressions: number | null
  gsc_total_clicks: number | null
  gsc_avg_position: number | null
  gsc_keywords_top10: number | null
  gsc_keywords_top20: number | null
  gsc_keywords_top50: number | null
  affiliate_clicks: number | null
  affiliate_conversions: number | null
  affiliate_revenue_usd: number | null
  new_subscribers: number | null
  total_subscribers: number | null
  newsletter_open_rate: number | null
  newsletter_click_rate: number | null
  top_pages: unknown | null
  vercel_function_error_rate: number | null
  created_at: string
}
export type PerformanceSnapshotInsert = Omit<PerformanceSnapshotRow, "id" | "created_at"> & {
  id?: string
  created_at?: string
}

export type SystemConfigRow = {
  key: string
  value: unknown
  description: string | null
  modified_by: "operator" | "CHIEF" | null
  modified_at: string
}
export type SystemConfigInsert = Omit<SystemConfigRow, "modified_at"> & {
  modified_at?: string
}

// ----------------------------------------------------------------------------
// Database — the shape consumed by `createBrowserClient<Database>()` etc.
// ----------------------------------------------------------------------------
type NoRels = []

export type Database = {
  public: {
    Tables: {
      tools:              { Row: ToolRow;             Insert: ToolInsert;             Update: ToolUpdate;                       Relationships: NoRels }
      comparisons:        { Row: ComparisonRow;       Insert: ComparisonInsert;       Update: ComparisonUpdate;                 Relationships: NoRels }
      affiliate_clicks:   { Row: AffiliateClickRow;   Insert: AffiliateClickInsert;   Update: Partial<AffiliateClickInsert>;    Relationships: NoRels }
      subscribers:        { Row: SubscriberRow;       Insert: SubscriberInsert;       Update: SubscriberUpdate;                 Relationships: NoRels }
      saved_calculations: { Row: SavedCalculationRow; Insert: SavedCalculationInsert; Update: Partial<SavedCalculationInsert>;  Relationships: NoRels }
      content_likes:      { Row: ContentLikeRow;      Insert: ContentLikeInsert;      Update: Partial<ContentLikeInsert>;       Relationships: NoRels }
      contact_submissions:{ Row: ContactSubmissionRow; Insert: ContactSubmissionInsert; Update: Partial<ContactSubmissionInsert>; Relationships: NoRels }
      featured_listings:  { Row: FeaturedListingRow;  Insert: FeaturedListingInsert;  Update: Partial<FeaturedListingInsert>;   Relationships: NoRels }
      // Multi-agent tables — migration 008
      semantic_core_entries: { Row: SemanticCoreEntryRow; Insert: SemanticCoreEntryInsert; Update: Partial<SemanticCoreEntryInsert>; Relationships: NoRels }
      content_opportunities: { Row: ContentOpportunityRow; Insert: ContentOpportunityInsert; Update: Partial<ContentOpportunityInsert>; Relationships: NoRels }
      agent_logs:            { Row: AgentLogRow;          Insert: AgentLogInsert;          Update: Partial<AgentLogInsert>;          Relationships: NoRels }
      performance_snapshots: { Row: PerformanceSnapshotRow; Insert: PerformanceSnapshotInsert; Update: Partial<PerformanceSnapshotInsert>; Relationships: NoRels }
      system_config:         { Row: SystemConfigRow;     Insert: SystemConfigInsert;       Update: Partial<SystemConfigInsert>;      Relationships: NoRels }
    }
    Views: {
      content_like_counts: { Row: ContentLikeCountRow; Relationships: NoRels }
    }
    Functions: { [_ in never]: never }
    Enums:     { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
