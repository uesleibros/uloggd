import "server-only";
import { readFileSync } from "node:fs";
import { createClient } from "redis";
import type { CatalogRedis } from "./redis-catalog-cache";

/**
 * How many commands may wait on the connection at once.
 *
 * It was 4. One connection to Redis is a pipeline: twelve commands sent
 * together come back in one round trip, which is the whole reason to keep a
 * single connection per worker. With room for only four, the fifth lookup a
 * page made either waited behind the others or failed with "The queue is
 * full", and the page then went to PostgreSQL anyway, having paid for the
 * wait first. That is the shape of a cache that makes the site slower.
 */
const QUEUE_LIMIT = 256;

/** Keep TLS verification enabled, including for the provider's own certificate. */
export function catalogRedisOptions(env: NodeJS.ProcessEnv = process.env) {
  const ca =
    env.REDIS_CA_CERT?.replace(/\\n/g, "\n") ||
    (env.REDIS_CA_CERT_PATH
      ? readFileSync(env.REDIS_CA_CERT_PATH, "utf8")
      : undefined);
  return {
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 1500,
      reconnectStrategy: false as const,
      ...(env.REDIS_URL?.startsWith("rediss:")
        ? {
            tls: true as const,
            rejectUnauthorized: true,
            ...(ca ? { ca } : {}),
          }
        : {}),
    },
    disableOfflineQueue: true,
    commandsQueueMaxLength: QUEUE_LIMIT,
    commandOptions: { timeout: 800 },
  };
}

/**
 * Two lanes on one connection: lookups and population.
 *
 * They used to share one gate of four. Filling Redis is background work, a Lua
 * script that checks the server's memory and rewrites accounting, and while
 * four of those were running every lookup from every page on that worker
 * queued behind them for up to 800 ms and then gave up and read PostgreSQL.
 * Population competed with the requests it existed to speed up.
 *
 * Lookups now go straight onto the pipeline with a short deadline of their
 * own. Population runs one script at a time per worker and is dropped, not
 * queued, when it falls behind: a missed fill costs one SQL read later, and a
 * fill that delays a page costs every reader now.
 */
export function createCatalogRedisClient(
  options: ReturnType<typeof catalogRedisOptions>,
  {
    now = Date.now,
    cooldownMs = 30_000,
    readDeadlineMs = 400,
    writeDeadlineMs = 1500,
  } = {},
): CatalogRedis & { close(): void } {
  let client: ReturnType<typeof createClient> | undefined;
  let connecting: Promise<void> | undefined;
  let retryAt = 0;
  // A single slow reply is a busy server, not a dead link. Three in a row is.
  let slowReads = 0;

  let writing = 0;
  const waitingWrites: {
    resolve: () => void;
    reject: () => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];

  function close() {
    if (client?.isOpen) client.destroy();
    client = undefined;
  }
  function failLink() {
    retryAt = now() + cooldownMs;
    slowReads = 0;
    close();
  }

  async function ready() {
    if (now() < retryAt) throw new Error("Redis catalogue cooling down");
    if (!client) {
      client = createClient(options);
      client.on("error", () => {});
    }
    const current = client;
    if (!current.isReady) {
      if (!connecting) {
        // Also bound DNS and the entire handshake, not just socket opening.
        connecting = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (current.isOpen) current.destroy();
            reject(new Error("Redis catalogue connection timeout"));
          }, 1800);
          current
            .connect()
            .then(() => resolve(), reject)
            .finally(() => clearTimeout(timer));
        }).finally(() => {
          connecting = undefined;
        });
      }
      await connecting;
    }
    return current;
  }

  /** Driver timeouts stop at dispatch. This bounds the reply as well. */
  function within<T>(work: Promise<T>, ms: number) {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Redis catalogue response timeout")),
        ms,
      );
      work.then(resolve, reject).finally(() => clearTimeout(timer));
    });
  }

  async function acquireWrite() {
    if (writing < 1) {
      writing++;
      return;
    }
    if (waitingWrites.length >= 16)
      throw new Error("Redis catalogue population behind; skipped");
    await new Promise<void>((resolve, reject) => {
      const item = {
        resolve,
        reject: () =>
          reject(new Error("Redis catalogue population behind; skipped")),
        timer: setTimeout(() => {
          const index = waitingWrites.indexOf(item);
          if (index >= 0) waitingWrites.splice(index, 1);
          item.reject();
        }, 5000),
      };
      waitingWrites.push(item);
    });
  }
  function releaseWrite() {
    const next = waitingWrites.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve();
    } else writing--;
  }

  return {
    async hmGet(key, fields) {
      let current: Awaited<ReturnType<typeof ready>>;
      try {
        current = await ready();
      } catch {
        failLink();
        throw new Error("Redis catalogue unavailable; using durable cache");
      }
      try {
        const values = await within(
          current.hmGet(key, fields),
          readDeadlineMs,
        );
        slowReads = 0;
        return values as (string | null)[];
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Redis catalogue response timeout"
        ) {
          // Leave the connection alone: the reply will still arrive and the
          // pipeline stays in order. Only a run of them means the link died.
          if (++slowReads >= 3) failLink();
        } else failLink();
        // Never include the URL, credentials or a driver error in logs/responses.
        throw new Error("Redis catalogue unavailable; using durable cache");
      }
    },
    async eval(script, args) {
      if (now() < retryAt) throw new Error("Redis catalogue cooling down");
      await acquireWrite();
      try {
        const current = await ready();
        return await within(current.eval(script, args), writeDeadlineMs);
      } catch {
        // A population script that cannot be answered in time means the
        // server is stuck, and lookups on the same connection would be too.
        failLink();
        throw new Error("Redis catalogue unavailable; using durable cache");
      } finally {
        releaseWrite();
      }
    },
    close,
  };
}

declare global {
  var uloggdCatalogRedis:
    ReturnType<typeof createCatalogRedisClient> | undefined;
}

export function catalogRedis(): CatalogRedis {
  return (globalThis.uloggdCatalogRedis ??= createCatalogRedisClient(
    catalogRedisOptions(),
  ));
}
