"use client"

import * as React from "react"

/* ----------------------------------------------------------------------------
   ScrollRevealController
   ----------------------------------------------------------------------------
   Single IntersectionObserver that watches every `.scroll-reveal` element
   on the page and flips `.in-view` on the first time each intersects.
   Pairs with the CSS rule in globals.css §8.

   Mounted exactly once via app/layout.tsx so one observer covers the
   whole page — not one observer per section.

   v3 (May 2026) — the critical fix vs v2:
     Browsers skip a CSS transition when both the "from" and "to" states
     are observed in the same frame. v2 added `.in-view` synchronously
     inside the IO callback, which on first mount fired the same frame
     the invisible state was applied — net effect, no visible fade.

     v3 wraps the class flip in a double-rAF (`requestAnimationFrame`
     called twice). This guarantees the browser has painted at least
     one frame in the invisible state before the visible state is
     committed, so the transition has a real from→to to animate.

   Honors `prefers-reduced-motion`: skips the observer entirely and
   adds `.in-view` to every section immediately. The CSS rule's
   `@media (prefers-reduced-motion: no-preference)` gate at §8 ALSO
   skips the invisible state for these users, so the class flip is
   a no-op visually — it's still useful so JS-driven code can rely on
   `.in-view` as a stable "section has been seen" marker downstream.

   Falls back instantly on browsers without IntersectionObserver
   (rare from this decade, but defensive).
---------------------------------------------------------------------------- */

function reveal(el: Element) {
  // Double-rAF — give the browser one paint frame in the invisible state
  // before we toggle to the visible state, otherwise the transition
  // collapses and the fade is invisible. The first rAF callback runs
  // before layout, the second after layout has been committed; flipping
  // the class in the second rAF means a real from→to transition.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add("in-view")
    })
  })
}

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
            reveal(entry.target)
            io.unobserve(entry.target)
          }
        }
      },
      {
        // 10 % of the section visible is enough to consider it "arrived."
        // Lower than the v2 15 % so the fade starts earlier in the scroll
        // and the eye has more time to register the motion.
        threshold: 0.1,
      },
    )

    all.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
