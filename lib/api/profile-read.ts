import "server-only";
import type { PoolClient } from "pg";
import type { PublicProfile, ProfileSummary } from "@/lib/profile-types";
import { ApiFailure } from "./route";

// Enumerating public columns keeps new account settings private by default.
export const PROFILE_COLUMNS = `id,username,display_name,pronouns,bio,drawer,thought,
  avatar_url,banner_url,created_at,verified,verified_at,account_type,
  organization_tagline,organization_category,organization_url,is_private,
  youtube_username,instagram_username,twitter_username,twitch_username,
  twitch_live_visible,steam_id,steam_username,steam_playing_visible,
  profile_comment_scope,library_visibility`;

export const PROFILE_TARGET = `select id,account_type from public.profiles
  where lower(username) = lower($1)
     or lower(username) = lower(public.resolve_username_alias(candidate => $1))
  order by (lower(username) = lower($1)) desc limit 1`;

export async function readProfile(client: PoolClient, username: string) {
  const { rows } = await client.query<PublicProfile>(
    `select ${PROFILE_COLUMNS} from public.profiles
      where lower(username) = lower($1)
         or lower(username) = lower(public.resolve_username_alias(candidate => $1))
      order by (lower(username) = lower($1)) desc limit 1`,
    [username],
  );
  if (!rows[0]) throw new ApiFailure("not_found", "No account with that name.");
  return rows[0];
}

export async function readProfileSummary(client: PoolClient, username: string) {
  // Scalar aggregates avoid transferring whole collections just to count them.
  const { rows } = await client.query<ProfileSummary>(
    `with target as (${PROFILE_TARGET}) select
      (select count(*)::int from public.user_games where profile_id = target.id) as library,
      (select count(*)::int from public.game_lists where profile_id = target.id and visibility = 'PUBLIC') as lists,
      (select count(*)::int from public.reviews where profile_id = target.id) as reviews,
      (select count(*)::int from public.diary_entries where profile_id = target.id) as diary,
      (select count(*)::int from public.screenshots where profile_id = target.id) as screenshots,
      (select count(*)::int from public.follows where following_id = target.id) as followers,
      (select count(*)::int from public.follows where follower_id = target.id) as following,
      exists(select 1 from public.follows where following_id = target.id and follower_id = auth.uid()) as viewer_follows from target`,
    [username],
  );
  if (!rows[0]) throw new ApiFailure("not_found", "No account with that name.");
  return rows[0];
}
