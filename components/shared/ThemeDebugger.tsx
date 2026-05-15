"use client"

import * as React from "react"

/* ----------------------------------------------------------------------------
   ThemeDebugger — temporary diagnostic overlay
   ----------------------------------------------------------------------------
   Mounts only when the URL contains `?debug-theme=1`. Prints four data
   points needed to diagnose why a given browser/device picked the
   theme it did:

     · matchMedia('(prefers-color-scheme: dark)').matches
     · localStorage.theme
     · <html> resolved class list (so we see whether next-themes added
       .dark / .light)
     · navigator.userAgent

   Use case: a visitor reports the site loaded in the "wrong" theme.
   They hit botapolis.com/?debug-theme=1, the overlay appears, they
   screenshot it. The data immediately reveals which of:
     a) browser is reporting prefers-color-scheme inconsistently
        (iOS private-mode anti-tracking masking, embedded WebView quirk),
     b) localStorage still has a stale theme from before the
        defaultTheme="system" switch,
     c) next-themes failed to mount,
   is at play. Once diagnosed, this whole component gets removed.

   It deliberately re-reads matchMedia in an effect rather than at
   import time — Safari evaluates the query against the *current*
   environment, and we want the snapshot after hydration.
---------------------------------------------------------------------------- */

export function ThemeDebugger() {
  const [enabled, setEnabled] = React.useState(false)
  const [info, setInfo] = React.useState<{
    media: string
    storage: string
    htmlClass: string
    ua: string
  } | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("debug-theme") !== "1") return
    setEnabled(true)

    const read = () => {
      const mqDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const mqLight = window.matchMedia("(prefers-color-scheme: light)").matches
      const mqNo = window.matchMedia("(prefers-color-scheme: no-preference)").matches
      setInfo({
        media:
          `dark=${mqDark} · light=${mqLight} · none=${mqNo}`,
        storage: window.localStorage.getItem("theme") ?? "(empty)",
        htmlClass: document.documentElement.className || "(none)",
        ua: navigator.userAgent,
      })
    }
    read()
    // Re-read on system theme change so we see the live MQ value.
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", read)
    return () => mq.removeEventListener("change", read)
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
        padding: "12px 16px",
        background: "#0A0A0B",
        color: "#FAFAFA",
        fontFamily: "ui-monospace, monospace",
        fontSize: "12px",
        lineHeight: 1.5,
        borderBottom: "2px solid #10B981",
        wordBreak: "break-all",
      }}
    >
      <div style={{ fontWeight: 700, color: "#34D399", marginBottom: 6 }}>
        THEME DEBUG (remove from URL to hide)
      </div>
      <div>
        <strong>matchMedia:</strong> {info.media}
      </div>
      <div>
        <strong>localStorage.theme:</strong> {info.storage}
      </div>
      <div>
        <strong>&lt;html&gt; class:</strong> {info.htmlClass}
      </div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>
        <strong>UA:</strong> {info.ua}
      </div>
    </div>
  )
}
