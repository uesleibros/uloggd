import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The internal API call is cleartext, retried, and never routed through the edge.
 *
 * Three deploys were lost here. The first built the origin from the request host
 * and guessed the scheme, defaulting to https for anything that was not
 * localhost, so every render opened a TLS handshake against Square Cloud's
 * cleartext listener: ERR_SSL_PACKET_LENGTH_TOO_LONG. The second assumed the
 * loopback, and the process binds to its hostname rather than to every
 * interface, so nothing was listening on 127.0.0.1:80: ECONNREFUSED. The third
 * fixed the pages and left the proxy fetching `request.nextUrl.origin`, which
 * behind the edge is https://uloggd.com, so the TLS error came back on every
 * signed-in request while the pages themselves were fine.
 *
 * These are source checks rather than behaviour ones because the modules read
 * `next/headers` and the request, which only exist inside a request. What they
 * guard is the part that broke three times: the scheme is never a guess, no one
 * address is trusted, and nobody gets their own private way in.
 */

const ROOT = process.cwd();

function read(file: string) {
  return readFile(path.join(ROOT, file), "utf8");
}

/** The body of a top level function, up to its closing brace. */
function bodyOf(source: string, opening: string) {
  const start = source.indexOf(opening);
  assert.notEqual(start, -1, `${opening} is gone`);
  const from = source.slice(start);
  return from.slice(0, from.indexOf("\n}"));
}

test("the internal origin is cleartext, never a guessed scheme", async () => {
  const source = await read("lib/api-origin.ts");
  const candidates = bodyOf(source, "export function candidateOrigins");

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
});

test("a redirect counts as a wrong address rather than a route to follow", async () => {
  // This is what makes "cleartext only" true instead of intended: an http call
  // that follows a 301 to https is how the TLS error came back a third time.
  const attempt = bodyOf(
    await read("lib/api-origin.ts"),
    "export async function reachApi",
  );

  assert.match(
    attempt,
    /redirect: "manual"/,
    "the internal fetch must not follow a redirect out of cleartext",
  );
  assert.match(
    attempt,
    /status >= 300 && \w+\.status < 400/,
    "a 3xx is a proxy in the way, so the next address gets a turn",
  );
});

test("the candidates run from the bound address out to the public one", async () => {
  const candidates = bodyOf(
    await read("lib/api-origin.ts"),
    "export function candidateOrigins",
  );

  const pinned = candidates.indexOf("ULOGGD_INTERNAL_ORIGIN");
  const bound = candidates.indexOf("process.env.HOSTNAME");
  const loopback = candidates.indexOf("127.0.0.1");
  const sixth = candidates.indexOf("[::1]");
  const arrived = candidates.lastIndexOf("${host}");

  for (const [what, at] of [
    ["an explicit internal origin", pinned],
    ["the address the server bound to", bound],
    ["the IPv4 loopback", loopback],
    ["the IPv6 loopback", sixth],
    ["the request's own host", arrived],
  ] as const)
    assert.notEqual(at, -1, `${what} has to be a candidate`);

  assert.ok(
    pinned < bound && bound < loopback && loopback < sixth && sixth < arrived,
    "most direct first: a pinned origin, HOSTNAME, both loopbacks, then the host",
  );
});

test("a refused connection moves on instead of taking the render down", async () => {
  const source = await read("lib/api-origin.ts");
  const attempt = bodyOf(source, "export async function reachApi");

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
  assert.match(
    attempt,
    /console\.error/,
    "two outages were spent inferring this from silence: say which addresses failed",
  );

  const kinds = bodyOf(source, "function unreachable");
  for (const code of [
    "ECONNREFUSED",
    "ENOTFOUND",
    "EHOSTUNREACH",
    "ERR_SSL_PACKET_LENGTH_TOO_LONG",
  ])
    assert.match(kinds, new RegExp(code), `${code} means try the next address`);
});

test("the port comes from PORT first, then the host, then Next's default", async () => {
  const body = bodyOf(await read("lib/api-origin.ts"), "function servingPort");

  assert.match(body, /process\.env\.PORT/);
  assert.match(body, /split\(":"\)\[1\]/);
  assert.match(body, /"3000"/);
});

test("the proxy asks the internal address, not the one the visitor typed", async () => {
  const proxy = await read("proxy.ts");

  assert.match(
    proxy,
    /apiReader\(\s*orderedOrigins\(request\.nextUrl\.host\)/,
    "the proxy shares the search; its own origin is the edge, which is https",
  );
  // `nextUrl.origin` is still right for the OAuth redirects, which are answers
  // to a browser. It is never right for a call this process makes to itself.
  const selfCalls = proxy
    .split("\n")
    .filter(
      (line) =>
        line.includes("nextUrl.origin") && !line.trimStart().startsWith("//"),
    );
  assert.deepEqual(
    selfCalls,
    [],
    "no line in the proxy may build an API call from the public origin",
  );
});

test("everything shares one way in to the API", async () => {
  // `lib/api-request.ts` was a second implementation with no retry and with
  // redirects followed. Both callers that mattered used it, and both broke.
  const og = await read("lib/og-data.ts");
  assert.match(og, /apiReader/);
  assert.match(og, /serverApiOrigins/);
  assert.doesNotMatch(og, /https?:\/\/\$\{/);
  assert.doesNotMatch(
    og,
    /api-request/,
    "the second implementation is gone; do not bring it back",
  );

  const server = await read("lib/api-server.ts");
  assert.match(server, /from "@\/lib\/api-origin"/);
  assert.doesNotMatch(
    server,
    /fetch\(/,
    "one module reaches the API, and this is not it",
  );
});
