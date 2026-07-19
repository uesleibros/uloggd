-- Load recent conversation roots with every descendant, avoiding orphaned
-- replies while keeping the profile query bounded.

create function public.get_profile_comment_threads(
  target_profile uuid,
  root_limit integer default 30
)
returns setof public.profile_comments
language sql stable security invoker set search_path = ''
as $$
  with recursive roots as (
    select comment.*
    from public.profile_comments comment
    where comment.profile_id = target_profile
      and comment.parent_id is null
    order by comment.created_at desc
    limit least(greatest(root_limit, 1), 50)
  ), thread as (
    select root.* from roots root
    union all
    select reply.*
    from public.profile_comments reply
    join thread parent on parent.id = reply.parent_id
  )
  select * from thread
$$;

revoke all on function public.get_profile_comment_threads(uuid,integer)
  from public;
grant execute on function public.get_profile_comment_threads(uuid,integer)
  to anon, authenticated;
