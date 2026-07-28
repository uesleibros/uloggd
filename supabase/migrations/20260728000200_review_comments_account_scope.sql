-- Review comment access is controlled only by profiles.content_comment_scope.
-- Clear legacy per-review overrides and keep the shared helper compatible with
-- the other community post types without enforcing reviews.comments_scope.

update public.reviews
set comments_scope = 'EVERYONE'
where comments_scope <> 'EVERYONE';

create or replace function public.content_comments_scope(
  target_type text,
  target_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case target_type
    when 'list' then (select comments_scope from public.game_lists where id = target_id)
    when 'review' then 'EVERYONE'::text
    when 'screenshot' then (select comments_scope from public.screenshots where id = target_id)
    when 'diary' then (select comments_scope from public.diary_entries where id = target_id)
  end
$$;

revoke all on function public.content_comments_scope(text, uuid) from public;
grant execute on function public.content_comments_scope(text, uuid)
  to anon, authenticated;
