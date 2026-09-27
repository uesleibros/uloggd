import assert from "node:assert/strict";
import test from "node:test";
import {
  copyAggregateSql,
  copyCursorClause,
  copyOrderBy,
  copySortKey,
  type CopySort,
} from "../../lib/copy-browsing.ts";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * Paging a shelf, against the database that has to hold the order.
 *
 * The unit tests prove the clauses agree with their own `order by`. These
 * prove the pair works on rows: sixty copies come back as sixty, once each,
 * including when they share a timestamp, which is the case a cursor without a
 * tie-break gets wrong.
 */

const skip = hasDatabase ? false : "DIRECT_URL is not set";
type Tx = Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>;

const PLATFORMS = [
  { id: 6, name: "PC" },
  { id: 167, name: "PlayStation 5" },
  { id: 130, name: "Nintendo Switch" },
];

async function shelf(
  tx: Tx,
  owner: string,
  howMany: number,
  sameMoment = false,
) {
  for (let index = 0; index < howMany; index += 1) {
    const platform = PLATFORMS[index % PLATFORMS.length];
    await tx.query(
      `insert into public.library_entries
         (profile_id, igdb_id, game_slug, platform_id, platform_name, medium,
          ownership, storefront, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8,
               coalesce($9::timestamptz, now()))`,
      [
        owner,
        1000 + index,
        `game-${String(index).padStart(3, "0")}`,
        platform.id,
        platform.name,
        index % 2 ? "DIGITAL" : "PHYSICAL",
        "OWNED",
        index % 3 === 0 ? "STEAM" : "RETAIL",
        // Left to `now()`, every row in the transaction lands on the same
        // instant, which is the case a timestamp-only cursor cannot page: it
        // either repeats a row or skips one. It is also the real one, because
        // `now()` carries microseconds and a shelf is written by the second.
        sameMoment ? null : new Date(Date.now() - index * 60_000),
      ],
    );
  }
}

/** Walks every page the way the route does, and returns what it saw. */
async function walk(tx: Tx, owner: string, sort: CopySort, size = 24) {
  const seen: string[] = [];
  let cursor: { key: string | null; id: string } | null = null;
  for (let page = 0; page < 20; page += 1) {
    const values: unknown[] = [owner];
    let where = "profile_id = $1";
    if (cursor) {
      values.push(cursor.key, cursor.id);
      where += ` and ${copyCursorClause(sort, "$2", "$3")}`;
    }
    // The key comes back as text from Postgres, the way the route reads it.
    // Through the driver it would be a JavaScript Date, which holds
    // milliseconds where the column holds microseconds, and a cursor rounded
    // down that way asks for rows older than an instant before every row: the
    // second page comes back empty and the shelf looks like it ends.
    const rows = await tx.query<{ id: string; cursor_key: string | null }>(
      `select id, ${copySortKey(sort)}::text as cursor_key
         from public.library_entries
        where ${where}
        order by ${copyOrderBy(sort)}
        limit ${size + 1}`,
      values,
    );
    const rest = rows.length > size;
    const data = rest ? rows.slice(0, size) : rows;
    seen.push(...data.map((row) => String(row.id)));
    if (!rest) break;
    const last = data[data.length - 1];
    cursor = { key: last.cursor_key, id: String(last.id) };
  }
  return seen;
}

test("sixty copies come back sixty times, once each", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    await shelf(tx, owner, 60);

    for (const sort of ["newest", "oldest", "title"] as CopySort[]) {
      const seen = await walk(tx, owner, sort);
      assert.equal(seen.length, 60, `${sort} lost or repeated a page`);
      assert.equal(new Set(seen).size, 60, `${sort} returned a copy twice`);
    }
  });
});

test("rows recorded in the same instant still page", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    await shelf(tx, owner, 30, true);

    const seen = await walk(tx, owner, "newest", 10);
    // Without the id in the cursor this is where a page repeats itself for
    // ever or skips nine rows.
    assert.equal(seen.length, 30);
    assert.equal(new Set(seen).size, 30);
  });
});

