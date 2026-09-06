import "server-only";

/**
 * A `q` turned into something safe to hand `ilike`.
 *
 * The wildcards are ours, not the caller's: a term carrying its own `%` would
 * otherwise decide how much of the index to walk, and one carrying `_` would
 * match a character nobody typed. Absent or empty comes back null, which every
 * query here reads as "no filter" rather than as "match nothing".
 */
export function searchTerm(request: Request) {
  const raw = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!raw) return null;
  return `%${raw.slice(0, 60).replace(/[\%_]/g, "\$&")}%`;
}
