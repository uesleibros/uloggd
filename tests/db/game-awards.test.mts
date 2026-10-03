import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";
const category = () => ({
  id: randomUUID(),
  name: "Game of the year",
  description: "",
  max_nominees: 5,
  nominees: [1, 2],
  winner: 1,
});
test(
  "played-year eligibility includes recorded sessions crossing New Year",
  { skip: !hasDatabase },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      await tx.query(
        `insert into public.diary_entries(profile_id,igdb_id,game_slug,played_on,ended_on) values
      ($1,55,'awards-range','2025-12-31','2026-01-02'),
      ($1,56,'awards-old','2025-12-30',null),
      ($1,57,'awards-next','2027-01-01',null)`,
        [owner],
      );
      await tx.become("authenticated", owner);
      const [award] = await tx.query<{ id: string }>(
        `insert into public.game_awards(profile_id,name,year,mode,source,categories) values($1,'Played year',2026,'PERSONAL','PLAYED_YEAR',$2) returning id`,
        [
          owner,
          JSON.stringify([{ ...category(), nominees: [55], winner: 55 }]),
        ],
      );
      const pool = await tx.query<{ igdb_id: number }>(
        "select igdb_id from public.award_eligible_games($1)",
        [award.id],
      );
      assert.deepEqual(
        pool.map((row) => row.igdb_id),
        [55],
      );
    });
  },
);
test(
  "awards enforce ownership, draft privacy, nominee limits and optimistic versions",
  { skip: !hasDatabase },
  async () =>
    withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      const outsider = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", owner);
      const [award] = await tx.query<{ id: string; version: number }>(
        `insert into public.game_awards(profile_id,name,year,mode,categories,visibility) values($1,'Awards',2026,'PERSONAL',$2,'PUBLIC') returning id,version`,
        [owner, JSON.stringify([category()])],
      );
      assert.equal(award.version, 1);
      await tx.become("anon");
      assert.equal(
        (
          await tx.query("select id from public.game_awards where id=$1", [
            award.id,
          ])
        ).length,
        0,
      );
      assert.equal(
        await tx.attempt("select public.live_award_categories($1)", [award.id]),
        "P0002",
      );
      await tx.become("authenticated", outsider);
      assert.equal(
        (
          await tx.query(
            "update public.game_awards set name='Other' where id=$1 returning id",
            [award.id],
          )
        ).length,
        0,
      );
      assert.equal(
        await tx.attempt("select * from public.award_eligible_games($1)", [
          award.id,
        ]),
        "P0002",
      );
      await tx.become("authenticated", owner);
      const [saved] = await tx.query<{ version: number }>(
        "update public.game_awards set status='PUBLISHED' where id=$1 and version=1 returning version",
        [award.id],
      );
      assert.equal(saved.version, 2);
      assert.equal(
        (
          await tx.query(
            "update public.game_awards set name='Stale' where id=$1 and version=1 returning id",
            [award.id],
          )
        ).length,
        0,
      );
      assert.equal(
        await tx.attempt(
          "update public.game_awards set categories=$2 where id=$1",
          [award.id, JSON.stringify([{ ...category(), winner: 3 }])],
        ),
        "22023",
      );
      assert.equal(
        await tx.attempt(
          "update public.game_awards set categories=$2 where id=$1",
          [award.id, JSON.stringify([{ ...category(), nominees: [1, 1] }])],
        ),
        "22023",
      );
      await tx.become("anon");
      assert.equal(
        (
          await tx.query("select id from public.game_awards where id=$1", [
            award.id,
          ])
        ).length,
        1,
      );
    }),
);
test(
  "live source membership removes nominees and winners without exposing a private list",
  { skip: !hasDatabase },
  async () =>
    withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", owner);
      const [list] = await tx.query<{ id: string }>(
        "insert into public.game_lists(profile_id,name,visibility) values($1,'Source','PRIVATE') returning id",
        [owner],
      );
      await tx.query(
        "insert into public.game_list_items(list_id,igdb_id,game_slug,position) values($1,1,'one',0),($1,2,'two',1),($1,3,'private-game',2)",
        [list.id],
      );
      const [award] = await tx.query<{ id: string }>(
        `insert into public.game_awards(profile_id,name,year,mode,source,source_list_id,categories,visibility,status) values($1,'Awards',2026,'PERSONAL','LIST',$2,$3,'PUBLIC','PUBLISHED') returning id`,
        [owner, list.id, JSON.stringify([category()])],
      );
      assert.equal(
        await tx.attempt(
          "update public.game_awards set categories=$2 where id=$1",
          [
            award.id,
            JSON.stringify([{ ...category(), nominees: [4], winner: 4 }]),
          ],
        ),
        "22023",
      );
      await tx.query(
        "delete from public.game_list_items where list_id=$1 and igdb_id=1",
        [list.id],
      );
      await tx.become("anon");
      const [live] = await tx.query<{
        categories: { nominees: number[]; winner: number | null }[];
      }>("select public.live_award_categories($1) as categories", [award.id]);
      assert.deepEqual(live.categories[0].nominees, [2]);
      assert.equal(live.categories[0].winner, null);
      assert.equal(
        (
          await tx.query("select id from public.game_lists where id=$1", [
            list.id,
          ])
        ).length,
        0,
      );
      assert.equal(
        await tx.attempt("select * from public.award_eligible_games($1)", [
          award.id,
        ]),
        "P0002",
      );
      await tx.become("authenticated", owner);
      await tx.query("delete from public.game_lists where id=$1", [list.id]);
      const [missing] = await tx.query<{
        categories: { nominees: number[] }[];
      }>("select public.live_award_categories($1) as categories", [award.id]);
      assert.deepEqual(missing.categories[0].nominees, []);
      assert.equal(
        await tx.attempt(
          "update public.game_awards set name='Changed' where id=$1",
          [award.id],
        ),
        "22023",
      );
    }),
);
