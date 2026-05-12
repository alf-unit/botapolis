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
 * When the supabase CLI is wired up later, replace this file with the output
 * of `supabase gen types typescript --local`. Call-sites don't change.
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
      featured_listings:  { Row: FeaturedListingRow;  Insert: FeaturedListingInsert;  Update: Partial<FeaturedListingInsert>;   Relationships: NoRels }
    }
    Views: {
      content_like_counts: { Row: ContentLikeCountRow; Relationships: NoRels }
    }
    Functions: { [_ in never]: never }
    Enums:     { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
