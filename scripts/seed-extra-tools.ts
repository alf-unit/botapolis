/**
 * seed-extra-tools.ts
 * ----------------------------------------------------------------------------
 * Part 2 of wave-2 external-catalog expansion. Loads 19 external/competitor
 * tools (Deep-Research dossier `Resources/Extra_Tools.md`) into `public.tools`
 * — DATA ONLY, no migrations (existing columns).
 *
 * VISIBILITY CONTRACT
 *   These 19 rows must NOT render as pages yet. Every render/discovery path
 *   (tools catalog, /tools/[slug] detail, sitemap, search index, alternatives,
 *   compare, related, cross-link grid) filters `status='published'`. So:
 *     • 18 active tools  → status='draft'    (data present, page invisible /
 *                          404; Part 3 flips to 'published' + adds a hidden
 *                          page_publications drip row → drip queue)
 *     • Returnly         → status='archived' (discontinued Oct-2023, sunset
 *                          into Loop Returns; per Extra_Tools "do not list as a
 *                          purchasable tool" — same pattern as booth-ai/cogsy)
 *   No page_publications rows are created here. Drip enrolment is Part 3.
 *
 * AFFILIATE
 *   WITH affiliate program (affiliate_url set + program metadata):
 *     constant-contact, activecampaign, brevo, hyros, chatfuel, livechat,
 *     help-scout, shipstation, bazaarvoice
 *   CARVE-OUT (affiliate_url=NULL, affiliate_partner=NULL → no CTA, /go fails
 *   closed to /tools/):  zendesk, intercom, riskified, parcellab, route,
 *     google-analytics, rockerbox, stamped, bold-subscriptions, returnly
 *
 * RU twins / verdict / alternatives_editorial are intentionally left NULL —
 * they are editorial synthesis written WITH the page in Part 3 (EN+RU same
 * session per Definition of Done). These draft rows have zero live exposure,
 * so no DoD pairing violation.
 *
 * Run:
 *   npx tsx scripts/seed-extra-tools.ts          # dry-run (prints plan)
 *   npx tsx scripts/seed-extra-tools.ts --apply  # upsert (onConflict slug)
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { resolve } from "path"
import type { ToolInsert } from "../lib/supabase/types"

config({ path: resolve(process.cwd(), ".env.local") })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const APPLY = process.argv.includes("--apply")

const UTM = "?utm_source=botapolis"

/** Build a verified-dated pricing_notes block in the established house format. */
function notes(tiers: string, gotchas: string, freePlan: string, verified: string) {
  return `Tiers (verified ${verified}): ${tiers}\n\nPricing gotchas: ${gotchas}\n\nFree plan: ${freePlan}\n\nVerified ${verified}`
}

/** Inferred 4-axis breakdown (Extra_Tools note 7: editorial estimates → "I"). */
function bd(ease: number, value: number, support: number, features: number) {
  return {
    ease_of_use: { value: ease, source: "I" as const },
    value: { value, source: "I" as const },
    support: { value: support, source: "I" as const },
    features: { value: features, source: "I" as const },
  }
}
/** Overall rating = mean of the 4 axes, 1 decimal (matches existing rows). */
function avg(ease: number, value: number, support: number, features: number) {
  return Math.round(((ease + value + support + features) / 4) * 10) / 10
}

