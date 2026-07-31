import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guards the seam that once swallowed a whole feature.
 *
 * `notifications_kind_check` lists the kinds the table accepts, and
 * `notification_preference_enabled` decides whether each one is delivered. The
 * function ends in `else false`, so a kind present in the constraint but
 * missing from the function is written nowhere and reported nowhere: no error,
 * no log, no failing build. That is exactly how `profile_comment_like` stopped
 * notifying when the screenshot pass rewrote the function.
 *
 * Reads the migrations from disk rather than the database so it runs in CI
 * without credentials.
 */
async function latestMigrationMatch(pattern: RegExp) {
  const root = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(root)).filter((name) => name.endsWith(".sql"));
  files.sort();
  let found: string | null = null;
  for (const name of files) {
    const sql = await readFile(path.join(root, name), "utf8");
    const match = sql.match(pattern);
    if (match) found = match[1];
  }
  return found;
}

test("every notification kind has a delivery preference", async () => {
  const constraint = await latestMigrationMatch(
    /notifications_kind_check check \(\s*kind in \(([\s\S]*?)\)\s*\);/,
  );
  const preference = await latestMigrationMatch(
    /create or replace function public\.notification_preference_enabled[\s\S]*?select case preference_kind([\s\S]*?)else false end/,
  );
  assert.ok(constraint, "no kind constraint found in the migrations");
  assert.ok(preference, "no preference function found in the migrations");

  const kinds = [...constraint.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  const handled = new Set(
    [...preference.matchAll(/when '([a-z_]+)' then/g)].map((m) => m[1]),
  );
  assert.ok(kinds.length > 0, "parsed no kinds from the constraint");

  const missing = kinds.filter((kind) => !handled.has(kind));
  assert.deepEqual(
    missing,
    [],
    `these kinds would be dropped silently by the else branch: ${missing.join(", ")}`,
  );
});
