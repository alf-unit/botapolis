"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { UserMenu } from "@/components/shared/UserMenu"
import { SearchTrigger } from "@/components/shared/SearchTrigger"
import type { SearchModalStrings } from "@/components/shared/SearchModal"

/* ----------------------------------------------------------------------------
   Navbar
   ----------------------------------------------------------------------------
   - Sticky top, transparent at scrollY = 0
   - Glassmorphism (blur + glass border) kicks in once scrollY > 24
   - Desktop:   logo · main nav · search · theme · lang · primary CTA
   - Mobile:    logo · hamburger → Sheet (right-side drawer) with the same items
---------------------------------------------------------------------------- */

export interface NavLink {
  label: string
  href: string
}

export interface NavbarStrings {
  tools: string
  compare: string
  reviews: string
  guides: string
  directory: string
  search: string
  searchPlaceholder: string
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
 * Locale-resolved SearchModal copy. Kept inline here (rather than threaded
 * through dict.nav.search.*) because the strings are component-specific
 * and live alongside the only consumer.
 */
function searchModalStrings(locale: "en" | "ru", trigger: string, placeholder: string): SearchModalStrings {
  return {
    triggerLabel:    trigger,
    placeholder,
    closeLabel:      locale === "ru" ? "Закрыть"          : "Close",
    emptyTitle:      locale === "ru" ? "Что ищем?"        : "What are you looking for?",
    emptyBody:       locale === "ru"
      ? "Инструменты, обзоры, гайды, сравнения — всё в одном поле."
      : "Tools, reviews, guides, comparisons — all in one box.",
    loadingError:    locale === "ru"
      ? "Не удалось загрузить поисковый индекс. Попробуй обновить страницу."
      : "Couldn't load the search index. Try refreshing the page.",
    noResultsTitle:  locale === "ru" ? "Ничего не нашли"  : "No results",
    noResultsBody:   locale === "ru"
      ? "Перефразируй запрос или загляни в каталог инструментов."
      : "Try a different query, or browse the tools catalog.",
    resultsLabel:    locale === "ru" ? "Pagefind"         : "Pagefind",
  }
}

export function Navbar({ strings, localePrefix = "", user = null, className }: NavbarProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const locale: "en" | "ru" = localePrefix === "/ru" ? "ru" : "en"

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

  // Primary nav scope (Sprint 2, May 2026):
  //   - /tools, /compare      — sprint 3-4, live since launch
  //   - /reviews, /guides     — sprint 2 (MDX pipeline) shipped May 2026
  //   - /directory            — still excluded (308 redirect to /tools)
  // The order goes "do something" → "compare options" → "deep reads" so
  // the path reflects intent rather than alphabet. Keeping it to four
  // entries holds the desktop bar visually balanced against the right-side
  // utility cluster.
  const links: NavLink[] = [
    { label: strings.tools,   href: `${localePrefix}/tools` },
    { label: strings.compare, href: `${localePrefix}/compare` },
    { label: strings.reviews, href: `${localePrefix}/reviews` },
    { label: strings.guides,  href: `${localePrefix}/guides` },
  ]

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-40 w-full",
        "transition-[background-color,backdrop-filter,border-color,box-shadow] duration-200 ease-[var(--ease-out-expo)]",
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
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 h-9 inline-flex items-center rounded-md",
                  "text-sm font-medium text-[var(--text-secondary)]",
                  "hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]",
                  "transition-colors duration-150",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search trigger — Pagefind-backed modal (block D). Owns its own
              ⌘K / Ctrl+K listener at the document level so the shortcut
              fires from anywhere on the page, not just when the trigger
              has focus. The static index is built post-deploy by
              scripts/build-search-index.ts. Mounted ONCE so we don't end
              up with two modals / two listeners — the trigger renders
              itself responsively (icon-only on phones, full chip with ⌘K
              hint on desktop). */}
          <SearchTrigger
            strings={searchModalStrings(locale, strings.search, strings.searchPlaceholder)}
            locale={locale}
          />

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

          <Link
            href={`${localePrefix}/#newsletter`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden md:inline-flex bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)]",
            )}
          >
            {strings.subscribe}
          </Link>

          {/* Mobile menu — uses Base-UI Sheet via render prop */}
          <Sheet>
            <SheetTrigger
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
                {links.map((l) => (
                  <SheetClose
                    key={l.href}
                    render={
                      <Link
                        href={l.href}
                        className={cn(
                          "px-3 h-11 inline-flex items-center rounded-md",
                          "text-base font-medium text-[var(--text-primary)]",
                          "hover:bg-[var(--bg-muted)]",
                        )}
                      >
                        {l.label}
                      </Link>
                    }
                  />
                ))}

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
                  render={
                    <Link
                      href={`${localePrefix}/#newsletter`}
                      className={cn(
                        buttonVariants({ size: "default" }),
                        "mt-3 w-full bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)]",
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
