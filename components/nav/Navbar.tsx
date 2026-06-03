"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, Menu, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { Logo } from "./Logo"
import { ThemeToggle } from "./ThemeToggle"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { NavbarSearch } from "./NavbarSearch"
import { UserMenu } from "@/components/shared/UserMenu"
import {
  NewsletterDialog,
  type NewsletterDialogStrings,
} from "@/components/marketing/NewsletterDialog"

/* ----------------------------------------------------------------------------
   Navbar
   ----------------------------------------------------------------------------
   - Sticky top, transparent at scrollY = 0
   - Glassmorphism (blur + glass border) kicks in once scrollY > 24
   - Desktop:   logo · main nav (leaves + dropdowns) · search · theme · lang · primary CTA
   - Mobile:    logo · hamburger → Sheet (right-side drawer); dropdowns render
                their sub-items expanded inline (no nested overlay).

   Adding a new menu entry — leaves vs dropdowns:
     - Top-level leaf:        `{ kind: "leaf", label, href }` in the `nav` array
                              below (e.g. News and Blog will land here later)
     - Dropdown sub-item:     append to the matching dropdown's `items` array
                              (e.g. /pricing, /discount when they ship)
   The render paths (desktop + mobile) automatically pick up new entries —
   no surface-specific changes required.
---------------------------------------------------------------------------- */

export interface NavLink {
  label: string
  href: string
}

/** Sub-item shape for dropdown groups. */
interface NavSubItem {
  label: string
  href: string
}

/**
 * Discriminated nav-item: top-level entries are either a single leaf link
 * or a labelled dropdown with sub-items. Both render variants are wired in
 * one place so adding entries doesn't touch the desktop or mobile JSX.
 */
type NavItem =
  | { kind: "leaf"; label: string; href: string }
  | { kind: "dropdown"; label: string; items: NavSubItem[] }

export interface NavbarStrings {
  tools: string
  compare: string
  guides: string
  /** Dropdown label for the Resources cluster (Best, Alternatives, …). */
  resources: string
  /** Sub-item: /best hub. */
  best: string
  /** Sub-item: /alternatives hub. */
  alternatives: string
  directory: string
  search: string
  // `searchPlaceholder` retired May 2026 audit (search palette removed; the
  // navbar button now navigates to /search which owns its own placeholder).
  // Kept here as optional for backwards compat — dictionaries can leave the
  // key in JSON without breaking the type contract.
  searchPlaceholder?: string
  subscribe: string
  openMenu: string
  closeMenu: string
  toggleTheme: string
  switchLanguage: string
}

interface NavbarProps {
  strings: NavbarStrings
  localePrefix?: "" | "/ru"
  /**
   * Server-resolved current user. Optional — when supplied, the UserMenu
   * skips its client-side getUser() round-trip and renders the right state
   * on first paint. When omitted, UserMenu resolves auth itself.
   */
  user?: { email: string } | null
  className?: string
}

/**
 * UserMenu strings — derived from locale prefix so consumers don't have to
 * thread a separate `userMenu` slot through every page. Kept inside Navbar
 * (and not in the locale JSON) because the dropdown labels are component-
 * specific and aren't shown anywhere else in the app.
 */
function userMenuStrings(localePrefix: "" | "/ru") {
  const ru = localePrefix === "/ru"
  return {
    signIn:        ru ? "Войти"             : "Sign in",
    dashboard:     ru ? "Личный кабинет"     : "Dashboard",
    saved:         ru ? "Сохранённые"        : "Saved",
    signOut:       ru ? "Выйти"             : "Sign out",
    signedOut:     ru ? "Вы вышли из аккаунта" : "Signed out",
    signOutFailed: ru ? "Не удалось выйти"   : "Couldn't sign out",
    openMenu:      ru ? "Открыть меню"        : "Open user menu",
  }
}

/**
 * Newsletter dialog copy — mirrors locales/{en,ru}.json `newsletter` slot
 * verbatim. Kept inline here for the same reason as userMenuStrings: every
 * page already passes `dict.nav`, and threading `dict.newsletter` through
 * every call-site of <Navbar/> just to feed the modal duplicates the JSON
 * data when this surface is the only client consumer anyway. If the copy
 * ever drifts from the footer strip's, normalise both then.
 */
function newsletterDialogStrings(localePrefix: "" | "/ru"): NewsletterDialogStrings {
  const ru = localePrefix === "/ru"
  return {
    eyebrow:  ru ? "Только для операторов" : "Operators only",
    title:    ru ? "Получайте operator's brief." : "Get the operator's brief.",
    subtitle: ru
      ? "Одно письмо в неделю. Обновления калькуляторов, новые обзоры, найденные нами компромиссы."
      : "One email a week. Calculator updates, new reviews, the trade-offs we caught.",
    footnote: ru
      ? "Уже 1247 Shopify-операторов · Отписаться можно в любой момент"
      : "Join 1,247 Shopify operators · Unsubscribe anytime",
    form: {
      placeholder:       ru ? "you@store.com" : "you@store.com",
      cta:               ru ? "Подписаться" : "Subscribe",
      ctaLoading:        ru ? "Подписываем…" : "Subscribing…",
      ctaSubscribed:     ru ? "Подписаны" : "Subscribed",
      successTitle:      ru ? "Готово." : "You're in.",
      successDescription: ru
        ? "Проверьте почту — там welcome-письмо."
        : "Check your inbox for a welcome note.",
      errorTitle:        ru ? "Не удалось подписаться" : "Couldn't subscribe",
      errorInvalid:      ru
        ? "В email похоже опечатка — проверь."
        : "That email looks off — double-check it.",
      errorRateLimited:  ru
        ? "Слишком много попыток. Попробуй через пару минут."
        : "Too many attempts. Try again in a few minutes.",
    },
  }
}

