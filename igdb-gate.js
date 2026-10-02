/** Grants live request leases, rather than booking sends that can outlive a hold. */
function createIgdbGate({
  limit = 4,
  windowMs = 1100,
  concurrency = 8,
  maxQueue = 128,
  maxWaitMs = 15000,
  maxLeaseMs = 11000,
  now = Date.now,
} = {}) {
  const rate = Math.max(1, Math.min(4, Math.floor(limit)));
  const openLimit = Math.max(1, Math.min(8, Math.floor(concurrency)));
  const queued = new Map();
  const active = new Map();
  const starts = [];
  let heldUntil = 0;
  let timer;
  function pump() {
    clearTimeout(timer);
    timer = undefined;
    const at = now();
    while (starts.length && starts[0] <= at - windowMs) starts.shift();
    while (queued.size && active.size < openLimit) {
      const wait = Math.max(
        heldUntil - at,
        starts.length >= rate ? starts[0] + windowMs - at : 0,
      );
      if (wait > 0) {
        timer = setTimeout(pump, wait);
        return;
      }
      const [key, pending] = queued.entries().next().value;
      queued.delete(key);
      clearTimeout(pending.timer);
      starts.push(at);
      const release = () => {
        if (!active.delete(key)) return;
        clearTimeout(expiry);
        pump();
      };
      const expiry = setTimeout(release, maxLeaseMs);
      active.set(key, release);
      pending.resolve({ at, release });
    }
  }
  return {
    acquire(key) {
      if (queued.has(key) || active.has(key))
        return Promise.reject(new Error("Duplicate IGDB lease"));
      if (queued.size >= maxQueue)
        return Promise.reject(new Error("IGDB is rate limited right now"));
      return new Promise((resolve, reject) => {
        const expiry = setTimeout(() => {
          queued.delete(key);
          reject(new Error("IGDB is rate limited right now"));
          pump();
        }, maxWaitMs);
        queued.set(key, { resolve, reject, timer: expiry });
        pump();
      });
    },
    release(key) {
      active.get(key)?.();
    },
    cancel(key) {
      const pending = queued.get(key);
      if (pending) {
        clearTimeout(pending.timer);
        queued.delete(key);
        pending.reject(new Error("IGDB request cancelled"));
      }
      active.get(key)?.();
      pump();
    },
    cancelOwner(prefix, includeActive = true) {
      for (const key of [
        ...queued.keys(),
        ...(includeActive ? active.keys() : []),
      ])
        if (key.startsWith(prefix)) this.cancel(key);
    },
    hold(ms) {
      heldUntil = Math.max(heldUntil, now() + ms);
      pump();
    },
  };
}

function attachIgdbGate(cluster, gate) {
  cluster.on("message", (worker, message) => {
    const key = worker.id + ":" + message?.id;
    if (message?.type === "uloggd:igdb-hold")
      gate.hold(Number(message.ms) || 0);
    if (message?.type === "uloggd:igdb-release") gate.release(key);
    if (message?.type === "uloggd:igdb-cancel") gate.cancel(key);
    if (message?.type !== "uloggd:igdb-slot") return;
    void gate.acquire(key).then(
      (lease) => {
        if (!worker.isConnected()) return lease.release();
        worker.send(
          { type: "uloggd:igdb-slot", id: message.id, at: lease.at },
          (error) => {
            if (error) lease.release();
          },
        );
      },
      () => {
        if (worker.isConnected())
          worker.send(
            { type: "uloggd:igdb-slot", id: message.id, refused: true },
            () => {},
          );
      },
    );
  });
  // Draining workers can still have open fetches until they exit or time out.
  cluster.on("disconnect", (worker) =>
    gate.cancelOwner(worker.id + ":", false),
  );
  cluster.on("exit", (worker) => gate.cancelOwner(worker.id + ":"));
}
module.exports = { createIgdbGate, attachIgdbGate };
