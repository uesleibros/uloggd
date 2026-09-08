import "server-only";
import { serverApi } from "@/lib/api-server";
import type { ProfileLibraryRecord } from "@/lib/profile-types";
export type LibrarySnapshot = {
  data: ProfileLibraryRecord[];
  summary: {
    library: number;
    playing: number;
    rated: number;
    username: string | null;
  };
};
export async function getLibraryCards(ids: number[]): Promise<LibrarySnapshot> {
  const unique = [...new Set(ids)];
  if (!unique.length)
    return {
      data: [],
      summary: { library: 0, playing: 0, rated: 0, username: null },
    };
  const chunks = await Promise.all(
    Array.from({ length: Math.ceil(unique.length / 200) }, (_, index) =>
      serverApi.get<LibrarySnapshot>(
        "/library/cards?ids=" +
          unique.slice(index * 200, (index + 1) * 200).join(","),
      ),
    ),
  );
  return {
    data: chunks.flatMap((chunk) => chunk.data),
    summary: chunks[0].summary,
  };
}
