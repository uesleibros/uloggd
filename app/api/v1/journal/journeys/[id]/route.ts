import { readContent } from "@/lib/api/content-read";
import type { JourneyRecord } from "@/lib/content-types";
import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalOneOf,
  optionalText,
  optionalUuid,
} from "@/lib/api/body";
import { JOURNEY_STATUSES } from "@/lib/api/enums";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Renames a run, or says what kind of run it was.
 *
 * One field at a time on purpose: the interface saves what somebody just
 * changed rather than the whole shape of the thing, so anything left out of
 * the body stays as it is. A run with nothing filled in is the honest state
 * of most of them and never has to be completed.
 */
export const PATCH = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "journey id", UUID);
    const body = await jsonBody(request);
    const title = optionalText(body, "title", 120);
    const details = {
      status: optionalOneOf(body, "status", JOURNEY_STATUSES),
      started_on: optionalDate(body, "started_on"),
      finished_on: optionalDate(body, "finished_on"),
      library_entry_id: optionalUuid(body, "library_entry_id"),
      replay: optionalBool(body, "replay"),
      mastered: optionalBool(body, "mastered"),
      difficulty: optionalText(body, "difficulty", 80),
      progress: optionalText(body, "progress", 160),
    };
    const touched = Object.values(details).some((value) => value !== null);
    if (!title && !touched)
      throw new ApiFailure(
        "invalid_request",
        "Send a title, or at least one of status, started_on, finished_on, library_entry_id, replay, mastered, difficulty or progress.",
      );

    return await db(async (client) => {
      if (title)
        await client.query(
          "select public.rename_journey(target_journey => $1, journey_title => $2)",
          [id, title],
        );
      if (touched)
        await client.query(
          `select public.update_journey_details(
             target_journey => $1, journey_status => $2, started => $3,
             finished => $4, copy => $5, is_replay => $6, is_mastered => $7,
             journey_difficulty => $8, journey_progress => $9)`,
          [
            id,
            details.status,
            details.started_on,
            details.finished_on,
            details.library_entry_id,
            details.replay,
            details.mastered,
            details.difficulty,
            details.progress,
          ],
        );

      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, title, status, started_on,
                finished_on, library_entry_id, replay, mastered, difficulty,
                progress, updated_at
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
      (select count(*)::int from public.diary_entries where journey_id=$2 and visibility='PUBLIC') as public_sessions,
      -- The run as a playthrough: its totals, its review and the copy it was
      -- played on, aggregated in the database rather than counted from rows
      -- the browser would have to be handed.
      (select to_jsonb(o) from public.journey_overview(
         owner => $1, target => $2) o) as overview`,
        [data.profile_id, data.id],
      );
      return { data, ...rows[0] };
    }),
});
