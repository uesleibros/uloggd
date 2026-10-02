import "server-only";
import { getGamesSeries, getSeriesGamesMany } from "./igdb";
import { resolveGameCover } from "./game-cover";
import {
  seriesKey,
  seriesSlots,
  slotProgress,
  type SlotHolding,
} from "./series-policy";
import { groupBySeries } from "./series-shelf";
import type { LibrarySeriesShelf } from "./series-view";

export async function readLibrarySeries(
  rows: SlotHolding[],
  summary = false,
): Promise<LibrarySeriesShelf[]> {
  const seriesOf = await getGamesSeries(
    rows.map((row) => row.igdb_id),
    { strict: true },
  );
  const candidates = groupBySeries(rows, seriesOf, {
    atLeast: summary ? 2 : 1,
    howMany: summary ? 6 : null,
  });
  const memberships = await getSeriesGamesMany(
    candidates.map((row) => row.series),
    { strict: true },
  );
  const holdings = new Map(rows.map((row) => [row.igdb_id, row]));
  return candidates.flatMap(({ series }) => {
    const games = memberships.get(seriesKey(series)) ?? [];
    const slots = seriesSlots(games);
    if (slots.length < 2) return [];
    const names = new Map(games.map((game) => [game.id, game.name]));
    return [
      {
        id: series.id,
        kind: series.kind,
        key: seriesKey(series),
        name: series.name,
        slots: slots.map((slot) => {
          const { state, via } = slotProgress(slot, holdings);
          return {
            id: slot.game.id,
            slug: slot.game.slug,
            name: slot.game.name,
            cover: resolveGameCover(slot.game.coverUrl, null),
            year: slot.game.releaseYear,
            state,
            via: via
              ? (names.get(via) ??
                slot.game.variantNames?.[via] ??
                `IGDB #${via}`)
              : null,
            satisfiedBy: slot.satisfiedBy,
          };
        }),
      },
    ];
  });
}
