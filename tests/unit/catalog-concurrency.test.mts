import assert from "node:assert/strict";
import test from "node:test";
import { mapCatalogQueries } from "../../lib/catalog-concurrency.ts";

test("catalogue groups overlap latency, stay ordered and have at most four readers", async () => {
  let open = 0,
    maximum = 0;
  const answers = await mapCatalogQueries(
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    async (value) => {
      maximum = Math.max(maximum, ++open);
      await new Promise((resolve) => setTimeout(resolve, value === 0 ? 30 : 5));
      open--;
      return value * 2;
    },
  );
  assert.equal(maximum, 4);
  assert.equal(open, 0);
  assert.deepEqual(answers, [0, 2, 4, 6, 8, 10, 12, 14, 16]);
});

test("a failed group stops new work and waits for already open readers to finish", async () => {
  let calls = 0,
    open = 0;
  await assert.rejects(
    mapCatalogQueries([0, 1, 2, 3, 4, 5], async (value) => {
      calls++;
      if (value === 0) throw Error("429");
      open++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      open--;
      return value;
    }),
    /429/,
  );
  assert.equal(calls, 4);
  assert.equal(open, 0);
});
