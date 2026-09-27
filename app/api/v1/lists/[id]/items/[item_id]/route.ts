import {
  clearing,
  jsonBody,
  optionalBool,
  optionalInt,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { MARK_COLORS, MARK_MODES } from "@/lib/api/enums";
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
    // How the item looks in this list, and nothing about what it means: the
    // author decides that, in the list's own description. A colour only
    // travels with COLOR, and `null` for the mode is no treatment at all.
    const markMode = optionalOneOf(body, "mark_mode", MARK_MODES);
    // One of the nine names, or a literal `#rrggbb` for the author whose
    // legend needs a colour the palette does not have.
    const namedColor = optionalOneOf(body, "mark_color", MARK_COLORS);
    const literalColor = namedColor
      ? null
      : optionalText(body, "mark_color", 7);
    if (literalColor !== null && !/^#[0-9a-fA-F]{6}$/.test(literalColor))
      throw new ApiFailure(
        "invalid_request",
        `mark_color must be one of ${MARK_COLORS.join(", ")} or a #rrggbb colour.`,
      );
    const markColor = namedColor ?? literalColor;
    const clearMark = clearing(body, "mark_mode");
    // The door this used to have, kept for anything written against it: a
    // ticked item was a dimmed one, so that is what it becomes.
    const legacyMarked = optionalBool(body, "marked");
    const marking =
      markMode !== null ||
      clearMark ||
      legacyMarked !== null ||
      markColor !== null;

    if (note === null && position === null && direction === null && !marking)
      throw new ApiFailure(
        "invalid_request",
        "Send a note, a mark, a position, or a direction of up, down or top.",
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
      if (marking) {
        const mode = clearMark
          ? null
          : (markMode ??
            (legacyMarked === null ? null : legacyMarked ? "DIM" : null) ??
            (markColor ? "COLOR" : null));
        await client.query(
          `select public.set_list_item_mark(
             target_list => $1, item_id => $2, mode => $3, colour => $4)`,
          [listId, itemId, mode, mode === "COLOR" ? markColor : null],
        );
      }

      const { rows } = await client.query(
        `select id, igdb_id, game_slug, position, note, mark_mode, mark_color,
                created_at
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
