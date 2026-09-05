import { jsonBody, requireInt, requireSlug } from "@/lib/api/body";
import { LIST_ID, segmentBefore } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiRoute({
  scope: "lists.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const listRef = segmentBefore(request, 1, "list id", LIST_ID);
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");

    return await db(async (client) => {
      const { rows: lists } = await client.query(
        `select id from public.game_lists
          where id::text = $1 or public_id = $1
          limit 1`,
        [listRef],
      );
      const list = lists[0];
      if (!list) throw new ApiFailure("not_found", "No list with that id.");

      await client.query(
        `select public.add_game_to_list(
           target_list => $1, game_id => $2, game_slug => $3)`,
        [list.id, gameId, slug],
      );

      const { rows } = await client.query(
        `select id, igdb_id, game_slug, position, note, created_at
           from public.game_list_items
          where list_id = $1 and igdb_id = $2
          limit 1`,
        [list.id, gameId],
      );
      return { data: rows[0] ?? null };
    });
  },
});
