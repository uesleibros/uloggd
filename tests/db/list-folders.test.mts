import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Folders, and the two rules that keep them from being a privacy control.
 *
 * A folder is a heading somebody put over their own lists. It carries no
 * visibility, so what these pin is the other direction: a folder cannot be
 * used to reach into somebody else's lists, and it cannot quietly become a
 * heading over a list that is not its owner's.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";

async function folder(
  tx: Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>,
  owner: string,
  name: string,
) {
  const [row] = await tx.query<{ id: string }>(
    "insert into public.list_folders (profile_id, name) values ($1, $2) returning id",
    [owner, name],
  );
  return row.id;
}

async function list(
  tx: Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>,
  owner: string,
  name: string,
  visibility: "PUBLIC" | "PRIVATE",
) {
  const [row] = await tx.query<{ id: string }>(
    `insert into public.game_lists (profile_id, name, visibility)
     values ($1, $2, $3::public."Visibility") returning id`,
    [owner, name, visibility],
  );
  return row.id;
}

test("a list can only be filed in its owner's folder", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const mine = await folder(tx, owner, "Séries");
    const paper = await list(tx, owner, "Zelda", "PUBLIC");

    await tx.query(
      "update public.game_lists set folder_id = $2 where id = $1",
      [paper, mine],
    );

    await tx.query("reset role");
    const theirs = await folder(tx, stranger, "Deles");
    await tx.become("authenticated", owner);
    // The update policy asks whether the row is yours. It cannot ask whether
    // the folder you are pointing it at is, which is what the trigger is for:
    // without it, their folder would quietly start counting my list.
    const failed = await tx.attempt(
      "update public.game_lists set folder_id = $2 where id = $1",
      [paper, theirs],
    );
    assert.equal(failed, "42501");
  });
});

test("an empty folder is nobody else's business", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const secret = await folder(tx, owner, "Presentes");
    const shown = await folder(tx, owner, "Recomendações");
    const hidden = await list(tx, owner, "Comprar", "PRIVATE");
    const open = await list(tx, owner, "Favoritos", "PUBLIC");
    await tx.query(
      "update public.game_lists set folder_id = $2 where id = $1",
      [hidden, secret],
    );
    await tx.query(
      "update public.game_lists set folder_id = $2 where id = $1",
      [open, shown],
    );

    await tx.become("authenticated", stranger);
    const seen = (
      await tx.query<{ id: string }>("select id from public.list_folders")
    ).map((row) => row.id);
    // The folder over a public list is visible, because its heading is
    // already over something they can read. The one holding only private
    // lists is not: the names people give their folders are not nothing, and
    // "Presentes" over an empty shelf still says something.
    assert.ok(seen.includes(shown));
    assert.ok(!seen.includes(secret));
  });
});

test("deleting a folder keeps the lists in it", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const shelf = await folder(tx, owner, "2026");
    const paper = await list(tx, owner, "Jogos do ano", "PUBLIC");
    await tx.query(
      "update public.game_lists set folder_id = $2 where id = $1",
      [paper, shelf],
    );

    await tx.query("delete from public.list_folders where id = $1", [shelf]);
    const [after] = await tx.query<{ folder_id: string | null }>(
      "select folder_id from public.game_lists where id = $1",
      [paper],
    );
    // Tidying a shelf is not throwing out what was on it.
    assert.equal(after.folder_id, null);
  });
});

test("a folder belongs to one person, by name", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const other = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    await folder(tx, owner, "Séries");
    const twice = await tx.attempt(
      "insert into public.list_folders (profile_id, name) values ($1, $2)",
      [owner, "Séries"],
    );
    assert.equal(twice, "23505", "the same name twice is the same folder");

    // Somebody else's shelves are their own, name and all.
    await tx.query("reset role");
    await tx.become("authenticated", other);
    const theirs = await tx.attempt(
      "insert into public.list_folders (profile_id, name) values ($1, $2)",
      [other, "Séries"],
    );
    assert.equal(theirs, null);

    // And a folder cannot be made in somebody else's name.
    const forged = await tx.attempt(
      "insert into public.list_folders (profile_id, name) values ($1, $2)",
      [owner, "Roubada"],
    );
    assert.equal(forged, "42501");
  });
});

test("a folder needs a name that says something", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    assert.equal(
      await tx.attempt(
        "insert into public.list_folders (profile_id, name) values ($1, $2)",
        [owner, "   "],
      ),
      "23514",
    );
    assert.equal(
      await tx.attempt(
        "insert into public.list_folders (profile_id, name) values ($1, $2)",
        [owner, "x".repeat(61)],
      ),
      "23514",
    );
  });
});