// Cmd+K / Ctrl+K is now owned by <NavbarSearch> (focuses the inline input
// rather than navigating). The previous useGlobalSearchShortcut hook was
// retired alongside the standalone-link pattern.

export function Navbar({ strings, localePrefix = "", user = null, className }: NavbarProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const locale: "en" | "ru" = localePrefix === "/ru" ? "ru" : "en"
  const searchHref = `${localePrefix}/search`

  // i18n strings for the inline navbar search. Kept inline (rather than in
  // NavbarStrings) so the locale JSON doesn't bloat with strings only one
  // component consumes.
  const ru = locale === "ru"
  const navSearchStrings = {
    placeholder: ru ? "Найти инструмент, обзор…" : "Search tools, reviews…",
    button:      ru ? "Найти"                     : "Search",
    aria:        ru ? "Поиск по сайту"            : "Site search",
  }

  // rAF-throttled scroll listener — keeps per-frame work under the 16ms budget.
  React.useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      setScrolled(window.scrollY > 24)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Primary nav scope (Phase A of nav rebuild, 2026-06-03):
  //   - leaves: /tools, /compare, /guides
  //   - dropdown: Resources -> /best, /alternatives  (extensible — add new
  //     sub-items here as Pricing-cluster, Discount, etc. ship)
  //   - future leaves: News, Blog will append as additional { kind: "leaf" }
  //     entries when they ship.
  // The order goes "catalog" → "head-to-head" → "playbooks" → "discovery
  // surfaces", so the path reflects intent rather than alphabet.
  const nav: NavItem[] = [
    { kind: "leaf", label: strings.tools,   href: `${localePrefix}/tools` },
    { kind: "leaf", label: strings.compare, href: `${localePrefix}/compare` },
    { kind: "leaf", label: strings.guides,  href: `${localePrefix}/guides` },
    {
      kind: "dropdown",
      label: strings.resources,
      items: [
        { label: strings.best,         href: `${localePrefix}/best` },
        { label: strings.alternatives, href: `${localePrefix}/alternatives` },
        // Extension slot — Pricing cluster, Discount, etc. land here.
      ],
    },
    // Future top-level leaves (News, Blog) — add as `{ kind: "leaf", … }`.
  ]

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-40 w-full",
        // Mobile audit (May 2026): animating `backdrop-filter` between
        // 0 → blur(8/16) on every scroll-crossing of the 24-px trigger
        // was the single most expensive paint on iOS Safari — each
        // frame had to re-rasterise the blurred area under the navbar.
        // Limiting the transition to colour + shadow lets the filter
        // snap in instantly (the visual delta is imperceptible at
        // 200 ms anyway) and the scroll stays buttery.
        "transition-[background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out-expo)]",
        scrolled
          ? "surface-glass border-b shadow-[var(--shadow-sm)]"
          : "bg-transparent border-b border-transparent",
        className,
      )}
    >
      <div className="container-default flex h-16 items-center justify-between gap-4">
        {/* Left cluster: logo + desktop nav */}
        <div className="flex items-center gap-6 lg:gap-8 min-w-0">
          <Logo href={`${localePrefix}/`} idSuffix="nav" />
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
            {nav.map((item) =>
              item.kind === "leaf" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 h-9 inline-flex items-center rounded-md",
                    "text-sm font-medium text-[var(--text-secondary)]",
                    "hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                    "transition-colors duration-150",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger
                    className={cn(
                      "px-3 h-9 inline-flex items-center gap-1 rounded-md",
                      "text-sm font-medium text-[var(--text-secondary)]",
                      "hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                      "data-[popup-open]:text-[var(--text-primary)] data-[popup-open]:bg-[var(--bg-muted)]",
                      "transition-colors duration-150 outline-none",
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className="size-3.5 opacity-70 transition-transform duration-150 data-[popup-open]:rotate-180"
                      aria-hidden="true"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={6} className="min-w-44 p-1.5">
                    {item.items.map((sub) => (
                      <DropdownMenuItem
                        key={sub.href}
                        render={
                          <Link
                            href={sub.href}
                            className="px-2 py-1.5 text-sm"
                          >
                            {sub.label}
                          </Link>
                        }
                      />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            )}
          </nav>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search — second iteration of the May 2026 audit fix.
              Inline input + submit button on lg+ widths (matches the
              "real search bar" pattern visitors expect from a marketing
              site); narrower viewports keep the icon-link affordance
              since the navbar already runs out of horizontal real
              estate at sm/md. Submit pushes /search?q=… — no live
              search on keystroke (the standalone page handles the
              actual query work). */}
          <NavbarSearch
            href={searchHref}
            placeholder={navSearchStrings.placeholder}
            buttonLabel={navSearchStrings.button}
            ariaLabel={navSearchStrings.aria}
            className="hidden lg:flex"
          />
          <Link
            href={searchHref}
            aria-label={strings.search}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>

          <ThemeToggle label={strings.toggleTheme} />

          <LanguageSwitcher className="hidden sm:inline-flex" />

          {/* Auth surface — avatar dropdown when signed in, "Sign in" link
              otherwise. Sits between locale and the subscribe CTA so the
              brand mint button stays the right-most call-to-action for
              anonymous visitors. */}
          <UserMenu
            strings={userMenuStrings(localePrefix)}
            localePrefix={localePrefix}
            initialUser={user}
          />

          {/* Subscribe used to be an anchor-link to the footer's
              #newsletter section — two-click UX (click → scroll → click
              the *other* Subscribe button next to the form). Replaced
              with an in-place dialog so the form opens right under the
              navbar from any page. Mobile version still uses the scroll-
              to-footer path inside the Sheet because the dialog overlay
              on top of a sheet's overlay gets fiddly with virtual
              keyboards on iOS Safari. */}
          <NewsletterDialog
            strings={newsletterDialogStrings(localePrefix)}
            source="navbar_modal"
            language={locale}
          >
            <Button
              type="button"
              variant="cta"
              size="sm"
              className="hidden md:inline-flex"
            >
              {strings.subscribe}
            </Button>
          </NewsletterDialog>

          {/* Mobile menu — uses Base-UI Sheet via render prop */}
          <Sheet>
            <SheetTrigger
              nativeButton={false}
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={strings.openMenu}
                  className="lg:hidden"
                >
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="w-[88%] max-w-sm bg-[var(--bg-elevated)] border-l border-[var(--border-base)] p-0"
            >
              <SheetHeader className="h-16 px-4 border-b border-[var(--border-base)] flex-row items-center justify-between gap-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo href={`${localePrefix}/`} idSuffix="mobile" />
              </SheetHeader>

              <nav aria-label="Mobile" className="flex flex-col p-4 gap-1">
                {/* Search at the top of the mobile menu — first thing
                    visitors see when they open the drawer. */}
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href={searchHref}
                      className={cn(
                        "px-3 h-11 inline-flex items-center gap-2 rounded-md",
                        "text-base font-medium text-[var(--text-primary)]",
                        "hover:bg-[var(--bg-muted)]",
                      )}
                    >
                      <Search className="size-4 text-[var(--text-tertiary)]" />
                      {strings.search}
                    </Link>
                  }
                />
                {nav.map((item) =>
                  item.kind === "leaf" ? (
                    <SheetClose
                      key={item.href}
                      nativeButton={false}
                      render={
                        <Link
                          href={item.href}
                          className={cn(
                            "px-3 h-11 inline-flex items-center rounded-md",
                            "text-base font-medium text-[var(--text-primary)]",
                            "hover:bg-[var(--bg-muted)]",
                          )}
                        >
                          {item.label}
                        </Link>
                      }
                    />
                  ) : (
                    /* Dropdowns render inline + always-expanded on mobile —
                       no nested overlay (iOS Safari virtual keyboards +
                       stacked overlays don't play nicely). The group label
                       acts as an unclickable section header; sub-items sit
                       under it at one indent level. */
                    <div key={item.label} className="flex flex-col">
                      <p
                        className={cn(
                          "px-3 pt-3 pb-1.5",
                          "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
                          "text-[var(--text-tertiary)]",
                        )}
                      >
                        {item.label}
                      </p>
                      {item.items.map((sub) => (
                        <SheetClose
                          key={sub.href}
                          nativeButton={false}
                          render={
                            <Link
                              href={sub.href}
                              className={cn(
                                "pl-6 pr-3 h-11 inline-flex items-center rounded-md",
                                "text-base font-medium text-[var(--text-primary)]",
                                "hover:bg-[var(--bg-muted)]",
                              )}
                            >
                              {sub.label}
                            </Link>
                          }
                        />
                      ))}
                    </div>
                  ),
                )}

                <div className="mt-4 pt-4 border-t border-[var(--border-base)] flex items-center justify-between gap-3">
                  <LanguageSwitcher />
                  <div className="flex items-center gap-2">
                    <UserMenu
                      strings={userMenuStrings(localePrefix)}
                      localePrefix={localePrefix}
                      initialUser={user}
                    />
                    <ThemeToggle label={strings.toggleTheme} />
                  </div>
                </div>

                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href={`${localePrefix}/#newsletter`}
                      className={cn(
                        buttonVariants({ variant: "cta", size: "default" }),
                        "mt-3 w-full",
                      )}
                    >
                      {strings.subscribe}
                    </Link>
                  }
                />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
