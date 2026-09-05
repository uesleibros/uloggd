import {
  jsonBody,
  optionalInt,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { LIST_ID, segmentBefore, lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTIONS = ["up", "down", "top"] as const;

/** The list and the item, checked to belong together before anything moves. */
async function locate(
  client: {
    query: (
      sql: string,
      values: unknown[],
    ) => Promise<{ rows: { id: string; igdb_id: number }[] }>;
  },
  listRef: string,
  itemId: string,
) {
  const { rows: lists } = await client.query(
    "select id, 0 as igdb_id from public.game_lists where id::text = $1 or public_id = $1 limit 1",
    [listRef],
  );
  if (!lists[0]) throw new ApiFailure("not_found", "No list with that id.");

  const { rows: items } = await client.query(
    "select id, igdb_id from public.game_list_items where id = $1 and list_id = $2",
    [itemId, lists[0].id],
  );
  if (!items[0])
    throw new ApiFailure("not_found", "That list has no item with that id.");

  return { listId: lists[0].id, item: items[0] };
}

export const PATCH = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const listRef = segmentBefore(request, 2, "list id", LIST_ID);
    const itemId = lastSegment(request, "item id", UUID);
    const body = await jsonBody(request);

    const note = optionalText(body, "note", 500);
    const position = optionalInt(body, "position", 0, 10_000);
    const direction = optionalOneOf(body, "direction", DIRECTIONS);

    if (note === null && position === null && direction === null)
      throw new ApiFailure(
        "invalid_request",
        "Send a note, a position, or a direction of up, down or top.",
      );
    if (position !== null && direction !== null)
      throw new ApiFailure(
        "invalid_request",
        "Send a position or a direction, not both.",
      );

    return await db(async (client) => {
      const { listId } = await locate(client, listRef, itemId);

      if (note !== null)
        await client.query(
          "select public.set_list_item_note(target_list => $1, item_id => $2, item_note => $3)",
          [listId, itemId, note],
        );
      if (position !== null)
        await client.query(
          "select public.place_list_item(target_list => $1, item_id => $2, new_position => $3)",
          [listId, itemId, position],
        );
      if (direction !== null)
        await client.query(
          "select public.move_list_item(target_list => $1, item_id => $2, direction => $3)",
          [listId, itemId, direction],
        );

      const { rows } = await client.query(
        `select id, igdb_id, game_slug, position, note, created_at
           from public.game_list_items where id = $1`,
        [itemId],
      );
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const listRef = segmentBefore(request, 2, "list id", LIST_ID);
    const itemId = lastSegment(request, "item id", UUID);

    return await db(async (client) => {
      // The removal takes the game rather than the row, so the row has to say
      // which game it was before it goes.
      const { listId, item } = await locate(client, listRef, itemId);
      await client.query(
        "select public.remove_game_from_list(target_list => $1, game_id => $2)",
        [listId, item.igdb_id],
      );
      return { data: { id: itemId, deleted: true } };
    });
  },
});
