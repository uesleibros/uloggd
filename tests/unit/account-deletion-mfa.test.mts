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
 * `getAuthenticatorAssuranceLevel()` decides whether a factor is enrolled from
 * `session.user.factors`, which is read out of the cookie, so anyone able to
 * edit their own cookie could drop the field and walk past the challenge. The
 * three callers that used it now share one helper that asks the auth server
 * instead.
 */
const ROUTE = "app/api/account/route.ts";
const HELPER = "lib/mfa-challenge.ts";
const CALLERS = [ROUTE, "proxy.ts", "app/[lang]/auth/mfa/page.tsx"];

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

test("no gate reads the assurance level from the session", async () => {
  for (const file of [...CALLERS, HELPER]) {
    const source = await read(file);
    assert.ok(
      !/getAuthenticatorAssuranceLevel/.test(source),
      `${file} is back on the session-derived assurance level, which the cookie holder controls`,
    );
  }
});

test("every gate goes through the shared helper", async () => {
  for (const file of CALLERS) {
    const source = await read(file);
    assert.match(
      source,
      /mfaChallengeRequired/,
      `${file} decides the second factor on its own instead of sharing one rule`,
    );
  }
});

test("the helper asks the auth server and a verified token", async () => {
  const helper = await read(HELPER);
  assert.match(
    helper,
    /auth\.getUser\(\)/,
    "enrolment no longer comes from the auth server",
  );
  assert.match(helper, /factors/, "enrolment is not read from the user object");
  assert.match(
    helper,
    /getClaims\(\)/,
    "the level no longer comes from a signature-verified token",
  );
  // Matches `coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'` in the trigger,
  // so a missing claim is the weaker level rather than a pass.
  assert.match(
    helper,
    /aal \?\? "aal1"/,
    "a missing aal claim is not defaulted to the weaker level",
  );
});

test("an unanswerable check refuses instead of passing", async () => {
  const helper = await read(HELPER);
  assert.match(
    helper,
    /return null/,
    "the helper no longer reports that it could not decide",
  );
  const route = await read(ROUTE);
  const refusal = route.indexOf("assurance_check_failed");
  const destroy = route.indexOf("deleteUser");
  assert.ok(
    refusal > 0 && refusal < destroy,
    "an unreadable token no longer stops the deletion",
  );
  assert.match(
    route,
    /challenge === null/,
    "the route treats an undecided check as permission to proceed",
  );
});

test("the gate is checked before the account is deleted", async () => {
  const route = await read(ROUTE);
  const gate = route.indexOf("mfa_required");
  const destroy = route.indexOf("deleteUser");
  assert.ok(gate > 0, "the route no longer refuses a session without a factor");
  assert.ok(
    gate < destroy,
    "the account is deleted before the second factor is checked",
  );
});
