import type { Series, SlotState } from "./series-policy";
import { countSeriesStates, seriesStatus } from "./series-shelf";

export type SeriesSlotView = {
  id: number;
  slug: string;
  name: string;
  cover: string;
  year: number | null;
  state: SlotState;
  via: string | null;
  satisfiedBy: number[];
};
export type LibrarySeriesShelf = Pick<Series, "id" | "name" | "kind"> & {
  key: string;
  slots: SeriesSlotView[];
};
/** Covers and game copy travel only for the visible page, not the whole index. */
export type SeriesIndexEntry = Omit<LibrarySeriesShelf, "slots"> & {
  slots: Pick<SeriesSlotView, "id" | "state">[];
};
export const SERIES_PAGE_SIZE = 6;
export type SeriesFilter = "all" | "progress" | "completed";
export type SeriesSort = "progress" | "name";
export type SeriesAnswer = {
  data: LibrarySeriesShelf[];
  index: SeriesIndexEntry[];
  ignored: number[];
  counts: Record<SeriesFilter, number>;
  page: number;
  total_pages: number;
};

export function selectSeries(
  index: SeriesIndexEntry[],
  ignored: ReadonlySet<number>,
  {
    filter = "all",
    query = "",
    sort = "progress",
    page = 1,
  }: {
    filter?: SeriesFilter;
    query?: string;
    sort?: SeriesSort;
    page?: number;
  } = {},
) {
  const rows = index.map((entry) => {
    const progress = countSeriesStates(entry.slots, ignored);
    return { entry, progress, status: seriesStatus(progress) };
  });
  const counts = {
    all: rows.length,
    progress: rows.filter((row) => row.status === "progress").length,
    completed: rows.filter((row) => row.status === "completed").length,
  };
  const needle = query.trim().toLocaleLowerCase();
  const priority = { progress: 0, unstarted: 1, completed: 2 };
  const filtered = rows
    .filter(
      (row) =>
        (filter === "all" || row.status === filter) &&
        (!needle || row.entry.name.toLocaleLowerCase().includes(needle)),
    )
    .sort((a, b) => {
      const byName =
        a.entry.name.localeCompare(b.entry.name) ||
        a.entry.key.localeCompare(b.entry.key);
      if (sort === "name") return byName;
      return (
        priority[a.status] - priority[b.status] ||
        b.progress.finished / Math.max(1, b.progress.total) -
          a.progress.finished / Math.max(1, a.progress.total) ||
        b.progress.played - a.progress.played ||
        byName
      );
    });
  const totalPages = Math.max(1, Math.ceil(filtered.length / SERIES_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  return {
    counts,
    total: filtered.length,
    page: currentPage,
    totalPages,
    rows: filtered.slice(
      (currentPage - 1) * SERIES_PAGE_SIZE,
      currentPage * SERIES_PAGE_SIZE,
    ),
  };
}
