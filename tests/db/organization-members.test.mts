import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, withRollback } from "./harness.mts";

/**
 * The people who hold an organization account.
 *
 * An organization used to be a shared login: everyone running it shared a
 * password, nothing recorded who did what, and removing someone meant changing
 * it on everybody. Membership is a record of who is there and a way to take
 * someone out.
 *
 * Two rules carry the weight and are what these tests pin. Only the account
 * itself adds people, so "who let this person in" stays answerable. And anyone
 * can remove themselves, because someone should be able to walk away from an
 * organization without asking it first.
 */
async function organization(
  tx: Awaited<Parameters<Parameters<typeof withRollback>[0]>[0]>,
) {
  const rows = await tx.query<{ id: string; username: string }>(
    `select id, username from public.profiles order by created_at limit 3`,
  );
  assert.equal(rows.length, 3, "need three accounts");
  await tx.query(
    `update public.profiles set account_type = 'ORGANIZATION' where id = $1`,
    [rows[0].id],
  );
  return { org: rows[0], member: rows[1], stranger: rows[2] };
}

test(
  "only the account itself can add a member",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { org, member, stranger } = await organization(tx);

      await tx.become("authenticated", org.id);
      assert.equal(
        await tx.attempt(`select public.add_organization_member($1)`, [
          member.username,
        ]),
        null,
        "the organization could not add a member",
      );
      await tx.query("reset role");

      // The hole worth checking: someone letting themselves in would make
      // membership meaningless as a signal of who is behind an account.
      await tx.become("authenticated", stranger.id);
      assert.ok(
        await tx.attempt(
          `insert into public.organization_members (organization_id, member_id)
           values ($1, $2)`,
          [org.id, stranger.id],
        ),
        "a stranger added themselves to an organization",
      );
      await tx.query("reset role");

      const listed = await tx.query<{ username: string }>(
        `select * from public.organization_members_of($1)`,
        [org.id],
      );
      assert.deepEqual(
        listed.map((row) => row.username),
        [member.username],
      );
    });
  },
);

test(
  "a member can remove themselves",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { org, member } = await organization(tx);
      await tx.become("authenticated", org.id);
      await tx.query(`select public.add_organization_member($1)`, [
        member.username,
      ]);
      await tx.query("reset role");

      await tx.become("authenticated", member.id);
      await tx.query(
        `delete from public.organization_members
          where organization_id = $1 and member_id = $2`,
        [org.id, member.id],
      );
      await tx.query("reset role");

      const listed = await tx.query(
        `select * from public.organization_members_of($1)`,
        [org.id],
      );
      assert.equal(listed.length, 0, "the member could not leave");
    });
  },
);

test(
  "adding refuses what it cannot make sense of",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { org, member } = await organization(tx);
      await tx.become("authenticated", org.id);

      // Distinct codes, because the form shows a different message for each and
      // "no such account" is a typo while the others are not.
      assert.equal(
        await tx.attempt(
          `select public.add_organization_member('nobody-here')`,
        ),
        "P0002",
      );
      assert.equal(
        await tx.attempt(`select public.add_organization_member($1)`, [
          org.username,
        ]),
        "22023",
        "an organization added itself as its own member",
      );
      assert.equal(
        await tx.attempt(`select public.add_organization_member($1, 'BOSS')`, [
          member.username,
        ]),
        "22023",
      );
    });
  },
);

test(
  "returning to a person removes the members",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // Otherwise the rows describe membership of something that is no longer an
    // organization: `organization_members_of` stops returning them while they
    // sit in the table indefinitely.
    await withRollback(async (tx) => {
      const { org, member } = await organization(tx);
      await tx.become("authenticated", org.id);
      await tx.query(`select public.add_organization_member($1)`, [
        member.username,
      ]);
      await tx.query("reset role");

      await tx.query(
        `update public.profiles set account_type = 'PERSON' where id = $1`,
        [org.id],
      );
      const left = await tx.query(
        `select 1 from public.organization_members where organization_id = $1`,
        [org.id],
      );
      assert.equal(left.length, 0, "a demoted account kept its members");
    });
  },
);

test(
  "a personal account never lists members",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // The rows are gone on demotion, but the function guards independently so
    // that a row written by any other path cannot make a person look like one.
    await withRollback(async (tx) => {
      const { org, member } = await organization(tx);
      await tx.become("authenticated", org.id);
      await tx.query(`select public.add_organization_member($1)`, [
        member.username,
      ]);
      await tx.query("reset role");

      await tx.query(
        `alter table public.profiles disable trigger profiles_clear_organization_fields`,
      );
      await tx.query(
        `update public.profiles set account_type = 'PERSON' where id = $1`,
        [org.id],
      );
      await tx.query(
        `alter table public.profiles enable trigger profiles_clear_organization_fields`,
      );

      const listed = await tx.query(
        `select * from public.organization_members_of($1)`,
        [org.id],
      );
      assert.equal(
        listed.length,
        0,
        "a personal account listed members anyway",
      );
    });
  },
);
