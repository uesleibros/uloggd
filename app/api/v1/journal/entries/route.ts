import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
  optionalTime,
  optionalUuid,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { VISIBILITIES } from "@/lib/api/enums";
import { applyCommentsScope } from "@/lib/api/comments";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  game: true,
  scope: "journal.read",
  table: "diary_entries",
  columns:
    "id, public_id, igdb_id, game_slug, played_on, ended_on, started_at, minutes, note, contains_spoilers, sensitive, comments_scope, visibility, marks_start, marks_finish, journey_id, created_at, updated_at",
  order: "played_on desc, id desc",
});

export const POST = apiRoute({
  scope: "journal.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const parameters = [
      requireInt(body, "igdb_id"),
      requireSlug(body, "game_slug"),
      optionalDate(body, "played_on") ?? new Date().toISOString().slice(0, 10),
      optionalDate(body, "ended_on"),
      optionalInt(body, "minutes", 0, 100000),
      optionalText(body, "note", 1000),
      optionalBool(body, "contains_spoilers") ?? false,
      optionalOneOf(body, "visibility", VISIBILITIES) ?? "PUBLIC",
      optionalBool(body, "marks_start") ?? false,
      optionalBool(body, "marks_finish") ?? false,
      optionalUuid(body, "journey_id"),
      optionalTime(body, "started_at"),
    ];

    const saved = await db(async (client) => {
      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, played_on, ended_on,
                started_at, minutes, note, visibility, contains_spoilers,
                journey_id, created_at
           from public.save_diary_entry(
           game_id => $1, game_slug => $2, entry_date => $3, entry_end => $4,
           entry_minutes => $5, entry_note => $6, spoilers => $7,
           entry_visibility => $8::public."Visibility",
           entry_marks_start => $9, entry_marks_finish => $10,
           entry_journey => $11, entry_time => $12::time
         )`,
        parameters,
      );
      const made = rows[0];
      await applyCommentsScope(client, "diary", made.id, body);
      return made;
    });

    return { data: saved };
  },
});
