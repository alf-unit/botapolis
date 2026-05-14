import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <ToolFaq>
   ----------------------------------------------------------------------------
   Section block surfaced at the bottom of every calculator page — a
   single-open Base UI accordion with editorial Q&A about the tool's math,
   assumptions, and limits.

   Wave 2 audit alignment (Botapolis design v.026): mirrors the FAQ section
   from mockups/tool-email-roi.html. Renders as a narrow column (max-prose)
   centered in the page so questions read like a chat thread rather than a
   data table.

   The parent page is responsible for emitting the matching FAQPage JSON-LD
   schema via `generateFAQSchema` — this component handles only the visible
   accordion. Keeping the schema emit in the page lets it sit next to the
   other JSON-LD scripts (BreadcrumbList, SoftwareApplication) and share the
   same lifecycle.

   Server Component — `Accordion` is a Base-UI primitive that handles its
   own client state internally via `data-slot`/`aria-expanded`, no wrapper
   "use client" needed.
---------------------------------------------------------------------------- */

export interface FaqItem {
  q: string
  a: string
}

interface ToolFaqProps {
  title: string
  /** Optional eyebrow above the title (e.g. "FAQ" / "Часто спрашивают"). */
  eyebrow?: string
  items: FaqItem[]
  className?: string
}

export function ToolFaq({ title, eyebrow, items, className }: ToolFaqProps) {
  if (items.length === 0) return null

  return (
    <section className={cn("container-default pb-20 lg:pb-24", className)}>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 lg:mb-8">
          {eyebrow && (
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-h3 lg:text-h2 font-semibold tracking-[-0.02em]">
            {title}
          </h2>
        </header>

        <Accordion className="border-t border-[var(--border-base)]">
          {items.map((item, i) => (
            <AccordionItem
              // The Base-UI Accordion uses the index of children — but our
              // questions are stable per render so the trigger is keyed on
              // the question text to keep React happy if the list reorders.
              key={item.q}
              value={String(i)}
              className="border-b border-[var(--border-base)]"
            >
              <AccordionTrigger
                className={cn(
                  "py-5 text-[16px] font-medium text-[var(--text-primary)]",
                  "hover:no-underline data-[panel-open]:text-[var(--text-primary)]",
                )}
              >
                {item.q}
              </AccordionTrigger>
              <AccordionContent>
                <p className="pb-2 pr-8 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
                  {item.a}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
