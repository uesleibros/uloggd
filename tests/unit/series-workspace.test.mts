import assert from "node:assert/strict";
import test from "node:test";
import {
  groupBySeries,
  countSeriesStates,
  seriesStatus,
} from "../../lib/series-shelf";
import {
  seriesSlots,
  slotProgress,
  type Series,
} from "../../lib/series-policy";
import { selectSeries, type SeriesIndexEntry } from "../../lib/series-view";
import { readSeriesPages, seriesIdBatches } from "../../lib/series-catalog";

const index: SeriesIndexEntry[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  kind: "collection",
  key: `collection:${i + 1}`,
  name: `Saga ${i + 1}`,
  slots: [
    { id: i * 10 + 1, state: "finished" },
    { id: i * 10 + 2, state: "library" },
  ],
}));
test("the full workspace includes one held game and every candidate; summary remains two parts and six", () => {
  const mapping = new Map<number, Series>(
    index.flatMap((row, i) => [
      [i * 10 + 1, { ...row, slug: null }],
      [i * 10 + 2, { ...row, slug: null }],
    ]),
  );
  const single = index.map((row) => ({ igdb_id: row.slots[0].id }));
  assert.equal(groupBySeries(single, mapping).length, 0);
  assert.equal(
    groupBySeries(single, mapping, { atLeast: 1, howMany: null }).length,
    8,
  );
  const both = index.flatMap((row) =>
    row.slots.map((slot) => ({ igdb_id: slot.id })),
  );
  assert.equal(groupBySeries(both, mapping).length, 6);
  assert.equal(
    groupBySeries(both, mapping, { atLeast: 1, howMany: null }).length,
    8,
  );
  assert.equal(selectSeries(index, new Set()).rows.length, 6);
  assert.equal(selectSeries(index, new Set(), { page: 2 }).rows.length, 2);
});
test("collection and franchise ids belong to different namespaces", () => {
  const mapping = new Map<number, Series>([
    [1, { id: 7, kind: "collection", name: "A", slug: null }],
    [2, { id: 7, kind: "franchise", name: "B", slug: null }],
  ]);
  assert.equal(
    groupBySeries([{ igdb_id: 1 }, { igdb_id: 2 }], mapping, {
      atLeast: 1,
      howMany: null,
    }).length,
    2,
  );
});
test("completed, started, backlog, wishlist and ignored states are truthful", () => {
  assert.equal(
    seriesStatus(
      countSeriesStates(
        Array.from({ length: 5 }, (_, id) => ({ id, state: "finished" })),
      ),
    ),
    "completed",
  );
  const states = [
    { id: 1, state: "finished" },
    { id: 2, state: "playing" },
    { id: 3, state: "started" },
    { id: 4, state: "library" },
    { id: 5, state: "none" },
  ] as const;
  assert.equal(countSeriesStates([...states]).played, 3);
  assert.equal(seriesStatus(countSeriesStates([...states])), "progress");
  const [slot] = seriesSlots([{ id: 1 }]);
  for (const status of ["BACKLOG", "WISHLIST"]) {
    const state = slotProgress(
      slot,
      new Map([[1, { igdb_id: 1, status }]]),
    ).state;
    assert.equal(state, "library");
    const progress = countSeriesStates([{ id: 1, state }]);
    assert.equal(progress.played, 0);
    assert.equal(progress.next, 1);
    assert.equal(seriesStatus(progress), "unstarted");
  }
  for (const status of ["DROPPED", "ON_HOLD"])
    assert.equal(
      slotProgress(slot, new Map([[1, { igdb_id: 1, status }]])).state,
      "started",
    );
  assert.equal(
    seriesStatus(countSeriesStates([...states], new Set([1, 2, 3, 4, 5]))),
    "unstarted",
  );
});
test("ignore and undo reclassify rows and global counts across pages", () => {
  const before = selectSeries(index, new Set(), { filter: "progress" });
  assert.equal(before.counts.progress, 8);
  assert.equal(before.rows.length, 6);
  const ignored = new Set([2]);
  const after = selectSeries(index, ignored, { filter: "progress" });
  assert.equal(after.counts.progress, 7);
  assert.equal(after.counts.completed, 1);
  assert.ok(after.rows.every((row) => row.entry.id !== 1));
  assert.equal(
    selectSeries(index, ignored, { filter: "completed" }).rows[0].entry.id,
    1,
  );
  ignored.delete(2);
  assert.equal(selectSeries(index, ignored).counts.completed, 0);
});
test("variants count once and retain the finished remake explanation", () => {
  const slots = seriesSlots([
    {
      id: 1,
      remakes: [{ id: 2 }],
      remasters: [{ id: 3 }],
      ports: [{ id: 4 }],
      versions: [{ id: 5 }],
    },
    { id: 2 },
    { id: 3 },
    { id: 10 },
    { id: 11, parent_game: { id: 1 } },
  ]);
  assert.deepEqual(
    slots.map((slot) => slot.game.id),
    [1, 10],
  );
  for (const id of [2, 3, 4, 5])
    assert.deepEqual(
      slotProgress(
        slots[0],
        new Map([[id, { igdb_id: id, status: "COMPLETED" }]]),
      ),
      { state: "finished", via: id },
    );
  for (const id of [10, 11])
    assert.equal(
      slotProgress(
        slots[0],
        new Map([[id, { igdb_id: id, status: "COMPLETED" }]]),
      ).state,
      "none",
    );
  const both = new Map(
    [1, 2, 3].map((id) => [id, { igdb_id: id, status: "COMPLETED" }]),
  );
  assert.deepEqual(slotProgress(slots[0], both), {
    state: "finished",
    via: null,
  });
});
test("name search, deterministic sorting and all-ignored series remain in All", () => {
  const rows = [
    { ...index[0], name: "Resident Evil" },
    { ...index[1], name: "Persona" },
  ];
  assert.equal(
    selectSeries(rows, new Set(), { query: "resident" }).rows.length,
    1,
  );
  assert.equal(
    selectSeries(rows, new Set(), { sort: "name" }).rows[0].entry.name,
    "Persona",
  );
  const ignored = new Set(
    rows.flatMap((row) => row.slots.map((slot) => slot.id)),
  );
  assert.deepEqual(selectSeries(rows, ignored).counts, {
    all: 2,
    completed: 0,
    progress: 0,
  });
});
test("catalogue pagination keeps more than 500 members and editions in batched rounds", async () => {
  const calls: string[][] = [];
  const result = await readSeriesPages<{ id: number }>(
    Array.from({ length: 100 }, (_, i) => `series ${i}`),
    async (parts) => {
      calls.push(parts.map((part) => part.body));
      return parts.map((part) =>
        Array.from(
          {
            length:
              part.body.startsWith("series 0\n") &&
              part.body.endsWith("offset 0;")
                ? 500
                : 2,
          },
          (_, id) => ({ id }),
        ),
      );
    },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].length, 100);
  assert.equal(calls[1].length, 1);
  assert.equal(result[0].length, 502);
  assert.equal(result[99].length, 2);
  assert.ok(calls[1][0].endsWith("offset 500;"));
  const batches = seriesIdBatches(
    Array.from({ length: 1201 }, (_, i) => i + 1),
  );
  assert.equal(batches.flat().length, 1201);
  assert.equal(batches.length, 13);
  assert.ok(batches.every((batch) => batch.length <= 100));
});
test("a failed or partial catalogue round refuses instead of pretending to be empty", async () => {
  await assert.rejects(
    readSeriesPages(["one", "two"], async () => [[]]),
    /Incomplete/,
  );
  await assert.rejects(
    readSeriesPages(["one"], async () => {
      throw new Error("unavailable");
    }),
    /unavailable/,
  );
});