const tools: ToolInsert[] = [
  // ── 1. Constant Contact ── affiliate (Impact/CJ) ──────────────────────────
  {
    slug: "constant-contact",
    name: "Constant Contact",
    tagline: "Email and digital marketing for small business.",
    description:
      "Email marketing and multi-channel digital marketing platform serving SMBs and nonprofits with email, social, event and SMS tools. Connects to Shopify via API/data import with 300+ native integrations and 5,000+ via marketplace/Zapier.",
    logo_url: null,
    website_url: "https://www.constantcontact.com",
    affiliate_url: `https://www.constantcontact.com/partners/affiliate${UTM}`,
    affiliate_partner: "impact",
    category: "email",
    subcategories: ["email-marketing", "automation", "events", "sms"],
    pricing_model: "tiered",
    pricing_min: 12,
    pricing_max: 80,
    pricing_notes: notes(
      "Lite $12/mo, Standard $35/mo, Premium $80/mo (all at 500 contacts; price scales with contact count to ~$425+ at higher tiers).",
      "Price jumps sharply across contact thresholds; automatic mid-cycle upgrades; overage fees $0.002/email; SMS add-on $10/mo on Lite/Standard; annual prepay is non-refundable.",
      "No permanent free plan — 60-day trial, 30-day refund.",
      "2026-04",
    ),
    features: [
      { name: "Email campaigns + drag-drop templates", plan_availability: "All plans" },
      { name: "Automation (welcome / resend)", plan_availability: "Standard and above" },
      { name: "A/B testing", plan_availability: "Standard and above" },
      { name: "Segmentation", plan_availability: "Standard and above" },
      { name: "AI content recommendations", is_ai: true, plan_availability: "Premium" },
      { name: "Events / registration", plan_availability: "All plans" },
      { name: "SMS marketing", plan_availability: "Premium (incl. 500/mo)" },
    ],
    integrations: ["Shopify", "Google", "Microsoft", "Facebook", "Instagram", "LinkedIn", "Canva", "Eventbrite", "Zapier"],
    integrates_with_tools: [],
    rating: avg(8, 6, 8, 7),
    rating_breakdown: bd(8, 6, 8, 7),
    pros: ["Genuinely easy to use", "Legendary phone support", "Strong event/registration tools"],
    cons: ["Steep price scaling with list size", "No permanent free plan", "Limited automation depth vs competitors"],
    best_for:
      "Small businesses, nonprofits and community orgs under ~5,000 contacts that want simplicity and hands-on support.",
    not_for:
      "Fast-scaling brands needing deep automation, or cost-sensitive teams (pricing climbs steeply with list size).",
    operator_quotes: [
      { quote: "Easy to use and trusted by small businesses.", source: "Mailsoftly", date: "2026" },
      { quote: "Costs scale steeply with list size — no free tier.", source: "CheckThat.ai", date: "2026" },
    ],
    external_ratings: {
      g2: { score: 4.1, reviews: 1000 },
      trustpilot: { score: 3.9, reviews: 1758 },
    },
    affiliate_commission: "Up to $80 per sale (directories cite $105 + $5/trial — conflicting)",
    affiliate_cookie_window: "Conflicting (30–120 days)",
    affiliate_program_url: "https://www.constantcontact.com/partners/affiliate",
    pricing_source_url: "https://www.constantcontact.com/pricing",
    shopify_native_notes:
      "Not a native Shopify app — connects via API/data import (native Shopify data import). 300+ native integrations on Lite; 5,000+ via marketplace/Zapier.",
    meta_title: "Constant Contact review 2026 · email for small business",
    meta_description:
      "Honest analyst review of Constant Contact for Shopify SMBs: tiered pricing from $12/mo, steep list-size scaling, strong phone support, and where it fits vs Mailchimp/Omnisend.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 2. Bazaarvoice ── affiliate (partner program, not per-sale) ───────────
  {
    slug: "bazaarvoice",
    name: "Bazaarvoice",
    tagline: "User-generated content and review syndication for brands and retailers.",
    description:
      "Enterprise ratings, reviews and UGC platform whose core value is syndicating reviews across a network of 2,300+ global retailers (Walmart, Target, Home Depot). Shopify Certified Technology Partner as of May 2026.",
    logo_url: null,
    website_url: "https://www.bazaarvoice.com",
    affiliate_url: `https://www.bazaarvoice.com/company/partner-program/${UTM}`,
    affiliate_partner: "direct",
    category: "reviews",
    subcategories: ["reviews", "ugc", "syndication", "sampling"],
    pricing_model: "custom",
    pricing_min: null,
    pricing_max: null,
    pricing_notes: notes(
      "No published pricing (custom, annual). Benchmarked tiers: syndication-only ~$6.5K–15K/yr; R&R own-site $10K–25K/yr; mid-market+syndication $40K–80K/yr; enterprise full suite $100K–200K+/yr (avg enterprise contract ~$184K/yr per Vendr/SpendHound).",
      "No published pricing; implementation $10K–50K+; overages on traffic/API/SKU $10K–30K+; 12-month auto-renew contracts widely criticized for rigidity.",
      "No — enterprise sales only.",
      "2026-05",
    ),
    features: [
      { name: "Ratings & Reviews collection + moderation" },
      { name: "Retail syndication to 2,300+ retailers" },
      { name: "Questions & Answers" },
      { name: "Visual / Social UGC (Vibe)" },
      { name: "Sampling / influencer programs" },
      { name: "Insights / analytics", is_ai: true },
    ],
    integrations: ["Salesforce Commerce Cloud", "Adobe Commerce/Magento", "SAP Hybris", "Oracle Commerce", "Shopify Plus", "Google"],
    integrates_with_tools: [],
    rating: avg(6, 6, 6, 8),
    rating_breakdown: bd(6, 6, 6, 8),
    pros: ["Best-in-class retail review syndication", "Measurable product-visibility lift", "Strong sampling programs"],
    cons: ["Clunky / outdated UI", "Rigid auto-renew contracts", "Complex setup"],
    best_for:
      "Enterprise CPG/retail brands selling across 5+ major retailers that need review syndication.",
    not_for: "DTC-only or single-channel Shopify brands; small or cost-sensitive stores.",
    operator_quotes: [
      { quote: "Syndication options are best-in-class.", source: "G2 / TrustRadius", date: "2026" },
      { quote: "Refused to release us from auto-renew contract... one of the worst vendor experiences.", source: "G2 (Sun Home Saunas)", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.2, reviews: 804 } },
    affiliate_commission: "Partner program (tiered: Integration/Referral/Signature/Premier) — not a per-sale commission affiliate",
    affiliate_cookie_window: "Not stated",
    affiliate_program_url: "https://www.bazaarvoice.com/company/partner-program/",
    pricing_source_url: "https://www.bazaarvoice.com",
    shopify_native_notes:
      "Works via API; Shopify Certified Technology Partner (May 2026). Strongest fit on Shopify Plus for brands needing review syndication to retail partners.",
    meta_title: "Bazaarvoice review 2026 · enterprise review syndication",
    meta_description:
      "Honest analyst review of Bazaarvoice: enterprise review syndication to 2,300+ retailers, custom six-figure pricing, rigid contracts, and who actually needs it vs Yotpo/Loox.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 3. ActiveCampaign ── affiliate (PartnerStack) ─────────────────────────
  {
    slug: "activecampaign",
    name: "ActiveCampaign",
    tagline: "Marketing automation and CRM platform.",
    description:
      "Email marketing, marketing automation and sales CRM platform known for deep, branching automation workflows. Connects to Shopify via app/API plus Zapier/Make and a REST API.",
    logo_url: null,
    website_url: "https://www.activecampaign.com",
    affiliate_url: `https://www.activecampaign.com/partners/affiliate${UTM}`,
    affiliate_partner: "partnerstack",
    category: "email",
    subcategories: ["email-marketing", "automation", "crm", "sms"],
    pricing_model: "tiered",
    pricing_min: 15,
    pricing_max: null,
    pricing_notes: notes(
      "Starter $15/mo, Plus $49/mo, Pro $79/mo, Enterprise custom (at 1,000 contacts, annual). Scales to ~$1,169/mo at 50K contacts; custom above.",
      "Contact-based pricing scales fast; tier bump when over contact limit; send limits 10–15x contacts with overages (~$5/5,000 sends); Nov 2025 change bills for inactive contacts; CRM/SMS add-ons extra.",
      "No — 14-day trial.",
      "2026-01",
    ),
    features: [
      { name: "Email + automation", plan_availability: "All plans" },
      { name: "Branching automation workflows", plan_availability: "Plus and above" },
      { name: "Landing pages", plan_availability: "Plus and above" },
      { name: "Generative AI content", is_ai: true, plan_availability: "Plus and above" },
      { name: "Predictive sending", is_ai: true, plan_availability: "Pro and above" },
      { name: "Lead scoring", plan_availability: "Plus and above" },
      { name: "Attribution", plan_availability: "Pro and above" },
    ],
    integrations: ["Meta Custom Audiences", "Google", "Shopify", "WooCommerce", "Salesforce (API)", "Make"],
    integrates_with_tools: ["postscript"],
    rating: avg(8, 7, 8, 9),
    rating_breakdown: bd(8, 7, 8, 9),
    pros: ["Powerful branching automation", "Strong deliverability", "Deep feature set"],
    cons: ["Steep price scaling", "Real learning curve", "Now bills for inactive contacts"],
    best_for: "Growing SMBs and mid-market teams needing advanced automation/CRM at a moderate price.",
    not_for: "Tiny budgets wanting flat pricing, or teams needing many cheap user seats.",
    operator_quotes: [
      { quote: "Powerful automation workflows... top choice.", source: "SwitchTheStack", date: "2025" },
      { quote: "Pricing model punishes success.", source: "Encharge", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.5, reviews: 14500 } },
    affiliate_commission: "20–30% recurring (tiered Silver/Gold/Platinum)",
    affiliate_cookie_window: "90 days",
    affiliate_program_url: "https://www.activecampaign.com/partners/affiliate",
    pricing_source_url: "https://www.activecampaign.com/pricing",
    shopify_native_notes:
      "Works via Shopify app / API plus Zapier/Make. Deep automation makes it a strong Klaviyo/Mailchimp alternative for stores that need branching workflows + CRM.",
    meta_title: "ActiveCampaign review 2026 · automation + CRM for Shopify",
    meta_description:
      "Honest analyst review of ActiveCampaign for Shopify: deep branching automation, CRM, tiered pricing from $15/mo, contact-based scaling, and where it beats Mailchimp.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 4. Hyros ── affiliate (direct / FirstPromoter) ────────────────────────
  {
    slug: "hyros",
    name: "Hyros",
    tagline: "AI ad tracking and attribution.",
    description:
      "AI-powered ad attribution/tracking platform using server-side tracking and identity resolution to attribute multi-channel sales for high-spend advertisers. Connects to Shopify plus 40+ integrations.",
    logo_url: null,
    website_url: "https://hyros.com",
    affiliate_url: `https://hyros.com/affiliate${UTM}`,
    affiliate_partner: "direct",
    category: "attribution",
    subcategories: ["attribution", "ad-tracking", "analytics", "ai"],
    pricing_model: "tiered",
    pricing_min: 69,
    pricing_max: 1499,
    pricing_notes: notes(
      "Tracked-revenue based: Shopify track $69/mo (at $5K tracked rev), Business $230/mo (at $20K tracked rev), scaling to $1,499/mo (at $750K); custom above $1M.",
      "Priced on tracked revenue, not ad spend; requires a sales demo (no self-serve); only accepts $5K+/mo ad spenders; some cite a 6-month commitment; annual-only display.",
      "No — 90-day refund guarantee.",
      "2026",
    ),
    features: [
      { name: "Server-side ad tracking", is_ai: true, plan_availability: "All plans" },
      { name: "Multi-touch attribution", plan_availability: "All plans" },
      { name: "Call / offline tracking", plan_availability: "All plans" },
      { name: "AI ad optimization recommendations", is_ai: true, plan_availability: "All plans" },
      { name: "HYROS AIR outbound AI agent", is_ai: true },
      { name: "Customer journey mapping" },
    ],
    integrations: ["Meta", "Google Ads", "TikTok", "YouTube", "ClickFunnels", "Stripe", "WooCommerce", "BigCommerce"],
    integrates_with_tools: [],
    rating: avg(6, 7, 8, 8),
    rating_breakdown: bd(6, 7, 8, 8),
    pros: ["Accurate cross-device attribution", "Surfaces missed sales", "Strong agency support"],
    cons: ["Expensive", "Requires high ad spend", "No self-serve / pricing transparency"],
    best_for:
      "E-commerce brands and info-marketers spending $5K+/mo (ideally $50K+) on ads, and agencies.",
    not_for: "Low ad-spend businesses (<$5K/mo) and those wanting cheap, self-serve tools.",
    operator_quotes: [
      { quote: "I can see exactly where my sales are coming from... 300% more profitable within 72 hours.", source: "Hyros.com testimonial", date: "2026" },
      { quote: "Most customers who left reviews on TrustPilot seem to be unhappy.", source: "AnyTrack", date: "2026" },
    ],
    external_ratings: null,
    affiliate_commission: "30% recurring lifetime (Hyros calls it the highest in the tracking industry)",
    affiliate_cookie_window: "Not stated",
    affiliate_program_url: "https://hyros.com/affiliate",
    pricing_source_url: "https://hyros.com/pricing-ai-tracking",
    shopify_native_notes:
      "Works via API (Shopify track tier). Server-side tracking targets high-spend advertisers — a heavier, pricier alternative to Triple Whale/Northbeam for $5K+/mo ad budgets.",
    meta_title: "Hyros review 2026 · AI ad attribution for high spenders",
    meta_description:
      "Honest analyst review of Hyros: server-side ad attribution from $69/mo (tracked-revenue based), built for $5K+/mo advertisers, and how it compares to Triple Whale.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 5. Chatfuel ── affiliate (FirstPromoter) ──────────────────────────────
  {
    slug: "chatfuel",
    name: "Chatfuel",
    tagline: "AI assistant for WhatsApp, Instagram & social media.",
    description:
      "No-code AI chatbot/messaging automation platform for WhatsApp, Instagram, Messenger, TikTok DMs and web chat, positioned as an AI Business Assistant. Shopify integration available (+$59/mo).",
    logo_url: null,
    website_url: "https://chatfuel.com",
    affiliate_url: `https://chatfuel.com/affiliate-program${UTM}`,
    affiliate_partner: "direct",
    category: "chat",
    subcategories: ["chatbot", "whatsapp", "instagram", "ai-agent"],
    pricing_model: "tiered",
    pricing_min: 39,
    pricing_max: 549,
    pricing_notes: notes(
      "Active-contact based: Fuely Super $39–$279/mo (150–5,000 contacts), Fuely Max $139–$549/mo, Enterprise ~$400+/mo.",
      "Per active-contact pricing scales; WhatsApp incurs separate Meta per-conversation fees ($0.02–$0.08); Shopify integration +$59/mo; Fuely Max ~2x Super; no free tier; old $14.99–$24.99 tiers retired.",
      "No — 7-day trial, 3-day refund window.",
      "2026",
    ),
    features: [
      { name: "No-code flow builder", plan_availability: "All plans" },
      { name: "Multi-channel inbox", plan_availability: "All plans" },
      { name: "AI agent (ChatGPT-class)", is_ai: true, plan_availability: "All plans" },
      { name: "Live chat handoff", plan_availability: "All plans" },
      { name: "Broadcasts / sequences", plan_availability: "All plans" },
      { name: "Abandoned cart / post-purchase", plan_availability: "All plans" },
      { name: "Unlimited team seats", plan_availability: "All plans" },
    ],
    integrations: ["WhatsApp", "Instagram", "Messenger", "TikTok", "Shopify", "Kommo CRM", "Google Sheets", "Stripe", "Calendly", "Zapier"],
    integrates_with_tools: [],
    rating: avg(8, 6, 5, 7),
    rating_breakdown: bd(8, 6, 5, 7),
    pros: ["Easy setup", "Official WhatsApp API + green badge", "Unlimited team seats"],
    cons: ["Billing opacity", "Dismissive support reports", "No free tier"],
    best_for:
      "WhatsApp-first SMBs and DTC brands (esp. LatAm, India, Middle East) doing Meta-channel commerce.",
    not_for: "Solopreneurs/budget users (ManyChat free tier is better) and teams needing SMS/email channels.",
    operator_quotes: [
      { quote: "If you can use WhatsApp, you can set up Chatfuel.", source: "Chatfuel.com", date: "2026" },
      { quote: "Dashboard outages lasting days... support told them they might be delusional.", source: "Trustpilot via Prospeo", date: "2026" },
    ],
    external_ratings: {
      g2: { score: 4.4, reviews: 45 },
      trustpilot: { score: 3.2, reviews: 14 },
    },
    affiliate_commission: "30–50% revenue share for 12 months (via FirstPromoter)",
    affiliate_cookie_window: "30 days",
    affiliate_program_url: "https://chatfuel.com/affiliate-program",
    pricing_source_url: "https://chatfuel.com/pricing",
    shopify_native_notes:
      "Works via API; Shopify integration is a +$59/mo add-on. WhatsApp-first positioning makes it a heavier ManyChat alternative for Meta-channel commerce.",
    meta_title: "Chatfuel review 2026 · WhatsApp & IG AI chatbot",
    meta_description:
      "Honest analyst review of Chatfuel for Shopify: no-code WhatsApp/Instagram AI agent from $39/mo, separate Meta conversation fees, +$59/mo Shopify add-on, vs ManyChat.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 6. Brevo ── affiliate (PartnerStack) ──────────────────────────────────
  {
    slug: "brevo",
    name: "Brevo",
    tagline: "All-in-one customer relationship platform (formerly Sendinblue).",
    description:
      "Multi-channel marketing platform (email, SMS, WhatsApp, chat, CRM) priced primarily on email send volume rather than contact count. Native Shopify integration.",
    logo_url: null,
    website_url: "https://www.brevo.com",
    affiliate_url: `https://www.brevo.com/partners/affiliates/${UTM}`,
    affiliate_partner: "partnerstack",
    category: "email",
    subcategories: ["email-marketing", "sms", "whatsapp", "crm"],
    pricing_model: "freemium",
    pricing_min: 9,
    pricing_max: 669,
    pricing_notes: notes(
      "Free $0, Starter $9/mo, Business/Standard $18/mo, Enterprise custom. Send-volume based — Standard scales $18 → $669/mo at 1M emails.",
      "Pricing by email volume with large jumps at high send tiers; logo removal +$9–$10.80/mo on Starter; dedicated IP $251/yr; SMS/WhatsApp pay-as-you-go; Oct 2025 removed landing pages from Starter.",
      "Yes — 300 emails/day, up to 100K contacts, no time limit.",
      "2026",
    ),
    features: [
      { name: "Email campaigns + editor", plan_availability: "All plans" },
      { name: "Marketing automation", plan_availability: "Business and above" },
      { name: "A/B testing", plan_availability: "Business and above" },
      { name: "SMS / WhatsApp", plan_availability: "Pay-as-you-go" },
      { name: "Landing pages", plan_availability: "Business and above" },
      { name: "Sales CRM", plan_availability: "All plans" },
      { name: "AI predictive sending", is_ai: true, plan_availability: "Higher tiers" },
      { name: "Transactional email / API", plan_availability: "All plans" },
    ],
    integrations: ["Shopify", "WooCommerce", "Meta/WhatsApp", "Major CMS", "Zapier"],
    integrates_with_tools: [],
    rating: avg(8, 9, 7, 8),
    rating_breakdown: bd(8, 9, 7, 8),
    pros: ["Volume-based pricing saves money for large lists", "Built-in SMS/WhatsApp", "Generous free plan"],
    cons: ["Weaker automation depth", "Logo removal costs extra", "Daily send cap on free plan"],
    best_for:
      "SMBs with large contact lists who send infrequently, multichannel marketers, and budget-conscious teams.",
    not_for: "High-frequency daily senders, and teams needing the deepest automation.",
    operator_quotes: [
      { quote: "Charges based on emails sent... an advantage for businesses with large lists.", source: "That Marketing Buddy", date: "2026" },
      { quote: "Real-time tracking shows engagement as it happens.", source: "Sender.net", date: "2026" },
    ],
    external_ratings: {
      g2: { score: 4.5, reviews: 2637 },
      trustpilot: { score: 4.0, reviews: 7078 },
    },
    affiliate_commission: "$100 per paid subscription + $5 per free account",
    affiliate_cookie_window: "90 days",
    affiliate_program_url: "https://www.brevo.com/partners/affiliates/",
    pricing_source_url: "https://www.brevo.com/pricing/",
    shopify_native_notes:
      "Native Shopify integration. Send-volume pricing makes it a cheaper Mailchimp/Klaviyo alternative for large, low-frequency lists; SMS/WhatsApp built in.",
    meta_title: "Brevo review 2026 · volume-priced email for Shopify",
    meta_description:
      "Honest analyst review of Brevo (ex-Sendinblue) for Shopify: send-volume pricing from $9/mo, generous free plan, built-in SMS/WhatsApp, and where it beats Mailchimp.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 7. Stamped ── CARVE-OUT (weak fit, no CTA) ────────────────────────────
  {
    slug: "stamped",
    name: "Stamped",
    tagline: "Reviews and loyalty for ecommerce brands.",
    description:
      "All-in-one Shopify retention platform bundling product reviews/UGC, loyalty/rewards and lifecycle automation in one dashboard. Built for Shopify with deep retention-stack integrations.",
    logo_url: null,
    website_url: "https://stamped.io",
    affiliate_url: null,
    affiliate_partner: null,
    category: "reviews",
    subcategories: ["reviews", "loyalty", "ugc", "lifecycle"],
    pricing_model: "tiered",
    pricing_min: 199,
    pricing_max: 798,
    pricing_notes: notes(
      "Monthly-order based: Reviews $199/mo, Full Suite (multi-product, reviews + loyalty) $798/mo, Enterprise custom ($1M+ rev).",
      "Priced by monthly order volume; free plan removed in 2025; additional domains $100/mo each; no overage fees since 2025.",
      "No — self-serve Shopify plans for smaller brands, no traditional free trial.",
      "2026-04",
    ),
    features: [
      { name: "In-email review collection (photo/video)" },
      { name: "Google Shopping syndication" },
      { name: "Loyalty points / VIP tiers / referrals" },
      { name: "Lifecycle automation / replenishment" },
      { name: "Questions & Answers" },
      { name: "AI sentiment analysis", is_ai: true },
    ],
    integrations: ["Klaviyo", "Attentive", "Gorgias", "Recharge", "Postscript", "Shop App", "Bazaarvoice (syndication)", "Tapcart"],
    integrates_with_tools: ["klaviyo", "attentive", "gorgias", "recharge", "postscript"],
    rating: avg(8, 8, 9, 8),
    rating_breakdown: bd(8, 8, 9, 8),
    pros: ["Unified reviews + loyalty", "Best-in-class in-email review collection", "Cheaper than Yotpo with strong support"],
    cons: ["Glitchy UI / automation editor", "Product feels static", "Slow ticket-based support (no live chat)"],
    best_for:
      "Growth-stage and mid-market Shopify brands wanting reviews + loyalty in one place; consumable/replenishment brands.",
    not_for: "Bootstrapped startups (entry price raised) and WooCommerce/BigCommerce users.",
    operator_quotes: [
      { quote: "About 1/6 of the cost [of Yotpo]... and more features.", source: "Capterra", date: "2026" },
      { quote: "Buggy, slow and I cannot get any help from customer support.", source: "Shopify App Store", date: "2026" },
    ],
    external_ratings: { shopify_store: { score: 4.7, reviews: 3670 } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://website.stamped.io/pricing/",
    shopify_native_notes:
      "Native Shopify build; integrates with the retention stack (Klaviyo, Attentive, Gorgias, Recharge, Postscript). Positioned as a cheaper Yotpo alternative for reviews + loyalty.",
    meta_title: "Stamped review 2026 · reviews + loyalty for Shopify",
    meta_description:
      "Honest analyst review of Stamped: reviews + loyalty bundled from $199/mo, order-based pricing, no free plan since 2025, and how it compares to Yotpo and Loox.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 8. Zendesk ── CARVE-OUT (no CTA) ──────────────────────────────────────
  {
    slug: "zendesk",
    name: "Zendesk",
    tagline: "AI-first customer service platform.",
    description:
      "Enterprise-grade customer service suite bundling ticketing, messaging, live chat, help center, voice and AI agents, priced per agent. Shopify app available via marketplace.",
    logo_url: null,
    website_url: "https://www.zendesk.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "support",
    subcategories: ["helpdesk", "ticketing", "live-chat", "ai-agents"],
    pricing_model: "tiered",
    pricing_min: 19,
    pricing_max: 115,
    pricing_notes: notes(
      "Per agent/mo annual: Support Team $19, Suite Team $55, Suite Growth $89, Suite Professional $115, Suite Enterprise custom ($150+).",
      "Per-agent scaling; the best AI is a paid add-on ($50/agent); AI agents bill per resolution (outcome-based, 2026); conversation overages (~$0.04 each over plan); WFM/QA add-ons; implementation $5K–50K+; annual escalation 5–7%.",
      "No — 14-day trial; 6-month startup program.",
      "2026",
    ),
    features: [
      { name: "Omnichannel ticketing", plan_availability: "All plans" },
      { name: "Help center", plan_availability: "All plans" },
      { name: "SLAs", plan_availability: "Growth and above" },
      { name: "Skills-based routing / IVR", plan_availability: "Professional and above" },
      { name: "AI agents (per-resolution)", is_ai: true, plan_availability: "All plans" },
      { name: "Advanced AI add-on", is_ai: true, plan_availability: "$50/agent add-on" },
      { name: "HIPAA", plan_availability: "Professional and above" },
    ],
    integrations: ["Slack", "Salesforce", "Shopify", "Meta", "WhatsApp", "1,000+ marketplace apps"],
    integrates_with_tools: [],
    rating: avg(7, 6, 7, 9),
    rating_breakdown: bd(7, 6, 7, 9),
    pros: ["Feature-rich", "Strong AI roadmap", "Scales with growth"],
    cons: ["Expensive per agent", "Best AI is a costly add-on", "Complex / clunky UI"],
    best_for: "Mid-market to enterprise support teams needing omnichannel + AI at scale.",
    not_for: "Teams under ~3 agents / tight budgets, and those wanting AI included in the base price.",
    operator_quotes: [
      { quote: "Leaning into AI... as a force multiplier for support teams.", source: "SaaSworthy", date: "2026" },
      { quote: "Penalizes you for growing your team.", source: "Robylon", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.3, reviews: 6700 } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://www.zendesk.com/pricing/",
    shopify_native_notes:
      "Works via API; Shopify app via marketplace. Enterprise helpdesk alternative to Gorgias for larger teams — AI agents bill per resolution on top of per-agent seats.",
    meta_title: "Zendesk review 2026 · enterprise helpdesk for Shopify",
    meta_description:
      "Honest analyst review of Zendesk for Shopify support: per-agent pricing from $19, AI agents billed per resolution, costly AI add-ons, and how it compares to Gorgias.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 9. Intercom ── CARVE-OUT (no public affiliate) ────────────────────────
  {
    slug: "intercom",
    name: "Intercom",
    tagline: "AI-first customer service platform.",
    description:
      "Customer service/messaging suite combining a shared inbox, helpdesk, messenger, workflows and the Fin AI agent; seat-based pricing plus usage-based AI. Works with Shopify and Gorgias.",
    logo_url: null,
    website_url: "https://www.intercom.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "support",
    subcategories: ["helpdesk", "live-chat", "ai-agents", "messenger"],
    pricing_model: "tiered",
    pricing_min: 29,
    pricing_max: 132,
    pricing_notes: notes(
      "Per seat/mo annual: Essential $29, Advanced $85, Expert $132.",
      "Fin AI billed $0.99/outcome on top of seats (50 included resolutions/mo minimum); usage fees for SMS/WhatsApp/email campaigns/phone; Copilot $35/seat; Proactive Support Plus $99/mo; bills can run 2–3x expected.",
      "No — 14-day trial; 90% off year-1 Early Stage program.",
      "2026-05",
    ),
    features: [
      { name: "Shared inbox / ticketing", plan_availability: "All plans" },
      { name: "Messenger / live chat", plan_availability: "All plans" },
      { name: "Fin AI agent (per-outcome)", is_ai: true, plan_availability: "All plans" },
      { name: "Workflows / automation", plan_availability: "Advanced and above" },
      { name: "Multiple team inboxes", plan_availability: "Advanced and above" },
      { name: "Copilot", is_ai: true, plan_availability: "Add-on" },
      { name: "SLAs / workload management", plan_availability: "Expert" },
    ],
    integrations: ["Salesforce", "HubSpot", "Slack", "Shopify", "WhatsApp", "Stripe"],
    integrates_with_tools: [],
    rating: avg(8, 6, 7, 9),
    rating_breakdown: bd(8, 6, 7, 9),
    pros: ["Polished messenger", "Powerful Fin AI agent", "Strong automation"],
    cons: ["Unpredictable usage billing", "Expensive at scale", "Fin per-outcome cost adds up"],
    best_for:
      "Growing product/support teams wanting AI-first support + messenger; mid-market scaling automation.",
    not_for: "Slack-first teams, very small budgets, and teams wanting predictable flat costs.",
    operator_quotes: [
      { quote: "Fin's per-outcome cost dominates at high volume.", source: "Featurebase", date: "2026" },
      { quote: "Actual Intercom spend being 2–3x what they initially expected.", source: "Robylon", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.5, reviews: 3855 } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://www.intercom.com/pricing",
    shopify_native_notes:
      "Works via API; Fin AI agent integrates with Shopify/Gorgias. AI-first messenger alternative to Gorgias/Zendesk — strongest for product teams, but usage billing is unpredictable.",
    meta_title: "Intercom review 2026 · AI-first support + Fin agent",
    meta_description:
      "Honest analyst review of Intercom for Shopify: seat-based pricing from $29, Fin AI agent at $0.99/outcome, unpredictable usage bills, and how it compares to Gorgias.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 10. Riskified ── CARVE-OUT (enterprise, no CTA) ───────────────────────
  {
    slug: "riskified",
    name: "Riskified",
    tagline: "AI-powered fraud and chargeback protection.",
    description:
      "Enterprise e-commerce fraud-prevention platform offering real-time approve/decline decisions with a full chargeback guarantee (liability shift) on approved orders. Certified Shopify Plus integration.",
    logo_url: null,
    website_url: "https://www.riskified.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "fraud",
    subcategories: ["fraud-prevention", "chargeback-guarantee", "risk", "ai"],
    pricing_model: "usage-based",
    pricing_min: null,
    pricing_max: null,
    pricing_notes: notes(
      "Usage-based (% of approved/guaranteed orders), custom. Annual-volume tiers (under $3M, $3–10M, $10–100M, >$100M); historically ~$3,000/mo entry. Charges only on approved orders.",
      "Pricing not published (sales quote); reportedly less effective in some markets (e.g. Japan); occasional post-approval declines reported.",
      "No — enterprise sales only.",
      "2026",
    ),
    features: [
      { name: "Chargeback Guarantee (full liability shift)", is_ai: true },
      { name: "Real-time decisioning", is_ai: true },
      { name: "Policy Protect (return/refund abuse)" },
      { name: "Dispute Resolve (chargeback management)" },
      { name: "Account takeover protection" },
      { name: "Control Center analytics" },
    ],
    integrations: ["Shopify", "Magento/Adobe Commerce", "PrestaShop", "PayPal", "Stripe", "Salesforce Commerce"],
    integrates_with_tools: [],
    rating: avg(8, 8, 7, 8),
    rating_breakdown: bd(8, 8, 7, 8),
    pros: ["Chargeback guarantee = peace of mind", "Higher approval rates", "Hands-off automation"],
    cons: ["Occasional denied claims", "Post-approval declines", "Enterprise-only fit"],
    best_for:
      "Mid-market to enterprise online retailers; international/high-risk verticals (fashion, electronics, luxury, tickets, travel).",
    not_for: "Small stores under ~$3M annual volume and those wanting cheap/simple fraud filters.",
    operator_quotes: [
      { quote: "Two fraudulent orders... returned the chargeback + fees immediately.", source: "Shopify App Store", date: "2026" },
      { quote: "They will deny your claims... avoid this app.", source: "Shopify App Store", date: "2026" },
    ],
    external_ratings: {
      g2: { score: 4.5, reviews: 207 },
      shopify_store: { score: 4.6, reviews: 43 },
    },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://www.riskified.com",
    shopify_native_notes:
      "Certified Shopify Plus integration (native). Enterprise fraud alternative to Signifyd — full chargeback liability shift, but priced and scoped for $3M+ stores.",
    meta_title: "Riskified review 2026 · enterprise fraud + chargeback guarantee",
    meta_description:
      "Honest analyst review of Riskified for Shopify Plus: AI fraud decisioning with full chargeback guarantee, usage-based custom pricing, and how it compares to Signifyd.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 11. Bold Subscriptions ── CARVE-OUT (weak, no CTA) ────────────────────
  {
    slug: "bold-subscriptions",
    name: "Bold Subscriptions",
    tagline: "Recurring billing and subscriptions for Shopify.",
    description:
      "Shopify subscription-management app for recurring orders, subscribe-and-save, boxes and memberships, with Maximizers to boost AOV and reduce churn. Native Shopify Checkout integration.",
    logo_url: null,
    website_url: "https://boldcommerce.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "subscriptions",
    subcategories: ["subscriptions", "recurring-billing", "upsell", "retention"],
    pricing_model: "tiered",
    pricing_min: 24.99,
    pricing_max: null,
    pricing_notes: notes(
      "Revenue-based + transaction fees: free for 90 days / stores <$100/mo subs rev; Launch $24.99/mo + 2% txn fee; Scale; Ultimate Retention; Enterprise custom ($1M+ annual subs rev).",
      "Base fee + transaction fee on every subscription order (third parties report $49.99 + 1% on some plans); the fee applies to the full order incl. one-time items; transaction fees still apply during the free trial; theme-compatibility issues reported.",
      "Yes — free for 90 days for stores <$100/mo subs rev; 30-day trial.",
      "2026-01",
    ),
    features: [
      { name: "Standard / prepaid / convertible subscriptions", plan_availability: "All plans" },
      { name: "Customer self-serve portal", plan_availability: "All plans" },
      { name: "Subscription Maximizers (upsells, dynamic discounts, add-ons)", plan_availability: "All plans" },
      { name: "Cancellation flows (ProsperStack on Ultimate)" },
      { name: "Reporting / CSV", plan_availability: "All plans" },
      { name: "APIs", plan_availability: "All plans" },
    ],
    integrations: ["Shopify Payments", "Authorize.net", "PayPal Express", "Shop Pay", "Google Pay", "Peel Analytics"],
    integrates_with_tools: ["rebuy"],
    rating: avg(7, 6, 6, 8),
    rating_breakdown: bd(7, 6, 6, 8),
    pros: ["All features on every plan", "Maximizers boost AOV", "Free migration"],
    cons: ["Transaction fees on growth", "Theme-compatibility glitches", "Support complaints"],
    best_for:
      "Shopify / Shopify Plus brands selling consumables, boxes or memberships that want recurring revenue + upsell tools.",
    not_for: "Stores wanting the cheapest/lightweight subscriptions (transaction fees add up); non-Shopify stores.",
    operator_quotes: [
      { quote: "The only subscriptions app on Shopify designed to maximize average order value.", source: "Bold Commerce", date: "2026" },
      { quote: "Dreadful customer support. A week with an issue and no response.", source: "Shopify App Store", date: "2026" },
    ],
    external_ratings: { shopify_store: { score: 4.2, reviews: 366, note: "Ignore stale 4.7/1,797 figure circulating on aggregators" } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://boldcommerce.com/shopify/subscriptions-pricing",
    shopify_native_notes:
      "Native Shopify Checkout integration. A Recharge/Skio/Loop alternative with AOV Maximizers, but base fee + per-order transaction fees make it pricier as subscription revenue grows.",
    meta_title: "Bold Subscriptions review 2026 · Shopify recurring billing",
    meta_description:
      "Honest analyst review of Bold Subscriptions for Shopify: recurring billing from $24.99/mo + transaction fees, AOV Maximizers, and how it compares to Recharge and Skio.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 12. LiveChat ── affiliate (direct) ────────────────────────────────────
  {
    slug: "livechat",
    name: "LiveChat",
    tagline: "Customer service software with live chat.",
    description:
      "Real-time live-chat and customer service platform (by Text S.A.) for websites, with omnichannel messaging, an AI Copilot and reporting, priced per agent. Integrates with Shopify, BigCommerce and WooCommerce.",
    logo_url: null,
    website_url: "https://www.livechat.com",
    affiliate_url: `https://partners.livechat.com/affiliate-program/${UTM}`,
    affiliate_partner: "direct",
    category: "chat",
    subcategories: ["live-chat", "customer-service", "omnichannel", "ecommerce"],
    pricing_model: "tiered",
    pricing_min: 19,
    pricing_max: 79,
    pricing_notes: notes(
      "Per agent: Starter $19, Team $49, Business $59–$79, Enterprise custom (~$149). Annual vs monthly rates vary by source.",
      "Per-agent cost scales fast; visitor limits by plan (100/400/1000); marketplace channels (WhatsApp/SMS/Instagram) extra; Enterprise reporting locked higher; ChatBot is a separate paid product (~$52/mo).",
      "No — 14-day trial; 15% off annual.",
      "2026-03",
    ),
    features: [
      { name: "Real-time live chat", plan_availability: "All plans" },
      { name: "Copilot AI", is_ai: true, plan_availability: "All plans" },
      { name: "Canned / saved responses", plan_availability: "All plans" },
      { name: "Agent groups", plan_availability: "Team and above" },
      { name: "Advanced reporting", plan_availability: "Business and above" },
      { name: "Skill-based routing", plan_availability: "Business and above" },
      { name: "Omnichannel (WhatsApp/SMS/Apple/Instagram)", plan_availability: "Add-on" },
    ],
    integrations: ["Shopify", "WhatsApp", "Messenger", "Instagram", "Apple Messages", "SMS", "Slack", "Salesforce"],
    integrates_with_tools: ["mailchimp"],
    rating: avg(9, 7, 8, 8),
    rating_breakdown: bd(9, 7, 8, 8),
    pros: ["Easy to use", "Reliable", "Fast setup with minimal training"],
    cons: ["No free plan", "Per-agent cost adds up", "Enterprise pricing ($149) seen as steep"],
    best_for: "SMBs to mid-market e-commerce/support teams wanting reliable real-time chat.",
    not_for: "Very small/free-only budgets (no free plan); teams wanting full helpdesk ticketing.",
    operator_quotes: [
      { quote: "Easy to integrate and very easy to set up.", source: "G2", date: "2026" },
      { quote: "Enterprise pricing... just too pricey [$149/mo].", source: "TrustRadius", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.5, reviews: 785 } },
    affiliate_commission: "20% recurring (22% after 5 referrals) + 5% second-tier",
    affiliate_cookie_window: "120 days",
    affiliate_program_url: "https://partners.livechat.com/affiliate-program/",
    pricing_source_url: "https://www.livechat.com/pricing/",
    shopify_native_notes:
      "Works via API (Shopify/BigCommerce/WooCommerce). Pure live-chat alternative to Tidio/Gorgias chat — reliable and simple, but no free plan and helpdesk ticketing is a separate product.",
    meta_title: "LiveChat review 2026 · real-time chat for Shopify",
    meta_description:
      "Honest analyst review of LiveChat for Shopify: per-agent pricing from $19, AI Copilot on all plans, no free tier, and how it compares to Tidio and Gorgias chat.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 13. parcelLab ── CARVE-OUT (enterprise, no CTA) ───────────────────────
  {
    slug: "parcellab",
    name: "parcelLab",
    tagline: "Post-purchase experience platform.",
    description:
      "Enterprise post-purchase software unifying order tracking, proactive delivery communication, returns and AI personalization across 550+ carriers and 175 countries. Shopify app plus Adobe/SAP/Salesforce.",
    logo_url: null,
    website_url: "https://parcellab.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "shipping",
    subcategories: ["post-purchase", "order-tracking", "returns", "notifications"],
    pricing_model: "custom",
    pricing_min: null,
    pricing_max: null,
    pricing_notes: notes(
      "No published pricing (custom, volume-based). Modular: Convert (predictive delivery/protection), Engage (tracking/comms), Retain (returns); negotiated by shipping volume, carriers and modules.",
      "No published pricing (case-by-case by shipping volume, carriers, modules); reporting historically limited to ~3 months back; enterprise contracts.",
      "No — enterprise sales only.",
      "2026",
    ),
    features: [
      { name: "Branded embedded tracking pages", plan_availability: "Engage" },
      { name: "Proactive delivery notifications (email/SMS/push)", plan_availability: "Engage" },
      { name: "Self-service returns portal", plan_availability: "Retain" },
      { name: "Predictive delivery dates", is_ai: true, plan_availability: "Convert" },
      { name: "Split-shipment management" },
      { name: "parcelLab Copilot", is_ai: true },
      { name: "Analytics / benchmarking", is_ai: true },
    ],
    integrations: ["Shopify", "Adobe Commerce", "Shopware", "SAP Commerce Cloud", "Salesforce Commerce/Service Cloud", "Klaviyo", "Gorgias"],
    integrates_with_tools: ["klaviyo", "gorgias"],
    rating: avg(8, 7, 9, 8),
    rating_breakdown: bd(8, 7, 9, 8),
    pros: ["Strong carrier coverage", "Deep customization", "Excellent onboarding/support"],
    cons: ["No published pricing", "Sophisticated setup", "Limited reporting history"],
    best_for:
      "Mid-market to enterprise retailers wanting branded end-to-end post-purchase / tracking / returns.",
    not_for: "Small stores wanting cheap plug-and-play tracking, or those needing published self-serve pricing.",
    operator_quotes: [
      { quote: "For every question I had, parcelLab had a solution.", source: "Software Advice", date: "2026" },
      { quote: "29% higher revenue per email with branded post-purchase messaging (vendor claim).", source: "parcelLab.com", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.6, reviews: 258 } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://parcellab.com",
    shopify_native_notes:
      "Works via API (Shopify app). Enterprise post-purchase alternative to AfterShip — branded tracking + returns + AI personalization, but custom-priced and built for high volume.",
    meta_title: "parcelLab review 2026 · enterprise post-purchase tracking",
    meta_description:
      "Honest analyst review of parcelLab for Shopify: enterprise post-purchase tracking, notifications and returns across 550+ carriers, custom pricing, and vs AfterShip.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 14. Route ── CARVE-OUT (no CTA) ───────────────────────────────────────
  {
    slug: "route",
    name: "Route",
    tagline: "Package protection and post-purchase tracking.",
    description:
      "Post-purchase platform offering licensed shipping/package protection, branded tracking, AI-powered instant claims resolution and product recommendations. Free to install (consumer pays protection).",
    logo_url: null,
    website_url: "https://route.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "shipping",
    subcategories: ["package-protection", "order-tracking", "post-purchase", "returns"],
    pricing_model: "freemium",
    pricing_min: 0,
    pricing_max: 349,
    pricing_notes: notes(
      "Standard $0/mo (consumer pays ~2–2.5% of cart, ~$0.98 min); Pro $349/mo.",
      "Consumer pays protection (~2–2.5% of cart); minimum order-volume requirements exclude small stores; reported widget/checkout install issues; a cashback promo was added without approval (complaint); service terminated for high-claim merchants.",
      "Yes — free to install; Standard has no monthly merchant fee.",
      "2026",
    ),
    features: [
      { name: "Package protection (lost/stolen/damaged, up to $5,000)", is_ai: true },
      { name: "Instant AI claim resolution", is_ai: true },
      { name: "AI fraud detection", is_ai: true },
      { name: "Branded package tracking" },
      { name: "Post-purchase product recommendations", plan_availability: "Pro" },
      { name: "Returns coverage add-on" },
      { name: "Carbon-neutral shipping" },
    ],
    integrations: ["Shopify", "Meta (remarketing)"],
    integrates_with_tools: ["loop-returns"],
    rating: avg(7, 6, 6, 7),
    rating_breakdown: bd(7, 6, 6, 7),
    pros: ["Reduces replacement costs & CS tickets", "Easy install", "Good onboarding"],
    cons: ["Denied/unhelpful claims (consumer)", "Checkout/widget install issues", "Service termination for high-claim merchants"],
    best_for: "Shopify DTC brands shipping 1,000+ orders/mo with meaningful shipping-issue support costs.",
    not_for: "Small/low-volume stores (minimum requirements); brands wanting to keep protection revenue (self-funded alts better).",
    operator_quotes: [
      { quote: "Reduced costs on replacement inventory and the amount of customer support required.", source: "Shopify App Store", date: "2026" },
      { quote: "They charge customers... yet when it comes time to file a claim, they become unhelpful.", source: "Shopify App Store", date: "2026" },
    ],
    external_ratings: { shopify_store: { score: 3.7, reviews: 335, note: "Consumer claim complaints; clean Trustpilot score not pinned" } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://route.com/pricing",
    shopify_native_notes:
      "Native Shopify app (free to install). Package-protection alternative to Navidium/self-funded protection — consumer-paid model, with claims-handling complaints to weigh.",
    meta_title: "Route review 2026 · package protection for Shopify",
    meta_description:
      "Honest analyst review of Route for Shopify: consumer-paid package protection, branded tracking, AI claims, $349/mo Pro tier, and how it compares to self-funded protection.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 15. ShipStation ── affiliate (CJ) ─────────────────────────────────────
  {
    slug: "shipstation",
    name: "ShipStation",
    tagline: "Shipping and order fulfillment software.",
    description:
      "Multi-carrier shipping/fulfillment platform (by Auctane) that pulls orders from sales channels, compares discounted carrier rates, prints labels in bulk and automates fulfillment. Native Shopify sync.",
    logo_url: null,
    website_url: "https://www.shipstation.com",
    affiliate_url: `https://www.shipstation.com/affiliate-program/${UTM}`,
    affiliate_partner: "impact",
    category: "shipping",
    subcategories: ["shipping", "fulfillment", "label-printing", "multi-carrier"],
    pricing_model: "freemium",
    pricing_min: 14.99,
    pricing_max: 349.99,
    pricing_notes: notes(
      "Shipment-volume based: Free $0, Starter $14.99/mo, Standard $29.99/mo, Premium $349.99/mo (at 50 shipments); scales by volume, >20K custom.",
      "Volume-based auto-upgrades between brackets; API access moved to higher (Standard/Scale) tiers (cut off lower plans); 'Your Carriers' add-on fee + per-shipment fees for own carrier accounts; postage/insurance separate; legacy carrier-connection fees pre-July 2025.",
      "Yes — Free plan + 30-day trial (no card); 90-day guarantee.",
      "2026-02",
    ),
    features: [
      { name: "Multi-channel order import", plan_availability: "All plans" },
      { name: "Discounted carrier rates (80–90% off)", plan_availability: "All plans" },
      { name: "Bulk label printing", plan_availability: "All plans" },
      { name: "Automation rules", plan_availability: "Standard and above (unlimited)" },
      { name: "Shipping API", plan_availability: "Standard and above" },
      { name: "Branded tracking", plan_availability: "All plans" },
      { name: "Inventory / warehouse", plan_availability: "Premium" },
      { name: "AI carrier selection", is_ai: true },
    ],
    integrations: ["Shopify", "Amazon", "eBay", "WooCommerce", "USPS", "UPS", "FedEx", "DHL", "40+ carriers"],
    integrates_with_tools: [],
    rating: avg(8, 8, 6, 8),
    rating_breakdown: bd(8, 8, 6, 8),
    pros: ["Discounted carrier rates that pay for the subscription", "Multi-channel support", "Time-saving automation"],
    cons: ["API moved to higher tier (forced upgrades)", "Poor communication of policy changes", "Support quality complaints"],
    best_for:
      "E-commerce sellers shipping from a handful to thousands of orders/mo across multiple channels.",
    not_for: "Sellers needing API on the cheapest tier (moved to higher plan); single-channel micro-sellers.",
    operator_quotes: [
      { quote: "Worth every penny... saves enough in postage and time that it pays for itself.", source: "TrustRadius", date: "2026" },
      { quote: "Told I needed to upgrade to a higher-tier plan despite being under thresholds... API connections stopped.", source: "G2", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.6, reviews: null } },
    affiliate_commission: "$35 per converted customer via CJ Affiliate (directories cite $50–$150)",
    affiliate_cookie_window: "30 days (some cite 45)",
    affiliate_program_url: "https://www.shipstation.com/affiliate-program/",
    pricing_source_url: "https://www.shipstation.com/pricing/",
    shopify_native_notes:
      "Native Shopify integration (syncs tracking/fulfillment). Multi-carrier shipping/label alternative — discounted rates offset the subscription, but API access is gated to higher tiers.",
    meta_title: "ShipStation review 2026 · multi-carrier shipping for Shopify",
    meta_description:
      "Honest analyst review of ShipStation for Shopify: discounted multi-carrier rates, free plan, pricing from $14.99/mo, API gated to higher tiers, and forced-upgrade complaints.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 16. Google Analytics ── CARVE-OUT (no affiliate program) ──────────────
  {
    slug: "google-analytics",
    name: "Google Analytics (GA4)",
    tagline: "Web and app analytics platform.",
    description:
      "Google's free web/app analytics platform (GA4) measuring traffic, events, conversions and audiences, with a paid enterprise tier (Analytics 360). Connects to Shopify via GA4 tag / Google Tag Manager.",
    logo_url: null,
    website_url: "https://marketingplatform.google.com/about/analytics/",
    affiliate_url: null,
    affiliate_partner: null,
    category: "analytics",
    subcategories: ["web-analytics", "conversion-tracking", "audiences", "reporting"],
    pricing_model: "freemium",
    pricing_min: 0,
    pricing_max: null,
    pricing_notes: notes(
      "GA4 free; Analytics 360 custom (~$50K+/yr historically, enterprise).",
      "Free tier has data sampling/limits and no SLA/phone support; 360 enterprise pricing is custom and expensive; attribution is platform-limited.",
      "Yes — GA4 is free.",
      "2026",
    ),
    features: [
      { name: "Event-based tracking (GA4)", plan_availability: "Free" },
      { name: "Conversion / funnel reporting", plan_availability: "Free" },
      { name: "Audiences / segments", plan_availability: "Free" },
      { name: "Predictive metrics (purchase/churn probability)", is_ai: true, plan_availability: "Free / 360" },
      { name: "Automated insights", is_ai: true },
      { name: "BigQuery export", plan_availability: "Free in GA4" },
      { name: "Cross-device / platform tracking" },
    ],
    integrations: ["Google Ads", "Google Tag Manager", "BigQuery", "Looker Studio", "Shopify", "Search Console"],
    integrates_with_tools: [],
    rating: avg(6, 10, 5, 8),
    rating_breakdown: bd(6, 10, 5, 8),
    pros: ["Free", "Deep Google ecosystem integration", "BigQuery export"],
    cons: ["Steep GA4 learning curve", "Limited support on free tier", "Attribution limitations"],
    best_for:
      "Virtually all online businesses needing free traffic/conversion analytics; enterprises needing 360 SLAs.",
    not_for: "Teams needing dedicated attribution/MTA, or those wanting human support on the free tier.",
    operator_quotes: [],
    external_ratings: null,
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://marketingplatform.google.com/about/analytics/",
    shopify_native_notes:
      "Works via API (GA4 tag / GTM; Shopify GA4 integration). Free baseline analytics — the default companion to attribution tools (Triple Whale/Polar) rather than a replacement for them.",
    meta_title: "Google Analytics (GA4) review 2026 · for Shopify stores",
    meta_description:
      "Honest analyst review of Google Analytics (GA4) for Shopify: free event-based analytics, BigQuery export, attribution limits, and why stores still pair it with Triple Whale.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 17. Help Scout ── affiliate (PartnerStack) ────────────────────────────
  {
    slug: "help-scout",
    name: "Help Scout",
    tagline: "Customer support platform built around a shared inbox.",
    description:
      "Email-first customer support platform with a shared inbox, knowledge base (Docs), live chat (Beacon) and AI features, priced per user. Integrates with Shopify via API/partners.",
    logo_url: null,
    website_url: "https://www.helpscout.com",
    affiliate_url: `https://www.helpscout.com/partner/${UTM}`,
    affiliate_partner: "partnerstack",
    category: "support",
    subcategories: ["helpdesk", "shared-inbox", "knowledge-base", "live-chat"],
    pricing_model: "freemium",
    pricing_min: 20,
    pricing_max: 75,
    pricing_notes: notes(
      "Per user/mo: Free $0 (5 users, 100 contacts/mo), Standard $20–25, Plus $40–45, Pro $65–75. Enterprise custom.",
      "AI Answers $0.75/resolution (variable at scale); extra inboxes $10/mo, extra Docs sites $20/mo; reporting/Salesforce/Jira/HubSpot integrations Plus-only; the 26th agent forces a Standard→Plus jump; Pro requires a 10-user minimum.",
      "Yes — Free: 5 users, 1 inbox, 1 Docs, 100 contacts/mo; 15-day trial.",
      "2026-04",
    ),
    features: [
      { name: "Shared inbox", plan_availability: "All plans" },
      { name: "Docs knowledge base", plan_availability: "All plans" },
      { name: "Beacon widget / live chat", plan_availability: "Plus for full" },
      { name: "Workflows / automation", plan_availability: "Standard and above" },
      { name: "AI Answers (autonomous resolution)", is_ai: true, plan_availability: "Usage ($0.75/resolution)" },
      { name: "AI Drafts (reply generation)", is_ai: true, plan_availability: "Plus and above" },
      { name: "Advanced reporting", plan_availability: "Plus and above" },
    ],
    integrations: ["Salesforce", "Jira", "HubSpot", "Slack", "Shopify", "Aircall"],
    integrates_with_tools: [],
    rating: avg(9, 8, 8, 7),
    rating_breakdown: bd(9, 8, 8, 7),
    pros: ["Clean / simple interface", "Strong knowledge base", "Lower mid-tier pricing than Intercom"],
    cons: ["Hidden add-on costs (AI/inboxes/Docs)", "Key integrations Plus-only", "No native phone"],
    best_for: "Small-to-mid teams (3–30) primarily doing email support that want a clean, simple helpdesk.",
    not_for: "Teams needing native phone/voice, very large teams (per-user costs scale), or those needing AI in the base tier.",
    operator_quotes: [
      { quote: "Pricing is fair compared to Zendesk and Gorgias, and the interface is clean.", source: "Chatarmin", date: "2026" },
      { quote: "Jump from $25 to $45 per user is significant — $2,400/yr for a 10-person team.", source: "BunnyDesk", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.4, reviews: 424 } },
    affiliate_commission: "~30% first year (or flat $200 — sources conflict); referral $300 first / $250 subsequent",
    affiliate_cookie_window: "Not stated",
    affiliate_program_url: "https://www.helpscout.com/partner/",
    pricing_source_url: "https://www.helpscout.com/pricing/",
    shopify_native_notes:
      "Works via API. Simple email-first helpdesk alternative to Gorgias/Zendesk — clean and affordable for small teams, but AI and key integrations carry add-on costs.",
    meta_title: "Help Scout review 2026 · simple helpdesk for Shopify",
    meta_description:
      "Honest analyst review of Help Scout for Shopify support: shared inbox + knowledge base, free plan, per-user pricing from $20, AI Answers at $0.75/resolution, vs Gorgias.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 18. Rockerbox ── CARVE-OUT (enterprise, no CTA) ───────────────────────
  {
    slug: "rockerbox",
    name: "Rockerbox",
    tagline: "Unified marketing measurement and attribution.",
    description:
      "Marketing measurement platform combining multi-touch attribution (MTA), marketing mix modeling (MMM) and incrementality testing on a SOC2-certified data foundation. Shopify integration + 100+ integrations.",
    logo_url: null,
    website_url: "https://www.rockerbox.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "attribution",
    subcategories: ["attribution", "mmm", "incrementality", "analytics"],
    pricing_model: "freemium",
    pricing_min: 0,
    pricing_max: null,
    pricing_notes: notes(
      "Free version available; Enterprise ~$1,000–2,000+/mo (spend/volume based), custom.",
      "Priced by monthly marketing spend under management + channels + data volume; not publicly tiered; multi-year deals negotiated 15–30% off.",
      "Yes — free version available.",
      "2026",
    ),
    features: [
      { name: "Multi-touch attribution (MTA)" },
      { name: "Marketing mix modeling (MMM)" },
      { name: "Incrementality testing" },
      { name: "Marketing data foundation (SOC2)" },
      { name: "Offline / TV / CTV attribution" },
      { name: "Custom attribution modeling" },
      { name: "Warehouse / Sheets export" },
    ],
    integrations: ["Meta", "Google", "TikTok", "Snap", "Pinterest", "Bing", "LinkedIn", "Shopify", "Stripe", "BigQuery"],
    integrates_with_tools: [],
    rating: avg(7, 7, 9, 8),
    rating_breakdown: bd(7, 7, 9, 8),
    pros: ["Excellent customer service", "Top conversion-path visibility", "Online + offline attribution"],
    cons: ["'Bucket' terminology confusing", "Enterprise pricing", "Requires analytics resources"],
    best_for:
      "Enterprise/scaling brands ($1M+ annual ad spend) with diversified online + offline media mixes.",
    not_for: "Small brands/low spend; Shopify-only DTC wanting cheap plug-and-play (Triple Whale is a better fit).",
    operator_quotes: [
      { quote: "Customer service at Rockerbox is top notch... built a feature within 2 days of me asking.", source: "Capterra", date: "2026" },
      { quote: "The 'bucket' terminology they use could be confusing to some.", source: "Capterra", date: "2026" },
    ],
    external_ratings: { g2: { score: 4.7, reviews: 19 } },
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: "https://www.rockerbox.com/plans",
    shopify_native_notes:
      "Works via API (Shopify + 100+ integrations). Enterprise MTA + MMM + incrementality alternative to Triple Whale/Northbeam — built for $1M+ ad-spend brands with offline media.",
    meta_title: "Rockerbox review 2026 · MTA + MMM attribution",
    meta_description:
      "Honest analyst review of Rockerbox: MTA + marketing mix modeling + incrementality for $1M+ ad-spend brands, custom enterprise pricing, and how it compares to Triple Whale.",
    featured: 0,
    status: "draft",
    alternatives_to: [],
  },

  // ── 19. Returnly ── CARVE-OUT + DISCONTINUED → status='archived' ──────────
  {
    slug: "returnly",
    name: "Returnly (by Affirm)",
    tagline: "Returns and exchanges platform (discontinued).",
    description:
      "Returns-management platform acquired by Affirm (acquisition completed May 3, 2021, ~$300M cash+equity) offering self-service online returns, exchanges and instant store credit. SUNSET: in July 2023 Affirm announced it was divesting Returnly and partnering with Loop Returns; the platform was sunset by early October 2023, with 1,500+ merchants migrated to Loop Returns. No longer an active product.",
    logo_url: null,
    website_url: "https://www.returnly.com",
    affiliate_url: null,
    affiliate_partner: null,
    category: "returns",
    subcategories: ["returns", "exchanges", "post-purchase", "store-credit"],
    pricing_model: null,
    pricing_min: null,
    pricing_max: null,
    pricing_notes:
      "DISCONTINUED. Affirm acquired Returnly (completed May 3, 2021, ~$300M cash+equity); divestiture/sunset announced July 2023, platform shut down by early October 2023. Loop Returns is the designated successor (Affirm took an all-equity stake in Loop). Do not evaluate as a purchasable tool — see Loop Returns.",
    features: [
      { name: "Self-service returns (historical)" },
      { name: "Exchanges (historical)" },
      { name: "Instant store credit (historical)" },
      { name: "Green returns (historical)" },
    ],
    integrations: ["Shopify", "Affirm"],
    integrates_with_tools: ["loop-returns"],
    rating: null,
    rating_breakdown: null,
    pros: ["Historical: easy self-service returns", "Historical: instant store credit"],
    cons: ["Discontinued — merchants forced to migrate before holiday season"],
    best_for: "No longer available — evaluate Loop Returns instead.",
    not_for: "All — the product is discontinued.",
    operator_quotes: [
      { quote: "Affirm is shutting down Returnly by October... your roadmap just changed.", source: "RMW Commerce (Rick Watson)", date: "2023" },
    ],
    external_ratings: null,
    affiliate_commission: null,
    affiliate_cookie_window: null,
    affiliate_program_url: null,
    pricing_source_url: null,
    shopify_native_notes:
      "Historically a native Shopify returns app. Discontinued in 2023 — Loop Returns is the successor for Shopify returns/exchanges.",
    meta_title: "Returnly (discontinued) · migrated to Loop Returns",
    meta_description:
      "Returnly was sunset by Affirm in 2023 and merchants migrated to Loop Returns. Archived reference only — see Loop Returns for Shopify returns and exchanges.",
    featured: 0,
    status: "archived",
    alternatives_to: [],
  },
]

async function main() {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`)
  console.log(`tools to seed: ${tools.length}`)

  // Guard: none of these slugs may collide with an existing row (we only ADD).
  const slugs = tools.map((t) => t.slug)
  const { data: existing, error: exErr } = await sb.from("tools").select("slug").in("slug", slugs)
  if (exErr) throw new Error(`collision check failed: ${exErr.message}`)
  if (existing && existing.length > 0) {
    console.log(`  NOTE: ${existing.length} slug(s) already present (will upsert/overwrite): ${existing.map((e) => e.slug).join(", ")}`)
  } else {
    console.log("  collision check: clean (all 19 are new slugs)")
  }

  // Plan table
  console.log("\n  PLAN (slug · category · status · affiliate):")
  for (const t of tools) {
    const aff = t.affiliate_url ? `AFF(${t.affiliate_partner})` : "carve-out"
    console.log(`    ${t.slug.padEnd(20)} ${String(t.category).padEnd(14)} ${t.status.padEnd(9)} ${aff}`)
  }

  if (!APPLY) {
    console.log("\n(dry-run — no writes. Re-run with --apply.)")
    await new Promise((r) => setTimeout(r, 100))
    return
  }

  // Upsert (onConflict slug → idempotent; updated_at refreshed by trigger/now)
  const { error } = await sb.from("tools").upsert(tools as never, { onConflict: "slug" })
  if (error) throw new Error(`upsert failed: ${error.message}`)
  console.log(`\n  upsert ok (${tools.length} rows)`)

  // Verify landing
  const { data: landed, error: vErr } = await sb
    .from("tools")
    .select("slug,name,category,status,affiliate_url,affiliate_partner,rating")
    .in("slug", slugs)
    .order("slug")
  if (vErr) throw new Error(`verify read failed: ${vErr.message}`)
  console.log("\n  LANDED:")
  for (const r of landed ?? []) {
    const aff = r.affiliate_url ? `Y(${r.affiliate_partner})` : "N (carve-out)"
    console.log(`    ${r.slug.padEnd(20)} ${String(r.category).padEnd(14)} ${r.status.padEnd(9)} aff=${aff.padEnd(18)} rating=${r.rating ?? "—"}`)
  }
  const { count } = await sb.from("tools").select("*", { count: "exact", head: true })
  console.log(`\n  total tools rows now: ${count}`)
  await new Promise((r) => setTimeout(r, 120))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
