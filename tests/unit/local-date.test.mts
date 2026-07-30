import assert from "node:assert/strict";
import test from "node:test";
import { localDateKey } from "../../lib/local-date";

test("date inputs preserve the viewer's local calendar day", () => {
  const lateLocalEvening = new Date(2026, 6, 29, 23, 45, 0);
  assert.equal(localDateKey(lateLocalEvening), "2026-07-29");
});

test("date inputs pad local months and days", () => {
  assert.equal(localDateKey(new Date(2026, 0, 3, 12)), "2026-01-03");
});
