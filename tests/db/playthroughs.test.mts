import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * A run, and the copy it was played on.
 *
 * The thing worth testing here is not that the columns exist. It is that a
 * page of runs can be read in one query without that query becoming a way to
 * see somebody's private sessions, or the copies of somebody whose library is
 * closed. `journey_overview` aggregates, and an aggregate is the easiest
 * place in a schema to leak something: a total is still a fact about the rows
 * it was made from.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";
type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

async function makeJourney(tx: Tx, title: string) {
  const [row] = await tx.query<{ id: string }>(
    `select id from public.create_journey(
       game_id => 1074, game_slug => 'super-mario-bros', journey_title => $1)`,
    [title],
  );
  return row.id;
}

async function addSession(
  tx: Tx,
  journey: string,
  minutes: number,
  visibility: "PUBLIC" | "PRIVATE",
  day: string,
) {
  await tx.query(
    `select public.save_diary_entry(
       game_id => 1074, game_slug => 'super-mario-bros',
       entry_date => $1::date, entry_minutes => $2,
       entry_visibility => $3::public."Visibility", entry_journey => $4)`,
    [day, minutes, visibility, journey],
  );
}

async function overview(tx: Tx, owner: string) {
  return tx.query<{
    id: string;
    minutes: string;
    sessions: string;
    copy_platform_name: string | null;
    review_public_id: string | null;
  }>("select * from public.journey_overview(owner => $1)", [owner]);
}

test("a copy carries only what somebody filled in", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    // "I played it on PS5" is a row with a platform and everything else null,
    // which is what keeps this from being a form.
    const [minimal] = await tx.query<{
      platform_name: string;
      ownership: string | null;
      medium: string | null;
    }>(
      `select platform_name, ownership, medium from public.save_library_entry(
         game_id => 1074, game_slug => 'super-mario-bros',
         platform => 167, platform_label => 'PlayStation 5')`,
    );
    assert.equal(minimal.platform_name, "PlayStation 5");
    assert.equal(minimal.ownership, null);
    assert.equal(minimal.medium, null);

    // And the detailed one, for somebody who wants it.
    const [full] = await tx.query<{ id: string; storefront: string }>(
      `select id, storefront from public.save_library_entry(
         game_id => 1074, game_slug => 'super-mario-bros',
         platform => 6, platform_label => 'PC',
         entry_storefront => 'STEAM', entry_ownership => 'SUBSCRIPTION',
         entry_medium => 'DIGITAL', entry_edition => 'Deluxe')`,
    );
    assert.equal(full.storefront, "STEAM");

    // Two copies of one game is the whole point of a separate table.
    const copies = await tx.query(
      "select id from public.library_entries where igdb_id = 1074",
    );
    assert.equal(copies.length, 2);

    // A storefront nobody normalised is refused rather than stored as a
    // spelling that every later statistic has to guess about.
    assert.equal(
      await tx.attempt(
        `select public.save_library_entry(
           game_id => 1074, game_slug => 'super-mario-bros',
           entry_storefront => 'steam')`,
      ),
      "23514",
    );
  });
});

test("a run's totals come from its sessions", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const journey = await makeJourney(tx, "Primeira run");
    await addSession(tx, journey, 90, "PUBLIC", "2026-01-10");
    await addSession(tx, journey, 45, "PUBLIC", "2026-01-12");

    const [copy] = await tx.query<{ id: string }>(
      `select id from public.save_library_entry(
         game_id => 1074, game_slug => 'super-mario-bros',
         platform => 167, platform_label => 'PlayStation 5',
         entry_ownership => 'OWNED')`,
    );
    await tx.query(
      `select public.update_journey_details(
         target_journey => $1, journey_status => 'COMPLETED', copy => $2,
         is_replay => false, journey_progress => 'creditos')`,
      [journey, copy.id],
    );

    const [row] = await overview(tx, id);
    assert.equal(Number(row.minutes), 135, "the sum is the sessions");
    assert.equal(Number(row.sessions), 2);
    assert.equal(row.copy_platform_name, "PlayStation 5");
  });
});

test(
  "a total never counts a session the reader cannot see",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const author = await makeProfile(tx, { role: "USER" });
      const stranger = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", author);
      const journey = await makeJourney(tx, "Meia privada");
      await addSession(tx, journey, 60, "PUBLIC", "2026-02-01");
      await addSession(tx, journey, 300, "PRIVATE", "2026-02-02");

      const [mine] = await overview(tx, author);
      assert.equal(Number(mine.minutes), 360, "the author sees all of it");

      await tx.become("authenticated", stranger);
      const [theirs] = await overview(tx, author);
      // The private five hours are not in the stranger's total. An aggregate is
      // the easiest place in a schema to leak something, because a sum is still
      // a fact about the rows it was made from.
      assert.equal(Number(theirs.minutes), 60);
      assert.equal(Number(theirs.sessions), 1);
    });
  },
);

