const { isWorker } = require("node:cluster");
const { createIgdbGate } = require("./igdb-gate");

/** NODE_UNIQUE_ID is deleted by Node before application code runs. */
function createIgdbClient({
  channel = process,
  worker = isWorker,
  limit = 4,
} = {}) {
  const clustered = worker;
  const local = createIgdbGate({ limit });
  const pending = new Map();
  let sequence = 0;
  const send = (message, callback = () => {}) => {
    if (!channel.connected || typeof channel.send !== "function") {
      callback(new Error("IGDB coordinator unavailable"));
      return;
    }
    channel.send(message, undefined, {}, callback);
  };
  if (clustered) {
    channel.on("message", (message) => {
      if (message?.type !== "uloggd:igdb-slot") return;
      const accept = pending.get(message.id);
      if (accept) accept(message);
      else send({ type: "uloggd:igdb-cancel", id: message.id });
    });
    channel.on("disconnect", () => {
      for (const accept of pending.values()) accept({ refused: true });
    });
  }
  const acquire = () => {
    const id = ++sequence;
    if (!clustered) return local.acquire(String(id));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        send({ type: "uloggd:igdb-cancel", id });
        reject(new Error("IGDB coordinator timed out"));
      }, 16000);
      pending.set(id, (message) => {
        clearTimeout(timeout);
        pending.delete(id);
        if (message.refused)
          return reject(new Error("IGDB is rate limited right now"));
        let released = false;
        resolve({
          at: message.at,
          release() {
            if (released) return;
            released = true;
            send({ type: "uloggd:igdb-release", id });
          },
        });
      });
      send({ type: "uloggd:igdb-slot", id }, (error) => {
        if (error) pending.get(id)?.({ refused: true });
      });
    });
  };
  return {
    async acquire() {
      const deadline = Date.now() + 16000;
      while (Date.now() < deadline) {
        const lease = await acquire();
        // A worker delayed by rendering cannot burst previously granted slots.
        if (Date.now() - lease.at <= 50) return lease.release;
        lease.release();
      }
      throw new Error("IGDB coordinator timed out");
    },
    hold(ms) {
      if (clustered) send({ type: "uloggd:igdb-hold", ms });
      else local.hold(ms);
    },
  };
}

module.exports = { createIgdbClient };
