import assert from "node:assert/strict";
import test from "node:test";
import { contextImageUrl, contextLink } from "../../lib/context-menu.ts";

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

test("image viewing resolves original IGDB uploads rather than card thumbnails", () => {
  const origin = "https://uloggd.com";
  const cover =
    "https://images.igdb.com/igdb/image/upload/t_cover_big/co123.jpg";
  const original = cover.replace("t_cover_big", "t_original");
  assert.equal(contextImageUrl(cover, origin), original);
  assert.equal(
    contextImageUrl(
      `/_next/image?url=${encodeURIComponent(cover)}&w=256&q=75`,
      origin,
    ),
    original,
  );
  assert.equal(contextImageUrl("/logo.jpg", origin), `${origin}/logo.jpg`);
  assert.equal(
    contextImageUrl("https://cdn.example.com/t_thumb/custom.webp", origin),
    "https://cdn.example.com/t_thumb/custom.webp",
  );
  assert.equal(
    contextImageUrl("/_next/image?url=javascript%3Aalert(1)", origin),
    null,
  );
  assert.equal(contextImageUrl("/_next/image?w=256", origin), null);
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
