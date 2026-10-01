import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

test("UI hints use the shared tooltip instead of native title attributes", async () => {
  const violations: string[] = [];
  async function walk(root: string) {
    for (const file of await readdir(root, { withFileTypes: true })) {
      const name = path.join(root, file.name);
      if (file.isDirectory()) {
        await walk(name);
        continue;
      }
      if (!name.endsWith(".tsx")) continue;
      const source = ts.createSourceFile(
        name,
        await readFile(name, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node: ts.Node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          // An iframe title names an embedded document for assistive technology.
          if (
            tag !== "iframe" &&
            (/^[a-z]/.test(tag) || /\.(Trigger|Button)$/.test(tag)) &&
            node.attributes.properties.some(
              (prop) =>
                ts.isJsxAttribute(prop) &&
                prop.name.getText(source) === "title",
            )
          )
            violations.push(name);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  await walk("components");
  await walk("app");
  assert.deepEqual(violations, []);
});