test(
  "a cursor rounded to the millisecond loses the rest",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", owner);
      await shelf(tx, owner, 30, true);

      // What the driver would hand over: the same instant with the microseconds
      // cut off. Pinned rather than merely avoided, because the failure it
      // causes is a second page that is simply empty, which reads like the end
      // of a shelf and not like a bug.
      const [first] = await tx.query<{ exact: string; rounded: string }>(
        `select created_at::text as exact,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as rounded
         from public.library_entries
        where profile_id = $1
        order by created_at desc, id desc limit 1`,
        [owner],
      );
      const page = async (key: string, id: string) =>
        (
          await tx.query(
            `select id from public.library_entries
            where profile_id = $1 and ${copyCursorClause("newest", "$2", "$3")}`,
            [owner, key, id],
          )
        ).length;

      const [last] = await tx.query<{ id: string }>(
        `select id from public.library_entries where profile_id = $1
        order by created_at desc, id desc limit 1`,
        [owner],
      );
      assert.ok(first.exact.length > first.rounded.length - 1);
      assert.equal(await page(first.exact, last.id), 29, "the exact key pages");
      assert.equal(
        await page(first.rounded, last.id),
        0,
        "and the rounded one falls off the end of the shelf",
      );
    });
  },
);

test("undated copies sort last and page cleanly", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    await shelf(tx, owner, 12);
    await tx.query(
      `update public.library_entries
          set acquired_on = case when igdb_id % 2 = 0 then date '2020-01-01' end
        where profile_id = $1`,
      [owner],
    );

    const seen = await walk(tx, owner, "acquired", 5);
    assert.equal(seen.length, 12);
    assert.equal(new Set(seen).size, 12);

    const [first] = await tx.query<{ acquired_on: string | null }>(
      `select acquired_on from public.library_entries
        where profile_id = $1 order by ${copyOrderBy("acquired")} limit 1`,
      [owner],
    );
    assert.ok(first.acquired_on, "a dated copy comes before the undated ones");
  });
});

