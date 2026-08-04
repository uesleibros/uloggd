import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

test("CodeMirror stays behind the on-demand editor boundary", async () => {
  const loader = await readFile(
    path.join(ROOT, "components/markdown/lazy-markdown-editor.tsx"),
    "utf8",
  );

  assert.match(loader, /dynamic<MarkdownEditorProps>\(/);
  assert.match(loader, /import\("\.\/markdown-editor"\)/);
  assert.doesNotMatch(
    loader,
    /import \{ MarkdownEditor \} from "\.\/markdown-editor"/,
  );
});

test("editing surfaces use the on-demand Markdown editor", async () => {
  for (const file of [
    "components/social/review-studio-form.tsx",
    "components/settings/profile-settings-panel.tsx",
  ]) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    assert.match(
      source,
      /from "@\/components\/markdown\/lazy-markdown-editor"/,
      `${file} puts CodeMirror back in its initial route bundle`,
    );
    assert.doesNotMatch(
      source,
      /from "@\/components\/markdown\/markdown-editor"/,
    );
  }
});
