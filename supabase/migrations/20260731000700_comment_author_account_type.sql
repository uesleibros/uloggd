-- Comment authors carry their account type, so an organization replying under
-- a review or a screenshot reads as one.
--
-- `get_content_comments` returns a fixed table shape with the author's fields
-- inlined, so the column has to be added here rather than joined on the
-- client. Profile comments already resolve their authors through a separate
-- profiles query and needed no change.

drop function if exists public.get_content_comments(text,uuid);

create function public.get_content_comments(target_type text, target_id uuid)
returns table (
  id uuid, public_id text, parent_id uuid, author_id uuid, body text,
  deleted_at timestamptz, created_at timestamptz, updated_at timestamptz,
  username text, display_name text, avatar_url text, verified boolean,
  account_type public."AccountType",
  like_count bigint, liked_by_viewer boolean
)
language sql stable security definer set search_path = '' as $$
  select comment.id, comment.public_id, comment.parent_id, comment.author_id,
    comment.body::text, comment.deleted_at, comment.created_at, comment.updated_at,
    author.username::text, author.display_name::text, author.avatar_url::text,
    author.verified, author.account_type, count(likes.profile_id)::bigint,
    coalesce(bool_or(likes.profile_id = auth.uid()), false)
  from public.content_comments comment
  join public.profiles author on author.id = comment.author_id
  left join public.content_likes likes
    on likes.content_type = 'content_comment' and likes.content_id = comment.id
  where comment.content_type = target_type and comment.content_id = target_id
    and public.content_comments_visible(target_type, target_id)
  group by comment.id, author.username, author.display_name, author.avatar_url,
    author.verified, author.account_type
  order by comment.created_at
$$;

revoke all on function public.get_content_comments(text,uuid) from public;
grant execute on function public.get_content_comments(text,uuid) to anon, authenticated;
