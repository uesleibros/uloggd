import assert from "node:assert/strict";
import test from "node:test";
import type { Game } from "../../lib/igdb";
import {
  pickFriendsPlaying,
  type FriendPlayingRow,
} from "../../lib/friends-playing";

/**
 * The "friends playing now" shelf on Home.
 *
 * One card per game. It used to be one card per person per game, so a game
 * three friends were all playing took three of the ten slots with the same
 * cover, and the shelf read as a bug rather than as a coincidence.
 */

function game(id: number): Game {
  return { id, name: `Game ${id}` } as Game;
}

function row(
  profileId: string,
  gameId: number,
  updatedAt: string,
): FriendPlayingRow {
  return {
    profile_id: profileId,
    igdb_id: gameId,
    updated_at: updatedAt,
    profiles: {
      username: profileId,
      display_name: null,
      avatar_url: null,
      verified: false,
    },
  };
}

const games = new Map([1, 2, 3].map((id) => [id, game(id)]));

test("a game three friends are playing appears once", () => {
  const shelf = pickFriendsPlaying(
    [
      row("ana", 1, "2026-08-03T12:00:00Z"),
      row("bea", 1, "2026-08-03T11:00:00Z"),
      row("caio", 1, "2026-08-03T10:00:00Z"),
      row("dani", 2, "2026-08-03T09:00:00Z"),
    ],
    games,
    10,
  );
  assert.deepEqual(
    shelf.map((item: { game: { id: number } }) => item.game.id),
    [1, 2],
  );
  // Rows arrive newest first, so the friend who survives a collision is the
  // one who touched it most recently, not whoever the database listed first.
  assert.equal(shelf[0].username, "ana");
});

test("one person playing several games still fills several slots", () => {
  // The dedupe is by game, not by person: somebody with three games on the go
  // is not a duplicate of themselves.
  const shelf = pickFriendsPlaying(
    [
      row("ana", 1, "2026-08-03T12:00:00Z"),
      row("ana", 2, "2026-08-03T11:00:00Z"),
      row("ana", 3, "2026-08-03T10:00:00Z"),
    ],
    games,
    10,
  );
  assert.deepEqual(
    shelf.map((item: { game: { id: number } }) => item.game.id),
    [1, 2, 3],
  );
});

test("the limit counts cards, not rows", () => {
  // Four rows collapse to two games; a limit of two must not be spent on the
  // duplicates that were dropped.
  const shelf = pickFriendsPlaying(
    [
      row("ana", 1, "2026-08-03T12:00:00Z"),
      row("bea", 1, "2026-08-03T11:00:00Z"),
      row("caio", 2, "2026-08-03T10:00:00Z"),
      row("dani", 3, "2026-08-03T09:00:00Z"),
    ],
    games,
    2,
  );
  assert.deepEqual(
    shelf.map((item: { game: { id: number } }) => item.game.id),
    [1, 2],
  );
});

test("rows without a game or a username are dropped", () => {
  // A private profile embeds as null, and IGDB does not always know an id the
  // library holds. Neither can become a card with nothing on it.
  const shelf = pickFriendsPlaying(
    [
      { ...row("ana", 1, "2026-08-03T12:00:00Z"), profiles: null },
      row("bea", 99, "2026-08-03T11:00:00Z"),
      row("caio", 2, "2026-08-03T10:00:00Z"),
    ],
    games,
    10,
  );
  assert.deepEqual(
    shelf.map((item: { game: { id: number } }) => item.game.id),
    [2],
  );
});

test("an embedded profile arrives as an object or as a list of one", () => {
  // PostgREST returns the joined row either way depending on how it reads the
  // relationship, and both have to produce a card.
  const shelf = pickFriendsPlaying(
    [
      {
        ...row("ana", 1, "2026-08-03T12:00:00Z"),
        profiles: [
          {
            username: "ana",
            display_name: "Ana",
            avatar_url: null,
            verified: true,
          },
        ],
      },
    ],
    games,
    10,
  );
  assert.equal(shelf.length, 1);
  assert.equal(shelf[0].username, "ana");
  assert.equal(shelf[0].verified, true);
});
