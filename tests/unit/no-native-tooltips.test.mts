import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * No `title` attribute on a DOM element outside an `<iframe>`.
 *
 * The native tooltip cannot be styled, waits about a second to appear, never
 * shows on touch, and is skipped by several screen readers. Everything that
 * used one now uses the tooltip in `components/ui/tooltip`, and this keeps the
 * next one from arriving unnoticed: it is a single attribute, easy to add out
 * of habit, and nothing else would ever flag it.
 *
 * Two things are deliberately allowed. On an `<iframe>`, `title` is the
 * accessible name and is required rather than decorative. On a capitalised
 * tag it is a prop of a React component, which is a name for a section or the
 * subject of a share sheet, not a tooltip.
 */
const ROOTS = ["components", "app"];

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

/**
 * The tag a `title=` on this line belongs to.
 *
 * Walks back to the nearest unclosed opening tag, counting closing tags on the
 * way so a sibling element that ended above the attribute is not mistaken for
 * its owner.
 */
function owningTag(lines: string[], index: number) {
  let depth = 0;
  for (let j = index; j >= 0 && j > index - 30; j--) {
    const matches = [...lines[j].matchAll(/<\/?([A-Za-z][A-Za-z0-9.]*)/g)];
    if (!matches.length) continue;
    const last = matches[matches.length - 1];
    if (last[0].startsWith("</")) {
      depth++;
      continue;
    }
    if (depth > 0) {
      depth--;
      continue;
    }
    return last[1];
  }
  return null;
}

test("no element uses the browser's own tooltip", async () => {
  const offenders: string[] = [];
  let scanned = 0;
  for (const root of ROOTS)
    for (const file of await tsxFiles(path.join(process.cwd(), root))) {
      const lines = (await readFile(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        if (!/\btitle=/.test(line)) return;
        scanned++;
        const tag = owningTag(lines, index);
        if (!tag || !/^[a-z]/.test(tag) || tag === "iframe") return;
        offenders.push(
          `${path.relative(process.cwd(), file)}:${index + 1} <${tag}>`,
        );
      });
    }

  // Guards against the walk silently matching nothing and passing on an empty
  // scan, which is how this check would rot without anyone noticing.
  assert.ok(scanned > 10, `only found ${scanned} title attributes to classify`);
  assert.deepEqual(
    offenders,
    [],
    `these use the native tooltip instead of components/ui/tooltip:\n${offenders.join("\n")}`,
  );
});
