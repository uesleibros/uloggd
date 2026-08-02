import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, makeProfile, withRollback } from "./harness.mts";

/**
 * The mineral draw and the ledger behind it.
 *
 * This is the part of the site where being wrong costs something that cannot
 * be taken back: a mineral paid twice, or a rate that does not match what
 * people were told, is a currency nobody can trust afterwards. The first
 * version of the draw was wrong in exactly that way, putting iron at 39.7%
 * against a stated 27 and never once producing a ruby, which is the reason
 * this file leads with a distribution check.
 */
const skip = hasDatabase ? false : "DIRECT_URL is not set";

test("the draw matches the odds it advertises", { skip }, async () => {
  await withRollback(async (tx) => {
    // Large enough that a rate being off by a third is impossible to miss and
    // small enough to run in a test: at 40k rolls, copper's 45% lands inside a
    // percentage point essentially always.
    const rolls = 40000;
    const rows = await tx.query<{ mineral: string; n: string }>(
      `select private.draw_mineral() as mineral, count(*)::text as n
         from generate_series(1, ${rolls}) group by 1`,
    );
    const rates = await tx.query<{ mineral: string; weight: string }>(
      `select mineral, weight::text from public.mineral_rates()`,
    );
    const total = rates.reduce((sum, rate) => sum + Number(rate.weight), 0);
    assert.equal(rates.length, 6, "the rate table changed shape");

    const seen = new Map(rows.map((row) => [row.mineral, Number(row.n)]));
    for (const rate of rates) {
      const expected = (Number(rate.weight) / total) * rolls;
      const actual = seen.get(rate.mineral) ?? 0;
      // Three standard deviations of a binomial, which a correct draw clears
      // with room and a broken one misses by a mile.
      const deviation = 3 * Math.sqrt(expected * (1 - expected / rolls));
      assert.ok(
        Math.abs(actual - expected) <= Math.max(deviation, 12),
        `${rate.mineral} came out ${actual} times against an expected ${expected.toFixed(0)}`,
      );
    }
  });
});

test("the rarest mineral is genuinely rare", { skip }, async () => {
  await withRollback(async (tx) => {
    // Stated separately from the distribution check because it is a product
    // decision, not an implementation detail: ruby is meant to be a lifetime
    // event, and a well-meant rebalance that made it common would still pass
    // the test above.
    const [ruby] = await tx.query<{ share: string }>(
      `select (weight::numeric / (select sum(weight) from public.mineral_rates()) * 100)::text as share
         from public.mineral_rates() where mineral = 'RUBY'`,
    );
    assert.ok(
      Number(ruby.share) <= 0.5,
      `ruby is drawn ${ruby.share}% of the time, which is not rare`,
    );
    const [copper] = await tx.query<{ share: string }>(
      `select (weight::numeric / (select sum(weight) from public.mineral_rates()) * 100)::text as share
         from public.mineral_rates() where mineral = 'COPPER'`,
    );
    assert.ok(
      Number(copper.share) > Number(ruby.share) * 50,
      "the common mineral is not meaningfully more common than the rare one",
    );
  });
});

test(
  "a level pays exactly once, however often it is claimed",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      const ownerId = await makeProfile(tx, { username: "mineralowner" });
      // Enough reviews to clear several levels at once: at 0.6 each, 60 reviews
      // is 36 XP, which is level 4 on a curve of 2 * (L - 1) * L.
      await tx.query(
        `insert into public.reviews (profile_id, igdb_id, game_slug, content)
       select $1, id, 'game-' || id, 'Worth it.' from generate_series(1, 60) as id`,
        [ownerId],
      );

      await tx.become("authenticated", ownerId);
      const [standing] = await tx.query<{ level: number }>(
        `select level from public.profile_level($1)`,
        [ownerId],
      );
      const first = await tx.query<{ level: number; mineral: string }>(
        `select * from public.claim_level_minerals()`,
      );
      const second = await tx.query(
        `select * from public.claim_level_minerals()`,
      );
      const [held] = await tx.query<{ n: string }>(
        `select count(*)::text as n from public.mineral_grants where profile_id = $1`,
        [ownerId],
      );
      await tx.query("reset role");

      assert.ok(
        standing.level > 1,
        `the account is only level ${standing.level}`,
      );
      assert.equal(
        first.length,
        standing.level - 1,
        "every level above the first should pay exactly one mineral",
      );
      assert.equal(
        second.length,
        0,
        "claiming twice paid a second time, so the ledger is not the guard",
      );
      assert.equal(Number(held.n), standing.level - 1);
    });
  },
);

