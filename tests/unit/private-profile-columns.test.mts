import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * `birth_date`, `age_assured_at` and `age_assurance_method` are revoked from
 * `anon` and `authenticated`, because row-level security cannot restrict
 * columns and `profiles_public_read` is `using (true)`. Reaching them goes
 * through `own_age_profile()`.
 *
 * Naming one of them in a `select()` fails at runtime and nowhere else: the
 * request comes back 42501, the call site destructures only `data`, and the
 * page renders as if the row did not exist. TypeScript does not check a select
 * string and a production build never talks to PostgREST, so a reintroduced
 * read reaches users looking exactly like a missing profile. That is the same
 * shape as the embed that took every profile page down.
 *
 * Reads source rather than the database so it needs no credentials.
 */
const PRIVATE_COLUMNS = [
  "birth_date",
  "age_assured_at",
  "age_assurance_method",
];

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  "supabase",
  "tests",
]);

async function sourceFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      found.push(...(await sourceFiles(full)));
    } else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Every `select("…")` argument that follows a `from("profiles")`, including the
 * embedded selects other tables use to pull a profile in. Deliberately coarse:
 * a select string anywhere near a profiles query is worth checking, and a false
 * positive here costs one review, while a miss costs a broken page.
 */
function profileSelectLiterals(source: string): string[] {
  const literals: string[] = [];
  const pattern = /\.select\(\s*(["'`])([\s\S]*?)\1/g;
  for (const match of source.matchAll(pattern)) {
    const columns = match[2];
    if (/\bprofiles\b/.test(columns)) {
      literals.push(columns);
      continue;
    }
    // A plain `from("profiles").select(...)`: look back far enough to cover the
    // chained calls that can sit between the two.
    const before = source.slice(Math.max(0, match.index - 400), match.index);
    if (/from\(\s*["'`]profiles["'`]\s*\)[^;]*$/.test(before))
      literals.push(columns);
  }
  return literals;
}

test("no profiles select reads a revoked column", async () => {
  const files = await sourceFiles(process.cwd());
  assert.ok(files.length > 0, "found no source files to scan");

  const offenders: string[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (!source.includes("profiles")) continue;
    for (const literal of profileSelectLiterals(source)) {
      const named = PRIVATE_COLUMNS.filter((column) =>
        new RegExp(`\\b${column}\\b`).test(literal),
      );
      if (named.length > 0)
        offenders.push(
          `${path.relative(process.cwd(), file)} selects ${named.join(", ")}`,
        );
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these reads are revoked at the database and will fail at runtime, use getOwnAgeProfile() instead:\n${offenders.join("\n")}`,
  );
});

test("the migration revokes the table grant before granting columns", async () => {
  // A column-level revoke is a no-op while a table-wide `grant select` stands,
  // which is how the first attempt at this fix passed review and changed
  // nothing. The order is the fix, so the order is what gets asserted.
  const root = path.join(process.cwd(), "supabase", "migrations");
  const names = (await readdir(root)).filter((name) =>
    name.includes("protect_private_profile_columns"),
  );
  assert.equal(names.length, 1, "expected exactly one privilege migration");

  const sql = await readFile(path.join(root, names[0]), "utf8");
  const revoke = sql.search(
    /revoke\s+select\s+on\s+public\.profiles\s+from\s+anon,\s*authenticated/i,
  );
  const grant = sql.search(/grant\s+select\s*\(/i);
  assert.ok(revoke >= 0, "the table-level revoke is missing");
  assert.ok(grant >= 0, "the per-column grants are missing");
  assert.ok(revoke < grant, "the table revoke must come before the grants");

  for (const column of PRIVATE_COLUMNS)
    assert.ok(
      !new RegExp(`^\\s*${column},?\\s*$`, "m").test(sql),
      `${column} appears in a grant list and would stay readable`,
    );
});
