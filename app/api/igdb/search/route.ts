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
    return Response.json({ results: [], lists: [], people: [] });

  try {
    const supabase = await createClient();
    // Header search covers games, people, and public lists. Keep the PostgREST
    // filter value deliberately narrow because `.or()` uses its filter grammar.
    const sanitized = query
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}\s._-]/gu, "")
      .trim()
      .slice(0, 64);
    const wantsEntities = ids.length === 0 && sanitized.length >= 2;

    // The catalog search, the auth claims and the people/list lookups are
    // independent, so they run concurrently instead of one after another. Only
    // saved-cover personalization has to wait, since it needs both the result
    // ids and the viewer. This overlaps the two Supabase round-trips with the
    // ~1s IGDB query rather than stacking them after it.
    const [results, { data: claims }, { data: lists }, { data: people }] =
      await Promise.all([
        ids.length
          ? getGamesByIds(ids).then((games) =>
              games.map((game) => ({ ...game, kind: "game" as const })),
            )
          : searchGames(query),
        supabase.auth.getClaims(),
        wantsEntities
          ? supabase
              .from("game_lists")
              .select(
                "id,public_id,name,visibility,owner:profiles!game_lists_profile_id_fkey(username)",
              )
              .eq("visibility", "PUBLIC")
              .ilike("name", `%${sanitized}%`)
              .order("updated_at", { ascending: false })
              .limit(4)
          : Promise.resolve({ data: [] }),
        wantsEntities
          ? supabase
              .from("profiles")
              .select("id,username,display_name,avatar_url,verified")
              .not("username", "is", null)
              .or(
                `username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`,
              )
              .order("verified", { ascending: false })
              .limit(4)
          : Promise.resolve({ data: [] }),
      ]);

    // Local JWT verification instead of a round-trip to the Auth server — that
    // network hop ran on every keystroke and added a fixed tax to each search.
    const user = claims?.claims.sub ? { id: claims.claims.sub } : null;
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
      {
        results: personalizedResults,
        lists: (lists ?? []).map((list) => {
          const owner = Array.isArray(list.owner) ? list.owner[0] : list.owner;
          return {
            id: list.public_id,
            name: list.name,
            owner: owner?.username ?? null,
          };
        }),
        people: (people ?? []).map((person) => ({
          id: person.id,
          username: String(person.username),
          displayName: person.display_name,
          avatarUrl: person.avatar_url,
          verified: Boolean(person.verified),
        })),
      },
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
