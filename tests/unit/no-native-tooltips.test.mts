import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

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

function titles(source: string) {
  const parsed = ts.createSourceFile(
    "source.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: { tag: string; line: number }[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      for (const attribute of node.attributes.properties) {
        if (
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText(parsed) === "title"
        )
          found.push({
            tag: node.tagName.getText(parsed),
            line:
              parsed.getLineAndCharacterOfPosition(attribute.getStart(parsed))
                .line + 1,
          });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return found;
}

test("tooltip scanning distinguishes JSX attributes from metadata and variables", () => {
  assert.deepEqual(
    titles(
      'const title = "label"; const node = <div data-context-title={title}><a title="native" /><iframe title="accessible" /><Custom title="prop" /></div>;',
    ).map(({ tag }) => tag),
    ["a", "iframe", "Custom"],
  );
});

test("no element uses the browser's own tooltip", async () => {
  const offenders: string[] = [];
  let scanned = 0;
  for (const root of ROOTS)
    for (const file of await tsxFiles(path.join(process.cwd(), root))) {
      titles(await readFile(file, "utf8")).forEach(({ tag, line }) => {
        scanned++;
        if (!/^[a-z]/.test(tag) || tag === "iframe") return;
        offenders.push(
          `${path.relative(process.cwd(), file)}:${line} <${tag}>`,
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
