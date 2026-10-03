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
    const mode = process.argv[2];
    if (mode === "lookups" || mode === "slow-lookup") {
      let buffer = "";
      let lookups = 0;
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        while (buffer.length) {
          const head = /^\*(\d+)\r\n/.exec(buffer);
          if (!head) break;
          const parts = [];
          let offset = head[0].length;
          for (let index = 0; index < Number(head[1]); index++) {
            const length = /^\$(\d+)\r\n/.exec(buffer.slice(offset));
            if (!length) return;
            offset += length[0].length;
            const end = offset + Number(length[1]);
            if (buffer.length < end + 2) return;
            parts.push(buffer.slice(offset, end));
            offset = end + 2;
          }
          buffer = buffer.slice(offset);
          if (parts[0].toUpperCase() !== "HMGET") {
            socket.write("+OK\r\n");
            continue;
          }
          lookups++;
          const fields = parts.length - 2;
          const reply = "*" + fields + "\r\n" + "$-1\r\n".repeat(fields);
          // Every reply 100 ms late; in slow-lookup mode the first one 900 ms.
          const delay = mode === "slow-lookup" && lookups === 1 ? 900 : 100;
          setTimeout(() => socket.write(reply), delay);
        }
      });
    } else if (process.argv[2] === "command") {
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
  if (process.argv[2] === "lookups") {
    try {
      // Warm the connection, then measure only the lookups.
      await client.hmGet("h", ["warm"]);
      const start = Date.now();
      const answers = await Promise.all(
        Array.from({ length: 24 }, (_, index) => client.hmGet("h", ["f" + index])),
      );
      console.log(
        JSON.stringify({
          connections,
          answered: answers.filter(Array.isArray).length,
          elapsedMs: Date.now() - start,
        }),
      );
    } finally {
      client.close();
      sockets.forEach((socket) => socket.destroy());
      await new Promise((resolve) => server.close(resolve));
    }
    return;
  }
  if (process.argv[2] === "slow-lookup") {
    try {
      const start = Date.now();
      await client.hmGet("h", ["slow"]).catch(() => null);
      const firstMs = Date.now() - start;
      // Replies on one connection come back in order, so the late one has to
      // land before the next can. Once it has, the same connection answers.
      await new Promise((resolve) => setTimeout(resolve, 700));
      const second = await client.hmGet("h", ["next"]).catch(() => null);
      console.log(
        JSON.stringify({
          connections,
          firstMs,
          secondAnswered: Array.isArray(second),
        }),
      );
    } finally {
      client.close();
      sockets.forEach((socket) => socket.destroy());
      await new Promise((resolve) => server.close(resolve));
    }
    return;
  }
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
