"use client"

import * as React from "react"

import { track, type AnalyticsEventMap, type AnalyticsEventName } from "@/lib/analytics/events"

/* ----------------------------------------------------------------------------
   <PageViewEvent>
   ----------------------------------------------------------------------------
   Drops a typed PostHog event once when the component mounts. Designed to
   sit inside a Server Component's tree — the parent passes in the event
   name and its properties, and we fire from useEffect.

   Why a component (and not a hook):
     The parent pages are async Server Components. They can't host
     useEffect / useRef themselves, so we surface tracking as a renderable
     primitive. Mounting it inside the JSX tree gives us "on view" semantics
     without lifting state.

   Why we don't auto-dedupe:
     If the user navigates client-side back to the same page, we WANT the
     event again — it represents a separate page-view-with-intent. The
     React component mounts fresh on each route, so dedup'ing here would
     hide real engagement.
---------------------------------------------------------------------------- */

interface PageViewEventProps<E extends AnalyticsEventName> {
  event:      E
  properties: AnalyticsEventMap[E]
}

export function PageViewEvent<E extends AnalyticsEventName>({
  event,
  properties,
}: PageViewEventProps<E>) {
  // useRef to capture the *initial* props — if a re-render passes different
  // properties (it shouldn't for our use, but defensive code is cheap), we
  // still fire the event we promised at mount time.
  const fired = React.useRef(false)

  React.useEffect(() => {
    if (fired.current) return
    fired.current = true
    track(event, properties)
    // We deliberately omit `event` / `properties` from the dep array — see
    // the dedupe note above; if they change, we don't refire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
