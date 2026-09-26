import {
  jsonBody,
  optionalText,
  optionalUuid,
  requireOneOf,
} from "@/lib/api/body";
import { ApiFailure } from "@/lib/api/route";
import { segmentBefore, UUID } from "@/lib/api/path";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["NOTE", "SHOT", "PROGRESS", "STOP"] as const;

/**
 * Appends one thing that happened.
 *
 * Append-only on purpose: a playlog is what the session was like as it went,
 * and an editable one is a draft of a post instead. The instant is the
 * database's `now()` unless the caller says otherwise, clamped between the
 * session's start and now so a late entry can still say when it happened.
 */
export const POST = apiRoute({
  scope: "journal.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const session = segmentBefore(request, 1, "session id", UUID);
    const body = await jsonBody(request);
    const kind = requireOneOf(body, "kind", KINDS);
    const shotId = optionalUuid(body, "screenshot_id");
    // The upload answers with the short id a screenshot's page is at, which
    // is the id the browser has in its hand a moment after taking one. The
    // row's own id is what the event points at, so it is resolved here
    // rather than making the caller ask for it separately.
    const shotPublicId = optionalText(body, "screenshot_public_id", 32);
    const data = await db(async (client) => {
      let shot = shotId;
      if (!shot && shotPublicId) {
        const { rows } = await client.query<{ id: string }>(
          "select id from public.screenshots where public_id = $1 and deleted_at is null",
          [shotPublicId],
        );
        if (!rows[0])
          throw new ApiFailure("not_found", "No screenshot with that id.");
        shot = rows[0].id;
      }
      const parameters = [
        session,
        kind,
        optionalText(body, "body", 500),
        optionalText(body, "marker", 80),
        shot,
      ];
      const { rows: made } = await client.query(
        `select id, entry_id, kind, body, marker, screenshot_id, at
           from public.add_play_event(
             session => $1, event_kind => $2, event_body => $3,
             event_marker => $4, shot => $5)`,
        parameters,
      );
      return made[0];
    });
    return { data };
  },
});
