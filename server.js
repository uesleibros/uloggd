const cluster = require("node:cluster");
const path = require("node:path");

const entrypoint = path.join(__dirname, ".next", "standalone", "server.js");
const workerCount = Number(process.env.WEB_CONCURRENCY) || 3;
const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";
const restartDelayMs = 1000;
const restartWindowMs = 30_000;
const maxRestartsPerWindow = 12;

if (cluster.isPrimary) {
  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;

  cluster.setupPrimary({ exec: entrypoint, args: [] });

  let restarts = [];
  let shuttingDown = false;

  const spawn = () => cluster.fork({ PORT: String(port), HOSTNAME: hostname });

  const onExit = (worker, code, signal) => {
    if (shuttingDown) return;
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
    `[cluster] starting ${workerCount} workers on ${hostname}:${port}`,
  );
  for (let index = 0; index < workerCount; index += 1) spawn();
}
