"use client"

import * as React from "react"
import Link from "next/link"

import { track } from "@/lib/analytics/events"

/* ----------------------------------------------------------------------------
   <TrackedAffiliateLink>
   ----------------------------------------------------------------------------
   Client wrapper that fires `affiliate_clicked` to PostHog immediately
   before letting the browser navigate to /go/[slug]. AffiliateButton stays a
   Server Component (it needs the Supabase DB lookup at request time) and
   delegates the actual anchor to this tiny island.

   Why a click handler and not a Link interceptor:
     We DON'T preventDefault — the browser still navigates normally, so /go's
     server-side click logging + UTM overlay still runs. The PostHog capture
     is purely additive; PostHog's transport uses `sendBeacon` under the
     hood, which is designed for exactly this "page is about to unload"
     situation.
---------------------------------------------------------------------------- */

interface TrackedAffiliateLinkProps {
  href:        string
  toolSlug:    string
  /** Article / widget where the click originated — same shape we put in
   *  the UTM campaign on the outbound link. */
  source:      string
  /** UTM campaign passed to /go (defaults to source). */
  campaign?:   string
  locale:      "en" | "ru"
  children:    React.ReactNode
  className?:  string
  style?:      React.CSSProperties
}

export function TrackedAffiliateLink({
  href,
  toolSlug,
  source,
  campaign,
  locale,
  children,
  className,
  style,
}: TrackedAffiliateLinkProps) {
  function handleClick() {
    // No preventDefault — the navigation continues. PostHog's batched
    // transport handles in-flight events across page unload via
    // `navigator.sendBeacon` when available.
    track("affiliate_clicked", {
      tool_slug: toolSlug,
      source,
      campaign:  campaign ?? source,
      locale,
    })
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      rel="sponsored nofollow noopener"
      target="_blank"
      className={className}
      style={style}
    >
      {children}
    </Link>
  )
}
