import { getTierlist } from "@/lib/api/tierlist-read";
import { jsonBody } from "@/lib/api/body";
import { LIST_ID, segmentBefore } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A tierlist's rows and where every game sits, saved as one thing.
 *
 * Not a PATCH of each item: a tierlist is only ever meaningful whole. Saving
 * a row and its contents separately would leave a moment where a game is in a
 * tier nobody defined, and the database writes both in one statement for
 * exactly that reason.
 */
export const PUT = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const listRef = segmentBefore(request, 1, "list id", LIST_ID);
    const body = await jsonBody(request);

    if (!Array.isArray(body.tiers) || !Array.isArray(body.items))
      throw new ApiFailure(
        "invalid_request",
        "tiers and items are both required, and both are lists.",
      );

    return await db(async (client) => {
      const { rows: lists } = await client.query<{ id: string; kind: string }>(
        `select id, kind from public.game_lists
          where id::text = $1 or public_id = $1
          limit 1`,
        [listRef],
      );
      const list = lists[0];
      if (!list) throw new ApiFailure("not_found", "No list with that id.");

      await client.query(
        `select public.save_tierlist(
           target_list => $1, tiers => $2::jsonb, items => $3::jsonb)`,
        [list.id, JSON.stringify(body.tiers), JSON.stringify(body.items)],
      );
      return { data: { id: list.id, saved: true } };
    });
  },
});

export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) =>
    db(async (client) => {
      const id = segmentBefore(request, 1, "list id", LIST_ID);
      const { rows } = await client.query(
        "select id,profile_id,kind from public.game_lists where id::text=$1 or public_id=$1 limit 1",
        [id],
      );
      const list = rows[0];
      if (!list || list.kind !== "TIERLIST")
        throw new ApiFailure("not_found", "No visible tierlist with that id.");
      return {
        data: await getTierlist(client, list.id, list.profile_id, {
          includePool:
            new URL(request.url).searchParams.get("pool") === "1" &&
            identity?.profileId === list.profile_id,
        }),
      };
    }),
});
