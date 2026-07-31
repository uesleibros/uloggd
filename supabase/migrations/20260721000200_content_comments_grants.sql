-- The schema's default grants hand INSERT/UPDATE/DELETE to authenticated, and
-- creating the table inherited them. Row level security already refuses those
-- writes, since content_comments has only a SELECT policy, but leaving the
-- grants in place means the table reads as writable to anyone inspecting
-- privileges, and one future permissive policy would be enough to open it.
-- Writes belong to create_content_comment and delete_content_comment.

revoke insert, update, delete, truncate, references, trigger
  on public.content_comments from anon, authenticated;

grant select on public.content_comments to anon, authenticated;
