import { jsonBody, optionalText } from "@/lib/api/body";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "journey id", UUID);
    const body = await jsonBody(request);
    const title = optionalText(body, "title", 120);
    if (!title) throw new ApiFailure("invalid_request", "title is required.");

    return await db(async (client) => {
      await client.query(
        "select public.rename_journey(target_journey => $1, journey_title => $2)",
        [id, title],
      );
      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, title, updated_at
           from public.journeys where id = $1`,
        [id],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No journey of yours with that id.");
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "journey id", UUID);
    await db((client) =>
      client.query("select public.delete_journey(target_journey => $1)", [id]),
    );
    return { data: { id, deleted: true } };
  },
});
