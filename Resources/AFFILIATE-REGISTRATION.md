# Affiliate registration worklist (П.13)

**Why this exists:** the original `supabase/seed.sql` + the (removed)
`scripts/seed-extra-tools.ts` constructed 19 **fabricated** `affiliate_url`
values (template `{vendor}/partners?utm_source=botapolis`, no real partner ID)
— they earned $0 and `/go/` sent buyers to vendors' "become a partner" pages.
All 19 were nulled 2026-06-17, so `/go/[slug]` now fail-closes to `/tools/{slug}`
and CTAs are hidden. **There is currently ZERO real affiliate monetization.**

**How to use this file:**
1. Go top → bottom (🟢 first — best lifetime value).
2. Register at the link in **Where to register**.
3. Paste the real referral/affiliate link you receive into **Ref link**.
4. When done (even partially), hand the file back → Claude Code does a
   read-only check then `UPDATE tools.affiliate_url` for the filled rows →
   `/go/[slug]` + the Try CTA + PartnerAlternatives revive, honestly.

Registration links are from the R6 `tools.affiliate_program_url` column
(verified during research) + web lookups. Universe = 37 published tools with a
real registrable program (48 published − 10 carve-outs − Shopify Sidekick).

---

## 🟢 STRONG — recurring revenue share (register first)

| Tool | Where to register | Ref link |
|------|-------------------|----------|
| ManyChat | https://affiliate.manychat.com/ | |
| AdCreative.ai | https://www.adcreative.ai/affiliate | |
| Chatfuel | https://chatfuel.com/affiliate-program | |
| Tidio | https://www.tidio.com/partners/affiliate/ | |
| Hyros | https://hyros.com/affiliate | |
| AfterShip | https://www.aftership.com/partners/affiliates | |
| Yotpo | https://www.yotpo.com/affiliate-program/ | |
| ActiveCampaign | https://www.activecampaign.com/partners/affiliate | |
| Gorgias | https://www.gorgias.com/affiliate-program | |
| Omnisend | https://www.omnisend.com/affiliates/ | |
| Loox | https://loox.app/partners | |
| LiveChat | https://partners.livechat.com/affiliate-program/ | |
| LoyaltyLion | https://loyaltylion.com/partnerships/agency-partner-program | |
| Flair AI | https://flair-ai-1.getrewardful.com/signup | |
| Help Scout | https://www.helpscout.com/partner/ | |
| Rebuy | https://www.rebuyengine.com/partners | |
| Triple Whale | https://www.triplewhale.com/affiliates | |
| Recharge | https://getrecharge.com/agency-partner-program/ | |
| Postscript | https://postscript.io/postscript-partner-program | |
| Loop Subscriptions | https://www.loopwork.co/partnerships-program-1 | |

## 🟡 REAL — commission undisclosed (you learn it on signup)

| Tool | Where to register | Ref link |
|------|-------------------|----------|
| Klaviyo | https://www.klaviyo.com/partners/become-a-partner | |
| Attentive | https://www.attentive.com/partners | |
| Northbeam | https://www.northbeam.io/partner-program | |
| Signifyd | https://www.signifyd.com/partner/ | |
| Polar Analytics | https://www.polaranalytics.com/l/partner-program | |
| Stay AI | https://stay.ai/become-a-partner/ | |
| Skio | https://skio.com/partners | |
| Pencil | https://trypencil.tapfiliate.com/ | |
| Inventory Planner | https://www.inventory-planner.com/partnership/ | |
| Smile.io | https://smile.io/partners | |
| LimeSpot | no public URL — apply via the Partners form on limespot.com | |

## ⚪ WEAK / one-time — low priority

| Tool | Where to register | Ref link |
|------|-------------------|----------|
| Brevo | https://www.brevo.com/partners/affiliates/ | |
| Constant Contact | https://www.constantcontact.com/partners/affiliate | |
| ShipStation | https://www.shipstation.com/affiliate-program/ | |
| Mailchimp | https://mailchimp.com/referral-program/ | |
| Loop Returns | https://www.loopreturns.com/referral-program/ | |
| Bazaarvoice | https://www.bazaarvoice.com/company/partner-program/ | |

---

## Not included (deliberately)

- **Shopify Sidekick** — indirect: it's a free Shopify feature; the only path
  is the generic Shopify Affiliate Program (`shopify.com/affiliates`), which
  pays for Shopify signups, not Sidekick. Register only if you want to push
  Shopify itself.
- **10 carve-outs** (`affiliate_partner = NULL`): bold-subscriptions,
  google-analytics, intercom, judge-me, parcellab, riskified, rockerbox, route,
  stamped, zendesk. These are competitor-foils per the R6 strategy — their
  traffic is routed to OUR affiliate tools, not monetized directly. Stamped /
  Bold technically have programs but were kept as foils. Revisit only if you
  want to monetize foils directly.

## Also note
- `smile.io` was among the nulled-19 (it's in 🟡 above — register fresh).
- `tools.affiliate_program_url` (R6 column) is owner/CHIEF re-verification data
  only — NOT user-facing and NOT what `/go/` uses. `/go/` uses
  `tools.affiliate_url`, which is what gets filled from this worklist.
