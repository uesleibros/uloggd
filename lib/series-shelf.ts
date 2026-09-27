import {
  slotProgress,
  type Series,
  type SeriesRow,
  type SeriesSlot,
  type SlotHolding,
} from "@/lib/series-policy";

/**
 * A whole library seen as the series it belongs to.
 *
 * The game page asks "how far through this series am I" about the series in
 * front of it. This asks it about all of them at once, which is a different
 * question with a different cost: the answer for one series is two requests to
 * the catalogue, so the shelf picks the few series worth asking about before
 * asking anything.
 *
 * Pure, and free of the server, because the picking is the judgement: one game
 * of a series is not a series somebody is partway through, and a shelf that
 * listed every franchise a library touches would be a list of every game in it
 * with extra words.
 */

export type ShelfRow = {
  igdb_id: number;
  status?: string | null;
  playing?: boolean | null;
  quick_rating?: number | null;
};

export type SeriesHolding = {
  series: Series;
  /** The games of this series that are in the library. */
  ids: number[];
  /** How many of those are marked finished, and how many are being played. */
  finished: number;
  playing: number;
};

/**
 * The series a library is actually made of, most-held first.
 *
 * `atLeast` is two because one game is not a series somebody is working
 * through: half a library would qualify at one, and the section would say
 * nothing except that games have franchises. `howMany` is what the caller is
 * willing to pay the catalogue for.
 */
export function groupBySeries(
  rows: ShelfRow[],
  seriesOf: Map<number, Series>,
  { atLeast = 2, howMany = 6 }: { atLeast?: number; howMany?: number } = {},
): SeriesHolding[] {
  const held = new Map<number, SeriesHolding>();
  for (const row of rows) {
    const series = seriesOf.get(row.igdb_id);
    if (!series) continue;
    const entry = held.get(series.id) ?? {
      series,
      ids: [],
      finished: 0,
      playing: 0,
    };
    // A library holds one row per game, but a caller could hand the same game
    // in twice; counting it twice would inflate a series into the list.
    if (!entry.ids.includes(row.igdb_id)) {
      entry.ids.push(row.igdb_id);
      if (row.status === "COMPLETED") entry.finished += 1;
      else if (row.playing) entry.playing += 1;
    }
    held.set(series.id, entry);
  }
  return [...held.values()]
    .filter((entry) => entry.ids.length >= atLeast)
    .sort(
      (a, b) =>
        b.ids.length - a.ids.length ||
        b.finished - a.finished ||
        a.series.name.localeCompare(b.series.name),
    )
    .slice(0, howMany);
}

export type ShelfProgress<T extends SeriesRow = SeriesRow> = {
  total: number;
  played: number;
  finished: number;
  /**
   * The first game of the series that is in nobody's library yet.
   *
   * In release order, because that is the order the slots come in and the
   * order people go through a series. It is the one useful thing a progress
   * bar can say beyond the number: not "you are at seven of twelve" but
   * "the next one is this".
   */
  next: SeriesSlot<T> | null;
};

/** How far along a series is, given what the library says about its games. */
export function shelfProgress<T extends SeriesRow>(
  slots: SeriesSlot<T>[],
  holdings: Map<number, SlotHolding>,
): ShelfProgress<T> {
  let played = 0;
  let finished = 0;
  let next: SeriesSlot<T> | null = null;
  for (const slot of slots) {
    const { state } = slotProgress(slot, holdings);
    if (state === "finished") finished += 1;
    if (state !== "none") played += 1;
    else if (!next) next = slot;
  }
  return { total: slots.length, played, finished, next };
}
