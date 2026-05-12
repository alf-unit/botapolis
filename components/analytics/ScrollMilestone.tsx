"use client"

import * as React from "react"

import { track, type AnalyticsEventMap, type AnalyticsEventName } from "@/lib/analytics/events"

/* ----------------------------------------------------------------------------
   <ScrollMilestone>
   ----------------------------------------------------------------------------
   Fires a typed PostHog event when the user has scrolled past a specific
   point in the page — used today for `review_scrolled_50` on review and
   guide pages, where "halfway through" is a meaningful engagement signal.

   Implementation: drops a one-pixel sentinel <div> at the documented
   position, watches it with an IntersectionObserver, fires once when the
   sentinel enters the viewport. Cheaper than a scroll handler (no per-frame
   work, browser-optimised), and works naturally with sticky navbars.

   Place the component INSIDE the section it should mark — for "50% read",
   parent layout positions <ScrollMilestone /> roughly halfway through the
   article body. The component renders an invisible block.
---------------------------------------------------------------------------- */

interface ScrollMilestoneProps<E extends AnalyticsEventName> {
  event:      E
  properties: AnalyticsEventMap[E]
  /**
   * Optional `rootMargin` override. Default `0px` — sentinel must touch
   * the viewport. Use a negative bottom margin (e.g. `0px 0px -25%`) to
   * require deeper scroll before firing.
   */
  rootMargin?: string
}

export function ScrollMilestone<E extends AnalyticsEventName>({
  event,
  properties,
  rootMargin = "0px",
}: ScrollMilestoneProps<E>) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const fired = React.useRef(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("IntersectionObserver" in window)) return  // very old browsers
    if (!ref.current) return

    const el = ref.current
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.current) {
            fired.current = true
            track(event, properties)
            observer.disconnect()  // single-fire by design
            return
          }
        }
      },
      { rootMargin, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={ref} aria-hidden="true" className="h-px w-full" />
}
