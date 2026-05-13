"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { NewsletterForm, type NewsletterFormStrings } from "@/components/marketing/NewsletterForm"

/* ----------------------------------------------------------------------------
   <NewsletterDialog>
   ----------------------------------------------------------------------------
   In-place subscribe modal. Replaces the navbar's old `<a href="#newsletter">`
   anchor that scrolled the user to the footer form — same form lives inside
   this dialog, so the action takes one click from any page and never makes
   the visitor scroll past the article they were reading.

   The footer-strip `<NewsletterForm source="footer">` stays as a long-form
   copy for visitors who scroll all the way down (and as a fallback when JS
   is disabled — the dialog won't open without JS, the footer form still
   submits via fetch).

   Wiring:
     - Trigger is whatever the caller renders as children. We pass it
       through DialogTrigger via Base UI's render-prop pattern + the
       nativeButton={false} opt-out (the trigger is our custom <Button>
       inside the Navbar, which would otherwise fail Base UI 1.4's strict
       native-button assertion — same pattern documented in fix(ui):
       UserMenu crash on Base UI 1.4).
     - Strings come from the i18n dictionary; we ask the parent for the
       newsletter slice (title/subtitle/eyebrow/footnote + the form's own
       NewsletterFormStrings) so the dialog stays locale-agnostic.

   We do NOT mount the form when the dialog is closed — Base UI's Portal
   only renders children when `open === true`, so Turnstile inside the
   form doesn't load its iframe until the user actually opens the modal.
   That keeps the navbar paint cheap and PostHog quiet about preloads.
---------------------------------------------------------------------------- */

export interface NewsletterDialogStrings {
  /** Eyebrow over the headline. E.g. "Operators only". */
  eyebrow:  string
  /** Headline inside the modal. E.g. "Get the operator's brief." */
  title:    string
  /** Lead paragraph under the headline. */
  subtitle: string
  /** Footnote under the form. E.g. "Join 1,247 operators · Unsubscribe anytime". */
  footnote: string
  /** Form's own strings (placeholder, CTA, toast copy, etc.). */
  form:     NewsletterFormStrings
}

interface NewsletterDialogProps {
  strings:  NewsletterDialogStrings
  /** Trigger element — usually a styled <Button>. Rendered via Base UI
   *  DialogTrigger's render prop so the click handler + ARIA wiring
   *  attach to the visible element directly. */
  children: React.ReactElement
  /** Analytics source label forwarded to the inner form. Defaults to
   *  "navbar_modal" so funnel reports can tell modal opens from
   *  footer-strip submissions. */
  source?:  string
  /** Locale forwarded to the API for subscriber-level segmentation. */
  language?: "en" | "ru"
}

export function NewsletterDialog({
  strings,
  children,
  source   = "navbar_modal",
  language = "en",
}: NewsletterDialogProps) {
  return (
    <Dialog>
      {/* nativeButton={false} mirrors the fix applied to UserMenu / Sheet —
          our trigger is a custom <Button>, not a raw <button>, and Base UI
          1.4's render-prop validation throws #31 without the opt-out. */}
      <DialogTrigger nativeButton={false} render={children} />

      <DialogContent
        className={cn(
          // Slightly wider than the default Dialog max-w-sm so the email
          // input + button on the same row don't wrap. Stays under the
          // mobile viewport on the smallest screens.
          "max-w-md sm:max-w-md p-6 sm:p-8 gap-5",
        )}
      >
        {/* Eyebrow chip — same mint mono kicker the footer strip + the
            hero use, so the modal reads as a peer of those surfaces and
            not a generic system dialog. */}
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)] font-mono"
          data-slot="newsletter-dialog-eyebrow"
        >
          {strings.eyebrow}
        </span>

        <DialogTitle className="text-h3 font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {strings.title}
        </DialogTitle>

        <DialogDescription className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          {strings.subtitle}
        </DialogDescription>

        <NewsletterForm
          strings={strings.form}
          source={source}
          language={language}
        />

        <p className="text-[12px] text-[var(--text-tertiary)]">
          {strings.footnote}
        </p>
      </DialogContent>
    </Dialog>
  )
}
