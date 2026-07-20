import type { NextRequest } from "next/server";
import { getGamesBySlugs } from "@/lib/igdb";

// Resolves markdown game-card slugs to hydrated games in one batch.
export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug))
    .slice(0, 24);
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
