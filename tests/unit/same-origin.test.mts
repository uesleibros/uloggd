import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { sameOrigin } from "@/lib/api/same-origin";

/**
 * The check behind every cookie-authenticated write, measured against a proxy.
 *
 * Four routes had grown a copy of it that compared the browser's `Origin`
 * against `new URL(request.url).origin`. That works on a laptop, where the
 * two are the same string, and fails on the only deployment this has:
 * Cloudflare hands the request to a cleartext listener this process owns, so
 * `request.url` is that listener's address and never the public origin the
 * browser sent. Importing a Backloggd profile answered `invalid_origin` in
 * production and worked perfectly in development.
 */

function ask(headers: Record<string, string>) {
  // The internal address, which is the thing the broken copies compared to.
  return sameOrigin(
    new Request("http://10.0.0.4:3000/api/imports/backloggd/preview", {
      method: "POST",
      headers,
    }),
  );
}

test("a browser on the real site is let through a proxy", () => {
  assert.equal(
    ask({
      origin: "https://uloggd.com",
      "x-forwarded-host": "uloggd.com",
      host: "10.0.0.4:3000",
    }),
    true,
  );
});

test("another site is refused, however it reaches us", () => {
  assert.equal(
    ask({ origin: "https://evil.example", "x-forwarded-host": "uloggd.com" }),
    false,
  );
  // No forwarded host, so the listener's own is what it is compared against.
  assert.equal(
    ask({ origin: "https://evil.example", host: "uloggd.com" }),
    false,
  );
  assert.equal(
    ask({ origin: "not a url", "x-forwarded-host": "uloggd.com" }),
    false,
  );
});

test("a request with no Origin is judged by sec-fetch-site", () => {
  assert.equal(ask({ "sec-fetch-site": "same-origin" }), true);
  assert.equal(ask({}), true);
  // The copies this replaced returned true here without asking, which let a
  // cross-site form post that omits Origin reach routes that write.
  assert.equal(ask({ "sec-fetch-site": "cross-site" }), false);
});

test("nothing keeps a copy of it", () => {
  // `--untracked`, so the file that owns it counts on the run that adds it.
  const own = execSync(
    'git grep -l --untracked "function sameOrigin" -- app lib',
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  assert.deepEqual(
    own,
    ["lib/api/same-origin.ts"],
    "a route is deciding this for itself again",
  );
});
