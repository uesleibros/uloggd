import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The route that hands a session to the end-to-end browser.
 *
 * It exists because the sign-in form cannot be driven in CI: it requires a
 * Turnstile token and the workflow has no Turnstile key, so the field renders
 * as unconfigured and the button never submits.
 *
 * The route converts tokens the caller already holds into cookies. That grants
 * nothing new, since anybody holding a valid access token can already act as
 * its owner by sending it. What would be serious is the route minting one, or
 * answering at all in a real deployment, so both are pinned here.
 */
const ROUTE = "app/api/e2e/session/route.ts";

test("the session route does not exist outside the test harness", async () => {
  const source = await readFile(path.join(process.cwd(), ROUTE), "utf8");
  // The gate, and the fact that it comes before anything else runs.
  const gate = source.indexOf('process.env.ULOGGD_E2E !== "1"');
  const body = source.indexOf("request.json()");
  assert.ok(gate > 0, "the route no longer checks the harness flag");
  assert.ok(
    gate < body,
    "the flag is checked after the request is read, so the route does work in production",
  );
  assert.match(
    source.slice(gate, gate + 120),
    /status: 404/,
    "the route announces itself instead of answering as if it were not there",
  );
});

test("the session route cannot mint a session, only carry one", async () => {
  const source = await readFile(path.join(process.cwd(), ROUTE), "utf8");
  // A service key here would turn "hands over a token you already have" into
  // "issues a token for anybody", which is a different thing entirely.
  assert.ok(
    !/SUPABASE_SECRET_KEY|createAdminClient|admin\./.test(source),
    "the session route reaches for admin powers",
  );
  assert.ok(
    !/signInWith|generateLink|createUser/.test(source),
    "the session route signs somebody in rather than carrying a token",
  );
  assert.match(source, /setSession/, "the route no longer sets the session");
});

test("the signed-in specs skip rather than fail without credentials", async () => {
  // A fork, or this repository before the secret is added, has no service key.
  // Skipping keeps the rest of the suite meaningful; failing would train
  // everybody to ignore a red build.
  const fixture = await readFile(
    path.join(process.cwd(), "tests/e2e/fixtures/account.ts"),
    "utf8",
  );
  assert.match(fixture, /export const canSignIn/);
  const spec = await readFile(
    path.join(process.cwd(), "tests/e2e/signed-in-flows.spec.ts"),
    "utf8",
  );
  assert.match(
    spec,
    /test\.skip\(\s*!canSignIn/,
    "the signed-in specs fail instead of skipping when there is no key",
  );
});

test("every signed-in spec cleans up the account it made", async () => {
  const spec = await readFile(
    path.join(process.cwd(), "tests/e2e/signed-in-flows.spec.ts"),
    "utf8",
  );
  // These write to the real project. An account left behind is rubbish in
  // somebody's production database, so the teardown has to run even when a
  // spec fails, which is what `afterAll` gives.
  assert.match(spec, /test\.afterAll\(/, "there is no teardown at all");
  assert.match(
    spec,
    /destroyAccount/,
    "the teardown does not delete the accounts",
  );
  const created = (spec.match(/createAccount\(/g) ?? []).length;
  const tracked = (spec.match(/accounts\.push\(/g) ?? []).length;
  assert.equal(
    created,
    tracked,
    `${created} accounts are created but ${tracked} are registered for cleanup`,
  );
});
