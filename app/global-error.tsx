"use client"

import { useEffect } from "react"
import "./globals.css"

/* ----------------------------------------------------------------------------
   Global error boundary — last-resort fallback.
   ----------------------------------------------------------------------------
   Renders ONLY when the error originates above the locale layout (i.e. the
   root or [locale] layout itself throws) — the one case where no <html>/
   <body> shell exists yet. Next requires `global-error.tsx` to render its
   own document shell for exactly this reason.

   Routine in-page errors are caught by `app/[locale]/error.tsx`, which keeps
   the full site chrome (Navbar) and the locale. This file stays deliberately
   dependency-free (no Navbar/Footer/providers) so it can't re-throw inside
   the boundary that is already handling a throw.
---------------------------------------------------------------------------- */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the digest for server-log correlation; no PII.
    console.error("global-error boundary:", error)
  }, [error])

  return (
    <html lang="en" translate="no" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground font-sans">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            500 · Something broke
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            This page hit an unexpected error
          </h1>
          <p className="text-muted-foreground">
            Try again — most errors here are transient. If it persists, head
            back to the homepage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
