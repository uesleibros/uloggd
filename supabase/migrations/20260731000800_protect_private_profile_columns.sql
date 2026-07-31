-- Private profile columns stop being world-readable.
--
-- `profiles_public_read` is `for select using (true)`, and row-level security
-- is exactly that: row level. It never restricted columns, so every column of
-- every profile was readable by anyone holding the publishable key, which ships
-- in the browser bundle by design. Confirmed against the live API with no
-- session: exact birth dates for the whole user base, alongside the age
-- assurance trail and each account's role.
--
-- Birth date is the serious one. The settings screen calls it "private and
-- permanent information", and for a user base with minors in it that gap
-- between promise and reality is not a nicety.
--
-- Column privileges are the fix, since RLS cannot express this. The row policy
-- stays as it is: profiles remain publicly readable, minus these columns.

-- A column-level revoke alone does nothing here: `anon` and `authenticated`
-- both hold a table-wide `grant select on public.profiles`, and a table grant
-- covers every column, including ones added later. The grant has to be taken
-- back and reissued column by column.
--
-- The useful side effect is that this now fails closed: a column added in a
-- later migration is private until someone grants it on purpose. The cost is
-- that they must remember to, or reads of it will error.
revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  locale,
  created_at,
  updated_at,
  banner_url,
  thought,
  verified,
  verified_at,
  verified_by,
  pronouns,
  library_visibility,
  youtube_username,
  instagram_username,
  twitter_username,
  custom_cover_scope,
  profile_comment_scope,
  username_changed_at,
  drawer,
  is_private,
  content_comment_scope,
  profile_visibility,
  account_type,
  organization_tagline
) on public.profiles to anon;

-- Signed-in callers additionally see `role`, because the moderation console
-- lists other accounts' roles. Closing that too needs the console moved onto a
-- definer function first, and is left as a follow-up rather than bundled into
-- a privacy fix. Anonymous enumeration of who moderates the platform ends here.
grant select (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  locale,
  created_at,
  updated_at,
  banner_url,
  thought,
  verified,
  verified_at,
  verified_by,
  pronouns,
  library_visibility,
  youtube_username,
  instagram_username,
  twitter_username,
  custom_cover_scope,
  profile_comment_scope,
  username_changed_at,
  drawer,
  is_private,
  content_comment_scope,
  profile_visibility,
  account_type,
  organization_tagline,
  role
) on public.profiles to authenticated;

/**
 * The caller's own age data.
 *
 * Every read of these columns in the app is a viewer reading themselves: the
 * age gate on a game page, the onboarding redirect, and the settings card.
 * A definer function serves all three without reopening the columns.
 */
create or replace function public.own_age_profile()
returns table(
  birth_date date,
  age_assured_at timestamptz,
  age_assurance_method text
)
language sql stable security definer set search_path = '' as $$
  select p.birth_date, p.age_assured_at, p.age_assurance_method::text
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke all on function public.own_age_profile() from public, anon;
grant execute on function public.own_age_profile() to authenticated;

/** The caller's own role, for the places that only need to gate themselves. */
create or replace function public.own_account_role()
returns public."AccountRole"
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.own_account_role() from public, anon;
grant execute on function public.own_account_role() to authenticated;
