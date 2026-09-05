import { ownedCollection } from "@/lib/api/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "library.read",
  table: "user_games",
  columns:
    "id, igdb_id, game_slug, status, progress, playtime_minutes, liked, favorite, playing, backlog, wishlist, quick_rating, started_at, completed_at, created_at, updated_at",
  order: "updated_at desc, id desc",
});
