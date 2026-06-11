import { notFound } from "next/navigation"

/* ----------------------------------------------------------------------------
   Locale-tree catch-all — keeps locale-prefixed junk URLs in their language.
   ----------------------------------------------------------------------------
   Without this route, a dead path under a VALID locale prefix
   (`/ru/lyovaya-stranitsa`) matches nothing inside the [locale] tree and
   falls through to the root `app/not-found.tsx`, which renders EN-only (a
   bare unknown segment carries no locale signal, so the root surface can't
   localise — see the rationale there). Result: an RU visitor following a
   dead /ru/* link got an English 404.

   This catch-all claims any URL that survives routing into a valid locale
   (the layout's validity guard rejects junk "locales" before we run) and
   throws notFound() FROM A PAGE — so it's handled by the sibling
   `app/[locale]/not-found.tsx` boundary, fully chromed and in the right
   language (the layout has already pinned the locale by the time the
   boundary renders).

   Specificity: every real route (static segments, [slug] dynamics) wins
   over [...rest], so this only ever sees URLs nothing else claimed. The
   /ru/go/:slug rewrite runs beforeFiles and never reaches routing, so the
   affiliate fix is untouched.

   Cost note: this segment is necessarily Dynamic (junk URLs can't be
   prerendered), but the render is just a notFound() throw + the static
   branded boundary — no Supabase, no Dynamic APIs. The bot-junk hot path
   (bare, un-prefixed URLs) still terminates at the STATIC root /_not-found,
   so the CPU surface this adds is only locale-prefixed dead links.
---------------------------------------------------------------------------- */

export default function LocaleCatchAll() {
  notFound()
}
