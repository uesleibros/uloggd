import type { NextRequest } from "next/server";
import { searchCatalogPublishers } from "@/lib/igdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ results: [] });

  try {
    const results = await searchCatalogPublishers(query);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=21600" } },
    );
  } catch (error) {
    console.error("IGDB publisher search failed", error);
    return Response.json({ error: "search_unavailable" }, { status: 502 });
  }
}
