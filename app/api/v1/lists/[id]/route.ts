import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { VISIBILITIES } from "@/lib/api/enums";
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

export const PATCH = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    if (!/^[0-9a-zA-Z_-]{1,64}$/.test(id))
      throw new ApiFailure("invalid_request", "That is not a list id.");
    const body = await jsonBody(request);

    return await db(async (client) => {
      const { rows: lists } = await client.query(
        `select id, name, description, visibility, ranked
           from public.game_lists
          where id::text = $1 or public_id = $1
          limit 1`,
        [id],
      );
      const before = lists[0];
      if (!before)
        throw new ApiFailure("not_found", "No list of yours with that id.");
      const keep = <T>(next: T | null, current: T) =>
        next === null ? current : next;

      await client.query(
        `select public.update_game_list(
           target_list => $1, list_name => $2, list_description => $3,
           list_visibility => $4::public."Visibility", list_ranked => $5)`,
        [
          before.id,
          keep(optionalText(body, "name", 120), before.name),
          keep(optionalText(body, "description", 1000), before.description),
          keep(
            optionalOneOf(body, "visibility", VISIBILITIES),
            before.visibility,
          ),
          keep(optionalBool(body, "ranked"), before.ranked),
        ],
      );

      const { rows } = await client.query(
        `select id, public_id, name, description, visibility, ranked, kind,
                updated_at
           from public.game_lists where id = $1`,
        [before.id],
      );
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    if (!/^[0-9a-zA-Z_-]{1,64}$/.test(id))
      throw new ApiFailure("invalid_request", "That is not a list id.");

    const removed = await db(async (client) => {
      const { rowCount } = await client.query(
        "delete from public.game_lists where id::text = $1 or public_id = $1",
        [id],
      );
      return rowCount ?? 0;
    });
    if (removed === 0)
      throw new ApiFailure("not_found", "No list of yours with that id.");
    return { data: { id, deleted: true } };
  },
});
