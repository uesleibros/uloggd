import { getGamesSeries, getSeriesGamesMany } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { serverApi, settleServer } from "@/lib/api-server";
import {
  seriesSlots,
  slotProgress,
  type SlotHolding,
} from "@/lib/series-policy";
import { groupBySeries } from "@/lib/series-shelf";
import {
  LibrarySeriesView,
  type LibrarySeriesShelf,
} from "@/components/library/library-series-view";
import type { UiLang } from "@/lib/ui-text";

/**
 * How far through its series a whole library is.
 *
 * The game page answers this about the series in front of it. Here the
 * question is asked of the shelf, which is a different question with a
 * different cost: one series is two requests to the catalogue, so the library
 * is grouped first and only the few series it is really made of are asked
 * about. Six of them, in two requests, however large the library is.
 *
 * The owner's own, because it is read through their library: somebody else's
 * shelf is not something this can be asked about without asking IGDB on their
 * behalf, and there is no question here that a stranger is owed.
 *
 * Everything is read here and drawn by the client view beside this file: one
 * control on that strip is interactive, and what it changes is arithmetic
 * that should not wait for a round trip.
 */
export async function LibrarySeries({ lang }: { lang: UiLang }) {
  const { data: mine } = await settleServer(
    serverApi.get<{
      data: {
        igdb_id: number;
        status: string | null;
        playing: boolean | null;
      }[];
    }>("/library/cards?all=1"),
  );
  const rows = mine?.data ?? [];
  if (rows.length < 4) return null;

  // One read for which series every game is in, batched a hundred at a time
  // and memoised: the second visit to this page costs the catalogue nothing.
  const seriesOf = await getGamesSeries(rows.map((row) => row.igdb_id));
  const held = groupBySeries(rows, seriesOf, { howMany: 6 });
  if (!held.length) return null;

  // The memberships and the set-aside games at once: neither waits on the
  // other, and one of them is a request to IGDB.
  const [memberships, skipped] = await Promise.all([
    getSeriesGamesMany(held.map((one) => one.series)),
    // The games this person has decided not to play. They stay in the row and
    // leave the count: a series holding a broadcast that no longer exists
    // should not tell anybody they are behind on it for ever.
    settleServer(
      serverApi.get<{ data: { igdb_id: number }[] }>("/library/ignored"),
    ),
  ]);
  const holdings = new Map<number, SlotHolding>(
    rows.map((row) => [row.igdb_id, row]),
  );

  // Flattened into what the browser needs: the states are worked out here,
  // where the library is, and the ids travel so the counts can be redone
  // there the moment somebody sets an entry aside.
  const shelves: LibrarySeriesShelf[] = held.flatMap((entry) => {
    const games = memberships.get(entry.series.id) ?? [];
    const slots = seriesSlots(games);
    // A series of one is the game itself with a heading over it.
    if (slots.length < 2) return [];
    return [
      {
        id: entry.series.id,
        name: entry.series.name,
        slots: slots.map((slot) => ({
          id: slot.game.id,
          slug: slot.game.slug,
          name: slot.game.name,
          cover: resolveGameCover(slot.game.coverUrl, null),
          year: slot.game.releaseYear,
          state: slotProgress(slot, holdings).state,
          via: null,
          satisfiedBy: slot.satisfiedBy,
        })),
      },
    ];
  });
  if (!shelves.length) return null;

  return (
    <LibrarySeriesView
      shelves={shelves}
      ignored={(skipped.data?.data ?? []).map((row) => row.igdb_id)}
      lang={lang}
    />
  );
}
