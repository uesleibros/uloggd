import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * How an item looks in a list, and who gets to decide it.
 *
 * The mark used to be a tick that meant "done". It is a colour or a dimming
 * now, and what either means belongs to whoever made the list. What the
 * database still has to hold is the same: only the owner writes it, a reader
 * of a private list cannot read it, and a colour cannot exist without the
 * mode that draws it.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";
type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

async function makeList(tx: Tx, name: string, visibility = "PUBLIC") {
  const [row] = await tx.query<{ id: string }>(
    `insert into public.game_lists (profile_id, name, visibility)
     values (auth.uid(), $1, $2::public."Visibility") returning id`,
    [name, visibility],
  );
  return row.id;
}

async function addItem(tx: Tx, list: string, game: number) {
  const [row] = await tx.query<{ id: string }>(
    `insert into public.game_list_items (list_id, igdb_id, game_slug, position)
     values ($1, $2, $3, 0) returning id`,
    [list, game, `game-${game}`],
  );
  return row.id;
}

async function markOf(tx: Tx, item: string) {
  const [row] = await tx.query<{
    mark_mode: string | null;
    mark_color: string | null;
  }>("select mark_mode, mark_color from public.game_list_items where id = $1", [
    item,
  ]);
  return row;
}

test("a colour, a dimming, and nothing at all", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const list = await makeList(tx, "Da franquia");
    const item = await addItem(tx, list, 1074);

    await tx.query(
      `select public.set_list_item_mark(
         target_list => $1, item_id => $2, mode => 'COLOR', colour => 'RED')`,
      [list, item],
    );
    assert.deepEqual(await markOf(tx, item), {
      mark_mode: "COLOR",
      mark_color: "RED",
    });

    // Switching to a dimming drops the colour rather than keeping one nobody
    // can see, so going back to COLOR does not restore a choice silently.
    await tx.query(
      `select public.set_list_item_mark(
         target_list => $1, item_id => $2, mode => 'DIM')`,
      [list, item],
    );
    assert.deepEqual(await markOf(tx, item), {
      mark_mode: "DIM",
      mark_color: null,
    });

    await tx.query(
      "select public.set_list_item_mark(target_list => $1, item_id => $2)",
      [list, item],
    );
    assert.deepEqual(await markOf(tx, item), {
      mark_mode: null,
      mark_color: null,
    });
  });
});

test("a colour nobody defined is refused", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const list = await makeList(tx, "Cores");
    const item = await addItem(tx, list, 1074);

    assert.equal(
      await tx.attempt(
        `select public.set_list_item_mark(
           target_list => $1, item_id => $2, mode => 'COLOR', colour => '#ff0000')`,
        [list, item],
      ),
      "22023",
    );
    assert.equal(
      await tx.attempt(
        `select public.set_list_item_mark(
           target_list => $1, item_id => $2, mode => 'COMPLETED')`,
        [list, item],
      ),
      "22023",
    );
  });
});

test("only the owner paints, and only their own list", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const list = await makeList(tx, "Minha lista");
    const item = await addItem(tx, list, 1074);

    await tx.become("authenticated", stranger);
    assert.equal(
      await tx.attempt(
        `select public.set_list_item_mark(
           target_list => $1, item_id => $2, mode => 'DIM')`,
        [list, item],
      ),
      "42501",
    );
    assert.deepEqual(await markOf(tx, item), {
      mark_mode: null,
      mark_color: null,
    });
  });
});

test("a private list keeps its marks private", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const list = await makeList(tx, "Só minha", "PRIVATE");
    const item = await addItem(tx, list, 1074);
    await tx.query(
      `select public.set_list_item_mark(
         target_list => $1, item_id => $2, mode => 'COLOR', colour => 'GREEN')`,
      [list, item],
    );

    await tx.become("authenticated", stranger);
    // Not the row, and so not the colour either: a mark is as visible as the
    // list it is in.
    const seen = await tx.query(
      "select id from public.game_list_items where id = $1",
      [item],
    );
    assert.equal(seen.length, 0);
  });
});

test("deleting a list takes its marks with it", { skip }, async () => {
  await withRollback(async (tx) => {
    const id = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", id);
    const list = await makeList(tx, "Temporária");
    const item = await addItem(tx, list, 1074);
    await tx.query(
      `select public.set_list_item_mark(
         target_list => $1, item_id => $2, mode => 'DIM')`,
      [list, item],
    );

    await tx.query("delete from public.game_lists where id = $1", [list]);
    const left = await tx.query(
      "select id from public.game_list_items where id = $1",
      [item],
    );
    assert.equal(left.length, 0);
  });
});

test("the old tick became a dimming, not a deletion", { skip }, async () => {
  await withRollback(async (tx) => {
    // The column is gone, which is the point: there is one source of truth
    // for how an item looks, and the rows that were ticked carry DIM.
    const [column] = await tx.query<{ present: boolean }>(
      `select exists(
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'game_list_items'
           and column_name = 'marked'
       ) as present`,
    );
    assert.equal(column.present, false);

    const [dimmed] = await tx.query<{ rows: string }>(
      "select count(*) as rows from public.game_list_items where mark_mode = 'DIM'",
    );
    assert.ok(
      Number(dimmed.rows) > 0,
      "the migration should have carried the ticked items over",
    );
  });
});
