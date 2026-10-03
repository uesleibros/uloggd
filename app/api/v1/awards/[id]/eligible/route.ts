import { apiRoute, ApiFailure } from "@/lib/api/route";
import { awardKey } from "@/lib/api/awards";
import { getGamesByIds } from "@/lib/igdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const params = new URL(request.url).searchParams;
    const page = Math.max(
      1,
      Math.min(1000, Math.trunc(Number(params.get("page")) || 1)),
    );
    const q = (params.get("q") ?? "")
      .trim()
      .slice(0, 100)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const rows = await db(async (client) => {
      const key = awardKey(request, true);
      const { rows: editions } = await client.query(
        `select id from public.game_awards where ${key[0]}=$1 and profile_id=$2`,
        [key[1], identity.profileId],
      );
      if (!editions[0])
        throw new ApiFailure("not_found", "No award of yours with that id.");
      return (
        await client.query<{ igdb_id: number; matching: number }>(
          `select igdb_id,count(*) over()::integer as matching from public.award_eligible_games($1)
       where $2='' or game_slug ilike '%' || $2 || '%' escape '\\' order by game_slug,igdb_id limit 48 offset $3`,
          [
            editions[0].id,
            q.replace(/[\\%_]/g, (c) => `\\${c}`),
            (page - 1) * 48,
          ],
        )
      ).rows;
    });
    const games = await getGamesByIds(rows.map((r) => r.igdb_id));
    return {
      data: games.map(({ id, name, slug, coverUrl }) => ({
        id,
        name,
        slug,
        coverUrl,
      })),
      has_more: (rows[0]?.matching ?? 0) > page * 48,
      page,
    };
  },
});
