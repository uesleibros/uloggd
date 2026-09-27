import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Copies, and the stops that move a run along.
 *
 * The copy is the one row on this site that says something about somebody's
 * money and their shelf, so most of what is worth testing here is who cannot
 * see it, and what happens to a run when the copy under it goes away.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";
type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

const GAME = 1074;
const SLUG = "super-mario-bros";

async function makeCopy(tx: Tx, platform: number, label: string, extra = "") {
  const [row] = await tx.query<{ id: string }>(
    `select id from public.save_library_entry(
       game_id => ${GAME}, game_slug => '${SLUG}',
       platform => $1, platform_label => $2${extra})`,
    [platform, label],
  );
  return row.id;
}

async function makeJourney(tx: Tx, title: string) {
  const [row] = await tx.query<{ id: string }>(
    `select id from public.create_journey(
       game_id => ${GAME}, game_slug => '${SLUG}', journey_title => $1)`,
    [title],
  );
  return row.id;
}

test("one game, several copies, each its own row", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    await makeCopy(tx, 21, "GameCube", ", entry_medium => 'PHYSICAL'");
    await makeCopy(tx, 6, "PC", ", entry_storefront => 'STEAM'");
    await makeCopy(
      tx,
      167,
      "PlayStation 5",
      ", entry_ownership => 'SUBSCRIPTION'",
    );

    const mine = await tx.query<{ platform_name: string }>(
      `select platform_name from public.own_library_entries(game_id => ${GAME})`,
    );
    assert.deepEqual(mine.map((row) => row.platform_name).sort(), [
      "GameCube",
      "PC",
      "PlayStation 5",
    ]);
  });
});

test("a run cannot be played on another game's copy", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const run = await makeJourney(tx, "Run do Mario");
    const [other] = await tx.query<{ id: string }>(
      `select id from public.save_library_entry(
         game_id => 7346, game_slug => 'breath-of-the-wild', platform => 130)`,
    );
    // "Resident Evil 4, played on my Skyrim cartridge" is a sentence the
    // database used to accept, because it only checked whose copy it was.
    assert.equal(
      await tx.attempt(
        "select public.update_journey_details(target_journey => $1, copy => $2)",
        [run, other.id],
      ),
      "42501",
    );
  });
});

test("forgetting a copy does not forget the playing", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const run = await makeJourney(tx, "Run com cópia");
    const copy = await makeCopy(tx, 6, "PC");
    await tx.query(
      "select public.update_journey_details(target_journey => $1, copy => $2)",
      [run, copy],
    );
    await tx.query(
      `select public.save_diary_entry(
         game_id => ${GAME}, game_slug => '${SLUG}',
         entry_date => '2026-02-02'::date, entry_minutes => 45,
         entry_visibility => 'PUBLIC'::public."Visibility", entry_journey => $1)`,
      [run],
    );

    assert.equal(
      (
        await tx.query<{ done: boolean }>(
          "select public.delete_library_entry(entry => $1) as done",
          [copy],
        )
      )[0].done,
      true,
    );

    const [after] = await tx.query<{
      library_entry_id: string | null;
      sessions: string;
    }>(
      `select library_entry_id,
              (select count(*) from public.diary_entries where journey_id = $1) as sessions
         from public.journeys where id = $1`,
      [run],
    );
    assert.equal(after.library_entry_id, null, "the run lost the copy");
    assert.equal(Number(after.sessions), 1, "and kept what was played");
  });
});

test("a run can go back to not knowing", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const run = await makeJourney(tx, "Run sem certeza");
    const copy = await makeCopy(tx, 6, "PC");
    await tx.query(
      "select public.update_journey_details(target_journey => $1, copy => $2)",
      [run, copy],
    );
    // Every argument is coalesced so that saving one field leaves the others
    // alone, which means null cannot also mean "clear it".
    await tx.query(
      "select public.update_journey_details(target_journey => $1, clear_copy => true)",
      [run],
    );
    const [after] = await tx.query<{ library_entry_id: string | null }>(
      "select library_entry_id from public.journeys where id = $1",
      [run],
    );
    assert.equal(after.library_entry_id, null);
  });
});

test("a closed library keeps its copies to itself", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.query(
      "update public.profiles set library_visibility = 'PRIVATE' where id = $1",
      [author],
    );
    await tx.become("authenticated", author);
    await makeCopy(tx, 6, "PC", ", entry_ownership => 'SUBSCRIPTION'");

    await tx.become("authenticated", stranger);
    // Not the rows, and not a count of them either: an aggregate is still a
    // fact about the rows it was made from.
    const seen = await tx.query(
      "select id from public.library_entries where profile_id = $1",
      [author],
    );
    assert.equal(seen.length, 0);
    const [counted] = await tx.query<{ copies: string; owners: string }>(
      `select count(*) as copies, count(distinct ownership) as owners
         from public.library_entries where profile_id = $1`,
      [author],
    );
    assert.equal(Number(counted.copies), 0);
    assert.equal(Number(counted.owners), 0);
  });
});

test("a stop moves the run along with it", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const run = await makeJourney(tx, "Run que para");

    const [session] = await tx.query<{ id: string }>(
      `select id from public.open_play_session(
         game_id => ${GAME}, game_slug => '${SLUG}', journey => $1)`,
      [run],
    );
    await tx.query(
      `select public.add_play_event(
         session => $1, event_kind => 'STOP',
         event_body => 'antes do chefe da torre')`,
      [session.id],
    );

    // The run's own progress and the last stop were two answers to one
    // question, and only one of them was ever written by hand.
    const [after] = await tx.query<{ progress: string }>(
      "select progress from public.journeys where id = $1",
      [run],
    );
    assert.equal(after.progress, "antes do chefe da torre");

    await tx.query(
      "select public.close_play_session(session => $1, session_minutes => 30)",
      [session.id],
    );
    const [resume] = await tx.query<{ said: string }>(
      "select public.last_stop(run => $1) as said",
      [run],
    );
    assert.equal(
      resume.said,
      "antes do chefe da torre",
      "and the next session can read it",
    );
  });
});

