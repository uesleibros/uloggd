import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createIgdbGate } = require("../../igdb-gate.js");
const { createIgdbClient } = require("../../igdb-client.js");
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("three real workers share four sends per second and eight open requests", async () => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ["tests/unit/fixtures/igdb-cluster.cjs"],
    { timeout: 15000 },
  );
  const result = JSON.parse(stdout);
  assert.equal(result.starts.length, 12);
  assert.equal(result.flags.length, 3);
  assert.ok(
    result.flags.every(
      (flag: { worker: boolean; uniqueIdPresent: boolean }) =>
        flag.worker && !flag.uniqueIdPresent,
    ),
  );
  assert.equal(result.maxOpen, 8);
  for (const start of result.starts)
    assert.ok(
      result.starts.filter((at: number) => at >= start && at < start + 1000)
        .length <= 4,
    );
});

test("a hold postpones requests already queued, rather than only new callers", async () => {
  const gate = createIgdbGate({ limit: 1, windowMs: 40 });
  (await gate.acquire("first")).release();
  const queued = gate.acquire("queued");
  await pause(10);
  const heldAt = Date.now();
  gate.hold(90);
  const lease = await queued;
  assert.ok(lease.at >= heldAt + 90);
  lease.release();
});

test("a disconnected cluster worker fails closed instead of spending its own budget", async () => {
  const client = createIgdbClient({
    worker: true,
    channel: { connected: false, on() {} },
  });
  await assert.rejects(client.acquire(), /rate limited/);
});

test("late IPC grants are released and reacquired before sending", async () => {
  let listener: (message: object) => void;
  const sent: { type: string; id: number }[] = [];
  const client = createIgdbClient({
    worker: true,
    channel: {
      connected: true,
      on(event: string, callback: (message: object) => void) {
        if (event === "message") listener = callback;
      },
      send(
        message: { type: string; id: number },
        _handle: unknown,
        _options: unknown,
        callback: () => void,
      ) {
        sent.push(message);
        callback();
        if (message.type === "uloggd:igdb-slot")
          queueMicrotask(() =>
            listener({
              ...message,
              at: Date.now() - (message.id === 1 ? 500 : 0),
            }),
          );
      },
    },
  });
  const release = await client.acquire();
  release();
  release();
  assert.deepEqual(
    sent.map((message) => message.type),
    [
      "uloggd:igdb-slot",
      "uloggd:igdb-release",
      "uloggd:igdb-slot",
      "uloggd:igdb-release",
    ],
  );
});

test("queue deadlines and owner cancellation free pending requests", async () => {
  const gate = createIgdbGate({ concurrency: 1, maxQueue: 1, maxWaitMs: 30 });
  const active = await gate.acquire("1:active");
  const pending = gate.acquire("2:pending");
  await assert.rejects(gate.acquire("overflow"), /rate limited/);
  await assert.rejects(pending, /rate limited/);
  const cancelled = gate.acquire("2:cancelled");
  gate.cancelOwner("2:");
  await assert.rejects(cancelled, /cancelled/);
  active.release();
});
