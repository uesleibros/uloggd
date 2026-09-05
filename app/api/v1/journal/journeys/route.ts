import {
  jsonBody,
  optionalText,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "journal.read",
  table: "journeys",
  columns: "id, public_id, igdb_id, game_slug, title, created_at, updated_at",
  order: "created_at desc, id desc",
});

export const POST = apiRoute({
  scope: "journal.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const title = optionalText(body, "title", 120);
    if (!title || !title.trim())
      throw new ApiFailure("invalid_request", "title is required.");

    const created = await db(async (client) => {
      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, title, created_at, updated_at
           from public.create_journey(
             game_id => $1, game_slug => $2, journey_title => $3)`,
        [gameId, slug, title.trim()],
      );
      return rows[0];
    });

    return { data: created };
  },
});
