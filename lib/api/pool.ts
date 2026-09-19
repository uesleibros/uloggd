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
  const pool = new Pool({
    connectionString,
    max: Number(process.env.API_POOL_MAX ?? 4),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // An idle connection the database drops is reported here, not to any query:
  // Supabase's pooler closes connections it has held too long, and restarts
  // take all of them. With no listener, Node treats the event as an uncaught
  // exception and the whole worker dies, with every request it was serving;
  // it was seen doing exactly that, "Connection terminated unexpectedly". The
  // pool has already discarded the broken client and opens a new one on the
  // next checkout, so there is nothing to do but say so.
  pool.on("error", (error) => {
    console.error(
      "[pool] an idle database connection was lost:",
      error.message,
    );
  });
  return pool;
}

export function apiPool() {
  globalThis.uloggdApiPool ??= createPool();
  return globalThis.uloggdApiPool;
}
