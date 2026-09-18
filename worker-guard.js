const cluster = require("node:cluster");

/**
 * Preloaded into every cluster worker: says how big it is, every 15 seconds.
 *
 * The primary decides what to do about it, not the worker, because the right
 * answer depends on the others: three workers that grow together must not all
 * leave at once, and a replacement has to be started before one is let go.
 * Only the primary can see all of them.
 *
 * Resident size rather than heap, because the heap is not where this site's
 * memory goes. Measured under share-card load, one worker held 70MB of live
 * heap at 330MB resident: the card renderer decodes images in WebAssembly, and
 * WebAssembly memory grows and never shrinks. A heap ceiling cannot see that;
 * resident size can.
 */
if (cluster.isWorker && typeof process.send === "function") {
  setInterval(() => {
    const { rss, heapUsed } = process.memoryUsage();
    try {
      process.send({ type: "uloggd:memory", rss, heapUsed });
    } catch {
      // The channel is closing because this worker is already on its way out.
    }
  }, 15_000).unref();
}
