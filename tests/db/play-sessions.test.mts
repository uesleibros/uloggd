import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * A session you open when you start playing.
 *
 * The four decisions the design left open are each proved here rather than
 * described: one open session per person, a draft that no reader can see, a
 * clock that will not record a day and a half, and a forgotten session that
 * leaves nothing behind.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";

type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

async function open(tx: Tx, options: { visibility?: string } = {}) {
  const [row] = await tx.query<{ id: string; open_since: string }>(
    `select * from public.open_play_session(
       game_id => 1074, game_slug => 'super-mario-bros',
       session_visibility => $1::public."Visibility")`,
    [options.visibility ?? "PUBLIC"],
  );
  return row;
}

test("one session at a time, and the second says so", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const session = await open(tx);
    assert.ok(session.open_since);

    // Not a constraint violation: a named one, so the interface can offer
    // the session that is already open instead of reporting an index.
    assert.equal(
      await tx.attempt(
        `select public.open_play_session(
           game_id => 1074, game_slug => 'super-mario-bros')`,
      ),
      "55006",
    );
  });
});

test("an open session is a draft nobody can read", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const reader = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", author);
    const session = await open(tx);
    await tx.query(
      `select public.add_play_event(session => $1, event_kind => 'NOTE',
         event_body => 'comecei agora')`,
      [session.id],
    );

    // Not even to its author through the ordinary table: one rule in the
    // database beats remembering to filter it out of six readers.
    const mine = await tx.query(
      "select id from public.diary_entries where id = $1",
      [session.id],
    );
    assert.equal(mine.length, 0);
    // The author reaches it through the one door that exists for it.
    const [own] = await tx.query<{ id: string }>(
      "select id from public.own_play_session()",
    );
    assert.equal(own.id, session.id);
    const events = await tx.query("select * from public.own_play_events()");
    assert.equal(events.length, 1);

    await tx.become("authenticated", reader);
    assert.equal(
      (
        await tx.query("select id from public.diary_entries where id = $1", [
          session.id,
        ])
      ).length,
      0,
    );
    // And the events with it, since they are read through the entry.
    assert.equal(
      (
        await tx.query(
          "select id from public.diary_entry_events where entry_id = $1",
          [session.id],
        )
      ).length,
      0,
    );
  });
});

test("closing it makes it an ordinary entry", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const reader = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", author);
    const session = await open(tx);
    for (const [kind, body, marker] of [
      ["NOTE", "primeira sala", null],
      ["PROGRESS", null, "capitulo 4"],
      ["STOP", "parei aqui, antes do chefe", null],
    ] as const)
      await tx.query(
        `select public.add_play_event(session => $1, event_kind => $2,
           event_body => $3, event_marker => $4)`,
        [session.id, kind, body, marker],
      );

    await tx.query(
      `select public.close_play_session(
         session => $1, session_minutes => 95, finished => true)`,
      [session.id],
    );

    const [entry] = await tx.query<{
      minutes: number;
      open_since: string | null;
      marks_finish: boolean;
    }>(
      "select minutes, open_since, marks_finish from public.diary_entries where id = $1",
      [session.id],
    );
    assert.equal(entry.open_since, null);
    assert.equal(entry.minutes, 95);
    assert.equal(entry.marks_finish, true);

    // Everything downstream of `diary_entries` now sees it, which is the
    // whole reason a session is an entry and not a new kind of post.
    await tx.become("authenticated", reader);
    const [seen] = await tx.query<{ id: string }>(
      "select id from public.diary_entries where id = $1",
      [session.id],
    );
    assert.equal(seen.id, session.id);
    assert.equal(
      (
        await tx.query(
          "select id from public.diary_entry_events where entry_id = $1",
          [session.id],
        )
      ).length,
      3,
    );
  });
});

test("the clock will not record a day and a half", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const session = await open(tx);
    // Opened two days ago and forgotten, which is not two days of play.
    //
    // Backdated from the connection's own role rather than as the author: no
    // browser role may write `open_since`, which is the point of the definer
    // functions, so there is no way to say this as the person whose session
    // it is. That is the behaviour under test, not a gap in it.
    await tx.query("reset role");
    await tx.query(
      "update public.diary_entries set open_since = now() - interval '48 hours' where id = $1",
      [session.id],
    );
    await tx.become("authenticated", id);
    await tx.query("select public.close_play_session(session => $1)", [
      session.id,
    ]);
    const [entry] = await tx.query<{ minutes: number }>(
      "select minutes from public.diary_entries where id = $1",
      [session.id],
    );
    assert.equal(entry.minutes, 960, "sixteen hours is the ceiling");
  });
});

test("a session that recorded nothing leaves nothing", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const first = await open(tx);
    const [{ abandon_play_session: gone }] = await tx.query<{
      abandon_play_session: boolean;
    }>("select public.abandon_play_session($1)", [first.id]);
    assert.equal(gone, true);
    assert.equal(
      (await tx.query("select id from public.own_play_session()")).length,
      0,
    );

    // With something on it, abandoning refuses: closing is the way out.
    const second = await open(tx);
    await tx.query(
      `select public.add_play_event(session => $1, event_kind => 'NOTE',
         event_body => 'algo aconteceu')`,
      [second.id],
    );
    const [{ abandon_play_session: kept }] = await tx.query<{
      abandon_play_session: boolean;
    }>("select public.abandon_play_session($1)", [second.id]);
    assert.equal(kept, false);
  });
});

test("nobody appends to somebody else's session", { skip }, async () => {
  await withRollback(async (tx) => {
    const author = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", author);
    const session = await open(tx);

    await tx.become("authenticated", stranger);
    for (const call of [
      `select public.add_play_event(session => $1, event_kind => 'NOTE', event_body => 'nao')`,
      `select public.close_play_session(session => $1)`,
    ])
      assert.equal(await tx.attempt(call, [session.id]), "42501", call);
    const [{ abandon_play_session: gone }] = await tx.query<{
      abandon_play_session: boolean;
    }>("select public.abandon_play_session($1)", [session.id]);
    assert.equal(gone, false);
    // And their own door shows them nothing of it.
    assert.equal(
      (await tx.query("select id from public.own_play_session()")).length,
      0,
    );
  });
});

test("an event cannot be emptier than its kind", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const session = await open(tx);
    for (const kind of ["NOTE", "PROGRESS", "SHOT"] as const)
      assert.equal(
        await tx.attempt(
          `select public.add_play_event(session => $1, event_kind => $2)`,
          [session.id, kind],
        ),
        "23514",
        kind,
      );
  });
});

test(
  "an event is never before the session or after now",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const id = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", id);
      const session = await open(tx);
      const [early] = await tx.query<{ at: string }>(
        `select at from public.add_play_event(session => $1, event_kind => 'NOTE',
         event_body => 'antes', happened_at => now() - interval '3 days')`,
        [session.id],
      );
      const [late] = await tx.query<{ at: string }>(
        `select at from public.add_play_event(session => $1, event_kind => 'NOTE',
         event_body => 'depois', happened_at => now() + interval '3 days')`,
        [session.id],
      );
      const [{ open_since: opened }] = await tx.query<{ open_since: string }>(
        "select open_since from public.own_play_session()",
      );
      assert.equal(new Date(early.at).getTime(), new Date(opened).getTime());
      assert.ok(new Date(late.at).getTime() <= Date.now() + 1000);
    });
  },
);
