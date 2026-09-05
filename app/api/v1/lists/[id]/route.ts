import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const id = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    if (!/^[0-9a-zA-Z_-]{1,64}$/.test(id))
      throw new ApiFailure("invalid_request", "That is not a list id.");

    return await db(async (client) => {
      const { rows: lists } = await client.query(
        `select id, public_id, profile_id, name, description, visibility,
                ranked, kind, created_at, updated_at
           from public.game_lists
          where id::text = $1 or public_id = $1
          limit 1`,
        [id],
      );
      const list = lists[0];
      if (!list) throw new ApiFailure("not_found", "No list with that id.");

      const { rows: items } = await client.query(
        `select id, igdb_id, game_slug, position, note, created_at
           from public.game_list_items
          where list_id = $1
          order by position asc, id asc
          limit 500`,
        [list.id],
      );

      const owned = list.profile_id === identity.profileId;
      delete list.profile_id;
      return { data: { ...list, owned, items } };
    });
  },
});
