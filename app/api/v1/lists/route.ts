import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { VISIBILITIES } from "@/lib/api/enums";
import { applyCommentsScope } from "@/lib/api/comments";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A plain collection, or the tiered kind that seeds its own rows. */
const KINDS = ["COLLECTION", "TIERLIST"] as const;

export const GET = ownedCollection({
  scope: "lists.read",
  table: "game_lists",
  columns:
    "id, public_id, name, description, visibility, ranked, kind, created_at, updated_at",
  order: "updated_at desc, id desc",
});

export const POST = apiRoute({
  scope: "lists.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const name = optionalText(body, "name", 100);
    if (!name || !name.trim())
      throw new ApiFailure("invalid_request", "name is required.");

    const created = await db(async (client) => {
      // Through the function the website uses, not a plain insert: it is what
      // validates the name, and it is what seeds a tierlist's five rows. A
      // tierlist made by inserting the row alone would have no tiers to put
      // anything in.
      const { rows } = await client.query(
        `select id, public_id, name, description, visibility, ranked, kind,
                comments_scope, created_at
           from public.create_game_list(
             list_name => $1, list_description => $2,
             list_visibility => $3::public."Visibility",
             list_ranked => $4, list_kind => $5)`,
        [
          name.trim(),
          optionalText(body, "description", 500),
          optionalOneOf(body, "visibility", VISIBILITIES) ?? "PUBLIC",
          optionalBool(body, "ranked") ?? false,
          optionalOneOf(body, "kind", KINDS) ?? "COLLECTION",
        ],
      );
      const made = rows[0];
      await applyCommentsScope(client, "list", made.id, body);
      return made;
    });

    return { data: created };
  },
});
