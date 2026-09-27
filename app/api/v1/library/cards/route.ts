import { apiRoute } from "@/lib/api/route";
import { gameIds } from "@/lib/api/game-ids";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    // No `ids` means the summary on its own: the counts are over the whole
    // library rather than over the ids, so there is a real question to ask here
    // without naming a single game, and the rail that prints those counts has
    // no game to name. With ids, `gameIds` stays as strict as it was.
    const query = new URL(request.url).searchParams;
    const asked = query.get("ids");
    const ids = asked === null ? [] : gameIds(request);
    // `all=1` is the other real question with no game to name: what does the
    // caller's whole library say. It exists for the reads that are about the
    // shelf rather than about a screenful of it, such as which series it is
    // made of, and it is capped so that it stays one answer rather than a
    // download.
    const everything = asked === null && query.get("all") === "1";
    return db(async (client) => {
      const { rows } = await client.query(
        `select
    coalesce((select jsonb_agg(c) from (select igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at from public.user_games where profile_id=$1 and ($3 or igdb_id=any($2::integer[])) order by updated_at desc limit 3000) c),'[]'::jsonb) as data,
    (select jsonb_build_object('library',count(*)::int,'playing',count(*) filter(where playing)::int,'rated',count(*) filter(where quick_rating is not null)::int,
      'username',(select username from public.profiles where id=$1)) from public.user_games where profile_id=$1) as summary`,
        [identity.profileId, ids, everything],
      );
      return rows[0];
    });
  },
});
