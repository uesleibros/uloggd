import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogBatchCache } from "../../lib/catalog-batch-cache";

test("summary, full view and detail pages load only the missing catalogue series", async () => {
  const read = createCatalogBatchCache<number>({ ttlMs: 1000, staleMs: 1000 });
  const calls: string[][] = [];
  const load = async (keys: string[]) => {
    calls.push(keys);
    return new Map(keys.map((key) => [key, [1, 2]]));
  };
  await read(["collection:1", "collection:2"], load);
  await read(["collection:2", "collection:1", "collection:3"], load);
  await read(["collection:3"], load);
  assert.deepEqual(calls, [["collection:1", "collection:2"], ["collection:3"]]);
});

test("overlapping simultaneous requests share their reserved batch", async () => {
  const read = createCatalogBatchCache<number>({ ttlMs: 1000, staleMs: 1000 });
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls: string[][] = [];
  const load = async (keys: string[]) => {
    calls.push(keys);
    await wait;
    return new Map(keys.map((key) => [key, [1]]));
  };
  const a = read(["a", "b"], load);
  const b = read(["b", "c"], load);
  release();
  await Promise.all([a, b]);
  assert.deepEqual(calls, [["a", "b"], ["c"]]);
});

test("a rate limit retains a complete catalogue, backs off and never fabricates cold data", async () => {
  let time = 0;
  const read = createCatalogBatchCache<number>({
    ttlMs: 100,
    staleMs: 1000,
    retryMs: 30,
    now: () => time,
  });
  await read(["warm"], async () => new Map([["warm", [1, 2]]]));
  time = 101;
  let calls = 0,
    warnings = 0;
  const fail = async (): Promise<Map<string, number[]>> => {
    calls++;
    throw new Error("IGDB 429");
  };
  assert.deepEqual(
    (await read(["warm"], fail, () => warnings++)).get("warm"),
    [1, 2],
  );
  await read(["warm"], fail);
  assert.equal(calls, 1);
  assert.equal(warnings, 1);
  await assert.rejects(read(["cold"], fail), /429/);
  await assert.rejects(read(["cold"], fail), /429/);
  assert.equal(calls, 2);
  time = 1200;
  await assert.rejects(read(["warm"], fail), /429/);
});

test("an incomplete batch is not remembered, including its successful prefix", async () => {
  let time = 0;
  const read = createCatalogBatchCache<number>({
    ttlMs: 100,
    staleMs: 100,
    retryMs: 10,
    now: () => time,
  });
  await assert.rejects(
    read(["a", "b"], async () => new Map([["a", [1]]])),
    /Incomplete/,
  );
  time = 11;
  let asked: string[] = [];
  await read(["a", "b"], async (keys) => {
    asked = keys;
    return new Map(keys.map((key) => [key, []]));
  });
  assert.deepEqual(asked, ["a", "b"]);
});

test("bounded caching evicts old catalogue data and keeps variants modes separate", async () => {
  const read = createCatalogBatchCache<number>({
    ttlMs: 1000,
    staleMs: 1000,
    maxEntries: 2,
    maxItems: 3,
  });
  const calls: string[][] = [];
  const load = async (keys: string[]) => {
    calls.push(keys);
    return new Map(keys.map((key) => [key, [1, 2]]));
  };
  await read(["a:main"], load);
  await read(["a:versions"], load);
  await read(["a:main"], load);
  assert.deepEqual(calls, [["a:main"], ["a:versions"], ["a:main"]]);
});
