import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { VISIBILITIES } from "@/lib/api/enums";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const name = optionalText(body, "name", 120);
    if (!name || !name.trim())
      throw new ApiFailure("invalid_request", "name is required.");

    const created = await db(async (client) => {
      const { rows } = await client.query(
        `insert into public.game_lists
           (profile_id, name, description, visibility, ranked)
         values ($1, $2, $3, $4::public."Visibility", $5)
         returning id, public_id, name, description, visibility, ranked, kind,
                   created_at`,
        [
          identity.profileId,
          name.trim(),
          optionalText(body, "description", 1000),
          optionalOneOf(body, "visibility", VISIBILITIES) ?? "PUBLIC",
          optionalBool(body, "ranked") ?? false,
        ],
      );
      return rows[0];
    });

    return { data: created };
  },
});
