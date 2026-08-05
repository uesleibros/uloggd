-- Four functions `anon` could call and had no business being able to.
--
-- None is exploitable, which is why this is hygiene rather than a fix. Three
-- are trigger functions: Postgres refuses to call a `returns trigger` function
-- outside a trigger, and an event trigger function outside an event, so the
-- grant buys nothing in either direction. `record_content_view` returns
-- immediately when there is no `auth.uid()`, so a signed-out caller writes
-- nothing.
--
-- They are revoked anyway because the answer to "what can an anonymous visitor
-- reach" should be a short list that is entirely deliberate. A grant nobody
-- meant to give is a grant nobody will question later, and the next function
-- added by copying one of these would inherit it.
--
-- Revoked from `public`, not from `anon`. Postgres grants execute on every new
-- function to `PUBLIC`, and every role inherits it, so revoking from `anon`
-- alone removes a grant it never held directly and changes nothing. The first
-- version of this migration did exactly that, and the audit query afterwards
-- still listed all four. Same shape as the table-level grant that outranked a
-- column-level revoke elsewhere in this schema: take it away from `public`,
-- then hand it back to whoever genuinely needs it.

-- The three trigger functions need no role at all: Postgres calls them itself.
-- `authenticated` is named as well as `public` because Supabase grants the
-- signed-in role execute on the schema's functions separately, and leaving it
-- would keep them on the list of things a session can reach.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_birth_date_change()
  from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.record_content_view(text, integer, text, uuid, uuid)
  from public, anon;

-- Signed-in visitors keep this one: it records what they looked at, keyed to
-- their own id, which is what the "recently viewed" shelf reads back. The
-- three above are called by Postgres itself and need no role at all.
grant execute on function public.record_content_view(text, integer, text, uuid, uuid)
  to authenticated;
