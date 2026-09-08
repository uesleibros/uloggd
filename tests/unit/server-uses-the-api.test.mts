import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const root = process.cwd();
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    return item.isDirectory()
      ? files(full)
      : /\.tsx?$/.test(full)
        ? [full]
        : [];
  });
}
function resolve(from: string, spec: string) {
  const base = spec.startsWith("@/")
    ? path.join(root, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(from), spec)
      : null;
  return base
    ? [
        base,
        base + ".ts",
        base + ".tsx",
        path.join(base, "index.ts"),
        path.join(base, "index.tsx"),
      ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile())
    : undefined;
}
test("website and runtime helpers reach data only through the API", () => {
  const queue = [
    ...files(path.join(root, "app")).filter((file) => {
      const relative = path
        .relative(path.join(root, "app"), file)
        .split(path.sep)
        .join("/");
      return (
        !relative.startsWith("api/") &&
        relative !== "[lang]/moderation/page.tsx"
      );
    }),
    path.join(root, "proxy.ts"),
  ];
  const seen = new Set<string>();
  const offenders: string[] = [];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const report = (node: ts.Node) =>
      offenders.push(
        path.relative(root, file) +
          ":" +
          (source.getLineAndCharacterOfPosition(node.getStart()).line + 1) +
          " " +
          node.getText(source).slice(0, 110),
      );
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const clause = ts.isImportDeclaration(node)
          ? node.importClause
          : undefined;
        const bindings = clause?.namedBindings;
        const typeOnly = ts.isExportDeclaration(node)
          ? node.isTypeOnly
          : clause?.isTypeOnly ||
            (!clause?.name &&
              bindings &&
              ts.isNamedImports(bindings) &&
              bindings.elements.every((item) => item.isTypeOnly));
        if (typeOnly) return;
        const spec = node.moduleSpecifier;
        if (spec && ts.isStringLiteral(spec)) {
          if (spec.text === "pg" || spec.text.startsWith("@/lib/api/"))
            report(node);
          const dependency = resolve(file, spec.text);
          if (dependency) queue.push(dependency);
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const access = node.expression;
        if (
          ["rpc", "channel"].includes(access.name.text) ||
          (access.name.text === "from" &&
            !/^(Array|Buffer|Uint8Array)$/.test(
              access.expression.getText(source),
            ))
        )
          report(node);
      }
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === "storage" &&
        /supabase/i.test(node.expression.getText(source))
      )
        report(node);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const spec = node.arguments[0];
        if (spec && ts.isStringLiteral(spec)) {
          const dependency = resolve(file, spec.text);
          if (dependency) queue.push(dependency);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(
    seen.size > 100,
    "the guard must follow the website's runtime imports",
  );
  assert.deepEqual(
    offenders,
    [],
    "Data access outside the API:\n" + offenders.join("\n"),
  );
});