test("nobody reads somebody else's stop", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", author);
    const run = await makeJourney(tx, "Run privada");
    const [session] = await tx.query<{ id: string }>(
      `select id from public.open_play_session(
         game_id => ${GAME}, game_slug => '${SLUG}', journey => $1,
         session_visibility => 'PRIVATE'::public."Visibility")`,
      [run],
    );
    await tx.query(
      `select public.add_play_event(
         session => $1, event_kind => 'STOP', event_body => 'onde eu parei')`,
      [session.id],
    );
    await tx.query(
      "select public.close_play_session(session => $1, session_minutes => 10)",
      [session.id],
    );

    await tx.become("authenticated", stranger);
    const [theirs] = await tx.query<{ said: string | null }>(
      "select public.last_stop(run => $1) as said",
      [run],
    );
    // It is context for the person who left it, not a thing about the run.
    assert.equal(theirs.said, null);
  });
});

test(
  "the newest thing said about a run is the one that stands",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const id = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", id);
      const run = await makeJourney(tx, "Run que muda de ideia");
      const [session] = await tx.query<{ id: string }>(
        `select id from public.open_play_session(
         game_id => ${GAME}, game_slug => '${SLUG}', journey => $1)`,
        [run],
      );
      // A place travels in `marker`, a stop and a note in `body`, which is
      // what the payload constraint asks of each kind.
      const say = (kind: "STOP" | "PROGRESS" | "NOTE", said: string) =>
        tx.query(
          `select public.add_play_event(
             session => $1, event_kind => $2,
             event_body => $3, event_marker => $4)`,
          [
            session.id,
            kind,
            kind === "PROGRESS" ? null : said,
            kind === "PROGRESS" ? said : null,
          ],
        );
      const progress = async () =>
        (
          await tx.query<{ progress: string | null }>(
            "select progress from public.journeys where id = $1",
            [run],
          )
        )[0].progress;

      // A stop, then a place: the place is the later statement.
      await say("STOP", "antes do chefe");
      assert.equal(await progress(), "antes do chefe");
      await say("PROGRESS", "capitulo 5");
      assert.equal(await progress(), "capitulo 5");

      // And the other way round, because neither kind outranks the other: the
      // rule is "the newest one", not "stops win".
      await say("STOP", "no save point");
      assert.equal(await progress(), "no save point");

      // A note is not a statement about where the run is.
      await say("NOTE", "a chuva estava linda");
      assert.equal(await progress(), "no save point");
    });
  },
);

test(
  "a private picture stays private inside a public session",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const author = await makeProfile(tx, { role: "USER" });
      const stranger = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", author);
      const [shot] = await tx.query<{ id: string }>(
        `insert into public.screenshots
         (profile_id, igdb_id, game_slug, image_url, width, height, visibility)
       values (auth.uid(), ${GAME}, '${SLUG}',
               'https://cdn.imgchest.com/files/private.webp', 800, 600,
               'PRIVATE'::public."Visibility")
       returning id`,
      );
      const [session] = await tx.query<{ id: string }>(
        `select id from public.open_play_session(
         game_id => ${GAME}, game_slug => '${SLUG}',
         session_visibility => 'PUBLIC'::public."Visibility")`,
      );
      await tx.query(
        `select public.add_play_event(
         session => $1, event_kind => 'SHOT', shot => $2)`,
        [session.id, shot.id],
      );
      await tx.query(
        "select public.close_play_session(session => $1, session_minutes => 20)",
        [session.id],
      );

      await tx.become("authenticated", stranger);
      // The event is readable, because the session is public. The picture is
      // not, because the picture is private: being referenced by a playlog is
      // not a way to publish something.
      const events = await tx.query<{ kind: string }>(
        "select kind from public.diary_entry_events where entry_id = $1",
        [session.id],
      );
      assert.equal(events.length, 1);
      const pictures = await tx.query(
        "select id from public.screenshots where id = $1",
        [shot.id],
      );
      assert.equal(pictures.length, 0, "a private screenshot stayed private");
    });
  },
);

test("a copy can be emptied again, field by field", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const [full] = await tx.query<{ id: string }>(
      `select id from public.save_library_entry(
         game_id => ${GAME}, game_slug => '${SLUG}',
         platform => 21, platform_label => 'GameCube',
         entry_storefront => 'RETAIL', entry_ownership => 'OWNED',
         entry_medium => 'PHYSICAL', entry_edition => 'Player''s Choice',
         entry_region => 'NTSC-U', entry_note => 'caixa amassada',
         acquired => '2007-04-02'::date)`,
    );

    // Everything back to null, which the editor does by sending null rather
    // than leaving the field out: leaving it out keeps what was there.
    await tx.query(
      `select public.save_library_entry(
         game_id => ${GAME}, game_slug => '${SLUG}', entry => $1,
         platform => null, platform_label => null,
         entry_storefront => null, entry_ownership => null,
         entry_medium => null, entry_edition => null, entry_region => null,
         entry_note => null, acquired => null)`,
      [full.id],
    );
    const [after] = await tx.query<Record<string, unknown>>(
      `select platform_id, platform_name, storefront, ownership, medium,
              edition, region, note, acquired_on
         from public.library_entries where id = $1`,
      [full.id],
    );
    assert.deepEqual(after, {
      platform_id: null,
      platform_name: null,
      storefront: null,
      ownership: null,
      medium: null,
      edition: null,
      region: null,
      note: null,
      acquired_on: null,
    });
  });
});
