import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { VISIBILITIES } from "@/lib/api/enums";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "journal.read",
  table: "diary_entries",
  columns:
    "id, public_id, igdb_id, game_slug, played_on, ended_on, minutes, note, contains_spoilers, visibility, marks_start, marks_finish, journey_id, created_at, updated_at",
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
      optionalText(body, "note", 5000),
      optionalBool(body, "contains_spoilers") ?? false,
      optionalOneOf(body, "visibility", VISIBILITIES) ?? "PUBLIC",
      optionalBool(body, "marks_start") ?? false,
      optionalBool(body, "marks_finish") ?? false,
    ];

    const saved = await db(async (client) => {
      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, played_on, ended_on, minutes,
                note, visibility, contains_spoilers, created_at
           from public.save_diary_entry(
           game_id => $1, game_slug => $2, entry_date => $3, entry_end => $4,
           entry_minutes => $5, entry_note => $6, spoilers => $7,
           entry_visibility => $8::public."Visibility",
           entry_marks_start => $9, entry_marks_finish => $10
         )`,
        parameters,
      );
      return rows[0];
    });

    return { data: saved };
  },
});
