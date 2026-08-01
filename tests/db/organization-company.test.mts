import assert from "node:assert/strict";
import test from "node:test";
import { hasDatabase, subjects, withRollback } from "./harness.mts";

/**
 * The link between an organization account and a catalogue company.
 *
 * Claiming is open, like the organization type itself. What is gated is the
 * display: the company page only names an account once a moderator has
 * verified it, which reuses the one check this project already has for "we
 * confirmed who this is" instead of inventing a second approval queue.
 *
 * That split is the whole feature, so it is what these tests pin. A squatter
 * may say they are Nintendo; they must not be able to make the Nintendo page
 * say it.
 */
test(
  "an unverified claim never reaches the company page",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.query(
        `update public.profiles
            set account_type = 'ORGANIZATION',
                organization_company_slug = 'test-company',
                verified = false, verified_at = null, verified_by = null
          where id = $1`,
        [ordinary.id],
      );

      await tx.become("anon");
      const shown = await tx.query(
        `select * from public.company_official_account('test-company')`,
      );
      assert.equal(
        shown.length,
        0,
        "an unverified account is presented as a company's official one",
      );
    });
  },
);

test(
  "a verified claim is shown",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // The mirror. Without it, a function that always returns nothing would
    // satisfy the test above while making the feature do nothing at all.
    await withRollback(async (tx) => {
      const { ordinary, moderator } = await subjects(tx);
      await tx.query(
        `update public.profiles
            set account_type = 'ORGANIZATION',
                organization_company_slug = 'test-company',
                verified = true, verified_at = now(), verified_by = $2
          where id = $1`,
        [ordinary.id, moderator?.id ?? null],
      );

      await tx.become("anon");
      const shown = await tx.query<{ username: string }>(
        `select * from public.company_official_account('test-company')`,
      );
      assert.equal(shown.length, 1, "a verified claim is not shown");
      assert.equal(shown[0].username, ordinary.username);
    });
  },
);

test(
  "the claim accepts a pasted page address, and refuses nonsense",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.become("authenticated", ordinary.id);

      // Copying the address of the page is what someone will actually do.
      assert.equal(
        await tx.attempt(
          `select public.set_account_type('ORGANIZATION', null, 'STUDIO', null, 'https://uloggd.com/pt-BR/company/square-enix?x=1')`,
        ),
        null,
      );
      await tx.query("reset role");
      const [row] = await tx.query<{ organization_company_slug: string }>(
        `select organization_company_slug from public.profiles where id = $1`,
        [ordinary.id],
      );
      assert.equal(row.organization_company_slug, "square-enix");

      await tx.become("authenticated", ordinary.id);
      assert.ok(
        await tx.attempt(
          `select public.set_account_type('ORGANIZATION', null, 'STUDIO', null, 'NOT A SLUG!!')`,
        ),
        "an invalid slug was stored",
      );
    });
  },
);

test(
  "returning to a person drops the claim",
  { skip: hasDatabase ? false : "DIRECT_URL is not set" },
  async () => {
    // Otherwise a demoted account keeps claiming a company, and a moderator
    // revoking the organization type would not revoke what it was claiming.
    await withRollback(async (tx) => {
      const { ordinary } = await subjects(tx);
      await tx.query(
        `update public.profiles
            set account_type = 'ORGANIZATION', organization_company_slug = 'test-company'
          where id = $1`,
        [ordinary.id],
      );
      await tx.query(
        `update public.profiles set account_type = 'PERSON' where id = $1`,
        [ordinary.id],
      );
      const [row] = await tx.query<{
        organization_company_slug: string | null;
      }>(
        `select organization_company_slug from public.profiles where id = $1`,
        [ordinary.id],
      );
      assert.equal(row.organization_company_slug, null);
    });
  },
);
