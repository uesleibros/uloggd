-- Take your data out, or take it down.
--
-- Two things every account should be able to do without asking anyone, and
-- neither existed. Export is the one that makes the rest defensible: erasure
-- is only reasonable if the person could have kept a copy first.
--
-- Both are definer functions rather than a pile of client-side deletes. A
-- client loop that removes twelve tables one call at a time is not atomic, so
-- a dropped connection halfway leaves an account half deleted with no record
-- of where it stopped. These either finish or roll back.

/**
 * Everything an account has written, as one JSON document.
 *
 * The caller's own rows only, and no other person's: comments someone else
 * left on your profile are their words, and a report you filed names an
 * account that did not agree to be in your export. What comes out is what you
 * put in.
 *
 * Aggregated in one statement so the snapshot is consistent. Twelve separate
 * reads could each land at a different instant and produce a document that
 * never existed.
 */
create or replace function public.export_account_data()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (
      select to_jsonb(p) - 'verified_by'
        from public.profiles p where p.id = auth.uid()
    ),
    'library', (
      select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
        from public.user_games g where g.profile_id = auth.uid()
    ),
    'reviews', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
        from public.reviews r where r.profile_id = auth.uid()
    ),
    'sessions', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
        from public.diary_entries d where d.profile_id = auth.uid()
    ),
    'journeys', (
      select coalesce(jsonb_agg(to_jsonb(j)), '[]'::jsonb)
        from public.journeys j where j.profile_id = auth.uid()
    ),
    'lists', (
      select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
        from public.game_lists l where l.profile_id = auth.uid()
    ),
    'screenshots', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
        from public.screenshots s where s.profile_id = auth.uid()
    ),
    'comments', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
        from public.content_comments c where c.author_id = auth.uid()
    ),
    'profile_comments', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
        from public.profile_comments c where c.author_id = auth.uid()
    ),
    'follows', (
      select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        from public.follows f where f.follower_id = auth.uid()
    ),
    'minerals', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
        from public.mineral_grants m where m.profile_id = auth.uid()
    ),
    'recently_viewed', (
      select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
        from public.content_views v where v.viewer_id = auth.uid()
    )
  )
  where auth.uid() is not null
$$;

revoke all on function public.export_account_data() from public, anon;
grant execute on function public.export_account_data() to authenticated;

/**
 * Deletes one category of the caller's own data.
 *
 * Named categories rather than a table name, because a table name is an
 * implementation detail and passing one from the client is a way to discover
 * the schema by guessing at it. An unknown category is refused rather than
 * silently doing nothing, so a typo in the interface is loud.
 *
 * Returns how many rows went, which is the only honest confirmation: "done"
 * over an empty delete tells someone their data is gone when nothing was
 * there to go.
 */
create or replace function public.erase_account_data(category text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  removed bigint := 0;
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  case category
    when 'library' then
      delete from public.user_games where profile_id = caller;
    when 'reviews' then
      delete from public.reviews where profile_id = caller;
    when 'sessions' then
      delete from public.diary_entries where profile_id = caller;
    when 'journeys' then
      -- Sessions reference a journey and are meant to survive it, so they are
      -- detached rather than cascaded: deleting a journey should not silently
      -- take a year of logs with it.
      update public.diary_entries set journey_id = null
       where profile_id = caller and journey_id is not null;
      delete from public.journeys where profile_id = caller;
    when 'lists' then
      delete from public.game_lists where profile_id = caller;
    when 'screenshots' then
      delete from public.screenshots where profile_id = caller;
    when 'comments' then
      delete from public.content_comments where author_id = caller;
      delete from public.profile_comments where author_id = caller;
    when 'views' then
      delete from public.content_views where viewer_id = caller;
    else
      raise exception 'unknown category: %', category using errcode = '22023';
  end case;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.erase_account_data(text) from public, anon;
grant execute on function public.erase_account_data(text) to authenticated;

/**
 * Deletes the caller's account and everything hanging off it.
 *
 * Removes the `auth.users` row, which cascades through `profiles` and from
 * there through every table that references it. Doing it the other way round,
 * clearing the profile and leaving the login, produces an account that can
 * sign in to nothing and is the state support tickets are made of.
 *
 * There is no undo and none is implied. The interface asks for the username
 * to be typed before this is called, which is the last point where a mistake
 * is still recoverable.
 */
create or replace function public.delete_own_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
