import type { NextRequest } from "next/server";
import { resolveGameCover } from "@/lib/game-cover";
import { getGamesByIds, searchGames } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";
import { getSpawndGame } from "@/lib/spawnd";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, 6);
  if (query.length < 2 && ids.length === 0)
    return Response.json({ results: [] });

  try {
    const [results, supabase] = await Promise.all([
      ids.length
        ? getGamesByIds(ids).then((games) =>
            games.map((game) => ({ ...game, kind: "game" as const })),
          )
        : searchGames(query),
      createClient(),
    ]);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: savedGames } =
      user && results.length
        ? await supabase
            .from("user_games")
            .select("igdb_id,custom_cover_url")
            .eq("profile_id", user.id)
            .in(
              "igdb_id",
              results.map((game) => game.id),
            )
        : { data: [] };
    const covers = new Map(
      (savedGames ?? []).map((game) => [game.igdb_id, game.custom_cover_url]),
    );
    const personalizedResults = results.map((game) => ({
      ...game,
      coverUrl: resolveGameCover(game.coverUrl, covers.get(game.id)),
      spawndAvailable: getSpawndGame({
        igdbId: game.id,
        lang: "en",
      }).available,
    }));
    return Response.json(
      { results: personalizedResults },
      {
        headers: {
          "Cache-Control": user
            ? "private, no-store"
            : "public, max-age=60, s-maxage=300",
        },
      },
    );
  } catch (error) {
    console.error("IGDB search failed", error);
    return Response.json({ error: "search_unavailable" }, { status: 502 });
  }
}
