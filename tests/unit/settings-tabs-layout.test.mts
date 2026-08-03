import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("desktop settings tabs wrap instead of hiding destinations", async () => {
  const css = await readFile(
    new URL("../../app/[lang]/settings/settings.css", import.meta.url),
    "utf8",
  );
  const desktop = css.match(
    /@media \(min-width: 621px\) \{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(desktop, "desktop settings tab rules are missing");
  assert.match(desktop, /\.account-settings-tabs\s*\{/);
  assert.match(desktop, /flex-wrap:\s*wrap/);
  assert.match(desktop, /overflow:\s*visible/);
});

test("all account settings destinations remain in the tab model", async () => {
  const source = await readFile(
    new URL("../../components/settings/account-settings.tsx", import.meta.url),
    "utf8",
  );
  for (const id of [
    "general",
    "profile",
    "preferences",
    "privacy",
    "appearance",
    "connections",
    "import",
    "security",
    "data",
  ]) {
    assert.match(source, new RegExp(`id: "${id}" as const`));
  }
});
