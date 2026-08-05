import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback, type Tx } from "./harness.mts";

/**
 * The suggestion shelf, and everyone it must not suggest.
 *
 * This function reads one account's library to describe another's, which is
 * the shape of every accidental disclosure: the number "twelve games in
 * common" is itself a statement about a library the viewer may not be allowed
 * to open. So the tests here are mostly about who disappears.
 *
 * The privacy is meant to come from row level security on `user_games` rather
 * than from rules restated inside the function, and that is exactly the claim
 * worth checking, because a `security invoker` function that quietly stopped
 * being one would still return sensible-looking rows.
 *
 * That was tried: switching the function to `security definer` fails exactly
 * one test here, the private library. The block survives the switch because
 * blocks are covered twice over, by row level security and again by
 * `profile_visible`. Worth writing down, because it means the private-library
 * test is the only thing standing between this function and a quiet
 * disclosure, and it should be the last one anybody deletes.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

/** A library of the given igdb ids, on a fresh account. */
async function makeLibrary(
  tx: Tx,
  username: string,
  ids: number[],
  fields: Record<string, string> = {},
) {
  const id = await makeProfile(tx, { username, ...fields });
  await tx.query(
    `insert into public.user_games (profile_id, igdb_id, game_slug, status)
     select $1, unnested, 'g-' || unnested, 'COMPLETED'
     from unnest($2::int[]) as unnested`,
    [id, ids],
  );
  return id;
}

/** What the shelf would show this viewer, as a map of profile id to count. */
async function neighboursOf(tx: Tx, viewer: string) {
  await tx.become("authenticated", viewer);
  const rows = await tx.query<{
    profile_id: string;
    shared_games: number;
    affinity: number;
  }>(`select * from public.taste_neighbours(12)`);
  // Back to the owning role: the reads run as the viewer, but the setup
  // writes around them insert into tables `authenticated` may not touch.
  await tx.query("reset role");
  return new Map(rows.map((row) => [row.profile_id, row.shared_games]));
}

// Distinct per test so two tests can never collide on a slug, and far from any
// real igdb id so a stray row could not be mistaken for one.
const catalogue = (offset: number, count: number) =>
  Array.from({ length: count }, (_, index) => 900_000 + offset * 100 + index);

test("someone with an overlapping library is suggested", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(1, 8);
    const viewer = await makeLibrary(tx, "tnviewer", shelf.slice(0, 6));
    const neighbour = await makeLibrary(tx, "tnneighbour", shelf.slice(2, 8));

    const found = await neighboursOf(tx, viewer);
    assert.equal(
      found.get(neighbour),
      4,
      "four games are in both libraries and the shelf should say so",
    );
  });
});

test("two shared games are not a taste", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(2, 8);
    const viewer = await makeLibrary(tx, "tnthinviewer", shelf.slice(0, 5));
    // Exactly two in common: the threshold is three, because one or two
    // shared games is what a bestseller looks like, not a taste.
    const barely = await makeLibrary(tx, "tnbarely", shelf.slice(3, 8));

    const found = await neighboursOf(tx, viewer);
    assert.equal(found.has(barely), false);
  });
});

test("a private library takes its owner off the shelf", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(3, 8);
    const viewer = await makeLibrary(tx, "tnprivviewer", shelf.slice(0, 6));
    const hidden = await makeLibrary(tx, "tnhidden", shelf.slice(0, 6), {
      library_visibility: "PRIVATE",
    });

    const found = await neighboursOf(tx, viewer);
    assert.equal(
      found.has(hidden),
      false,
      "a library nobody may open cannot be counted at somebody else",
    );
  });
});

test(
  "a followers-only profile is not offered to a stranger",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const shelf = catalogue(4, 8);
      const viewer = await makeLibrary(tx, "tnscopeviewer", shelf.slice(0, 6));
      // The library is public but the profile is not: sending someone to a
      // page they cannot open is the same disclosure with an extra click.
      const guarded = await makeLibrary(tx, "tnguarded", shelf.slice(0, 6), {
        profile_visibility: "FOLLOWERS",
      });

      assert.equal((await neighboursOf(tx, viewer)).has(guarded), false);

      await tx.query(
        `insert into public.follows (follower_id, following_id) values ($1, $2)`,
        [viewer, guarded],
      );
      // And now that they follow, the profile is reachable — but it is also
      // already followed, so the shelf still has no reason to offer it.
      assert.equal((await neighboursOf(tx, viewer)).has(guarded), false);
    });
  },
);

