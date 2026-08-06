import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback, type Tx } from "./harness.mts";

/**
 * Counting somebody else's library against your own.
 *
 * The same disclosure shape as the suggestion shelf, and a wider one: this
 * answers for anybody the caller names, including people the shelf refuses to
 * suggest. So the question is not whether the arithmetic is right, it is
 * whether a library the caller may not open can still be counted at them.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

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

async function countsFor(tx: Tx, viewer: string, targets: string[]) {
  await tx.become("authenticated", viewer);
  const rows = await tx.query<{ profile_id: string; shared_games: number }>(
    `select * from public.shared_library_counts($1::uuid[])`,
    [targets],
  );
  await tx.query("reset role");
  return new Map(rows.map((row) => [row.profile_id, row.shared_games]));
}

const catalogue = (offset: number, count: number) =>
  Array.from({ length: count }, (_, index) => 950_000 + offset * 100 + index);

test("it counts what two libraries have in common", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(1, 10);
    const viewer = await makeLibrary(tx, "slcviewer", shelf.slice(0, 7));
    const other = await makeLibrary(tx, "slcother", shelf.slice(4, 10));
    const stranger = await makeLibrary(tx, "slcstranger", catalogue(2, 5));

    const counts = await countsFor(tx, viewer, [other, stranger]);
    assert.equal(counts.get(other), 3);
    // Nothing in common comes back as no row at all, which the caller reads
    // as zero. A row of zero would be the same claim in more bytes.
    assert.equal(counts.has(stranger), false);
  });
});

test("a private library cannot be counted", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(3, 10);
    const viewer = await makeLibrary(tx, "slcprivviewer", shelf.slice(0, 7));
    const hidden = await makeLibrary(tx, "slchidden", shelf.slice(0, 7), {
      library_visibility: "PRIVATE",
    });

    const counts = await countsFor(tx, viewer, [hidden]);
    assert.equal(
      counts.has(hidden),
      false,
      "the number is itself a statement about a library nobody may open",
    );
  });
});

test("a block stops the count in both directions", { skip }, async () => {
  await withRollback(async (tx) => {
    const shelf = catalogue(4, 10);
    const viewer = await makeLibrary(tx, "slcblockviewer", shelf.slice(0, 7));
    const blocked = await makeLibrary(tx, "slcblocked", shelf.slice(0, 7));

    assert.equal((await countsFor(tx, viewer, [blocked])).get(blocked), 7);
    await tx.query(
      `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`,
      [blocked, viewer],
    );
    assert.equal((await countsFor(tx, viewer, [blocked])).has(blocked), false);
    assert.equal((await countsFor(tx, blocked, [viewer])).has(viewer), false);
  });
});

test("asking about yourself answers nothing", { skip }, async () => {
  await withRollback(async (tx) => {
    const viewer = await makeLibrary(tx, "slcself", catalogue(5, 6));
    const counts = await countsFor(tx, viewer, [viewer]);
    assert.equal(
      counts.has(viewer),
      false,
      "every game is in common with yourself, which is not information",
    );
  });
});

test("anon cannot call it at all", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    const code = await tx.attempt(
      `select * from public.shared_library_counts(array[]::uuid[])`,
    );
    await tx.query("reset role");
    assert.equal(
      code,
      "42501",
      "execute must not have been left with PUBLIC, which anon inherits",
    );
  });
});
