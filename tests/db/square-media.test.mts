import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";
test(
  "media replacement is atomic, owner-scoped, retains recent history and queues evictions",
  { skip: !hasDatabase },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      const other = await makeProfile(tx, { role: "USER" });
      const key = (id = owner) => `avatars/${id}/${randomUUID()}.avif`;
      const first = key();
      await tx.query("select public.replace_profile_media($1,'avatar',$2)", [
        owner,
        first,
      ]);
      assert.equal(
        (
          await tx.query<{ avatar_url: string }>(
            "select avatar_url from public.profiles where id=$1",
            [owner],
          )
        )[0].avatar_url,
        first,
      );
      assert.equal(
        (
          await tx.query(
            "select * from public.profile_image_history where profile_id=$1",
            [owner],
          )
        ).length,
        1,
      );
      await assert.rejects(
        tx.query("select public.replace_profile_media($1,'avatar',$2)", [
          owner,
          key(other),
        ]),
      );
    });
  },
);
test(
  "history eviction and cascaded deletes retain cleanup keys after row deletion",
  { skip: !hasDatabase },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      const keys = Array.from(
        { length: 6 },
        () => `avatars/${owner}/${randomUUID()}.avif`,
      );
      for (const key of keys)
        await tx.query("select public.replace_profile_media($1,'avatar',$2)", [
          owner,
          key,
        ]);
      assert.equal(
        (
          await tx.query(
            "select * from public.profile_image_history where profile_id=$1",
            [owner],
          )
        ).length,
        5,
      );
      assert.equal(
        (
          await tx.query<{ referenced: boolean }>(
            "select public.media_is_referenced($1) as referenced",
            [keys[0]],
          )
        )[0].referenced,
        false,
      );
      assert.ok(
        (
          await tx.query(
            "select storage_key from public.media_delete_queue where profile_id=$1 and storage_key=$2",
            [owner, keys[0]],
          )
        ).length,
      );
      await tx.query(
        "select public.replace_profile_media($1,'avatar',$2,true)",
        [owner, keys[2]],
      );
      assert.equal(
        (
          await tx.query<{ avatar_url: string }>(
            "select avatar_url from public.profiles where id=$1",
            [owner],
          )
        )[0].avatar_url,
        keys[2],
      );
      await tx.query("delete from public.profiles where id=$1", [owner]);
      assert.equal(
        (
          await tx.query(
            "select storage_key from public.media_delete_queue where profile_id=$1",
            [owner],
          )
        ).length,
        6,
      );
    });
  },
);
test(
  "clients cannot call the backend media replacement or cleanup functions",
  { skip: !hasDatabase },
  async () => {
    await withRollback(async (tx) => {
      const owner = await makeProfile(tx, { role: "USER" });
      await tx.become("authenticated", owner);
      assert.equal(
        await tx.attempt(
          "select public.replace_profile_media($1,'avatar',$2)",
          [owner, `avatars/${owner}/${randomUUID()}.avif`],
        ),
        "42501",
      );
      assert.equal(
        await tx.attempt("select * from public.media_delete_queue"),
        "42501",
      );
    });
  },
);
