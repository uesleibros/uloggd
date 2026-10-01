import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

test(
  "suspension and permanent bans preserve both follow directions while blocking writes",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const admin = await makeProfile(tx, { role: "ADMIN" });
      const target = await makeProfile(tx, { role: "USER" });
      const other = await makeProfile(tx, { role: "USER" });
      await tx.query(
        `insert into public.follows(follower_id,following_id) values ($1,$2),($2,$1)`,
        [target, other],
      );
      const edges = () =>
        tx.query(
          `select follower_id,following_id,created_at from public.follows where follower_id=$1 or following_id=$1 order by follower_id`,
          [target],
        );
      const original = await edges();
      for (const duration of [7, null]) {
        await tx.become("authenticated", admin);
        await tx.query(
          `select * from public.moderate_profile($1,'BAN','Policy violation',$2)`,
          [target, duration],
        );
        assert.deepEqual(await edges(), original);
        await tx.become("authenticated", target);
        assert.equal(
          await tx.attempt(`delete from public.follows where follower_id=$1`, [
            target,
          ]),
          "42501",
        );
        assert.equal(
          await tx.attempt(
            `update public.profiles set display_name='Cannot write' where id=$1`,
            [target],
          ),
          "42501",
        );
        await tx.become("authenticated", admin);
        await tx.query(
          `select * from public.moderate_profile($1,'UNBAN','Appeal accepted')`,
          [target],
        );
        assert.deepEqual(await edges(), original);
      }
      await tx.become("authenticated", target);
      assert.equal(
        await tx.attempt(`delete from public.follows where follower_id=$1`, [
          target,
        ]),
        null,
      );
    });
  },
);
