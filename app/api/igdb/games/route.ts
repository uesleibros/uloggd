import type { NextRequest } from "next/server";
import { resolveGameCover } from "@/lib/game-cover";
import { getGamesBySlugs } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/server";

// Resolves markdown game-card slugs to hydrated games in one batch.
export async function GET(request: NextRequest) {
  // A drawer can easily reference more games than one IGDB query takes, and
  // truncating here silently dropped cards from the end of the alphabet.
  // getGamesBySlugs batches internally, so this only guards against abuse.
  const slugs = (request.nextUrl.searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug))
    .slice(0, 120);
  if (!slugs.length) return Response.json({ results: [] });
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const viewerId = claimsData?.claims?.sub ?? null;
    const requestedOwner = request.nextUrl.searchParams.get("coverOwner");
    const coverOwner =
      requestedOwner &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestedOwner,
      )
        ? requestedOwner
        : viewerId;
    const [results, { data: viewerPreference }] = await Promise.all([
      getGamesBySlugs(slugs),
      viewerId && coverOwner && viewerId !== coverOwner
        ? supabase
            .from("profiles")
            .select("custom_cover_scope")
            .eq("id", viewerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const showCreatorCovers =
      Boolean(coverOwner) &&
      (viewerId === coverOwner ||
        viewerPreference?.custom_cover_scope === "EVERYONE");
    const { data: savedCovers } =
      showCreatorCovers && results.length
        ? await supabase
            .from("user_games")
            .select("igdb_id,custom_cover_url")
            .eq("profile_id", coverOwner)
            .in(
              "igdb_id",
              results.map((game) => game.id),
            )
        : { data: [] };
    const customById = new Map(
      (savedCovers ?? []).map((item) => [item.igdb_id, item.custom_cover_url]),
    );
    const personalized = results.map((game) => ({
      ...game,
      coverUrl: resolveGameCover(game.coverUrl, customById.get(game.id)),
    }));
    return Response.json(
      { results: personalized },
      {
        headers: {
          "Cache-Control": coverOwner
            ? "private, no-store"
            : "public, max-age=300, s-maxage=1800",
        },
      },
    );
  } catch (error) {
    console.error("IGDB slug lookup failed", error);
    return Response.json({ error: "lookup_unavailable" }, { status: 502 });
  }
}
