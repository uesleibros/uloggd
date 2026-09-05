import { ownedCollection } from "@/lib/api/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "journal.read",
  table: "diary_entries",
  columns:
    "id, public_id, igdb_id, game_slug, played_on, ended_on, minutes, note, contains_spoilers, visibility, marks_start, marks_finish, journey_id, created_at, updated_at",
  order: "played_on desc, id desc",
});
