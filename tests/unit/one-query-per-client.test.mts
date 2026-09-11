import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A shared pg client carries one query at a time.
 *
 * `Promise.all` over `client.query` reads like parallelism and is not: the
 * driver queues the calls on the single connection and warns that calling
 * `query` while the client is busy is deprecated, which becomes an error in
 * pg@9. There were sixteen of these, and the warning was on every page of the
 * production log.
 *
 * They cannot simply move to a connection each. `asOwner` sets the row-level
 * identity on one client inside a transaction, so a query on another connection
 * runs as nobody, and the pool is four per worker: a page that took four
 * connections to render would starve the next three requests. `series` in
 * lib/api/series.ts is the shape they use instead.
 *
 * This walks the source rather than the runtime because the failure is a
 * deprecation warning today: it does not fail a test, it just prints, until the
 * version bump turns every one of them into a broken page.
 */

const ROOTS = ["app/api", "lib/api", "lib"];
const OPENERS = ["Promise.all(", "Promise.allSettled("];

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".ts")) yield full;
  }
}

/** The argument list of the call opened at `from`, bracket balanced. */
function argumentsOf(source: string, from: number) {
  let depth = 0;
  for (let at = from; at < source.length; at += 1) {
    const ch = source[at];
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(from, at + 1);
    }
  }
  return source.slice(from);
}

test("no concurrent queries share one pg client", async () => {
  const offenders: string[] = [];

  for (const root of ROOTS) {
    for await (const file of walk(path.join(process.cwd(), root))) {
      const source = await readFile(file, "utf8");
      // The helper itself explains the rule, and its own text names the thing
      // it replaces.
      if (file.endsWith(path.join("lib", "api", "series.ts"))) continue;

      for (const opener of OPENERS) {
        let at = source.indexOf(opener);
        while (at !== -1) {
          const args = argumentsOf(source, at + opener.length - 1);
          // A `client` named inside the concurrent branches is the tell. The
          // await-free cases (a `getGamesByIds` next to one query) are fine and
          // do not mention it more than once.
          const mentions = args.match(/\bclient\b/g)?.length ?? 0;
          if (mentions > 1)
            offenders.push(
              `${path.relative(process.cwd(), file)}: ${
                source.slice(0, at).split("\n").length
              } (${mentions} client references inside ${opener})`,
            );
          at = source.indexOf(opener, at + 1);
        }
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these run queries concurrently on one connection; use series() from lib/api/series.ts:\n${offenders.join("\n")}`,
  );
});

test("the series helper runs its tasks one after another", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib/api/series.ts"),
    "utf8",
  );
  assert.match(
    source,
    /for \(const task of tasks\) answers\.push\(await task\(\)\)/,
  );
  // The prose above it names what it replaces, so only the code is checked.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
  assert.doesNotMatch(
    code,
    /Promise\.all/,
    "the whole point is that it does not do that",
  );
});
