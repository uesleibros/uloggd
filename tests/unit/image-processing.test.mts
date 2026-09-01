import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireImageSlot,
  ImageProcessingBusyError,
} from "../../lib/image-processing";

/**
 * The gate that keeps a burst of image work from taking the whole container.
 *
 * A fixed-CPU box has no headroom to absorb a stampede: uploads arrive in
 * handfuls and share cards arrive as a crowd of crawlers on the same post, and
 * either can starve the server rendering every other page.
 *
 * What is pinned here is the slot accounting, because it is the part that
 * fails silently. A slot handed to a waiter that already timed out, or a
 * double release, does not throw: it quietly raises or lowers the real limit,
 * and the only symptom is a container that is either slower or more fragile
 * than the numbers say.
 *
 * These share one module-level counter, so every test has to end holding
 * nothing, or the next one starts against a limit that is already spent.
 */
const MAX_CONCURRENT = 2;

async function drain() {
  const held: Array<() => void> = [];
  for (let i = 0; i < MAX_CONCURRENT; i += 1)
    held.push(await acquireImageSlot({ maxQueued: 0 }));
  await assert.rejects(
    acquireImageSlot({ maxQueued: 0 }),
    ImageProcessingBusyError,
    "the limit is not back to its full width",
  );
  held.forEach((release) => release());
}

test("never runs more than the limit at once", async () => {
  let running = 0;
  let peak = 0;
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      const release = await acquireImageSlot({
        timeoutMs: 5000,
        maxQueued: 20,
      });
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      release();
    }),
  );
  assert.equal(peak, MAX_CONCURRENT);
  assert.equal(running, 0);
  await drain();
});

test("a full queue is refused rather than joined", async () => {
  const held: Array<() => void> = [];
  for (let i = 0; i < MAX_CONCURRENT; i += 1)
    held.push(await acquireImageSlot());

  const queued = Array.from({ length: 3 }, () =>
    acquireImageSlot({ timeoutMs: 500, maxQueued: 3 }).then(
      (release) => {
        release();
        return "acquired";
      },
      () => "refused",
    ),
  );
  await assert.rejects(
    acquireImageSlot({ timeoutMs: 500, maxQueued: 3 }),
    ImageProcessingBusyError,
    "a fourth waiter joined a queue that was already full",
  );

  held.forEach((release) => release());
  assert.deepEqual(await Promise.all(queued), [
    "acquired",
    "acquired",
    "acquired",
  ]);
  await drain();
});

test("a waiter that times out does not take a slot with it", async () => {
  const held: Array<() => void> = [];
  for (let i = 0; i < MAX_CONCURRENT; i += 1)
    held.push(await acquireImageSlot());

  // This one gives up before a slot frees. The slot it never received must not
  // be handed to it anyway, or the limit quietly drops by one for the life of
  // the process.
  await assert.rejects(
    acquireImageSlot({ timeoutMs: 10 }),
    ImageProcessingBusyError,
  );
  held.forEach((release) => release());
  await drain();
});

test("releasing twice does not widen the limit", async () => {
  const release = await acquireImageSlot();
  release();
  release();
  await drain();
});
