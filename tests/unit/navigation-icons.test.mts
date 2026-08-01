import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Every navigation destination resolves to its own icon.
 *
 * The sidebar and the overflow menu each kept a copy of this map, and the
 * copies drifted: one looked items up by `icon` and the other by `key`, so an
 * entry added to one was missing from the other and fell through to the
 * settings gear. Screenshots shipped that way, showing a cog in the "More"
 * menu, which nothing failed on because a wrong icon is still an icon.
 *
 * Reads source rather than rendering, since resolving these needs no runtime.
 */
const [navigation, iconMap] = await Promise.all([
  readFile(
    path.join(process.cwd(), "components", "platform-navigation.tsx"),
    "utf8",
  ),
  readFile(
    path.join(process.cwd(), "components", "navigation-icons.ts"),
    "utf8",
  ),
]);

test("every navigation item has an icon of its own", () => {
  // The icon names the sidebar asks for, straight out of the item list.
  const requested = [...navigation.matchAll(/icon:\s*"([a-z]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(requested.length > 5, "parsed too few items to be the real list");

  const known = new Set(
    [...iconMap.matchAll(/^\s{2}([a-z]+):\s*[A-Z]/gm)].map((match) => match[1]),
  );
  const missing = requested.filter((name) => !known.has(name));
  assert.deepEqual(
    missing,
    [],
    `these fall back to the settings gear: ${missing.join(", ")}`,
  );
});

test("there is one icon map, not one per menu", () => {
  // The drift was only possible because there were two. A second inline map is
  // what this is really guarding against.
  for (const file of ["adaptive-sidebar-navigation.tsx", "nav-more-menu.tsx"]) {
    const source = readFileSync(
      path.join(process.cwd(), "components", file),
      "utf8",
    );
    assert.ok(
      source.includes("NAVIGATION_ICONS"),
      `${file} does not use the shared map`,
    );
    assert.ok(
      !/const icons\s*[:=]/.test(source),
      `${file} declares an icon map of its own again`,
    );
  }
});
