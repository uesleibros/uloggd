import { apiRoute } from "@/lib/api/route";
import { gameIds } from "@/lib/api/game-ids";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const ids = gameIds(request);
    return db(async (client) => {
      const { rows } = await client.query(
        `select
    coalesce((select jsonb_agg(c) from (select igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at from public.user_games where profile_id=$1 and igdb_id=any($2::integer[])) c),'[]'::jsonb) as data,
    (select jsonb_build_object('library',count(*)::int,'playing',count(*) filter(where status='PLAYING')::int,'rated',count(*) filter(where quick_rating is not null)::int,
      'username',(select username from public.profiles where id=$1)) from public.user_games where profile_id=$1) as summary`,
        [identity.profileId, ids],
      );
      return rows[0];
    });
  },
});
