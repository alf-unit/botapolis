"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   LiveNumber — animated numeric display
   ----------------------------------------------------------------------------
   Two modes share one component (avoids two near-identical files):

     · Interactive — `value` changes in response to slider input. The
       displayed number tweens from the previous value to the new one
       over `duration` ms. Used by /tools/* calculators where every
       slider drag updates the result.

     · One-shot reveal — `value` is static. When `startOnView` is true,
       the count-up runs once the wrapper enters the viewport (uses
       IntersectionObserver). Used by hero DemoWidget on homepage so
       the headline figure ($4,410) tweens in instead of just being
       there. Without `startOnView`, the count-up still happens on
       mount, just immediately.

   Respects `prefers-reduced-motion: reduce` — collapses to the
   final value with no animation. Reads the media query once per
   tween via matchMedia (cheap on hot path).

   Formatting: pass `formatter` for total control (e.g. "Up to $X"),
   or use prefix/suffix/decimals/locale for the common 90% case.

   Layout-stability: defaults to `font-mono tabular-nums` so the
   width doesn't jitter as digits change. Wrapping in a span with a
   fixed min-width is the caller's job if needed.

   Why this lives in components/ui/ (not /tools or /content):
   it's a generic primitive — same as Button, Card. Calculators and
   marketing surfaces both depend on it.
---------------------------------------------------------------------------- */

export interface LiveNumberProps {
  /** Target value. When this changes, the display tweens to it. */
  value: number
  /** Prepended after formatting, e.g. "$" or "+". */
  prefix?: string
  /** Appended after formatting, e.g. "%" or "/mo". */
  suffix?: string
  /** Tween duration in ms. Defaults to 400. Reduced-motion users get 0. */
  duration?: number
  /** Fixed digits after the decimal. Defaults to 0. */
  decimals?: number
  /** Intl.NumberFormat locale. Defaults to "en-US". */
  locale?: string
  /** Full custom formatter — escape hatch when prefix/suffix isn't enough. */
  formatter?: (n: number) => string
  /**
   * If true, the initial tween starts only when the element enters
   * the viewport (IntersectionObserver). Subsequent value changes
   * (re-renders from interactive props) tween immediately as usual.
   */
  startOnView?: boolean
  className?: string
  /** Render as <span> (default) or <div>. */
  as?: "span" | "div"
}

export function LiveNumber({
  value,
  prefix,
  suffix,
  duration = 400,
  decimals = 0,
  locale = "en-US",
  formatter,
  startOnView = false,
  className,
  as = "span",
}: LiveNumberProps) {
  // Start at 0 when `startOnView` is on (so there's room to tween FROM),
  // otherwise start at the target so SSR + first paint match.
  const [display, setDisplay] = React.useState<number>(
    startOnView ? 0 : value,
  )
  const fromRef = React.useRef<number>(startOnView ? 0 : value)
  const rafRef = React.useRef<number | null>(null)
  const wrapperRef = React.useRef<HTMLElement | null>(null)
  // Has the viewport-trigger fired at least once? After that the
  // component behaves like the standard interactive mode (every
  // value change tweens).
  const armedRef = React.useRef<boolean>(!startOnView)

  // Tween from current display to `to` over `duration` ms.
  const tweenTo = React.useCallback(
    (to: number) => {
      if (typeof window === "undefined") return
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      if (reduced || duration <= 0) {
        setDisplay(to)
        fromRef.current = to
        return
      }
      const from = fromRef.current
      const start = performance.now()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        // ease-out-expo — matches design-system motion-spec
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setDisplay(from + (to - from) * eased)
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          rafRef.current = null
          fromRef.current = to
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [duration],
  )

  // Tween on every value change — but only after the first viewport
  // entry if `startOnView` was set. Until then, stay at 0.
  React.useEffect(() => {
    if (!armedRef.current) return
    tweenTo(value)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, tweenTo])

  // Viewport observer — fires once, then disconnects. After the
  // first entry the component re-uses the standard tween path.
  React.useEffect(() => {
    if (!startOnView) return
    const el = wrapperRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      // Old browsers / SSR — just play the tween now.
      armedRef.current = true
      tweenTo(value)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          armedRef.current = true
          tweenTo(value)
          io.disconnect()
        }
      },
      { threshold: 0.25 }, // a quarter visible counts as "seen"
    )
    io.observe(el)
    return () => io.disconnect()
  }, [startOnView, value, tweenTo])

  const formatted = formatter
    ? formatter(display)
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display)

  const Tag = as
  return (
    <Tag
      ref={wrapperRef as React.Ref<HTMLSpanElement & HTMLDivElement>}
      className={cn("tabular-nums", className)}
    >
      {prefix}
      {formatted}
      {suffix}
    </Tag>
  )
}
