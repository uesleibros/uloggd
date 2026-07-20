import type { NextRequest } from "next/server";
import { getGamesBySlugs } from "@/lib/igdb";

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
    const results = await getGamesBySlugs(slugs);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } },
    );
  } catch (error) {
    console.error("IGDB slug lookup failed", error);
    return Response.json({ error: "lookup_unavailable" }, { status: 502 });
  }
}
