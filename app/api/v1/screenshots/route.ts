import { ownedCollection } from "@/lib/api/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "screenshots.read",
  table: "screenshots",
  columns:
    "id, public_id, igdb_id, game_slug, description, image_url, width, height, contains_spoilers, sensitive, visibility, created_at, updated_at",
  also: "deleted_at is null",
  order: "created_at desc, id desc",
});
