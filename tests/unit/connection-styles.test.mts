import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Every class the connection surfaces name has a rule behind it.
 *
 * This exists because the Steam "playing now" card shipped with no stylesheet
 * at all. The component was written, the CSS was meant to go in beside the
 * Twitch card, the edit that was supposed to place it matched nothing and said
 * nothing, and the result went out as unstyled markup. Nothing failed: the
 * build passed, the types passed, the tests passed, and the only thing that
 * noticed was somebody looking at the page.
 *
 * A class with no rule is the one kind of front-end mistake that is invisible
 * to every check except a pair of eyes, so it gets a check of its own.
 */

const COMPONENTS = [
  "components/steam-playing-card.tsx",
  "components/twitch-live-card.tsx",
  "components/settings/connection-settings.tsx",
];

/** Class names this file is responsible for; the rest belong to other rules. */
const OWNED = /^(steam|twitch|settings-connection)-/;

async function stylesheets(): Promise<string> {
  const roots = ["app"];
  const files: string[] = [];
  while (roots.length) {
    const dir = roots.pop()!;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) roots.push(full);
      else if (entry.name.endsWith(".css")) files.push(full);
    }
  }
  const contents = await Promise.all(
    files.map((file) => readFile(file, "utf8")),
  );
  return contents.join("\n");
}

test("no connection class ships without a stylesheet rule", async () => {
  const css = await stylesheets();
  const missing: string[] = [];

  for (const component of COMPONENTS) {
    const source = await readFile(component, "utf8");
    // Only static `className="..."` literals. A computed one cannot be
    // checked from here, and guessing at it would make this test lie.
    for (const match of source.matchAll(/className="([^"{}]+)"/g))
      for (const token of match[1].split(/\s+/).filter(Boolean)) {
        if (!OWNED.test(token)) continue;
        // `.token` followed by anything that ends a compound selector: a
        // space, a comma, a brace, another class, a pseudo, an attribute.
        const rule = new RegExp(`\\.${token}(?![\\w-])`);
        if (!rule.test(css)) missing.push(`${component}: .${token}`);
      }
  }

  assert.deepEqual(
    missing,
    [],
    `these classes are rendered but styled nowhere:\n${missing.join("\n")}`,
  );
});

test("the two presence cards are both actually styled", async () => {
  // The named version of the check above, so an edit to the scanning regex
  // cannot quietly make the whole file vacuous.
  //
  // Boundary-aware, not a substring test: `.steam-playing-mark` appears inside
  // `.steam-playing-mark-renamed`, so a plain `includes` would keep passing
  // through exactly the rename this is meant to catch.
  const css = await stylesheets();
  for (const anchor of [
    "steam-playing-card",
    "steam-playing-mark",
    "steam-playing-body",
    "twitch-live-card",
    "twitch-live-thumb",
    "twitch-live-badge",
  ])
    assert.ok(
      new RegExp(`\\.${anchor}(?![\\w-])`).test(css),
      `.${anchor} has no rule anywhere`,
    );
});
