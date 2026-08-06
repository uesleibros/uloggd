-- How many comments each of these posts has, for the feed.
--
-- The site's front page says games get better when they become a conversation.
-- It has six comments in its whole history, against forty-three likes, and the
-- reason is in the markup rather than in anybody's appetite: the feed offers a
-- like button and a link to read the rest, and says nothing at all about
-- comments. Liking is one click; commenting is noticing a link, leaving the
-- page and finding a box. The counts came out exactly as that design predicts.
--
-- So the feed needs to be able to say "three replies" without fetching three
-- replies. `get_content_comments` returns every row with its author and its
-- likes, which is right for the page that draws a thread and far too much for
-- eighteen cards that only need a number.
--
-- Deleted comments are excluded. They render as a tombstone inside an open
-- thread, which is honest there, but counting them would advertise a
-- conversation that is not there to read.
--
-- `security definer`, matching the listing function it mirrors, and reusing
-- the same `content_comments_visible` gate rather than restating it: a count
-- is a weaker disclosure than the text, but it is the same disclosure, and two
-- copies of one visibility rule is how they come to disagree.
create or replace function public.get_content_comment_counts(
  target_type text,
  target_ids uuid[]
)
returns table (content_id uuid, comment_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select ids.id, count(comment.id)::bigint
  from unnest(target_ids) as ids(id)
  left join public.content_comments comment
    on comment.content_type = target_type
   and comment.content_id = ids.id
   and comment.deleted_at is null
   and public.content_comments_visible(target_type, ids.id)
  group by ids.id
$$;

comment on function public.get_content_comment_counts(text, uuid[]) is
  'Comment counts for a batch of posts, for feeds. Mirrors the visibility of '
  'get_content_comments and excludes deleted rows.';

-- Execute comes from PUBLIC unless taken away there, so revoking from anon
-- alone would leave the grant where it was. Signed-out visitors read feeds
-- too, so anon keeps it deliberately.
revoke all on function public.get_content_comment_counts(text, uuid[])
  from public, anon, authenticated;
grant execute on function public.get_content_comment_counts(text, uuid[])
  to anon, authenticated;
