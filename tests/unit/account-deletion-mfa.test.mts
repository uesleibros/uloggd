import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The second factor standing between a stolen session and a deleted account.
 *
 * Deletion runs through the admin client, which is service role: it passes
 * over row-level security and over the `require_mfa_for_mutation` triggers
 * that protect every other write. So unlike the rest of the app, this check is
 * not defence in depth. It is the only gate, on an action nothing undoes.
 *
 * That is why the inputs have to be authentic ones. `getAuthenticatorAssurance
 * Level()` computes whether a factor is enrolled from `session.user.factors`,
 * which is read out of the cookie, so anyone able to edit their own cookie
 * could drop the field and walk past the challenge. The enrolment now comes
 * from `getUser()`, which asks the auth server, and the level from
 * `getClaims()`, which verifies the token signature.
 */
const ROUTE = "app/api/account/route.ts";

async function source() {
  return readFile(path.join(process.cwd(), ROUTE), "utf8");
}

test("the MFA gate never reads the assurance level from the session", async () => {
  const route = await source();
  assert.ok(
    !/getAuthenticatorAssuranceLevel/.test(route),
    "the route is back on the session-derived assurance level, which the cookie holder controls",
  );
});

test("enrolment comes from the auth server and the level from a verified token", async () => {
  const route = await source();
  assert.match(
    route,
    /auth\.getUser\(\)/,
    "the route no longer asks the auth server who the caller is",
  );
  assert.match(
    route,
    /user\.factors/,
    "enrolment is not read from the authenticated user object",
  );
  assert.match(
    route,
    /getClaims\(\)/,
    "the assurance level no longer comes from a signature-verified token",
  );
  // Matches `coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'` in the database
  // trigger, so a missing claim is treated as the weaker level rather than
  // waved through.
  assert.match(
    route,
    /claims\.aal \?\? "aal1"/,
    "a missing aal claim is not defaulted to the weaker level",
  );
});

test("the gate is checked before the account is deleted", async () => {
  const route = await source();
  const gate = route.indexOf("mfa_required");
  const destroy = route.indexOf("deleteUser");
  assert.ok(gate > 0, "the route no longer refuses a session without a factor");
  assert.ok(
    gate < destroy,
    "the account is deleted before the second factor is checked",
  );
});

test("a failed check refuses rather than proceeding", async () => {
  const route = await source();
  const failure = route.indexOf("assurance_check_failed");
  const destroy = route.indexOf("deleteUser");
  assert.ok(
    failure > 0 && failure < destroy,
    "an unreadable token no longer stops the deletion",
  );
});
