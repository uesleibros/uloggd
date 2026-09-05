import { ownedCollection } from "@/lib/api/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "journal.read",
  table: "journeys",
  columns: "id, public_id, igdb_id, game_slug, title, created_at, updated_at",
  order: "created_at desc, id desc",
});
