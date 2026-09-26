import {
  jsonBody,
  optionalBool,
  optionalInt,
  optionalText,
} from "@/lib/api/body";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Closes it, which is what turns a session into a post.
 *
 * PATCH rather than a verb in the path: the only change an open session takes
 * is the one that ends it, and what comes back is the entry the journal now
 * holds. `minutes` left out means the clock's own count, capped in the
 * database.
 */
export const PATCH = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "session id", UUID);
    const body = await jsonBody(request);
    const parameters = [
      id,
      optionalInt(body, "minutes", 0, 100000),
      optionalText(body, "note", 5000),
      optionalBool(body, "marks_finish"),
    ];
    const data = await db(async (client) => {
      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, played_on, ended_on,
                minutes, note, visibility, journey_id, marks_finish, updated_at
           from public.close_play_session(
             session => $1, session_minutes => $2,
             session_note => $3, finished => $4)`,
        parameters,
      );
      return rows[0];
    });
    return { data };
  },
});

/**
 * Throws away a session that recorded nothing.
 *
 * Refused once there is an event on it: opened and forgotten is not a thing
 * somebody did, but opened and written in is, and closing is the way out of
 * that one.
 */
export const DELETE = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "session id", UUID);
    const gone = await db(async (client) => {
      const { rows } = await client.query<{ done: boolean }>(
        "select public.abandon_play_session(session => $1) as done",
        [id],
      );
      return rows[0]?.done ?? false;
    });
    if (!gone)
      throw new ApiFailure(
        "conflict",
        "That session is not open, is not yours, or already has something in it.",
      );
    return { data: { id, deleted: true } };
  },
});
