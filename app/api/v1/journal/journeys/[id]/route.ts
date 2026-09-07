import { readContent } from "@/lib/api/content-read";
import type { JourneyRecord } from "@/lib/content-types";
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

    // The function answers false for a journey that is not there, or is
    // somebody else's. Reporting that as deleted would be telling the caller
    // something went away when nothing did.
    const removed = await db(async (client) => {
      const { rows } = await client.query<{ done: boolean }>(
        "select public.delete_journey(target_journey => $1) as done",
        [id],
      );
      return rows[0]?.done ?? false;
    });
    if (!removed)
      throw new ApiFailure("not_found", "No journey of yours with that id.");
    return { data: { id, deleted: true } };
  },
});

export const GET = apiRoute({
  public: true,
  scope: "journal.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const id = decodeURIComponent(
        new URL(request.url).pathname.split("/").pop() ?? "",
      );
      const data = await readContent<JourneyRecord>(client, "journey", id);
      const { rows } = await client.query(
        `select
      (select to_jsonb(l) from public.profile_level(target => $1) l) as standing,
      exists(select 1 from public.profile_suspension(target => $1)) as suspended,
      (select count(*)::int from public.diary_entries where journey_id=$2 and visibility='PUBLIC') as public_sessions`,
        [data.profile_id, data.id],
      );
      return { data, ...rows[0] };
    }),
});
