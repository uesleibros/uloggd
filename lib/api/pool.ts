import "server-only";
import { Pool, types } from "pg";

// A date column is a calendar day, not an instant. Left alone, the driver
// hands back a Date at local midnight and JSON turns it into a UTC timestamp,
// so a session logged on the 3rd reads as the 2nd or the 4th depending on
// where the reader is. Kept as text, played_on is the day it says it is.
types.setTypeParser(types.builtins.DATE, (value) => value);
// The same for a bare time: 21:30 is a time of day, and nothing about it
// wants a timezone attached.
types.setTypeParser(types.builtins.TIME, (value) => value);

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
