import "server-only";
import { serverApi } from "@/lib/api-server";

export type LibraryGame = {
  igdbId: number;
  slug: string;
  name: string;
  coverUrl: string;
  fallbackUrl: string;
  releaseTimestamp: number | null;
};

export async function getLibraryPool(
  exclude: Iterable<number> = [],
): Promise<LibraryGame[]> {
  const result = await serverApi.get<{ data: LibraryGame[] }>("/library/pool");
  const used = new Set(exclude);
  return result.data.filter((game) => !used.has(game.igdbId));
}
