"use client"

import * as React from "react"

/* ----------------------------------------------------------------------------
   ThemeDebugger — temporary diagnostic overlay (v2, extended)
   ----------------------------------------------------------------------------
   Mounts only when the URL contains `?debug-theme=1`. v1 showed four
   fields; v2 extends with everything that could plausibly explain why
   iOS Chrome reports `prefers-color-scheme: dark` on a Light-Mode iPhone:

     · all three prefers-color-scheme variants
     · `dark` MQ re-polled at +0 ms, +250 ms, +1000 ms (catches the case
       where iOS WebKit hydrates the MQ value lazily and we sampled
       before it settled)
     · the FORCED-COLORS / PREFERS-CONTRAST / REDUCED-MOTION media
       queries — some Accessibility modes secretly override the
       color-scheme MQ on WebKit
     · `document.documentElement.style.colorScheme` — what next-themes
       set, which feeds back into how the browser interprets system
       elements
     · cookie list (looking for stale `theme=` from a prior version)
     · screen / viewport dimensions
     · navigator.userAgent

   Goal: one screenshot pinpoints whether the anomaly is an
   Accessibility-mode override, a deferred-MQ-evaluation race, or a
   plain "Chrome iOS app theme overrides iOS Settings" situation.
---------------------------------------------------------------------------- */

interface DebugInfo {
  mq: string
  mqLater: string
  a11y: string
  storage: string
  cookies: string
  htmlClass: string
  htmlColorScheme: string
  viewport: string
  ua: string
}

function snapshot(): Omit<DebugInfo, "mqLater"> {
  const m = (q: string) => window.matchMedia(q).matches
  return {
    mq: `dark=${m("(prefers-color-scheme: dark)")} · light=${m("(prefers-color-scheme: light)")} · none=${m("(prefers-color-scheme: no-preference)")}`,
    a11y: `forced-colors=${m("(forced-colors: active)")} · contrast-more=${m("(prefers-contrast: more)")} · contrast-less=${m("(prefers-contrast: less)")} · reduced-motion=${m("(prefers-reduced-motion: reduce)")} · inverted=${m("(inverted-colors: inverted)")}`,
    storage: window.localStorage.getItem("theme") ?? "(empty)",
    cookies: document.cookie || "(none)",
    htmlClass: document.documentElement.className || "(none)",
    htmlColorScheme: document.documentElement.style.colorScheme || "(unset)",
    viewport: `${window.innerWidth}×${window.innerHeight} · dpr=${window.devicePixelRatio}`,
    ua: navigator.userAgent,
  }
}

export function ThemeDebugger() {
  const [enabled, setEnabled] = React.useState(false)
  const [info, setInfo] = React.useState<DebugInfo | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("debug-theme") !== "1") return
    setEnabled(true)

    // Initial snapshot
    const base = snapshot()
    const initialDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setInfo({ ...base, mqLater: `t0=dark:${initialDark} · pending…` })

    // Re-poll later — captures the case where iOS WebKit defers
    // MQ evaluation until after first paint / after the layout
    // pipeline drains. If t250 / t1000 differ from t0 we have a
    // race. If they're identical, the value is stable and we know
    // the browser is *consistently* reporting dark for this session.
    const t250 = window.setTimeout(() => {
      const d250 = window.matchMedia("(prefers-color-scheme: dark)").matches
      setInfo((prev) =>
        prev
          ? { ...prev, mqLater: `t0=dark:${initialDark} · t250=dark:${d250} · pending…` }
          : prev,
      )
    }, 250)
    const t1000 = window.setTimeout(() => {
      const d1000 = window.matchMedia("(prefers-color-scheme: dark)").matches
      const d250 = window.matchMedia("(prefers-color-scheme: dark)").matches
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              mqLater: `t0=dark:${initialDark} · t250=dark:${d250} · t1000=dark:${d1000}`,
              // refresh snapshot too in case the html class / colorScheme
              // settled after next-themes mount
              ...snapshot(),
            }
          : prev,
      )
    }, 1000)

    // Live re-snapshot when the MQ flips (theme change in system)
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () =>
      setInfo((prev) => (prev ? { ...prev, ...snapshot() } : prev))
    mq.addEventListener("change", onChange)

    return () => {
      mq.removeEventListener("change", onChange)
      window.clearTimeout(t250)
      window.clearTimeout(t1000)
    }
  }, [])

  if (!enabled || !info) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        maxHeight: "70vh",
        overflowY: "auto",
        padding: "12px 16px",
        background: "#0A0A0B",
        color: "#FAFAFA",
        fontFamily: "ui-monospace, monospace",
        fontSize: "11px",
        lineHeight: 1.5,
        borderBottom: "2px solid #10B981",
        wordBreak: "break-all",
      }}
    >
      <div style={{ fontWeight: 700, color: "#34D399", marginBottom: 6 }}>
        THEME DEBUG v2 (remove from URL to hide)
      </div>
      <div><strong>MQ now:</strong> {info.mq}</div>
      <div><strong>MQ over time:</strong> {info.mqLater}</div>
      <div><strong>a11y:</strong> {info.a11y}</div>
      <div><strong>localStorage.theme:</strong> {info.storage}</div>
      <div><strong>cookies:</strong> {info.cookies}</div>
      <div><strong>&lt;html&gt; class:</strong> {info.htmlClass}</div>
      <div><strong>&lt;html&gt; color-scheme:</strong> {info.htmlColorScheme}</div>
      <div><strong>viewport:</strong> {info.viewport}</div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>
        <strong>UA:</strong> {info.ua}
      </div>
    </div>
  )
}
