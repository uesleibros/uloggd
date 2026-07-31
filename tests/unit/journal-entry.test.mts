import assert from "node:assert/strict";
import test from "node:test";
import {
  compareEntriesWithinDay,
  entryTimeInputValue,
  formatEntryTime,
} from "../../lib/journal-entry";

test("entry times read as the hour that was logged, not the viewer's", () => {
  // A wall-clock `time` column carries no zone; running it through a real Date
  // in a non-UTC viewer would silently shift the hour.
  assert.equal(formatEntryTime("23:30:00", "en"), "11:30 PM");
  assert.equal(formatEntryTime("07:05:00", "pt-BR"), "07:05");
});

test("entries without a logged hour format to nothing", () => {
  assert.equal(formatEntryTime(null, "en"), null);
  assert.equal(formatEntryTime("", "en"), null);
  assert.equal(formatEntryTime("not-a-time", "en"), null);
});

test("the time input keeps only the HH:MM a time field accepts", () => {
  assert.equal(entryTimeInputValue("21:45:00"), "21:45");
  assert.equal(entryTimeInputValue(null), "");
});

test("a day orders timed entries by the clock, untimed ones behind them", () => {
  const morning = { startedAt: "09:00:00", createdAt: "2026-07-30T20:00:00Z" };
  const night = { startedAt: "22:15:00", createdAt: "2026-07-30T08:00:00Z" };
  const untimedFirst = { startedAt: null, createdAt: "2026-07-30T01:00:00Z" };
  const untimedLast = { startedAt: null, createdAt: "2026-07-30T02:00:00Z" };

  const ordered = [untimedLast, night, untimedFirst, morning].sort(
    compareEntriesWithinDay,
  );
  assert.deepEqual(ordered, [morning, night, untimedFirst, untimedLast]);
});
