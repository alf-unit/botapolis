"use client"

import * as React from "react"

/* ----------------------------------------------------------------------------
   ScrollRevealController
   ----------------------------------------------------------------------------
   One-shot IntersectionObserver that walks every `.scroll-reveal` element
   on the page and flips `.in-view` on the first time each enters the
   viewport. Pairs with the CSS rule in globals.css §8.

   Mounted exactly once (in app/layout.tsx) — a single observer covers
   the entire page, NOT one observer per element. After all sections
   have been revealed the observer is disconnected entirely so it stops
   contributing to per-frame work.

   Why a top-level controller instead of per-section client wrappers:
     · `app/page.tsx` is a server component; wrapping individual
       sections would force them to become client islands and break
       async data fetching at the section level.
     · One controller costs one effect, one observer, one query
       selector. Wrapping each of 4 sections would cost 4 hydration
       boundaries.

   Honors `prefers-reduced-motion`: when reduced motion is requested,
   skip observing entirely and flip every section to `.in-view`
   immediately so nothing fades. The CSS rule won't transition in
   that case (global reduced-motion override at §5 collapses
   transition-duration to 0), so this is belt-and-suspenders.

   Falls back gracefully on browsers without IntersectionObserver
   (any from this decade has it, but defensive): instantly mark every
   section as in-view.
---------------------------------------------------------------------------- */
export function ScrollRevealController() {
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const all = document.querySelectorAll<HTMLElement>(".scroll-reveal")
    if (all.length === 0) return

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (reduced || typeof IntersectionObserver === "undefined") {
      all.forEach((el) => el.classList.add("in-view"))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view")
            io.unobserve(entry.target)
          }
        }
      },
      {
        // 15 % of the section needs to be on screen before the fade
        // fires — far enough into the entry that the user has clearly
        // arrived, close enough to the edge that the fade still reads
        // as "appearing as I scroll" rather than "popping into view
        // late."
        threshold: 0.15,
      },
    )

    all.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
