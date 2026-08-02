import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Export and erasure.
 *
 * The two operations where being wrong is not recoverable: an export that
 * leaks somebody else's rows cannot be un-downloaded, and a delete that takes
 * more than it was asked for cannot be undone. Both are checked against a
 * second account whose data must be untouched either way.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

async function seed(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  name: string,
) {
  const id = await makeProfile(tx, { username: name });
  await tx.query(
    `insert into public.user_games (profile_id, igdb_id, game_slug, status)
     select $1, i, 'g-' || i, 'PLAYING' from generate_series(1, 3) as i`,
    [id],
  );
  await tx.query(
    `insert into public.reviews (profile_id, igdb_id, game_slug, content)
     values ($1, 900, 'g-900', 'Mine.')`,
    [id],
  );
  return id;
}

test("an export contains only the caller's own rows", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await seed(tx, "exportmine");
    await seed(tx, "exportyours");

    await tx.become("authenticated", mineId);
    const [row] = await tx.query<{
      export_account_data: Record<string, unknown>;
    }>(`select public.export_account_data()`);
    await tx.query("reset role");

    const payload = row.export_account_data as {
      library: { profile_id: string }[];
      reviews: { profile_id: string }[];
      profile: { id: string };
    };
    assert.equal(
      payload.library.length,
      3,
      "the export is empty, so it proves nothing",
    );
    assert.equal(payload.reviews.length, 1);
    assert.equal(payload.profile.id, mineId);
    for (const item of [...payload.library, ...payload.reviews])
      assert.equal(
        item.profile_id,
        mineId,
        "the export contains another account's rows",
      );
  });
});

test("erasing a category leaves the others alone", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await seed(tx, "erasemine");
    const yoursId = await seed(tx, "eraseyours");

    await tx.become("authenticated", mineId);
    const [removed] = await tx.query<{ erase_account_data: string }>(
      `select public.erase_account_data('library')`,
    );
    await tx.query("reset role");

    const [mineLibrary] = await tx.query<{ n: string }>(
      `select count(*)::text as n from public.user_games where profile_id = $1`,
      [mineId],
    );
    const [mineReviews] = await tx.query<{ n: string }>(
      `select count(*)::text as n from public.reviews where profile_id = $1`,
      [mineId],
    );
    const [yourLibrary] = await tx.query<{ n: string }>(
      `select count(*)::text as n from public.user_games where profile_id = $1`,
      [yoursId],
    );

    assert.equal(
      Number(removed.erase_account_data),
      3,
      "the row count is wrong",
    );
    assert.equal(Number(mineLibrary.n), 0);
    assert.equal(
      Number(mineReviews.n),
      1,
      "clearing the library took the reviews with it",
    );
    assert.equal(
      Number(yourLibrary.n),
      3,
      "clearing one account's library cleared another's",
    );
  });
});

test("clearing journeys keeps the sessions", { skip }, async () => {
  await withRollback(async (tx) => {
    // Stated separately because it is a product decision, not a side effect: a
    // journey is a grouping, and deleting a grouping should not take a year of
    // logs with it.
    const mineId = await makeProfile(tx, { username: "erasejourney" });
    const [journey] = await tx.query<{ id: string }>(
      `insert into public.journeys (profile_id, igdb_id, game_slug, title)
       values ($1, 901, 'g-901', 'Run') returning id`,
      [mineId],
    );
    await tx.query(
      `insert into public.diary_entries (profile_id, igdb_id, game_slug, played_on, journey_id)
       values ($1, 901, 'g-901', current_date, $2)`,
      [mineId, journey.id],
    );

    await tx.become("authenticated", mineId);
    await tx.query(`select public.erase_account_data('journeys')`);
    await tx.query("reset role");

    const [sessions] = await tx.query<{ n: string; journey_id: string | null }>(
      `select count(*)::text as n, max(journey_id::text) as journey_id
         from public.diary_entries where profile_id = $1`,
      [mineId],
    );
    assert.equal(Number(sessions.n), 1, "the session went with the journey");
    assert.equal(
      sessions.journey_id,
      null,
      "the session still points at a gone journey",
    );
  });
});

test(
  "an unknown category is refused rather than ignored",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // A silent no-op would tell someone their data was cleared when nothing
      // ran, which is the worst possible outcome for this particular button.
      const mineId = await makeProfile(tx, { username: "erasebogus" });
      await tx.become("authenticated", mineId);
      const refused = await tx.attempt(
        `select public.erase_account_data('profiles')`,
      );
      await tx.query("reset role");
      assert.equal(refused, "22023");
    });
  },
);

test("neither function works signed out", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    const exported = await tx.attempt(`select public.export_account_data()`);
    const erased = await tx.attempt(
      `select public.erase_account_data('library')`,
    );
    const deleted = await tx.attempt(`select public.delete_own_account()`);
    await tx.query("reset role");
    assert.equal(exported, "42501", "anon can call the export");
    assert.equal(erased, "42501");
    assert.equal(deleted, "42501");
  });
});
