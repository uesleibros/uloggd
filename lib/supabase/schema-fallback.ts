/**
 * PostgREST forwards Postgres' "undefined column/function" errors verbatim, so a
 * query that names a column a pending migration adds fails as a whole. Because
 * most call sites destructure only `data`, that failure is indistinguishable
 * from an empty result: the lists page renders zero lists, the screenshot page
 * 404s, and nothing anywhere says why.
 *
 * Detecting the shape lets a page retry against the pre-migration schema and
 * keep serving, while the log line names the gap for whoever has to apply the
 * migration.
 */
type QueryError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

const MISSING_SCHEMA_CODES = new Set([
  "42703", // undefined_column
  "42883", // undefined_function
  "PGRST202", // function not found in the schema cache
  "PGRST204", // column not found in the schema cache
]);

export function isMissingSchemaError(error: QueryError): boolean {
  if (!error) return false;
  if (error.code && MISSING_SCHEMA_CODES.has(error.code)) return true;
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    text.includes("does not exist") ||
    text.includes("could not find the function") ||
    text.includes("schema cache")
  );
}

/**
 * One line per degraded query. Loud enough to find in the server log, quiet
 * enough that a production instance with every migration applied never prints.
 */
export function warnSchemaGap(scope: string, error: QueryError) {
  console.error(
    `[schema] ${scope} degraded to the pre-migration shape, a migration is pending`,
    error?.message ?? error,
  );
}
