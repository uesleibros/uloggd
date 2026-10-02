const cluster = require("node:cluster");
const { createIgdbGate, attachIgdbGate } = require("../../../igdb-gate");
const { createIgdbClient } = require("../../../igdb-client");

if (cluster.isPrimary) {
  const gate = createIgdbGate();
  attachIgdbGate(cluster, gate);
  const starts = [];
  const flags = [];
  let finished = 0;
  let open = 0;
  let maxOpen = 0;
  cluster.setupPrimary({ exec: __filename });
  cluster.on("message", (_worker, message) => {
    if (message.type === "flags") flags.push(message);
    if (message.type === "start") {
      starts.push(message.at);
      maxOpen = Math.max(maxOpen, ++open);
    }
    if (message.type === "end") open--;
    if (message.type === "done" && ++finished === 3) {
      console.log(JSON.stringify({ starts, flags, maxOpen }));
      for (const worker of Object.values(cluster.workers)) worker.disconnect();
    }
  });
  for (let index = 0; index < 3; index++) cluster.fork();
} else {
  const client = createIgdbClient();
  process.send({
    type: "flags",
    worker: cluster.isWorker,
    uniqueIdPresent: !!process.env.NODE_UNIQUE_ID,
  });
  Promise.all(
    Array.from({ length: 4 }, async () => {
      const release = await client.acquire();
      process.send({ type: "start", at: Date.now() });
      await new Promise((resolve) => setTimeout(resolve, 2300));
      process.send({ type: "end" });
      release();
    }),
  ).then(() => process.send({ type: "done" }));
}
