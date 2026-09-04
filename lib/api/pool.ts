import "server-only";
import { Pool } from "pg";

declare global {
  var uloggdApiPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new Pool({
    connectionString,
    max: Number(process.env.API_POOL_MAX ?? 4),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function apiPool() {
  globalThis.uloggdApiPool ??= createPool();
  return globalThis.uloggdApiPool;
}
