import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  isAllowedBackloggdCollectionUrl,
  normalizeBackloggdUsername,
  parseAnubisChallenge,
  parseBackloggdGamesPage,
} from "../../lib/backloggd/parser";
import { solveAnubisChallenge } from "../../lib/backloggd/anubis";

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

test("parses and solves the bounded Anubis fast proof-of-work challenge", () => {
  const randomData = "ab".repeat(64);
  const challenge = parseAnubisChallenge(
    `<html><head>
      <script id="anubis_challenge" type="application/json">${JSON.stringify({
        rules: { algorithm: "fast", difficulty: 2 },
        challenge: {
          id: "019fa920-9064-72d5-964a-6437ec472e1c",
          method: "fast",
          randomData,
          difficulty: 2,
        },
      })}</script>
      <script id="anubis_base_prefix" type="application/json">""</script>
    </head></html>`,
  );
  assert.ok(challenge);
  const proof = solveAnubisChallenge(challenge);
  assert.ok(proof);
  assert.match(proof.hash, /^00/);
  assert.equal(
    proof.hash,
    createHash("sha256").update(`${randomData}${proof.nonce}`).digest("hex"),
  );
});

test("rejects unsupported or excessive Anubis challenges", () => {
  const challenge = parseAnubisChallenge(
    `<script id="anubis_challenge">${JSON.stringify({
      rules: { algorithm: "slow", difficulty: 20 },
      challenge: {
        id: "019fa920-9064-72d5-964a-6437ec472e1c",
        method: "slow",
        randomData: "ab".repeat(64),
        difficulty: 20,
      },
    })}</script>`,
  );
  assert.equal(challenge, null);
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
