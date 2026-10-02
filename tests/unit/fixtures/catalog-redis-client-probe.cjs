const net = require("node:net");

(async () => {
  const { createCatalogRedisClient, catalogRedisOptions } =
    await import("../../../lib/catalog-redis-client.ts");
  const sockets = new Set();
  let connections = 0;
  let evaluations = 0;
  const server = net.createServer((socket) => {
    connections++;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    // Accept TCP but never answer the Redis handshake.
    if (process.argv[2] === "command") {
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        while (buffer.length) {
          const head = /^\*(\d+)\r\n/.exec(buffer);
          if (!head) break;
          const arguments = [];
          let offset = head[0].length;
          for (let index = 0; index < Number(head[1]); index++) {
            const length = /^\$(\d+)\r\n/.exec(buffer.slice(offset));
            if (!length) return;
            offset += length[0].length;
            const end = offset + Number(length[1]);
            if (buffer.length < end + 2) return;
            arguments.push(buffer.slice(offset, end));
            offset = end + 2;
          }
          buffer = buffer.slice(offset);
          if (arguments[0] === "EVAL") evaluations++;
          else socket.write("+OK\r\n");
        }
      });
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const options = catalogRedisOptions({
    REDIS_URL: `redis://127.0.0.1:${server.address().port}`,
  });
  const client = createCatalogRedisClient(options);
  try {
    const start = Date.now();
    const failed = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        client.eval("return 1", { keys: [], arguments: [] }),
      ),
    );
    const elapsedMs = Date.now() - start;
    const before = connections;
    const retryStart = Date.now();
    await client.eval("return 1", { keys: [], arguments: [] }).catch(() => {});
    const tls = catalogRedisOptions({
      REDIS_URL: "rediss://example.invalid:6379",
      REDIS_CA_CERT: "trusted\\ncertificate",
    });
    console.log(
      JSON.stringify({
        connections,
        evaluations,
        before,
        elapsedMs,
        retryMs: Date.now() - retryStart,
        rejected: failed.filter((r) => r.status === "rejected").length,
        verifiedTls: tls.socket.tls && tls.socket.rejectUnauthorized,
        ca: tls.socket.ca,
        queue: options.commandsQueueMaxLength,
      }),
    );
  } finally {
    client.close();
    sockets.forEach((socket) => socket.destroy());
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.stack : "Redis probe failed");
  process.exitCode = 1;
});
