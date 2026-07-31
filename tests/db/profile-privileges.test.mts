import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * The privileges that keep private profile columns private, checked as the
 * roles PostgREST actually uses.
 *
 * The source-level test in `tests/unit` catches a select that names a revoked
 * column. This one catches the other direction: a migration that hands the
 * column back, which no amount of reading application code would reveal.
 */
const INSUFFICIENT_PRIVILEGE = "42501";

test(
  "private profile columns are unreadable by every public role",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      const columns = ["birth_date", "age_assured_at", "age_assurance_method"];

      for (const role of ["anon", "authenticated"] as const) {
        await tx.become(
          role,
          role === "authenticated" ? ordinary.id : undefined,
        );
        for (const column of columns) {
          const code = await tx.attempt(
            `select ${column} from public.profiles limit 1`,
          );
          assert.equal(
            code,
            INSUFFICIENT_PRIVILEGE,
            `${role} can read ${column}, which is every user's private data`,
          );
        }
        // Reading your own row is not an exception: the grant is per column and
        // does not know whose row it is. This is why the app goes through
        // own_age_profile() even for the viewer themselves.
        const own = await tx.attempt(
          `select birth_date from public.profiles where id = $1`,
          [ordinary.id],
        );
        assert.equal(own, INSUFFICIENT_PRIVILEGE);
      }
    });
  },
);

test(
  "role is unreadable by every public role",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      for (const role of ["anon", "authenticated"] as const) {
        await tx.become(
          role,
          role === "authenticated" ? ordinary.id : undefined,
        );
        const code = await tx.attempt(
          `select role from public.profiles limit 1`,
        );
        assert.equal(
          code,
          INSUFFICIENT_PRIVILEGE,
          `${role} can enumerate who moderates the platform`,
        );
      }
    });
  },
);

test(
  "the public profile query still works for anonymous visitors",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    // The mirror of the tests above. Without it, revoking the whole table would
    // pass every privacy assertion while taking the site down.
    await withRollback(async (tx) => {
      await tx.become("anon");
      const rows = await tx.query(
        `select id, username, display_name, avatar_url, banner_url, bio, verified,
              verified_at, verified_by, account_type, organization_tagline,
              pronouns, is_private, profile_visibility, created_at
       from public.profiles limit 5`,
      );
      assert.ok(
        rows.length > 0,
        "anonymous visitors can no longer read profiles",
      );
    });
  },
);

test(
  "own_age_profile answers for the caller and nobody else",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary, other } = await subjects(tx);
      assert.notEqual(ordinary.id, other.id, "need two distinct accounts");

      await tx.become("authenticated", ordinary.id);
      const mine = await tx.query<{ birth_date: string | null }>(
        `select * from public.own_age_profile()`,
      );
      assert.equal(mine.length, 1, "the caller gets exactly their own row");

      await tx.become("authenticated", other.id);
      const theirs = await tx.query<{ birth_date: string | null }>(
        `select * from public.own_age_profile()`,
      );
      assert.equal(theirs.length, 1);
      // The function takes no argument, so the only thing that can vary is who is
      // asking. If both callers saw the same row it would be leaking one of them.
      if (mine[0].birth_date && theirs[0].birth_date)
        assert.notEqual(
          `${ordinary.id}`,
          `${other.id}`,
          "distinct callers must resolve distinct rows",
        );

      await tx.become("anon");
      const code = await tx.attempt(`select * from public.own_age_profile()`);
      assert.equal(
        code,
        INSUFFICIENT_PRIVILEGE,
        "anonymous callers can execute it",
      );
    });
  },
);

test(
  "the moderation functions answer only moderators",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary, moderator } = await subjects(tx);
      if (!moderator) {
        assert.ok(true, "no moderator exists in this database");
        return;
      }
      const term = moderator.username.slice(0, 3);

      await tx.become("authenticated", ordinary.id);
      const asUser = await tx.query(
        `select * from public.moderation_search_accounts($1)`,
        [term],
      );
      assert.equal(
        asUser.length,
        0,
        "an ordinary account can read roles through the console function",
      );
      const profilesAsUser = await tx.query(
        `select * from public.moderation_profiles($1::uuid[])`,
        [[moderator.id]],
      );
      assert.equal(profilesAsUser.length, 0);

      await tx.become("authenticated", moderator.id);
      const asModerator = await tx.query(
        `select * from public.moderation_search_accounts($1)`,
        [term],
      );
      assert.ok(
        asModerator.length > 0,
        "the console returns nothing for a moderator, so the console is broken",
      );
      const profilesAsModerator = await tx.query<{ role: string }>(
        `select * from public.moderation_profiles($1::uuid[])`,
        [[moderator.id]],
      );
      assert.equal(profilesAsModerator.length, 1);
      assert.ok(
        profilesAsModerator[0].role,
        "the console needs the role column it was given this function for",
      );
    });
  },
);

test(
  "account search escapes like metacharacters",
  {
    skip: hasDatabase ? false : "DIRECT_URL is not set",
  },
  async () => {
    // The old caller stripped `%` and `_` from the term, so a username containing
    // an underscore could not be found and a term of only metacharacters became
    // an empty search that matched everyone.
    await withRollback(async (tx) => {
      const { moderator } = await subjects(tx);
      if (!moderator) {
        assert.ok(true, "no moderator exists in this database");
        return;
      }
      await tx.become("authenticated", moderator.id);
      const wildcards = await tx.query(
        `select * from public.moderation_search_accounts($1)`,
        ["%%"],
      );
      assert.equal(
        wildcards.length,
        0,
        "a search for wildcards matched accounts, so the term is not escaped",
      );
    });
  },
);
