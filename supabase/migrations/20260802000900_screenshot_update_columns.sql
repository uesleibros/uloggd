-- The author cannot rewrite what the automatic check recorded.
--
-- The previous migration revoked UPDATE on `sensitive_detected` and it had no
-- effect, because a table-level `grant update` was already in place and a
-- table grant supersedes a column revoke. This is the third time that has
-- caught this project: it is how every profile's birth date stayed readable
-- for the schema's life, and it is why the revoke has to be on the table with
-- the columns granted back one by one.
--
-- Found by a test that asserted the author was refused. An earlier version of
-- that test looked for an existing screenshot to act on, found none, and
-- passed by doing nothing.

revoke update on public.screenshots from authenticated;

-- Everything an author legitimately edits about their own screenshot. Row-level
-- security still decides which rows those are; this decides which columns.
grant update (
  description,
  contains_spoilers,
  sensitive,
  visibility,
  comments_scope,
  deleted_at,
  updated_at
) on public.screenshots to authenticated;

-- Deliberately absent: `sensitive_detected`, which records that the check set
-- the flag rather than the person, and the identity and image columns, which
-- describe what the screenshot is rather than how it is presented. Nothing in
-- the app edits those after the insert.
