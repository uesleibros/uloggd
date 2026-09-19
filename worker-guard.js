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
    // Once the primary has let this worker go, the channel is closed, and a
    // send on a closed channel is not thrown where try/catch could see it: it
    // is emitted afterwards as an error nobody listens for, which Node turns
    // into an uncaught exception on a worker that was only finishing its last
    // requests. So check first, and hand send a callback, which makes it report
    // a failure to the callback instead of emitting it.
    if (!process.connected) return;
    const { rss, heapUsed } = process.memoryUsage();
    process.send(
      { type: "uloggd:memory", rss, heapUsed },
      undefined,
      {},
      () => {
        // Nothing to do: the worker is on its way out.
      },
    );
  }, 15_000).unref();
}
