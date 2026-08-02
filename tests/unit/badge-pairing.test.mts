import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The level and the check mark are either both interactive or both inert.
 *
 * There are two versions of each. `ProfileLevelBadge` and `VerifiedBadge` open
 * a dialog; `LevelMark` and `VerifiedNameMark` are pictures. Mixing them puts
 * two marks side by side where one reacts to a click and the other ignores it,
 * which reads as one of them being broken.
 *
 * A few places have to use the inert pair, and that is fine as long as both
 * are inert: a search result is one link acting as a listbox option and the
 * account trigger is a button, so neither can contain a dialog trigger.
 *
 * This drifted the moment the level badge became interactive everywhere, since
 * the check mark beside it was left as a picture in seven files.
 */
const ROOTS = ["components", "app"];
const INTERACTIVE = ["ProfileLevelBadge", "VerifiedBadge"];
const INERT = ["LevelMark", "VerifiedNameMark"];

/**
 * Files allowed to hold both kinds, because they render two separate contexts.
 *
 * The account menu has a trigger, which is a button and cannot contain
 * another, and a menu below it, which can. Everything else uses one pair.
 */
const MIXED_ALLOWED = new Set([path.join("components", "account-menu.tsx")]);

async function tsxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await tsxFiles(full)));
    else if (entry.name.endsWith(".tsx")) found.push(full);
  }
  return found;
}

/** Lines where a component is rendered, ignoring its import and definition. */
function usageLines(lines: string[], component: string) {
  return lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) =>
        line.includes(`<${component}`) &&
        !line.trimStart().startsWith("import") &&
        !line.includes(`export function ${component}`),
    )
    .map(({ index }) => index);
}

test("a level and a check mark beside it behave the same way", async () => {
  const offenders: string[] = [];
  let filesWithMarks = 0;

  for (const root of ROOTS)
    for (const file of await tsxFiles(path.join(process.cwd(), root))) {
      // The module that defines them all naturally mentions both kinds.
      if (file.endsWith("verified-badge.tsx")) continue;
      const relative = path.relative(process.cwd(), file);
      if (MIXED_ALLOWED.has(relative)) continue;
      const lines = (await readFile(file, "utf8")).split("\n");

      const used = (component: string) => usageLines(lines, component).length > 0;
      if (INTERACTIVE.some(used) || INERT.some(used)) filesWithMarks++;

      // Checked per file rather than by how close the two are on the page. A
      // line-distance version of this missed the connection card, where the
      // level moved out of the link and ended up seventeen lines from the
      // check mark it is rendered beside.
      for (const [a, b] of [
        [INTERACTIVE[0], INERT[1]],
        [INERT[0], INTERACTIVE[1]],
      ])
        if (used(a) && used(b))
          offenders.push(`${relative} renders <${a}> and <${b}>`);
    }

  // Guards against the sweep matching nothing and passing on an empty scan,
  // which is how a check like this rots without anyone noticing.
  assert.ok(filesWithMarks > 5, `only ${filesWithMarks} files render a mark`);
  assert.deepEqual(
    offenders,
    [],
    `these mix an interactive mark with an inert one:\n${offenders.join("\n")}`,
  );
});

test("every place that shows a level also shows it the same way twice", async () => {
  // The inert pair exists for two named places. Anywhere else reaching for it
  // is probably working around a nesting problem that should be fixed by
  // moving the mark out of the link instead.
  const allowed = new Set([
    // A listbox option: one link, and it closes on click.
    path.join("components", "game-search.tsx"),
    // The menu trigger is a button.
    path.join("components", "account-menu.tsx"),
    // The whole card is one link.
    path.join("components", "social", "connection-card.tsx"),
  ]);
  const found: string[] = [];
  for (const root of ROOTS)
    for (const file of await tsxFiles(path.join(process.cwd(), root))) {
      if (file.endsWith("verified-badge.tsx")) continue;
      const lines = (await readFile(file, "utf8")).split("\n");
      if (!usageLines(lines, "LevelMark").length) continue;
      const relative = path.relative(process.cwd(), file);
      if (!allowed.has(relative)) found.push(relative);
    }
  assert.deepEqual(
    found,
    [],
    `these use the inert level mark without being one of the two places that must:\n${found.join("\n")}`,
  );
});
