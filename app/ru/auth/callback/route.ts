/* /ru/auth/callback — RU mirror of the Supabase auth callback.
   The callback handler is locale-agnostic (it only deals with the OAuth
   code exchange), but we still need the route to exist under /ru/ so the
   magic-link emailRedirectTo URL we hand Supabase round-trips correctly
   when the user clicks from a Russian session. */
export { GET } from "@/app/(auth)/auth/callback/route"
