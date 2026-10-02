import "server-only";
import { readFileSync } from "node:fs";
import { createClient } from "redis";
import type { CatalogRedis } from "./redis-catalog-cache";

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
    commandsQueueMaxLength: 4,
    commandOptions: { timeout: 800 },
  };
}

export function createCatalogRedisClient(
  options: ReturnType<typeof catalogRedisOptions>,
  { now = Date.now, cooldownMs = 30_000 } = {},
): CatalogRedis & { close(): void } {
  let client: ReturnType<typeof createClient> | undefined;
  let connecting: Promise<void> | undefined;
  let retryAt = 0;
  let active = 0;
  const waiting: {
    resolve: () => void;
    reject: () => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];
  async function acquire() {
    if (active < 4) {
      active++;
      return;
    }
    if (waiting.length >= 32)
      throw new Error("Redis catalogue busy; using durable cache");
    await new Promise<void>((resolve, reject) => {
      const item = {
        resolve,
        reject: () =>
          reject(new Error("Redis catalogue busy; using durable cache")),
        timer: setTimeout(() => {
          const index = waiting.indexOf(item);
          if (index >= 0) waiting.splice(index, 1);
          item.reject();
        }, 800),
      };
      waiting.push(item);
    });
  }
  function release() {
    const next = waiting.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve();
    } else active--;
  }
  function close() {
    if (client?.isOpen) client.destroy();
    client = undefined;
  }
  return {
    async eval(script, args) {
      if (now() < retryAt) throw new Error("Redis catalogue cooling down");
      await acquire();
      try {
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
        // Driver command timeouts stop at dispatch. Bound the response as well.
        return await new Promise<unknown>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (current.isOpen) current.destroy();
            reject(new Error("Redis catalogue response timeout"));
          }, 1500);
          current
            .eval(script, args)
            .then(resolve, reject)
            .finally(() => clearTimeout(timer));
        });
      } catch {
        retryAt = now() + cooldownMs;
        close();
        // Never include the URL, credentials or a driver error in logs/responses.
        throw new Error("Redis catalogue unavailable; using durable cache");
      } finally {
        release();
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
