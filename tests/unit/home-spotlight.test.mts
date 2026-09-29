import assert from "node:assert/strict";
import test from "node:test";

import { chooseSpotlight } from "../../lib/home-spotlight.ts";
import type { Game } from "../../lib/igdb.ts";

/**
 * What the band at the top of the home page says.
 *
 * It is picked from reads the page already does, so the thing worth pinning is
 * the order of preference and the honesty of the empty case: a band with
 * nothing in it is the one outcome that would put the page back where it was.
 */

const DAY = 24 * 60 * 60;
const game = (id: number, over: Partial<Game> = {}): Game =>
  ({
    id,
    name: `Game ${id}`,
    slug: `game-${id}`,
    summary: "",
    rating: null,
    ratingCount: 0,
    releaseYear: null,
    releaseTimestamp: null,
    hype: 0,
    coverUrl: "",
    heroUrl: null,
    genres: [],
    platforms: [],
    platformList: [],
    developers: [],
    publishers: [],
    companySlugs: [],
    companies: [],
    ...over,
  }) as Game;

const soon = Math.floor(Date.now() / 1000) + 30 * DAY;
const noRatings = new Map<number, { rating: number; count: number }>();

test("the nearest release comes first, and says when", () => {
  const spotlight = chooseSpotlight(
    "pt-BR",
    {
      upcoming: [
        game(1, { heroUrl: "art", releaseTimestamp: soon, hype: 1234 }),
      ],
      anticipated: [game(2, { heroUrl: "art" })],
      popular: [game(3, { heroUrl: "art" })],
    },
    noRatings,
  );
  assert.equal(spotlight?.game.id, 1);
  assert.match(spotlight!.kicker, /^Chega em /);
  assert.equal(spotlight!.fact, "1.234 pessoas esperando");
});

test("a game with a picture is preferred to one without", () => {
  const spotlight = chooseSpotlight(
    "en",
    {
      upcoming: [game(1), game(2, { heroUrl: "art", releaseTimestamp: soon })],
      anticipated: [],
      popular: [],
    },
    noRatings,
  );
  assert.equal(spotlight?.game.id, 2);
});

test("with nothing upcoming it falls back, and says why it is there", () => {
  const spotlight = chooseSpotlight(
    "en",
    { upcoming: [], anticipated: [], popular: [game(9, { heroUrl: "art" })] },
    new Map([[9, { rating: 84, count: 212 }]]),
  );
  assert.equal(spotlight?.game.id, 9);
  assert.equal(spotlight!.kicker, "Big right now");
  assert.equal(spotlight!.fact, "84/100 on uloggd · 212 ratings");
});

test("a game the catalogue said nothing else about still stands alone", () => {
  const spotlight = chooseSpotlight(
    "en",
    { upcoming: [], anticipated: [game(4)], popular: [] },
    noRatings,
  );
  assert.equal(spotlight?.game.id, 4);
  assert.equal(spotlight!.fact, null);
});

test("no catalogue, no band: the page keeps its sentence", () => {
  assert.equal(
    chooseSpotlight(
      "pt-BR",
      { upcoming: [], anticipated: [], popular: [] },
      noRatings,
    ),
    null,
  );
});
