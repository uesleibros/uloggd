import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Nothing in the browser talks to the database.
 *
 * The site is meant to go through its own API, and the reason is not tidiness:
 * an API the product itself cannot live on is an API nobody has proven. Every
 * query that goes around it is a second implementation with its own shape, its
 * own failure modes and its own idea of what a row looks like, and it is the
 * one nobody tests.
 *
 * Authentication is the exception, and only authentication. Signing in,
 * enrolling a second factor, listing passkeys and refreshing a session are
 * Supabase Auth, not the database; putting our own API in front of them would
 * mean reimplementing an identity provider, which is a bigger promise than
 * this rule is worth.
 */

const ROOT = process.cwd();
const ROOTS = ["components", "app"];

/**
 * What reaching the database looks like, whatever the client is called.
 *
 * Asking whether each line mentions `.auth` does not work: the client is
 * usually named on one line and used on the next. These are the verbs that
 * touch data, and none of them belongs in a browser bundle.
 */
const DATABASE = /\.(from|rpc|channel)\(|\.storage\b/;

async function tsxFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Route handlers are the API. They are supposed to reach the database.
      if (full.includes(`${path.sep}api${path.sep}`)) continue;
      found.push(...(await tsxFiles(full)));
    } else if (entry.name.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

test("no client component reads the database directly", async () => {
  const offenders: string[] = [];

  for (const root of ROOTS) {
    for (const file of await tsxFiles(path.join(ROOT, root))) {
      const source = await readFile(file, "utf8");
      if (!/^\s*"use client";/m.test(source)) continue;
      if (!/supabase/i.test(source)) continue;

      const reaching = source
        .split("\n")
        .filter(
          (line) =>
            DATABASE.test(line) &&
            !line.trimStart().startsWith("*") &&
            !line.trimStart().startsWith("//"),
        );

      if (reaching.length)
        offenders.push(
          `${path.relative(ROOT, file)}: ${reaching[0].trim().slice(0, 80)}`,
        );
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these run in the browser and reach past the API:\n  ${offenders.join("\n  ")}`,
  );
});

test("the API client is how the browser asks for data", async () => {
  // A sanity check on the rule above: if nothing imported the API client, the
  // first test would pass by there being no browser data access at all.
  const provider = await readFile(
    path.join(ROOT, "components/xp-feedback-provider.tsx"),
    "utf8",
  );
  assert.match(provider, /from "@\/lib\/api-client"/);
  assert.match(provider, /\/profiles\/levels\?ids=/);
  // The word still appears, in the comment explaining why it does not any
  // more, so this asks about the import rather than the prose.
  assert.doesNotMatch(provider, /from "@\/lib\/supabase\//);
});
