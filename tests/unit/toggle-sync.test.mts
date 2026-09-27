import assert from "node:assert/strict";
import test from "node:test";
import { ToggleSync } from "../../lib/toggle-sync.ts";

/**
 * A toggle pressed faster than the network answers.
 *
 * Every case here is one somebody can produce with two fingers and a slow
 * connection, and the failure it guards against is the worst kind: the screen
 * says one thing and the database holds the other, for ever, with nothing on
 * screen to suggest anything went wrong.
 */

/** A write that answers when told to, so a test can hold it open. */
function slowWrites() {
  const calls: { key: number; desired: boolean; release: () => void }[] = [];
  const write = (key: number, desired: boolean) =>
    new Promise<void>((resolve) => {
      calls.push({ key, desired, release: resolve });
    });
  return { calls, write };
}

test("a press is visible before the network answers", async () => {
  const { calls, write } = slowWrites();
  const seen: boolean[] = [];
  const sync = new ToggleSync({
    write,
    onVisible: (_key, visible) => seen.push(visible),
  });

  assert.equal(sync.press(1, false), true);
  assert.deepEqual(seen, [true]);
  assert.equal(sync.visible(1, false), true);
  // And the request is only now on its way.
  assert.equal(calls.length, 1);
  assert.deepEqual([calls[0].key, calls[0].desired], [1, true]);
});

test("pressing twice in flight ends where the last press asked", async () => {
  const { calls, write } = slowWrites();
  const sync = new ToggleSync({ write });

  sync.press(1, false);
  // Before the first write answers, the viewer changes their mind.
  sync.press(1, false);
  assert.equal(sync.visible(1, false), false, "the screen answers at once");
  assert.equal(calls.length, 1, "one request at a time, never two racing");

  calls[0].release();
  await new Promise((resolve) => setImmediate(resolve));
  // The queue notices the server is now where nobody wants it and puts it
  // back, which is the whole point: the last press wins.
  assert.equal(calls.length, 2);
  assert.deepEqual([calls[1].key, calls[1].desired], [1, false]);
  calls[1].release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sync.visible(1, false), false);
  assert.equal(sync.settled, true);
});

test("three presses end pressed", async () => {
  const { calls, write } = slowWrites();
  const sync = new ToggleSync({ write });

  sync.press(1, false);
  sync.press(1, false);
  sync.press(1, false);
  assert.equal(sync.visible(1, false), true);

  // Let the queue run to quiescence, releasing whatever it asks for.
  for (let guard = 0; guard < 6 && calls.length; guard += 1) {
    const open = calls.filter((call) => call.release);
    open.forEach((call) => call.release());
    await new Promise((resolve) => setImmediate(resolve));
    if (sync.settled) break;
  }
  assert.equal(sync.visible(1, false), true);
  assert.equal(calls[calls.length - 1].desired, true);
});

test("a failed write puts the screen back", async () => {
  const failures: number[] = [];
  const sync = new ToggleSync({
    write: () => Promise.reject(new Error("offline")),
    onError: (key) => failures.push(key),
  });

  sync.press(7, false);
  assert.equal(sync.visible(7, false), true, "optimistic while it tries");
  await new Promise((resolve) => setImmediate(resolve));
  // The server never took it, so the screen stops claiming otherwise.
  assert.equal(sync.visible(7, false), false);
  assert.deepEqual(failures, [7]);
  assert.equal(sync.settled, true);
});

test("keys do not wait on each other", async () => {
  const { calls, write } = slowWrites();
  const sync = new ToggleSync({ write });

  sync.press(1, false);
  sync.press(2, false);
  assert.equal(calls.length, 2, "one queue per key, not one for everything");
  assert.equal(sync.visible(1, false), true);
  assert.equal(sync.visible(2, false), true);
  calls.forEach((call) => call.release());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sync.settled, true);
});

test("a snapshot is adopted only once the press has settled", async () => {
  const { calls, write } = slowWrites();
  const sync = new ToggleSync({ write });

  sync.press(1, false);
  // A page rendered before the press lands while it is still in flight.
  assert.equal(sync.adopt(1, false), false);
  assert.equal(sync.visible(1, false), true, "no flicker back to the old one");

  calls[0].release();
  await new Promise((resolve) => setImmediate(resolve));
  // A snapshot from before the write still says false: still refused, or the
  // press would come undone on screen until the next render.
  assert.equal(sync.adopt(1, false), false);
  assert.equal(sync.visible(1, false), true);
  // One that agrees with what the write returned is the truth again, and the
  // override steps aside.
  assert.equal(sync.adopt(1, true), true);
  assert.equal(sync.visible(1, true), true);
});

test("it says when the queue has gone quiet", async () => {
  const { calls, write } = slowWrites();
  let settled = 0;
  const sync = new ToggleSync({ write, onSettled: () => (settled += 1) });

  sync.press(1, false);
  assert.equal(sync.busy, true);
  assert.equal(settled, 0);
  calls[0].release();
  await new Promise((resolve) => setImmediate(resolve));
  // One resync after the dust settles, not one per press.
  assert.equal(settled, 1);
  assert.equal(sync.busy, false);
});
