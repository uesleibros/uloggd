const cluster = require("node:cluster");
const path = require("node:path");
const { memoryPlan } = require("./server-memory");

const entrypoint = path.join(__dirname, ".next", "standalone", "server.js");
const guard = path.join(__dirname, "worker-guard.js");
const workerCount = Number(process.env.WEB_CONCURRENCY) || 3;
const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";
const restartDelayMs = 1000;
const restartWindowMs = 30_000;
const maxRestartsPerWindow = 12;
/** How long a recycled worker gets to finish what it is serving. */
const drainMs = 30_000;

if (cluster.isPrimary) {
  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;

  const plan = memoryPlan({ workers: workerCount });
  const rssLimitBytes = plan.rssLimitMb * 1048576;

  // Every worker gets a heap ceiling it can actually live inside. Without one,
  // each sized its heap from the whole machine (4288MB each was measured), so
  // three of them were allowed twelve gigabytes in a three-gigabyte container,
  // and V8 had no reason to give anything back until the platform stopped the
  // container.
  cluster.setupPrimary({
    exec: entrypoint,
    args: [],
    execArgv: [
      ...process.execArgv,
      `--max-old-space-size=${plan.heapMb}`,
      "--require",
      guard,
    ],
  });

  let restarts = [];
  let shuttingDown = false;
  /** Workers being replaced on purpose, whose exit is not a crash. */
  const recycling = new Set();

  const spawn = () =>
    cluster.fork({
      PORT: String(port),
      HOSTNAME: hostname,
      // glibc gives every thread that allocates its own arena, and keeps what
      // each arena ever freed instead of returning it. sharp and the card
      // renderer allocate from worker threads, so on a Linux container that
      // becomes resident memory nothing will ever reuse. Two arenas is the
      // usual cure for a long-running Node process, and it is read once, when
      // the worker starts, which is why it is set here and not later.
      MALLOC_ARENA_MAX: process.env.MALLOC_ARENA_MAX ?? "2",
    });

  const onExit = (worker, code, signal) => {
    if (shuttingDown) return;
    if (recycling.has(worker.id)) {
      // Its replacement was started before it was asked to leave, so there is
      // nothing to respawn, and a planned exit is not a restart to count.
      recycling.delete(worker.id);
      console.log(`[cluster] worker ${worker.process.pid} recycled`);
      return;
    }
    const now = Date.now();
    restarts = restarts.filter((at) => now - at < restartWindowMs);
    restarts.push(now);
    console.error(
      `[cluster] worker ${worker.process.pid} exited (code=${code}, signal=${signal ?? "none"}); respawning`,
    );
    if (restarts.length > maxRestartsPerWindow) {
      console.error(
        `[cluster] ${restarts.length} restarts in ${restartWindowMs}ms; giving up so the platform restarts the container`,
      );
      process.exit(1);
    }
    setTimeout(spawn, restartDelayMs);
  };

  /**
   * Replaces a worker that has grown past its share, one at a time.
   *
   * Some of what a worker holds is never returned: the card renderer's
   * WebAssembly memory only grows, and a heap that has once expanded is slow to
   * shrink. Left alone that ends with the platform stopping the whole
   * container, every worker at once. Replacing the one that grew costs a cold
   * worker instead of an outage.
   *
   * The replacement starts first, so capacity never drops below what it was,
   * and only one worker is ever recycled at a time: they grow together, and
   * three leaving at once would be the outage this exists to prevent.
   */
  cluster.on("message", (worker, message) => {
    if (message?.type !== "uloggd:memory") return;
    if (shuttingDown || recycling.size > 0) return;
    if (message.rss < rssLimitBytes) return;

    recycling.add(worker.id);
    console.warn(
      `[cluster] worker ${worker.process.pid} at ${Math.round(message.rss / 1048576)}MB resident, over its ${plan.rssLimitMb}MB share; replacing it`,
    );
    spawn();
    worker.disconnect();
    setTimeout(() => {
      if (!worker.isDead()) worker.kill("SIGKILL");
    }, drainMs).unref();
  });

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const workers = Object.values(cluster.workers ?? {});
    if (workers.length === 0) process.exit(0);
    for (const worker of workers) worker?.kill(signal);
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  cluster.on("exit", onExit);
  cluster.on("disconnect", () => {
    if (shuttingDown && Object.keys(cluster.workers ?? {}).length === 0)
      process.exit(0);
  });

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  console.log(
    `[cluster] starting ${workerCount} workers on ${hostname}:${port}; budget ${plan.budgetMb}MB, heap ${plan.heapMb}MB and recycle at ${plan.rssLimitMb}MB per worker`,
  );
  for (let index = 0; index < workerCount; index += 1) spawn();
}