test("a filter is an and, never a union", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    // Four copies, each saying something different.
    const rows: [number, string, number, string, string, string][] = [
      [1, "game-a", 6, "PC", "DIGITAL", "STEAM"],
      [1, "game-a", 167, "PlayStation 5", "PHYSICAL", "RETAIL"],
      [2, "game-b", 6, "PC", "DIGITAL", "STEAM"],
      [3, "game-c", 130, "Nintendo Switch", "PHYSICAL", "RETAIL"],
    ];
    for (const [game, slug, platform, name, medium, storefront] of rows)
      await tx.query(
        `insert into public.library_entries
           (profile_id, igdb_id, game_slug, platform_id, platform_name,
            medium, ownership, storefront)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [owner, game, slug, platform, name, medium, "OWNED", storefront],
      );

    const count = async (where: string) =>
      Number(
        (
          await tx.query<{ total: string }>(
            `select count(*) as total from public.library_entries
              where profile_id = $1 ${where ? `and ${where}` : ""}`,
            [owner],
          )
        )[0].total,
      );

    assert.equal(await count("storefront = 'STEAM'"), 2);
    assert.equal(await count("medium = 'DIGITAL'"), 2);
    assert.equal(await count("medium = 'PHYSICAL'"), 2);
    assert.equal(await count("ownership = 'OWNED'"), 4);
    assert.equal(
      await count("storefront = 'STEAM' and medium = 'PHYSICAL'"),
      0,
      "two filters narrow each other rather than adding up",
    );
    assert.equal(await count("platform_id = 6 and medium = 'DIGITAL'"), 2);
  });
});

/** The numbers a filtered shelf reports about itself. */
type Totals = {
  copies: number;
  games: number;
  games_with_multiple_copies: number;
  games_on_multiple_platforms: number;
};

async function totals(tx: Tx, where: string, values: unknown[]) {
  const [row] = await tx.query<{
    totals: Totals;
    group_counts?: {
      value: string | null;
      label: string | null;
      copies: number;
    }[];
  }>(copyAggregateSql({ filtered: where }), values);
  return row.totals;
}

test("two counts that look like one", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const copy = (game: number, platform: [number, string] | null) =>
      tx.query(
        `insert into public.library_entries
           (profile_id, igdb_id, game_slug, platform_id, platform_name)
         values ($1, $2, $3, $4, $5)`,
        [
          owner,
          game,
          `game-${game}`,
          platform?.[0] ?? null,
          platform?.[1] ?? null,
        ],
      );
    const PC: [number, string] = [6, "PC"];
    const PS5: [number, string] = [167, "PlayStation 5"];
    // Game 1: two identical discs.
    await copy(1, PS5);
    await copy(1, PS5);
    // Game 2: one on PC, one on PS5.
    await copy(2, PC);
    await copy(2, PS5);
    // Game 3: one copy, and one nobody labelled.
    await copy(3, PC);
    await copy(3, null);

    const all = await totals(tx, "profile_id = $1", [owner]);
    assert.equal(all.copies, 6);
    assert.equal(all.games, 3);
    // All three are owned more than once; only the second is on two
    // platforms, because two identical PS5 discs are one platform and a copy
    // nobody labelled is not a platform at all.
    assert.equal(all.games_with_multiple_copies, 3);
    assert.equal(all.games_on_multiple_platforms, 1);
  });
});

test("the numbers are about the filtered shelf", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    const copy = (game: number, platform: [number, string]) =>
      tx.query(
        `insert into public.library_entries
           (profile_id, igdb_id, game_slug, platform_id, platform_name)
         values ($1, $2, $3, $4, $5)`,
        [owner, game, `game-${game}`, platform[0], platform[1]],
      );
    const PC: [number, string] = [6, "PC"];
    const PS5: [number, string] = [167, "PlayStation 5"];
    await copy(1, PS5);
    await copy(1, PS5);
    await copy(2, PC);
    await copy(2, PS5);

    const whole = await totals(tx, "profile_id = $1", [owner]);
    assert.deepEqual(whole, {
      copies: 4,
      games: 2,
      games_with_multiple_copies: 2,
      games_on_multiple_platforms: 1,
    });

    // The same shelf seen through one platform. Every number answers the
    // filtered question: the second game is on two platforms in the library
    // and on one here, and saying otherwise would be the screen describing
    // rows it is not showing.
    const ps5 = await totals(
      tx,
      "profile_id = $1 and platform_id = $2::integer",
      [owner, 167],
    );
    assert.deepEqual(ps5, {
      copies: 3,
      games: 2,
      games_with_multiple_copies: 1,
      games_on_multiple_platforms: 0,
    });

    // And through a search that finds one of them.
    const searched = await totals(
      tx,
      "profile_id = $1 and game_slug ilike '%' || $2 || '%'",
      [owner, "game-2"],
    );
    assert.equal(searched.copies, 2);
    assert.equal(searched.games, 1);
  });
});

test("a group is counted whole, not by the page", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    for (let index = 0; index < 40; index += 1)
      await tx.query(
        `insert into public.library_entries
           (profile_id, igdb_id, game_slug, storefront, medium)
         values ($1, $2, $3, 'STEAM', $4)`,
        [
          owner,
          500 + index,
          `steam-${index}`,
          index < 5 ? "PHYSICAL" : "DIGITAL",
        ],
      );
    for (let index = 0; index < 20; index += 1)
      await tx.query(
        `insert into public.library_entries
           (profile_id, igdb_id, game_slug, storefront, medium)
         values ($1, $2, $3, 'RETAIL', 'PHYSICAL')`,
        [owner, 600 + index, `retail-${index}`],
      );
    // One nobody ever said anything about, which is a group of its own.
    await tx.query(
      `insert into public.library_entries (profile_id, igdb_id, game_slug)
       values ($1, 999, 'unsaid')`,
      [owner],
    );

    const read = async (where: string, values: unknown[]) => {
      const [row] = await tx.query<{
        group_counts: { value: string | null; copies: number }[];
      }>(copyAggregateSql({ filtered: where, group: "storefront" }), values);
      return new Map(row.group_counts.map((one) => [one.value, one.copies]));
    };

    const whole = await read("profile_id = $1", [owner]);
    // Forty and twenty, whatever the page size is: this is the number a
    // heading prints while twenty-four rows are on screen.
    assert.equal(whole.get("STEAM"), 40);
    assert.equal(whole.get("RETAIL"), 20);
    // The unsaid one is counted rather than dropped, because the view draws a
    // group for it and a heading without a number under it is a page lying
    // about its own contents.
    assert.equal(whole.get(null), 1);

    // A group count describes the result rather than offering a way out of
    // it: under "physical", Steam is five, not forty.
    const physical = await read("profile_id = $1 and medium = $2", [
      owner,
      "PHYSICAL",
    ]);
    assert.equal(physical.get("STEAM"), 5);
    assert.equal(physical.get("RETAIL"), 20);
    assert.equal(physical.get(null), undefined);
  });
});

test(
  "a platform is its id, and the label is only a label",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", owner);
      const copy = (game: number, id: number | null, name: string | null) =>
        tx.query(
          `insert into public.library_entries
           (profile_id, igdb_id, game_slug, platform_id, platform_name)
         values ($1, $2, $3, $4, $5)`,
          [owner, game, `game-${game}`, id, name],
        );
      await copy(1, 167, "PlayStation 5");
      await copy(2, 167, "PS5");
      await copy(3, 6, "PC");
      // Two catalogue platforms that share a label are two platforms, and one
      // platform written two ways is still one.
      await copy(4, 8, "PlayStation 5");
      // A copy from before platforms had ids: it stays in the shelf and out of
      // the selectable facet, because a filter keyed on a name is a filter that
      // silently stops filtering.
      await copy(5, null, "Mega Drive");

      const [row] = await tx.query<{
        platform: { value: string; label: string; copies: number }[];
        group_counts: {
          value: string | null;
          label: string | null;
          copies: number;
        }[];
      }>(
        copyAggregateSql({
          filtered: "profile_id = $1",
          facets: {
            platform: "profile_id = $1",
            medium: "profile_id = $1",
            ownership: "profile_id = $1",
            storefront: "profile_id = $1",
          },
          group: "platform",
        }),
        [owner],
      );
      const facet = new Map(row.platform.map((one) => [one.value, one]));
      assert.equal(facet.get("167")?.copies, 2, "one platform, two spellings");
      assert.equal(facet.get("8")?.copies, 1, "same name, different platform");
      assert.equal(facet.get("6")?.label, "PC");
      assert.ok(!facet.has("Mega Drive"), "a name is never an identity");
      assert.equal(facet.size, 3);

      // Grouping is allowed to show the unidentified one, keyed on the only
      // thing it has: nobody is asked to filter by it.
      const groups = new Map(row.group_counts.map((one) => [one.value, one]));
      assert.equal(groups.get("Mega Drive")?.copies, 1);
      assert.equal(groups.get("167")?.copies, 2);
      // Whichever of the two spellings the collation puts first: the label is
      // presentation, and the group is the id underneath it either way.
      assert.ok(
        ["PS5", "PlayStation 5"].includes(groups.get("167")?.label ?? ""),
      );
    });
  },
);

test("the search reads the slug, not the catalogue", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    for (const [game, slug, edition] of [
      [1, "resident-evil-4", null],
      [2, "resident-evil-2", null],
      [3, "persona-5-royal", "Collector's Edition"],
    ] as [number, string, string | null][])
      await tx.query(
        `insert into public.library_entries
           (profile_id, igdb_id, game_slug, edition)
         values ($1, $2, $3, $4)`,
        [owner, game, slug, edition],
      );

    const found = async (term: string) =>
      (
        await tx.query<{ game_slug: string }>(
          `select game_slug from public.library_entries
            where profile_id = $1
              and (game_slug ilike '%' || $2 || '%'
                   or lower(coalesce(edition, '')) like '%' || replace($2, '-', ' ') || '%')
            order by game_slug`,
          [owner, term],
        )
      ).map((row) => row.game_slug);

    assert.deepEqual(await found("resident"), [
      "resident-evil-2",
      "resident-evil-4",
    ]);
    assert.deepEqual(await found("collector"), ["persona-5-royal"]);
    assert.deepEqual(await found("halo"), []);
  });
});

test("the browsing read is the caller's own shelf", { skip }, async () => {
  await withRollback(async (tx) => {
    const owner = await makeProfile(tx, { role: "USER" });
    const stranger = await makeProfile(tx, { role: "USER" });
    await tx.become("authenticated", owner);
    await shelf(tx, owner, 5);

    await tx.become("authenticated", stranger);
    // The route reads through this, and it answers about `auth.uid()` and
    // nobody else: there is no parameter that points it at another person.
    assert.equal(
      (await tx.query("select id from public.own_library_entries()")).length,
      0,
    );

    // The table itself is more permissive on purpose, and by exactly the rule
    // the library follows: a copy says what somebody owns, which is the same
    // kind of fact as what is in their library, so a public library shows its
    // copies and a closed one shows none. That second half is what the
    // privacy test beside this one pins.
    const [profile] = await tx.query<{ library_visibility: string }>(
      "select library_visibility from public.profiles where id = $1",
      [owner],
    );
    assert.equal(profile.library_visibility, "PUBLIC");
    assert.equal(
      (
        await tx.query(
          "select id from public.library_entries where profile_id = $1",
          [owner],
        )
      ).length,
      5,
    );

    await tx.query("reset role");
    await tx.query(
      "update public.profiles set library_visibility = 'PRIVATE' where id = $1",
      [owner],
    );
    await tx.become("authenticated", stranger);
    assert.equal(
      (
        await tx.query(
          "select id from public.library_entries where profile_id = $1",
          [owner],
        )
      ).length,
      0,
      "a closed library keeps its copies",
    );
  });
});
