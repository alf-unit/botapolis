-- ============================================================================
-- Botapolis · 007_real_tool_logo_paths.sql
-- ----------------------------------------------------------------------------
-- Points every tool's `logo_url` at the real, self-hosted brand asset that
-- now lives in `public/tools/`. Until this migration runs, the column still
-- holds the original placeholder paths (`/tools/<slug>.svg` for ALL tools)
-- that the seed shipped with — but those `.svg` files never existed, so
-- <ToolLogo> 404'd on every tool and fell back to the initial-letter chip.
--
-- The real files are official vendor brand marks (square symbol where the
-- vendor publishes one, otherwise their official app/site icon), each in
-- whatever format the vendor ships — hence the mixed extensions below.
-- `seed.sql` was updated in lockstep so a fresh seed lands these same paths;
-- this migration carries the change to the already-seeded production DB
-- (the live site reads `logo_url` from the row, not from seed.sql).
--
-- Idempotent: plain per-slug UPDATEs to a fixed value. Re-running is a
-- no-op (the WHERE narrows to the slug; the SET writes the same string).
-- A row that doesn't exist is simply skipped — no error.
-- ============================================================================

update public.tools set logo_url = '/tools/klaviyo.png'    where slug = 'klaviyo';
update public.tools set logo_url = '/tools/mailchimp.png'  where slug = 'mailchimp';
update public.tools set logo_url = '/tools/omnisend.png'   where slug = 'omnisend';
update public.tools set logo_url = '/tools/gorgias.svg'    where slug = 'gorgias';
update public.tools set logo_url = '/tools/tidio.png'      where slug = 'tidio';
update public.tools set logo_url = '/tools/postscript.png' where slug = 'postscript';
update public.tools set logo_url = '/tools/manychat.png'   where slug = 'manychat';
update public.tools set logo_url = '/tools/recharge.webp'  where slug = 'recharge';
update public.tools set logo_url = '/tools/loox.png'       where slug = 'loox';
update public.tools set logo_url = '/tools/judge-me.jpg'   where slug = 'judge-me';
update public.tools set logo_url = '/tools/smile-io.png'   where slug = 'smile-io';
update public.tools set logo_url = '/tools/yotpo.png'      where slug = 'yotpo';
