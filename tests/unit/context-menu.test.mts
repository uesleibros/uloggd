import assert from "node:assert/strict";
import test from "node:test";
import { contextLink } from "../../lib/context-menu.ts";

test("context navigation classifies only same-origin platform destinations", () => {
  const origin = "https://uloggd.com";
  for (const [path, kind] of [
    ["/pt-BR/game/game-name", "game"],
    ["/en/u/person", "profile"],
    ["/es/lists/list-id", "list"],
    ["/pt-BR/shot/shot-id", "screenshot"],
  ]) {
    assert.deepEqual(contextLink(path, origin), { url: origin + path, kind });
  }
  assert.equal(
    contextLink("https://example.com/pt-BR/u/person", origin)?.kind,
    "link",
  );
  assert.equal(
    contextLink("/pt-BR/search?page=2#results", origin)?.url,
    origin + "/pt-BR/search?page=2#results",
  );
});

test("context navigation rejects executable and local browser URLs", () => {
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///secret",
    "blob:https://uloggd.com/private",
    "mailto:person@example.com",
    "https://[",
  ])
    assert.equal(contextLink(href, "https://uloggd.com"), null);
});
