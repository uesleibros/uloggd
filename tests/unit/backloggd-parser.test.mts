import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedBackloggdCollectionUrl,
  normalizeBackloggdUsername,
  parseBackloggdGamesPage,
} from "../../lib/backloggd/parser";

test("accepts only a Backloggd username or canonical public profile URL", () => {
  assert.equal(normalizeBackloggdUsername("Player_One"), "Player_One");
  assert.equal(normalizeBackloggdUsername("@Player_One"), "Player_One");
  assert.equal(
    normalizeBackloggdUsername("https://www.backloggd.com/u/Player_One/games/"),
    "Player_One",
  );
  assert.equal(
    normalizeBackloggdUsername("http://backloggd.com/u/player"),
    null,
  );
  assert.equal(
    normalizeBackloggdUsername("https://backloggd.com.attacker.test/u/player"),
    null,
  );
  assert.equal(
    normalizeBackloggdUsername("https://backloggd.com/games/hades/"),
    null,
  );
  assert.equal(normalizeBackloggdUsername("name/../../admin"), null);
});

test("extracts only canonical Backloggd game links and safe pagination", () => {
  const url = new URL("https://backloggd.com/u/Player_One/games/");
  const page = parseBackloggdGamesPage(
    `<!doctype html>
      <html><head><title>Player_One's games</title></head><body>
        <a class="game-card" href="/games/hades/"><img alt="Hades"></a>
        <a href="https://www.backloggd.com/games/alan-wake-ii/">Alan Wake II</a>
        <a href="/games/hades/">Duplicate Hades</a>
        <a href="https://evil.example/games/not-a-game/">Ignore me</a>
        <a href="?page=2">2</a>
        <a href="?page=3&sort=rating">unsafe filter</a>
        <a href="/u/another-user/games/?page=2">wrong profile</a>
      </body></html>`,
    url,
    "Player_One",
  );

  assert.deepEqual(
    page.games.map((game) => game.slug),
    ["hades", "alan-wake-ii"],
  );
  assert.equal(page.games[0].sourceName, "Hades");
  assert.deepEqual(page.pageUrls, [
    "https://backloggd.com/u/Player_One/games/?page=2",
  ]);
  assert.equal(page.challenge, false);
});

test("detects BotStopper responses instead of parsing challenge links", () => {
  const page = parseBackloggdGamesPage(
    `<html><head><title>Making sure you're not a bot!</title></head>
      <body><script id="anubis_challenge">{}</script>Protected by BotStopper</body></html>`,
    new URL("https://backloggd.com/u/player/games/"),
    "player",
  );
  assert.equal(page.challenge, true);
  assert.deepEqual(page.games, []);
});

test("collection URL allowlist rejects redirects outside the exact profile path", () => {
  assert.equal(
    isAllowedBackloggdCollectionUrl(
      new URL("https://backloggd.com/u/player/games/?page=40"),
      "player",
    ),
    true,
  );
  assert.equal(
    isAllowedBackloggdCollectionUrl(
      new URL("https://backloggd.com/u/player/games/?page=41"),
      "player",
    ),
    false,
  );
  assert.equal(
    isAllowedBackloggdCollectionUrl(
      new URL("https://backloggd.com/u/player/games/export"),
      "player",
    ),
    false,
  );
  assert.equal(
    isAllowedBackloggdCollectionUrl(
      new URL("https://cdn.backloggd.com/u/player/games/?page=2"),
      "player",
    ),
    false,
  );
});