test("the shelf knows when they already follow you", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(11, 8);
    const viewer = await makeLibrary(tx, "tnbackviewer", shelf.slice(0, 6));
    const admirer = await makeLibrary(tx, "tnadmirer", shelf.slice(0, 6));
    const stranger = await makeLibrary(tx, "tnstranger", shelf.slice(0, 6));

    await tx.query(
      `insert into public.follows (follower_id, following_id) values ($1, $2)`,
      [admirer, viewer],
    );

    await tx.become("authenticated", viewer);
    const rows = await tx.query<{
      profile_id: string;
      follows_viewer: boolean;
    }>(`select * from public.taste_neighbours(12)`);
    await tx.query("reset role");

    const back = new Map(
      rows.map((row) => [row.profile_id, row.follows_viewer]),
    );
    assert.equal(back.get(admirer), true, "this one already found the viewer");
    assert.equal(back.get(stranger), false);
  });
});

test("a block hides both accounts from each other", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(5, 8);
    const viewer = await makeLibrary(tx, "tnblockviewer", shelf.slice(0, 6));
    const blocked = await makeLibrary(tx, "tnblocked", shelf.slice(0, 6));

    assert.equal((await neighboursOf(tx, viewer)).has(blocked), true);

    await tx.query(
      `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`,
      [blocked, viewer],
    );
    // Blocked by the other account, not by this one: `users_blocked` reads
    // both directions, and the suggestion has to obey the direction the
    // viewer did not choose just as much as the one they did.
    assert.equal((await neighboursOf(tx, viewer)).has(blocked), false);
    assert.equal((await neighboursOf(tx, blocked)).has(viewer), false);
  });
});

test(
  "people already followed or asked are not suggested",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const shelf = catalogue(6, 8);
      const viewer = await makeLibrary(tx, "tnknownviewer", shelf.slice(0, 6));
      const followed = await makeLibrary(tx, "tnfollowed", shelf.slice(0, 6));
      const asked = await makeLibrary(tx, "tnasked", shelf.slice(0, 6));

      const before = await neighboursOf(tx, viewer);
      assert.equal(before.has(followed) && before.has(asked), true);

      await tx.query(
        `insert into public.follows (follower_id, following_id) values ($1, $2)`,
        [viewer, followed],
      );
      await tx.query(
        `insert into public.follow_requests (requester_id, target_id)
       values ($1, $2)`,
        [viewer, asked],
      );

      const after = await neighboursOf(tx, viewer);
      assert.equal(after.has(followed), false, "already following");
      assert.equal(
        after.has(asked),
        false,
        "already asked, waiting on an answer",
      );
    });
  },
);

test("a half-registered account is never suggested", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(7, 8);
    const viewer = await makeLibrary(tx, "tnnamedviewer", shelf.slice(0, 6));
    const nameless = await makeProfile(tx, {});
    await tx.query(
      `insert into public.user_games (profile_id, igdb_id, game_slug, status)
       select $1, unnested, 'g-' || unnested, 'COMPLETED'
       from unnest($2::int[]) as unnested`,
      [nameless, shelf.slice(0, 6)],
    );

    const found = await neighboursOf(tx, viewer);
    assert.equal(
      found.has(nameless),
      false,
      "an account without a username has no profile page to send anyone to",
    );
  });
});

test(
  "the ranking does not simply reward a large library",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // The reason this is cosine and not a count. Against the real data the
      // raw count put the account with four hundred and twenty-nine games at
      // the top of ten of the eleven lists.
      const mine = catalogue(8, 10);
      const viewer = await makeLibrary(tx, "tnrankviewer", mine);
      // Shares six of the viewer's ten games and owns almost nothing else: the
      // closer taste.
      const close = await makeLibrary(tx, "tnclose", [
        ...mine.slice(0, 6),
        ...catalogue(9, 2),
      ]);
      // Shares seven, inside a library of a hundred and seven. A bigger count,
      // a weaker signal.
      const hoarder = await makeLibrary(tx, "tnhoarder", [
        ...mine.slice(0, 7),
        ...catalogue(10, 100),
      ]);

      await tx.become("authenticated", viewer);
      const rows = await tx.query<{ profile_id: string; shared_games: number }>(
        `select * from public.taste_neighbours(12)`,
      );
      await tx.query("reset role");

      assert.equal(rows[0]?.profile_id, close, "the closer taste ranks first");
      assert.equal(rows[1]?.profile_id, hoarder);
      assert.equal(
        rows[1]?.shared_games,
        7,
        "and it still reports the honest count, which is the larger one",
      );
    });
  },
);

test("anon cannot call it at all", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    const code = await tx.attempt(`select * from public.taste_neighbours(12)`);
    await tx.query("reset role");
    assert.equal(
      code,
      "42501",
      "execute must not have been left with PUBLIC, which anon inherits",
    );
  });
});
