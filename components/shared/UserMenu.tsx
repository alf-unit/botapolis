"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Bookmark, LayoutDashboard, LogIn, LogOut } from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* ----------------------------------------------------------------------------
   UserMenu — TZ § 10 (sprint 5)
   ----------------------------------------------------------------------------
   Two appearances:
     - Authed:    avatar (initial) + dropdown { Dashboard · Saved · Sign out }
     - Anon:      compact "Sign in" link to /login

   We accept an optional initial user prop from server-rendered pages
   (Navbar receives it from the dashboard/saved pages) so there's no flash of
   the wrong state. When unset, we fall back to a client-side `getUser()`
   call. `onAuthStateChange` keeps the menu live across sign-in/out events.
---------------------------------------------------------------------------- */

export interface UserMenuStrings {
  signIn:     string
  dashboard:  string
  saved:      string
  signOut:    string
  signedOut:  string
  signOutFailed: string
  openMenu:   string
}

interface UserMenuProps {
  strings:       UserMenuStrings
  localePrefix?: "" | "/ru"
  /** Optional server-resolved user (skip the client roundtrip on first paint). */
  initialUser?:  { email: string } | null
  className?:    string
}

export function UserMenu({
  strings,
  localePrefix = "",
  initialUser = null,
  className,
}: UserMenuProps) {
  const router = useRouter()
  const pathname = usePathname()

  type AuthState =
    | { status: "loading"; user: null }
    | { status: "ready";   user: User | { email: string } | null }

  const [state, setState] = React.useState<AuthState>(
    initialUser
      // If the server already resolved the user, skip the loading flash.
      ? { status: "ready", user: initialUser }
      : { status: "loading", user: null },
  )

  // ----- Hydrate auth state on mount + subscribe to changes ----------------
  React.useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    // Initial resolve — only needed when the server didn't hand us a user.
    if (!initialUser) {
      supabase.auth.getUser().then(({ data }) => {
        if (cancelled) return
        setState({ status: "ready", user: data.user })
      })
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ status: "ready", user: session?.user ?? null })
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [initialUser])

  // ----- Sign out -----------------------------------------------------------
  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(strings.signOutFailed, { description: error.message })
      return
    }
    toast.success(strings.signedOut)
    // Refresh forces the server components above us to re-evaluate auth —
    // critical for `/dashboard` and `/saved` where the page itself reads
    // `getUser()` and would otherwise serve cached HTML.
    router.refresh()
    router.push(`${localePrefix}/`)
  }

  // ----- Render: loading skeleton placeholder ------------------------------
  if (state.status === "loading") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-8 rounded-full bg-[var(--bg-muted)] animate-pulse",
          className,
        )}
      />
    )
  }

  // ----- Render: anon "Sign in" --------------------------------------------
  if (!state.user) {
    // Carry the current path through as `?next=` so users land back where
    // they were after they finish signing in. We strip locale below so the
    // proxy can recompute it consistently from the destination.
    const next = pathname && pathname !== `${localePrefix}/login`
      ? `?next=${encodeURIComponent(pathname)}`
      : ""

    return (
      <Link
        href={`${localePrefix}/login${next}`}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
          "transition-colors duration-150",
          className,
        )}
        aria-label={strings.signIn}
      >
        <LogIn className="size-4" />
        <span className="hidden sm:inline">{strings.signIn}</span>
      </Link>
    )
  }

  // ----- Render: authed avatar dropdown ------------------------------------
  const email   = state.user.email ?? "?"
  const initial = email.trim().charAt(0).toUpperCase() || "?"

  return (
    <DropdownMenu>
      {/* Base UI 1.4+ runtime-validates that `render` resolves to a native
          <button> for Trigger / a button or link for Item. Our custom <Button>
          eventually renders one, but the validator counts the wrapper layer
          and throws Base UI error #31 ("not rendered as a native <button>").
          Same story on the Items below where we render <Link> (an <a>).
          `nativeButton={false}` opts out of the assertion — semantics are
          preserved by the rendered element's own role / type. */}
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={strings.openMenu}
            className={cn("relative size-8 rounded-full p-0 overflow-hidden", className)}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 inline-flex items-center justify-center text-[13px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklch, var(--brand) 26%, transparent), color-mix(in oklch, var(--violet-500) 26%, transparent))",
              }}
            >
              {initial}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          nativeButton={false}
          render={
            <Link href={`${localePrefix}/dashboard`} className="flex items-center gap-2">
              <LayoutDashboard className="size-4" />
              {strings.dashboard}
            </Link>
          }
        />
        <DropdownMenuItem
          nativeButton={false}
          render={
            <Link href={`${localePrefix}/saved`} className="flex items-center gap-2">
              <Bookmark className="size-4" />
              {strings.saved}
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-[var(--danger)] focus:text-[var(--danger)]"
        >
          <LogOut className="size-4" />
          {strings.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
