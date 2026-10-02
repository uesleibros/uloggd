import {
  slotProgress,
  seriesKey,
  type Series,
  type SeriesRow,
  type SeriesSlot,
  type SlotHolding,
  type SlotState,
} from "@/lib/series-policy";

/** Shared candidate selection and progress arithmetic for summary and full workspace. */

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

/** The summary defaults to two held parts and six rows; full view explicitly asks for one and no cap. */
export function groupBySeries(
  rows: ShelfRow[],
  seriesOf: Map<number, Series>,
  {
    atLeast = 2,
    howMany = 6,
  }: { atLeast?: number; howMany?: number | null } = {},
): SeriesHolding[] {
  const held = new Map<string, SeriesHolding>();
  for (const row of rows) {
    const series = seriesOf.get(row.igdb_id);
    if (!series) continue;
    const key = seriesKey(series);
    const entry = held.get(key) ?? {
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
    held.set(key, entry);
  }
  return [...held.values()]
    .filter((entry) => entry.ids.length >= atLeast)
    .sort(
      (a, b) =>
        b.ids.length - a.ids.length ||
        b.finished - a.finished ||
        a.series.name.localeCompare(b.series.name),
    )
    .slice(0, howMany ?? undefined);
}

/**
 * Whether a slot is one somebody has decided not to play.
 *
 * The slot's own game, not its substitutes: ignoring a remake is a sentence
 * about that remake, and the game it remakes is still in the series.
 */
export function slotIsIgnored(
  slot: SeriesSlot<SeriesRow>,
  ignored: ReadonlySet<number>,
): boolean {
  return ignored.has(slot.game.id);
}

export type ShelfProgress<T extends SeriesRow = SeriesRow> = {
  /** How many slots count, which is every one that is not ignored. */
  total: number;
  played: number;
  finished: number;
  /**
   * How many were set aside.
   *
   * They leave the denominator rather than counting as unplayed. A series
   * with a Satellaview broadcast that no longer exists in it would otherwise
   * tell somebody they are behind on something nobody can reach, which is the
   * kind of number people stop trusting.
   */
  ignored: number;
  /**
   * The first nonignored game that has not been started, including backlog and wishlist.
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
  ignored: ReadonlySet<number> = new Set(),
): ShelfProgress<T> {
  const counted = countSeriesStates(
    slots.map((slot) => ({
      id: slot.game.id,
      state: slotProgress(slot, holdings).state,
    })),
    ignored,
  );
  return {
    ...counted,
    next: slots.find((slot) => slot.game.id === counted.next) ?? null,
  };
}

/** Already resolved canonical states, shared by every optimistic series view. */
export function countSeriesStates(
  slots: { id: number; state: SlotState }[],
  ignored: ReadonlySet<number> = new Set(),
) {
  const counted = slots.filter((slot) => !ignored.has(slot.id));
  const started = (state: SlotState) =>
    state === "finished" || state === "playing" || state === "started";
  return {
    total: counted.length,
    played: counted.filter((slot) => started(slot.state)).length,
    finished: counted.filter((slot) => slot.state === "finished").length,
    ignored: slots.length - counted.length,
    next: counted.find((slot) => !started(slot.state))?.id ?? null,
  };
}

export function seriesStatus(
  progress: Pick<ShelfProgress, "total" | "played" | "finished">,
): "completed" | "progress" | "unstarted" {
  if (progress.total > 0 && progress.finished === progress.total)
    return "completed";
  if (progress.played > 0) return "progress";
  return "unstarted";
}
