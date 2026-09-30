import type { TierlistGame } from "@/lib/tierlists";

/** Retain catalogue metadata when a result becomes an editable list item. */
export function catalogSearchResults(payload: unknown): TierlistGame[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("results" in payload) ||
    !Array.isArray(payload.results)
  ) {
    throw new Error("Invalid catalogue search response");
  }
  return payload.results.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const game = row as Record<string, unknown>;
    if (
      typeof game.id !== "number" ||
      !Number.isSafeInteger(game.id) ||
      game.id <= 0 ||
      typeof game.name !== "string" ||
      !game.name.trim() ||
      typeof game.slug !== "string" ||
      !game.slug.trim() ||
      typeof game.coverUrl !== "string" ||
      !game.coverUrl
    )
      return [];
    return [
      {
        igdbId: game.id,
        name: game.name,
        slug: game.slug,
        coverUrl: game.coverUrl,
        fallbackUrl:
          typeof game.fallbackCoverUrl === "string" && game.fallbackCoverUrl
            ? game.fallbackCoverUrl
            : game.coverUrl,
        releaseTimestamp:
          typeof game.releaseTimestamp === "number" &&
          Number.isFinite(game.releaseTimestamp)
            ? game.releaseTimestamp
            : null,
      },
    ];
  });
}
