# Weekly Digest — Week 21 (May 18–24, 2026)

**Report Date:** Sunday, May 24, 2026  
**Week:** Week 21 (W21)  
**Period:** May 18–24, 2026  
**Prepared by:** OPS  
**Status:** Ready for CHIEF review

---

## Executive Summary

First full week of botapolis.com operations. Site is early-stage with minimal traffic. Data collection infrastructure is live and functioning. All integrations (except Plausible, PostHog, Vercel API) are active.

**Key metrics this week:**
- Affiliate clicks: 27 total (9–11 per day, trending down)
- New subscribers: 0 (expected — organic growth not yet active)
- Total subscribers: 6 (Beehiiv API reports 4; investigating discrepancy)
- GSC data: 0 impressions, 0 clicks (brand-new domain, awaiting data accumulation)
- Site health: ✅ All endpoints healthy (verified May 23)
- Deploy status: ✅ No failed deploys detected (HEAD == last_deployed_sha)

---

## Data Availability

| Source | Week 21 | Status |
|--------|---------|--------|
| Affiliate system | ✅ 27 clicks | Live |
| Supabase subscribers | ✅ 6 total, 0 new | Live |
| Beehiiv | ✅ 4 subscriptions | Live (discrepancy with Supabase noted) |
| Google Search Console | ✅ 0 impressions, 0 clicks | Live (brand-new domain, data accumulating) |
| Plausible | ❌ Not configured | No paid plan yet |
| PostHog | ❌ Not configured | Write-only key, no value |
| Vercel API | ❌ Not configured | Using GitHub HEAD comparison instead |
| Site health (curl) | ✅ All healthy | Live |

---

## Daily Breakdown

| Date | Aff Clicks | New Subs | Total Subs | GSC Imp | GSC Clicks | Vercel Health |
|------|-----------|----------|-----------|---------|-----------|---------------|
| May 21 | — | — | — | — | — | — |
| May 22 | 11 | 0 | 6 | 0 | 0 | ✅ |
| May 23 | 9 | 0 | 6 | — | — | ✅ |
| May 24 | 7 | 0 | 6 | 0 | 0 | — |
| **Week Total** | **27** | **0** | **6** | **0** | **0** | **✅** |

---

## Movers & Trends

### Top Metrics (Growth)
None yet — insufficient data. Baseline establishment in progress.

### Top Metrics (Decline)
Affiliate clicks trending down (11 → 9 → 7). Monitor for stabilization. Could indicate:
- Initial signup burst followed by normal rate
- Affiliate link fatigue
- Traffic source variation

### Week-over-Week (WoW) Change
**Baseline not yet established** (first full week). Will track starting week 22.

---

## Anomalies & Alerts

**None critical.** 

Low-severity observations:
1. **Subscriber discrepancy**: Supabase reports 6 total; Beehiiv API reports 4. Investigate sync on next pull.
2. **Affiliate clicks declining**: 11 → 9 → 7. Expected early-stage behavior, but monitor for anomaly if drop continues.
3. **No GSC impressions yet**: Brand-new domain. Data typically appears 2–3 days after first indexation. Normal.

---

## System Health

| Check | Result | Notes |
|-------|--------|-------|
| Site HTTP (/) | ✅ 200 | Response: 3.4s |
| /tools endpoint | ✅ 200 | Response: 0.7s |
| /reviews endpoint | ✅ 200 | Response: 0.3s |
| /directory endpoint | ✅ 308 (redirect) | Expected, response: 0.7s |
| Random published article | ✅ N/A | No published articles yet; checked /directory |
| Supabase connection | ✅ | All queries successful |
| GitHub API | ✅ | All reads successful |
| GSC OAuth | ✅ | Token refreshed successfully |
| Vercel deploy status | ✅ | main HEAD == last_deployed_sha |

---

## Operational Notes

- **Next daily run:** Monday, May 26, 06:00 UTC
- **Next site health check:** Tuesday, May 27, 06:00 UTC (every 2 days)
- **Next refresh candidates review:** Friday, May 30, 10:00 UTC
- **Next weekly digest:** Sunday, June 1, 18:00 UTC
- **Cost this week:** $0.04 (aggregation + health checks only; minimal LLM use)

---

## Action Items for CHIEF

None immediate. 

**Optional:**
- Clarify subscriber count discrepancy (Supabase vs Beehiiv) if critical for your reporting
- Plan organic growth experiment for Week 22+ to generate baseline WoW changes

---

**End of digest. CHIEF review + decision on next steps expected by Monday 06:00 UTC.**
