import "server-only";
import { after } from "next/server";
import { apiPool } from "@/lib/api/pool";
import { createCatalogStore } from "./catalog-store";
import { createPublicCatalogCache } from "./public-catalog-cache";
import { catalogRedis } from "./catalog-redis-client";
import {
  accelerateCatalogStore,
  createRedisCatalogCache,
} from "./redis-catalog-cache";

declare global {
  var uloggdCatalogueCli: boolean | undefined;
  var uloggdPublicCatalogue:
    ReturnType<typeof createPublicCatalogCache> | undefined;
}
let warnedAt = 0;
let redisWarnedAt = 0;
const durable = {
  read: (keys: string[]) => createCatalogStore(apiPool()).read(keys),
  claim: (keys: string[], ttl: number) =>
    createCatalogStore(apiPool()).claim(keys, ttl),
  write: (
    ...args: Parameters<ReturnType<typeof createCatalogStore>["write"]>
  ) => createCatalogStore(apiPool()).write(...args),
  fail: (...args: Parameters<ReturnType<typeof createCatalogStore>["fail"]>) =>
    createCatalogStore(apiPool()).fail(...args),
};
const store = process.env.REDIS_URL
  ? accelerateCatalogStore(
      durable,
      createRedisCatalogCache({
        eval: (script, options) => catalogRedis().eval(script, options),
      }),
      () => {
        if (Date.now() - redisWarnedAt < 60_000) return;
        redisWarnedAt = Date.now();
        console.warn("[igdb] Redis unavailable; using durable catalogue cache");
      },
      Date.now,
      globalThis.uloggdCatalogueCli ? undefined : (task) => after(task),
    )
  : durable;

/** Backend storage of public IGDB responses. This boundary never reads user tables. */
export const publicCatalogue = (globalThis.uloggdPublicCatalogue ??=
  createPublicCatalogCache({
    store,
    maxBytes: 8 * 1024 * 1024,
    maxEntries: 5000,
    defer: (task) => after(task),
    onRefreshError: () => {
      if (Date.now() - warnedAt < 60_000) return;
      warnedAt = Date.now();
      console.warn(
        "[igdb] serving a complete previous catalogue; background refresh unavailable",
      );
    },
  }));
