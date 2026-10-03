import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as tick } from "node:timers/promises";
import { createCatalogBackgroundQueue } from "../../lib/catalog-background.ts";

test("catalogue background tasks start outside rendering and obey concurrency and queue bounds", async () => {
  const defer = createCatalogBackgroundQueue(1, 2);
  let started = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  defer(async () => {
    started++;
    await gate;
  });
  defer(async () => {
    started++;
    throw new Error("Redis unavailable");
  });
  assert.equal(started, 0);
  assert.throws(() => defer(async () => {}), /queue full/);
  await tick();
  assert.equal(started, 1);
  release();
  await tick();
  assert.equal(started, 2);
  defer(async () => {
    started++;
  });
  await tick();
  assert.equal(started, 3);
});
