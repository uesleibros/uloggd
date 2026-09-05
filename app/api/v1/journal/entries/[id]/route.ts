import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
  optionalTime,
  optionalUuidList,
} from "@/lib/api/body";
import { VISIBILITIES } from "@/lib/api/enums";
import { lastSegment, UUID } from "@/lib/api/path";
import { applyCommentsScope } from "@/lib/api/comments";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "entry id", UUID);
    const body = await jsonBody(request);

    return await db(async (client) => {
      const { rows: existing } = await client.query(
        `select id, played_on, ended_on, started_at, minutes, note,
                contains_spoilers, visibility, marks_start, marks_finish
           from public.diary_entries where id = $1`,
        [id],
      );
      const before = existing[0];
      if (!before)
        throw new ApiFailure("not_found", "No entry of yours with that id.");
      const keep = <T>(next: T | null, current: T) =>
        next === null ? current : next;

      await applyCommentsScope(client, "diary", id, body);

      await client.query(
        `select public.update_diary_entry(
           entry_id => $1, entry_date => $2, entry_end => $3,
           entry_minutes => $4, entry_note => $5, spoilers => $6,
           entry_visibility => $7::public."Visibility",
           entry_marks_start => $8, entry_marks_finish => $9,
           entry_time => $10::time
         )`,
        [
          id,
          keep(optionalDate(body, "played_on"), before.played_on),
          keep(optionalDate(body, "ended_on"), before.ended_on),
          keep(optionalInt(body, "minutes", 0, 100000), before.minutes),
          keep(optionalText(body, "note", 5000), before.note),
          keep(
            optionalBool(body, "contains_spoilers"),
            before.contains_spoilers,
          ),
          keep(
            optionalOneOf(body, "visibility", VISIBILITIES),
            before.visibility,
          ),
          keep(optionalBool(body, "marks_start"), before.marks_start),
          keep(optionalBool(body, "marks_finish"), before.marks_finish),
          keep(optionalTime(body, "started_at"), before.started_at),
        ],
      );

      // Two writes of their own, because neither is a column
      // update_diary_entry touches: the flag keeps a record of an automatic
      // mark that turning it off must not erase, and the order is one
      // statement over many rows rather than a value on this one.
      const sensitive = optionalBool(body, "sensitive");
      if (sensitive !== null)
        await client.query(
          `select public.mark_diary_sensitive(
             entry => $1, value => $2, detected => $3)`,
          // sensitive_detected only ever turns on: an override that erased the
          // record of an automatic mark would be an override nobody could
          // review afterwards.
          [id, sensitive, optionalBool(body, "sensitive_detected") ?? false],
        );

      const order = optionalUuidList(body, "image_order", 12);
      if (order)
        await client.query(
          `select public.reorder_diary_entry_images(
             target_entry => $1, image_ids => $2::uuid[])`,
          [id, order],
        );

      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, played_on, ended_on,
                started_at, minutes, note, visibility, contains_spoilers,
                sensitive, comments_scope, journey_id, updated_at
           from public.diary_entries where id = $1`,
        [id],
      );
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "entry id", UUID);
    const removed = await db(async (client) => {
      const { rows } = await client.query(
        "select public.delete_diary_entry(entry_id => $1) as done",
        [id],
      );
      return rows[0]?.done;
    });
    if (removed === false)
      throw new ApiFailure("not_found", "No entry of yours with that id.");
    return { data: { id, deleted: true } };
  },
});
