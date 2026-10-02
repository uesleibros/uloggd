import "server-only";
import { after } from "next/server";
import { apiPool } from "@/lib/api/pool";
import { createCatalogStore } from "./catalog-store";
import { createPublicCatalogCache } from "./public-catalog-cache";

declare global {
  var uloggdPublicCatalogue:
    ReturnType<typeof createPublicCatalogCache> | undefined;
}
let warnedAt = 0;

/** Backend storage of public IGDB responses. This boundary never reads user tables. */
export const publicCatalogue = (globalThis.uloggdPublicCatalogue ??=
  createPublicCatalogCache({
    store: {
      read: (keys) => createCatalogStore(apiPool()).read(keys),
      claim: (keys, ttl) => createCatalogStore(apiPool()).claim(keys, ttl),
      write: (claims, values) =>
        createCatalogStore(apiPool()).write(claims, values),
      fail: (claims, error) =>
        createCatalogStore(apiPool()).fail(claims, error),
    },
    defer: (task) => after(task),
    onRefreshError: () => {
      if (Date.now() - warnedAt < 60_000) return;
      warnedAt = Date.now();
      console.warn(
        "[igdb] serving a complete previous catalogue; background refresh unavailable",
      );
    },
  }));
