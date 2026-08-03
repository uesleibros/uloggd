import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The session list in security settings.
 *
 * The table behind it holds refresh-token material, so what matters here is
 * the boundary: only your own rows, only the displayable columns, and revoking
 * somebody else's session must fail loudly rather than delete nothing.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

async function fakeSession(
  tx: Parameters<Parameters<typeof withRollback>[0]>[0],
  userId: string,
  agent: string,
) {
  const [row] = await tx.query<{ id: string }>(
    `insert into auth.sessions (id, user_id, created_at, updated_at, user_agent, ip)
     values (gen_random_uuid(), $1, now(), now(), $2, '203.0.113.7')
     returning id`,
    [userId, agent],
  );
  return row.id;
}

test("you see your sessions and only yours", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await makeProfile(tx, { username: "sessionmine" });
    const theirsId = await makeProfile(tx, { username: "sessiontheirs" });
    await fakeSession(tx, mineId, "Chrome on Windows");
    await fakeSession(tx, theirsId, "Safari on iOS");

    await tx.become("authenticated", mineId);
    const rows = await tx.query<{ user_agent: string }>(
      `select user_agent from public.list_own_sessions()`,
    );
    await tx.query("reset role");

    assert.equal(rows.length, 1, "the list is not scoped to the caller");
    assert.equal(rows[0].user_agent, "Chrome on Windows");
  });
});

test("revoking deletes yours and refuses theirs", { skip }, async () => {
  await withRollback(async (tx) => {
    const mineId = await makeProfile(tx, { username: "revokemine" });
    const theirsId = await makeProfile(tx, { username: "revoketheirs" });
    const mineSession = await fakeSession(tx, mineId, "A");
    const theirSession = await fakeSession(tx, theirsId, "B");

    await tx.become("authenticated", mineId);
    await tx.query(`select public.revoke_own_session($1)`, [mineSession]);
    const refused = await tx.attempt(`select public.revoke_own_session($1)`, [
      theirSession,
    ]);
    await tx.query("reset role");

    const [mine] = await tx.query<{ n: string }>(
      `select count(*)::text as n from auth.sessions where id = $1`,
      [mineSession],
    );
    const [theirs] = await tx.query<{ n: string }>(
      `select count(*)::text as n from auth.sessions where id = $1`,
      [theirSession],
    );
    assert.equal(Number(mine.n), 0, "my session was not revoked");
    assert.equal(refused, "22023", "someone else's session did not refuse");
    assert.equal(Number(theirs.n), 1, "someone else's session was deleted");
  });
});

test("the token material never leaves the function", { skip }, async () => {
  await withRollback(async (tx) => {
    // The function's return type is the contract; a column added to it later
    // is how the HMAC key would end up in a JSON response.
    const [def] = await tx.query<{ def: string }>(
      `select pg_get_function_result(p.oid) as def
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'list_own_sessions'`,
    );
    assert.ok(
      !/token|hmac|key/i.test(def.def),
      `the session list exposes token material: ${def.def}`,
    );
    assert.ok(/user_agent/.test(def.def));
  });
});

test("neither works signed out", { skip }, async () => {
  await withRollback(async (tx) => {
    await tx.become("anon");
    const listed = await tx.attempt(`select * from public.list_own_sessions()`);
    const revoked = await tx.attempt(
      `select public.revoke_own_session(gen_random_uuid())`,
    );
    await tx.query("reset role");
    assert.equal(listed, "42501");
    assert.equal(revoked, "42501");
  });
});

test(
  "the identity list shows only your own, and no provider payload",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // `identity_data` holds whatever the provider sent about the person. The
      // settings card needs the provider name and two dates; the rest has no
      // business leaving the auth schema.
      const [def] = await tx.query<{ def: string }>(
        `select pg_get_function_result(p.oid) as def
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'list_own_identities'`,
      );
      assert.ok(
        !/identity_data|provider_id/.test(def.def),
        `the identity list exposes provider payload: ${def.def}`,
      );

      const mineId = await makeProfile(tx, { username: "identitymine" });
      const theirsId = await makeProfile(tx, { username: "identitytheirs" });
      for (const [id, provider] of [
        [mineId, "discord"],
        [theirsId, "google"],
      ] as const)
        await tx.query(
          // Every parameter carries its own cast, and the value is passed
          // twice: `provider_id` is text and `user_id` is uuid, and Postgres
          // deduces one type per parameter, so a single `$1` used as both is
          // refused before the statement runs.
          `insert into auth.identities (provider_id, user_id, identity_data, provider)
           values ($1::text, $2::uuid, '{}'::jsonb, $3::text)`,
          [id, id, provider],
        );

      await tx.become("authenticated", mineId);
      const rows = await tx.query<{ provider: string }>(
        `select provider from public.list_own_identities()`,
      );
      await tx.query("reset role");

      assert.equal(rows.length, 1, "the list is not scoped to the caller");
      assert.equal(rows[0].provider, "discord");
    });
  },
);