test("level 1 pays nothing", { skip }, async () => {
  await withRollback(async (tx) => {
    // Everyone starts there. Paying for it would hand a mineral to an account
    // that has done nothing, which is the opposite of what these are for.
    const ownerId = await makeProfile(tx, { username: "mineralnew" });
    await tx.become("authenticated", ownerId);
    const granted = await tx.query(
      `select * from public.claim_level_minerals()`,
    );
    await tx.query("reset role");
    assert.equal(granted.length, 0);
  });
});

test("nobody can write the ledger directly", { skip }, async () => {
  await withRollback(async (tx) => {
    // The whole scarcity rests on the draw happening server side. A client
    // that can insert its own row picks its own minerals.
    const ownerId = await makeProfile(tx, { username: "mineralcheat" });
    await tx.become("authenticated", ownerId);
    const inserted = await tx.attempt(
      `insert into public.mineral_grants (profile_id, level, mineral)
       values ($1, 2, 'RUBY')`,
      [ownerId],
    );
    const updated = await tx.attempt(
      `update public.mineral_grants set mineral = 'RUBY' where profile_id = $1`,
      [ownerId],
    );
    await tx.query("reset role");
    assert.equal(inserted, "42501", "an account can grant itself minerals");
    assert.equal(updated, "42501", "an account can rewrite its own minerals");
  });
});

test(
  "a wallet lists every mineral, including the empty ones",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // The gaps are most of what makes a rare one legible, so a wallet that
      // returned only what someone owns would be the wrong shape.
      const ownerId = await makeProfile(tx, { username: "mineralwallet" });
      const rows = await tx.query<{ mineral: string; amount: string }>(
        `select mineral, amount::text from public.profile_minerals($1)`,
        [ownerId],
      );
      assert.equal(rows.length, 6);
      assert.deepEqual(
        rows.map((row) => Number(row.amount)),
        [0, 0, 0, 0, 0, 0],
      );
    });
  },
);

test("a wallet is readable without an account", { skip }, async () => {
  await withRollback(async (tx) => {
    const ownerId = await makeProfile(tx, { username: "mineralpublic" });
    await tx.become("anon");
    const refused = await tx.attempt(
      `select * from public.profile_minerals($1)`,
      [ownerId],
    );
    await tx.query("reset role");
    assert.equal(refused, null, `anon was refused with ${refused}`);
  });
});

test(
  "a wallet ledger read has to be scoped by the reader",
  { skip },
  async () => {
    await withRollback(async (tx) => {
      // The read policy is `using (true)` on purpose: a wallet is public the way
      // a level is. That puts the scoping burden on every query, and the first
      // version of the history panel had none, so it listed the whole site's
      // grants as though they were the viewer's.
      const oneId = await makeProfile(tx, { username: "walletone" });
      const twoId = await makeProfile(tx, { username: "wallettwo" });
      for (const [id, level] of [
        [oneId, 2],
        [twoId, 3],
      ] as const)
        await tx.query(
          `insert into public.mineral_grants (profile_id, level, mineral)
         values ($1, $2, 'COPPER')`,
          [id, level],
        );

      await tx.become("authenticated", oneId);
      const unscoped = await tx.query<{ profile_id: string }>(
        `select profile_id from public.mineral_grants`,
      );
      const scoped = await tx.query<{ profile_id: string }>(
        `select profile_id from public.mineral_grants where profile_id = $1`,
        [oneId],
      );
      await tx.query("reset role");

      assert.ok(
        unscoped.length > scoped.length,
        "the policy no longer exposes other wallets, so this test is measuring nothing",
      );
      assert.equal(scoped.length, 1);
      assert.equal(scoped[0].profile_id, oneId);
    });
  },
);
