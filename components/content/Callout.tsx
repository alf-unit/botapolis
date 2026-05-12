import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, Lightbulb, XOctagon } from "lucide-react"

import { cn } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   <Callout>
   ----------------------------------------------------------------------------
   Editorial callout used inside MDX. Five variants map to semantic intent:

     - tip      → green, "useful trick" / "small win"
     - info     → blue, neutral aside
     - warning  → amber, "watch out, common mistake"
     - danger   → red, "this will lose you money"
     - success  → mint-deep, "confirmed working"

   Server component on purpose — no client JS needed.

   Usage in MDX:
     <Callout variant="warning" title="Heads up">
       Klaviyo bills based on **total** contacts, not active subscribers.
       Suppressed contacts still count.
     </Callout>
---------------------------------------------------------------------------- */

type CalloutVariant = "tip" | "info" | "warning" | "danger" | "success"

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  children: ReactNode
}

const STYLES: Record<
  CalloutVariant,
  {
    container: string
    iconWrap:  string
    icon:      React.ComponentType<{ className?: string }>
    iconColor: string
  }
> = {
  tip: {
    container: "border-[var(--accent-200)] bg-[var(--accent-50)]",
    iconWrap:  "bg-[var(--accent-100)]",
    icon:      Lightbulb,
    iconColor: "text-[var(--accent-700)]",
  },
  info: {
    container: "border-[#BFDBFE] bg-[#EFF6FF]",
    iconWrap:  "bg-[#DBEAFE]",
    icon:      Info,
    iconColor: "text-[#1D4ED8]",
  },
  warning: {
    container: "border-[#FDE68A] bg-[var(--warning-bg)]",
    iconWrap:  "bg-[#FEF3C7]",
    icon:      AlertTriangle,
    iconColor: "text-[#B45309]",
  },
  danger: {
    container: "border-[#FECACA] bg-[var(--danger-bg)]",
    iconWrap:  "bg-[#FEE2E2]",
    icon:      XOctagon,
    iconColor: "text-[#B91C1C]",
  },
  success: {
    container: "border-[var(--accent-300)] bg-[var(--accent-50)]",
    iconWrap:  "bg-[var(--accent-100)]",
    icon:      CheckCircle2,
    iconColor: "text-[var(--accent-700)]",
  },
}

export function Callout({ variant = "tip", title, children }: CalloutProps) {
  const styles = STYLES[variant]
  const Icon = styles.icon

  return (
    <aside
      role="note"
      className={cn(
        "my-6 flex gap-4 rounded-2xl border p-5",
        styles.container,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          styles.iconWrap,
        )}
      >
        <Icon className={cn("size-[18px]", styles.iconColor)} />
      </span>
      <div className="min-w-0 flex-1 text-[var(--text-primary)]">
        {title && (
          <p className="text-[14px] font-semibold tracking-[-0.005em]">
            {title}
          </p>
        )}
        {/* Body inherits standard MDX p/list styles — but we tighten leading
            slightly so the callout reads as a single thought, not a section. */}
        <div
          className={cn(
            "text-[15px] leading-[1.65] text-[var(--text-primary)]",
            "[&>p]:my-0 [&>p+p]:mt-2 [&>p]:text-inherit",
            "[&>ul]:my-2 [&>ul]:text-inherit",
            title && "mt-1",
          )}
        >
          {children}
        </div>
      </div>
    </aside>
  )
}
