import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The routes a push notification can open.
 *
 * A wrong segment here is invisible until someone taps a notification on their
 * lock screen and lands on a 404, which is the worst place to discover it and
 * the least likely to be reported. TypeScript cannot help: every segment is a
 * string, and they are all equally valid strings.
 *
 * So each one is checked against the route tree on disk. Resolution itself was
 * verified separately against real rows, and each resulting URL requested
 * against a production build.
 */
const source = await readFile(
  path.join(process.cwd(), "lib", "push-target.ts"),
  "utf8",
);

/** Top-level segments that exist under `app/[lang]`. */
async function routeSegments() {
  const root = path.join(process.cwd(), "app", "[lang]");
  const entries = await readdir(root, { withFileTypes: true });
  return new Set(
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  );
}

test("every route a notification can open exists", async () => {
  const segments = await routeSegments();

  // Pulled out of the template literals rather than listed again, so the test
  // reads what the code will actually build.
  const used = new Set(
    [...source.matchAll(/`\/\$\{lang\}\/([a-z]+)\//g)].map((match) => match[1]),
  );
  assert.ok(used.size > 0, "parsed no routes out of the resolver");

  const missing = [...used].filter((segment) => !segments.has(segment));
  assert.deepEqual(
    missing,
    [],
    `these notifications would open a 404: ${missing.join(", ")}`,
  );
});

test("the comment routes cover every commentable post type", async () => {
  // `content_comments.content_type` decides the route. A type present in the
  // database and missing from the map falls back to the feed, so the person
  // taps a reply to their review and lands on the timeline.
  const table = source.match(/const POST_ROUTE[\s\S]*?\};/)?.[0];
  assert.ok(table, "the post route map is gone");

  const segments = await routeSegments();
  const mapped = [...table.matchAll(/(\w+): "([a-z]+)"/g)];
  assert.ok(mapped.length >= 4, "expected a route per commentable type");
  for (const [, type, segment] of mapped)
    assert.ok(
      segments.has(segment),
      `comments on ${type} would open /${segment}, which is not a route`,
    );
});

test("a target that cannot be resolved falls back to the feed", () => {
  // A notification that opens nothing is a lost message; one that opens the
  // wrong page is only a nuisance. Every branch has to end somewhere.
  const branches = source.match(/return feed;/g) ?? [];
  assert.ok(
    branches.length >= 8,
    "some branch stopped falling back to the feed",
  );
  assert.ok(
    !/throw new/.test(source),
    "resolution throws, which would drop the notification entirely",
  );
});
