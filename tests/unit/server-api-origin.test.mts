import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The server asks its own API in cleartext, at an address it found by trying.
 *
 * Two deploys were lost here. The first built the origin from the request's
 * host and guessed the scheme, defaulting to https for anything that was not
 * localhost, so every render opened a TLS handshake against Square Cloud's
 * cleartext listener on port 80: ERR_SSL_PACKET_LENGTH_TOO_LONG. The second
 * assumed the loopback, and the process binds to its hostname rather than to
 * every interface, so nothing was listening on 127.0.0.1:80: ECONNREFUSED.
 *
 * These are source checks rather than behaviour ones because the module reads
 * `next/headers`, which only exists inside a request. What they guard is the
 * part that broke twice: the scheme is never a guess, and no single address is
 * trusted to be the right one.
 */

const ROOT = process.cwd();

function read() {
  return readFile(path.join(ROOT, "lib/api-server.ts"), "utf8");
}

/** The body of a top level function, up to its closing brace. */
function bodyOf(source: string, opening: string) {
  const start = source.indexOf(opening);
  assert.notEqual(start, -1, `${opening} is gone from lib/api-server.ts`);
  const from = source.slice(start);
  return from.slice(0, from.indexOf("\n}"));
}

test("the internal origin is cleartext, never a guessed scheme", async () => {
  const source = await read();
  const candidates = bodyOf(source, "function candidateOrigins");

  assert.doesNotMatch(
    candidates,
    /https/,
    "nothing about the internal origin may be https: the listener is cleartext",
  );
  assert.doesNotMatch(
    candidates,
    /x-forwarded-proto/,
    "the scheme is not the deployment's to tell us any more",
  );
  assert.doesNotMatch(
    bodyOf(source, "export async function serverApiOrigin"),
    /https/,
    "the exported origin may not reintroduce a scheme of its own",
  );
});

test("the candidates run from the bound address out to the public one", async () => {
  const source = await read();
  const candidates = bodyOf(source, "function candidateOrigins");

  const bound = candidates.indexOf("process.env.HOSTNAME");
  const loopback = candidates.indexOf("127.0.0.1");
  const arrived = candidates.lastIndexOf("${host}");

  assert.notEqual(bound, -1, "the address the server bound to has to be tried");
  assert.notEqual(loopback, -1, "the loopback has to be tried");
  assert.notEqual(arrived, -1, "the request's own host is the last resort");
  assert.ok(
    bound < loopback && loopback < arrived,
    "most direct first: HOSTNAME, then the loopback, then the request's host",
  );
});

test("a refused connection moves on instead of taking the render down", async () => {
  const source = await read();
  const attempt = bodyOf(source, "async function request");

  assert.match(attempt, /for \(const origin of origins\)/);
  assert.match(
    attempt,
    /reachable = origin/,
    "the address that answered is remembered, so the cost is paid once",
  );
  assert.match(
    attempt,
    /if \(!unreachable\(error\)\) throw error/,
    "an HTTP answer is an answer: only a dead connection tries the next address",
  );

  const kinds = bodyOf(source, "function unreachable");
  for (const code of [
    "ECONNREFUSED",
    "ENOTFOUND",
    "ERR_SSL_PACKET_LENGTH_TOO_LONG",
  ]) {
    assert.match(kinds, new RegExp(code), `${code} means try the next address`);
  }
});

test("the port comes from PORT first, then the host, then Next's default", async () => {
  const source = await read();
  const body = bodyOf(source, "function servingPort");

  assert.match(body, /process\.env\.PORT/);
  assert.match(body, /split\(":"\)\[1\]/);
  assert.match(body, /"3000"/);
});

test("nothing else builds an absolute origin for the internal call", async () => {
  // `lib/og-data.ts` shares the helper rather than rolling its own, which is
  // what kept both fixes to one place.
  const og = await readFile(path.join(ROOT, "lib/og-data.ts"), "utf8");
  assert.match(og, /serverApiOrigin/);
  assert.doesNotMatch(og, /https?:\/\/\$\{/);
});