test("a closed library keeps its copies out of the run", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    // Closed from the connection's own role: no browser role may write this
    // column, which is why the API owns the setting.
    await tx.query(
      "update public.profiles set library_visibility = 'PRIVATE' where id = $1",
      [author],
    );
    await tx.become("authenticated", author);
    const journey = await makeJourney(tx, "Run fechada");
    // A session the stranger can see, so the run itself is visible and what
    // is being tested is the copy rather than the run.
    await addSession(tx, journey, 30, "PUBLIC", "2026-04-01");
    const [copy] = await tx.query<{ id: string }>(
      `select id from public.save_library_entry(
         game_id => 1074, game_slug => 'super-mario-bros',
         platform => 167, platform_label => 'PlayStation 5')`,
    );
    await tx.query(
      "select public.update_journey_details(target_journey => $1, copy => $2)",
      [journey, copy.id],
    );

    await tx.become("authenticated", stranger);
    assert.equal(
      (
        await tx.query(
          "select id from public.library_entries where profile_id = $1",
          [author],
        )
      ).length,
      0,
      "the table itself is closed",
    );
    const [row] = await overview(tx, author);
    // And the run does not become a way around that.
    assert.equal(row.copy_platform_name, null);
  });
});

test("nobody edits somebody else's run or copy", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", author);
    const journey = await makeJourney(tx, "Minha run");
    const [copy] = await tx.query<{ id: string }>(
      `select id from public.save_library_entry(
         game_id => 1074, game_slug => 'super-mario-bros', platform => 6)`,
    );

    await tx.become("authenticated", stranger);
    assert.equal(
      await tx.attempt(
        "select public.update_journey_details(target_journey => $1, journey_status => 'DROPPED')",
        [journey],
      ),
      "42501",
    );
    assert.equal(
      await tx.attempt(
        `select public.save_library_entry(
           game_id => 1074, game_slug => 'super-mario-bros', entry => $1,
           entry_ownership => 'OWNED')`,
        [copy.id],
      ),
      "42501",
    );
    // And a run cannot be pointed at a copy that is not the author's.
    await tx.become("authenticated", author);
    const [theirs] = await tx.query<{ id: string }>(
      `select id from public.save_library_entry(
         game_id => 1074, game_slug => 'super-mario-bros', platform => 6)`,
    );
    await tx.become("authenticated", stranger);
    assert.equal(
      await tx.attempt(
        "select public.update_journey_details(target_journey => $1, copy => $2)",
        [journey, theirs.id],
      ),
      "42501",
    );
  });
});

test("saving one detail leaves the others alone", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const journey = await makeJourney(tx, "Progressiva");
    await tx.query(
      `select public.update_journey_details(
         target_journey => $1, journey_status => 'PLAYING',
         journey_difficulty => 'Hard')`,
      [journey],
    );
    // The interface saves one field at a time, so an argument left out must
    // not blank what is already there.
    await tx.query(
      "select public.update_journey_details(target_journey => $1, is_mastered => true)",
      [journey],
    );
    const [row] = await tx.query<{
      status: string;
      difficulty: string;
      mastered: boolean;
    }>(
      "select status, difficulty, mastered from public.journeys where id = $1",
      [journey],
    );
    assert.deepEqual(
      {
        status: row.status,
        difficulty: row.difficulty,
        mastered: row.mastered,
      },
      { status: "PLAYING", difficulty: "Hard", mastered: true },
    );
  });
});

test("a run is as visible as what is inside it", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", author);
    const empty = await makeJourney(tx, "Ainda não comecei");
    const priv = await makeJourney(tx, "Segunda tentativa, depois da recaída");
    await addSession(tx, priv, 60, "PRIVATE", "2026-03-01");
    const open = await makeJourney(tx, "Run pública");
    await addSession(tx, open, 60, "PUBLIC", "2026-03-02");

    await tx.become("authenticated", stranger);
    const seen = await tx.query<{ id: string }>(
      "select id from public.journeys where profile_id = $1",
      [author],
    );
    // A title is not nothing: it is a sentence somebody wrote for themselves,
    // and it used to be public whatever the sessions under it said.
    assert.deepEqual(
      seen.map((row) => row.id),
      [open],
    );
    assert.ok(!seen.some((row) => row.id === priv));
    assert.ok(!seen.some((row) => row.id === empty));

    await tx.become("authenticated", author);
    assert.equal(
      (
        await tx.query("select id from public.journeys where profile_id = $1", [
          author,
        ])
      ).length,
      3,
      "the author still sees every run of their own",
    );
  });
});

test(
  "the overview answers by the same rule the table does",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const author = await makeProfile(tx, { role: "USER" });
      const stranger = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", author);
      const hidden = await makeJourney(tx, "Tentativa que não deu certo");
      await addSession(tx, hidden, 120, "PRIVATE", "2026-05-01");
      const shown = await makeJourney(tx, "Run pública");
      await addSession(tx, shown, 60, "PUBLIC", "2026-05-02");

      await tx.become("authenticated", stranger);
      const seen = await overview(tx, author);
      // The function is `security definer`, so closing the policy did nothing
      // for it: a run whose every session is private came back here with its
      // title and zero minutes beside it. A definer function that reads a table
      // has to carry that table's rule itself.
      assert.deepEqual(
        seen.map((row) => row.id),
        [shown],
      );

      // And one run at a time answers by the same rule.
      const [one] = await tx.query<{ id: string }>(
        "select id from public.journey_overview(owner => $1, target => $2)",
        [author, hidden],
      );
      assert.equal(one, undefined, "a private run is not readable one by one");
      await tx.become("authenticated", author);
      const [mine] = await tx.query<{ id: string; minutes: string }>(
        "select id, minutes from public.journey_overview(owner => $1, target => $2)",
        [author, hidden],
      );
      assert.equal(mine.id, hidden);
      assert.equal(Number(mine.minutes), 120);
    });
  },
);
