import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * What an organization account may claim about itself.
 *
 * The website is the part that needs care: it is rendered as a link other
 * people click, so anything that is not an ordinary https URL has to be
 * refused before it is stored rather than sanitised at render time in one of
 * the several places a profile appears.
 *
 * The demotion path is here because adding these columns nearly broke it.
 * `moderate_profile` sets the type to PERSON and clears only the tagline, so
 * the constraint would have rejected every revocation. A trigger clears the
 * rest, which is what this checks.
 */
const REJECTED_URLS = [
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "https://user:password@example.com",
  "https://localhost",
  "https://example",
  "ftp://example.com",
  "https://exa mple.com",
];

test(
  "an organization can state a category and a website",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);

      assert.equal(
        await tx.attempt(
          `select public.set_account_type('ORGANIZATION', 'Digital game store', 'STORE', 'nuuvem.com')`,
        ),
        null,
        "a valid organization could not be saved",
      );

      await tx.query("reset role");
      const [row] = await tx.query<{
        account_type: string;
        organization_category: string;
        organization_url: string;
      }>(
        `select account_type, organization_category, organization_url
         from public.profiles where id = $1`,
        [ordinary.id],
      );
      assert.equal(row.account_type, "ORGANIZATION");
      assert.equal(row.organization_category, "STORE");
      // A bare domain is what people type, so it is completed rather than
      // rejected on a technicality.
      assert.equal(row.organization_url, "https://nuuvem.com");
    });
  },
);

test(
  "a website that is not an ordinary https URL is refused",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);

      for (const url of REJECTED_URLS) {
        const code = await tx.attempt(
          `select public.set_account_type('ORGANIZATION', null, 'STORE', $1)`,
          [url],
        );
        assert.ok(
          code,
          `${url} was accepted, and it is rendered as a link people click`,
        );
      }

      assert.ok(
        await tx.attempt(
          `select public.set_account_type('ORGANIZATION', null, 'NOT_A_CATEGORY', null)`,
        ),
        "an invented category was accepted",
      );
    });
  },
);

test(
  "returning to a person clears every organization field",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);
      await tx.query(
        `select public.set_account_type('ORGANIZATION', 'Store', 'STORE', 'https://example.com')`,
      );
      await tx.query(`select public.set_account_type('PERSON')`);
      await tx.query("reset role");

      const [row] = await tx.query<{
        organization_tagline: string | null;
        organization_category: string | null;
        organization_url: string | null;
      }>(
        `select organization_tagline, organization_category, organization_url
         from public.profiles where id = $1`,
        [ordinary.id],
      );
      assert.deepEqual(
        [
          row.organization_tagline,
          row.organization_category,
          row.organization_url,
        ],
        [null, null, null],
        "a former organization kept fields that only organizations may have",
      );
    });
  },
);

test(
  "moderation can still revoke a claim",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // This is the case the new constraint nearly broke: the revocation path
    // knows nothing about these columns, so without the trigger it would fail
    // and moderators would lose the ability to demote an account at all.
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.query(
        `update public.profiles
            set account_type = 'ORGANIZATION',
                organization_tagline = 'Store',
                organization_category = 'STORE',
                organization_url = 'https://example.com'
          where id = $1`,
        [ordinary.id],
      );

      const code = await tx.attempt(
        `update public.profiles
            set account_type = 'PERSON', organization_tagline = null
          where id = $1`,
        [ordinary.id],
      );
      assert.equal(code, null, "revoking an organization claim now errors");

      const [row] = await tx.query<{
        organization_category: string | null;
        organization_url: string | null;
      }>(
        `select organization_category, organization_url
         from public.profiles where id = $1`,
        [ordinary.id],
      );
      assert.equal(row.organization_category, null);
      assert.equal(row.organization_url, null);
    });
  },
);

test(
  "the fields are readable by visitors, since they are public claims",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      await tx.become("anon");
      assert.equal(
        await tx.attempt(
          `select organization_category, organization_url from public.profiles limit 1`,
        ),
        null,
        "anonymous visitors cannot read what an organization says it is",
      );
    });
  },
);
