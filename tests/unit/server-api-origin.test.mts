import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The server asks its own API over the loopback, in cleartext.
 *
 * The first version of this built the origin from the request's host and
 * guessed the scheme, defaulting to https for anything that was not localhost.
 * Square Cloud answers plain HTTP on port 80, so every render opened a TLS
 * handshake against a cleartext listener and died with
 * ERR_SSL_PACKET_LENGTH_TOO_LONG. The whole site was down.
 *
 * This is a source check rather than a behaviour one because the function
 * reads `next/headers`, which only exists inside a request. What it guards is
 * the part that broke: the scheme must not be a guess, and the target must not
 * be the public name.
 */

const ROOT = process.cwd();

test("the internal origin is loopback http, never a guessed scheme", async () => {
  const source = await readFile(
    path.join(ROOT, "lib/api-server.ts"),
    "utf8",
  );

  const origin = source.slice(
    source.indexOf("export async function serverApiOrigin"),
  );
  const body = origin.slice(0, origin.indexOf("\n}"));

  assert.match(
    body,
    /http:\/\/127\.0\.0\.1:/,
    "the internal call has to go to the loopback in cleartext",
  );
  assert.doesNotMatch(
    body,
    /https/,
    "nothing about the internal origin may be https: the listener is cleartext",
  );
  assert.doesNotMatch(
    body,
    /x-forwarded-proto/,
    "the scheme is not the deployment's to tell us any more",
  );
});

test("the port comes from PORT first, then the host, then Next's default", async () => {
  const source = await readFile(path.join(ROOT, "lib/api-server.ts"), "utf8");
  const helper = source.slice(source.indexOf("function servingPort"));
  const body = helper.slice(0, helper.indexOf("\n}"));

  assert.match(body, /process\.env\.PORT/);
  assert.match(body, /split\(":"\)\[1\]/);
  assert.match(body, /"3000"/);
});

test("nothing else builds an absolute origin for the internal call", async () => {
  // `lib/og-data.ts` shares the helper rather than rolling its own, which is
  // what kept this fix to one place.
  const og = await readFile(path.join(ROOT, "lib/og-data.ts"), "utf8");
  assert.match(og, /serverApiOrigin/);
  assert.doesNotMatch(og, /https?:\/\/\$\{/);
});
