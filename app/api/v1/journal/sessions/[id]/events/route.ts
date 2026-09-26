import {
  jsonBody,
  optionalText,
  optionalUuid,
  requireOneOf,
} from "@/lib/api/body";
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
    const parameters = [
      session,
      requireOneOf(body, "kind", KINDS),
      optionalText(body, "body", 500),
      optionalText(body, "marker", 80),
      optionalUuid(body, "screenshot_id"),
    ];
    const data = await db(async (client) => {
      const { rows } = await client.query(
        `select id, entry_id, kind, body, marker, screenshot_id, at
           from public.add_play_event(
             session => $1, event_kind => $2, event_body => $3,
             event_marker => $4, shot => $5)`,
        parameters,
      );
      return rows[0];
    });
    return { data };
  },
});
