import Script from "next/script"

/* ----------------------------------------------------------------------------
   PlausibleScript — TZ § 13.1 (sprint 6)
   ----------------------------------------------------------------------------
   Renders Plausible's <script> tag only when `NEXT_PUBLIC_PLAUSIBLE_ENABLED`
   is the literal string "true". Any other value (unset, "false", "0") leaves
   the page untouched — no network request fires, no DOM node is added.

   `data-domain` defaults to "botapolis.com" but accepts the
   `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env override so a preview deploy can point
   its analytics at a staging Plausible site without code changes.

   Strategy: `afterInteractive` (next/script's mapping of <script defer>),
   matches Plausible's own docs and keeps the analytics out of the LCP
   critical path.
---------------------------------------------------------------------------- */
export function PlausibleScript() {
  const enabled = process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED === "true"
  if (!enabled) return null

  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "botapolis.com"

  return (
    <Script
      defer
      strategy="afterInteractive"
      // `id` is required by next/script when omitting children — Next uses
      // it to de-dupe across renders and to attach the lifecycle hooks.
      id="plausible-analytics"
      data-domain={domain}
      src="https://plausible.io/js/script.js"
    />
  )
}
