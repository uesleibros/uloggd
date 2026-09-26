/**
 * Which of IGDB's several answers counts as "the series".
 *
 * Its own module, and without the `server-only` marker, so the policy can be
 * tested: it is a judgement rather than a fact, and the one in `lib/igdb.ts`
 * cannot be imported by a test because that file is server-only for good
 * reasons of its own.
 */

export type Series = {
  id: number;
  name: string;
  slug: string | null;
  kind: "collection" | "franchise";
};

type Listed = { id: number; name: string; slug?: string };

/**
 * A game can be in any number of collections and franchises, and IGDB nests
 * them: Breath of the Wild is in "The Legend of Zelda", which has thirty
 * games in it, and in "The Legend of Zelda: Breath of the Wild", which has
 * that game and its own editions. The first is a series somebody plays
 * through; the second is a shelf with one thing on it.
 *
 * The shortest name is the outer one, every time, because the inner ones are
 * named after the game they contain. So the shortest name wins, a franchise
 * is used only when there is no collection at all, and the caller drops a
 * series that turns out to hold fewer than two games.
 */
export function pickSeries(
  collections: Listed[] | undefined,
  franchises: Listed[] | undefined,
): Series | null {
  const named = (list: Listed[] | undefined) =>
    [...(list ?? [])]
      .filter((one) => one?.name)
      .sort((a, b) => a.name.length - b.name.length)[0] ?? null;
  const collection = named(collections);
  const franchise = named(franchises);
  const chosen = collection ?? franchise;
  if (!chosen) return null;
  return {
    id: chosen.id,
    name: chosen.name,
    slug: chosen.slug ?? null,
    kind: collection ? "collection" : "franchise",
  };
}
