import { apiRoute } from "@/lib/api/route";
import { getGamesByIds } from "@/lib/igdb";
import {
  pickFriendsPlaying,
  type FriendPlayingRow,
} from "@/lib/friends-playing";
import {
  orderNeighbours,
  type RankedNeighbour,
  type NeighbourProfile,
} from "@/lib/taste-neighbours-order";
import type { ProfileLevel } from "@/lib/profile-level";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "social.read",
  bucket: "read",
  handle: async ({ db, identity }) => {
    const data = await db(
      async (client) =>
        (
          await client.query<{
            friends: FriendPlayingRow[];
            ranked: RankedNeighbour[];
            profiles: NeighbourProfile[];
            levels: (ProfileLevel & { profile_id: string })[];
          }>(
            `with
 ranked as materialized (select * from public.taste_neighbours(max_rows => 12)),
 friends as materialized (select g.profile_id,g.igdb_id,g.updated_at,jsonb_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'verified',p.verified) as profiles
  from public.user_games g join public.profiles p on p.id=g.profile_id
  where g.status='PLAYING' and g.profile_id in (select following_id from public.follows where follower_id=$1 limit 1000)
  order by g.updated_at desc limit 40)
 select coalesce((select jsonb_agg(f order by f.updated_at desc) from friends f),'[]'::jsonb) as friends,
 coalesce((select jsonb_agg(r) from ranked r),'[]'::jsonb) as ranked,
 coalesce((select jsonb_agg(p) from (select id,username,display_name,avatar_url,bio,verified,account_type from public.profiles where id in (select profile_id from ranked)) p),'[]'::jsonb) as profiles,
 coalesce((select jsonb_agg(l) from public.profile_levels(targets => array(select profile_id from ranked union select profile_id from friends)) l),'[]'::jsonb) as levels`,
            [identity.profileId],
          )
        ).rows[0],
    );
    const games = await getGamesByIds([
      ...new Set(data.friends.map((row) => row.igdb_id)),
    ]);
    return {
      data: {
        friends: pickFriendsPlaying(
          data.friends,
          new Map(games.map((game) => [game.id, game])),
          10,
        ),
        neighbours: orderNeighbours(data.ranked, data.profiles),
        levels: data.levels,
      },
    };
  },
});
