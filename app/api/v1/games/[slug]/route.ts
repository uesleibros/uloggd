import { getGamesBySlugs } from "@/lib/igdb";
import { publicGame } from "@/lib/api/shapes";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  scope: "catalog.read",
  bucket: "catalog",
  handle: async ({ request }) => {
    const slug = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    ).toLowerCase();

    if (!/^[a-z0-9-]{1,80}$/.test(slug))
      throw new ApiFailure("invalid_request", "That is not a game slug.");

    const [game] = await getGamesBySlugs([slug]);
    if (!game) throw new ApiFailure("not_found", "No game with that slug.");

    return { data: publicGame(game) };
  },
});
