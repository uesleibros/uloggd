-- A recorded session can cross New Year's Day. Both years include that game.
create or replace function private.award_played_ids(owner_id uuid, award_year integer)
returns setof integer language sql stable security definer set search_path='' as $$
  select igdb_id from public.diary_entries where profile_id=owner_id
    and open_since is null
    and played_on < make_date(award_year+1,1,1)
    and coalesce(ended_on,played_on) >= make_date(award_year,1,1)
  union select igdb_id from public.reviews where profile_id=owner_id and (
    started_on >= make_date(award_year,1,1) and started_on < make_date(award_year+1,1,1)
    or finished_on >= make_date(award_year,1,1) and finished_on < make_date(award_year+1,1,1))
  union select igdb_id from public.journeys where profile_id=owner_id and (
    started_on >= make_date(award_year,1,1) and started_on < make_date(award_year+1,1,1)
    or finished_on >= make_date(award_year,1,1) and finished_on < make_date(award_year+1,1,1))
$$;
