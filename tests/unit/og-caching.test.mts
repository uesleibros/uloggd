import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Why share cards were slow, in one rule.
 *
 * Every card read through the cookie-bound Supabase client. Link previewers
 * send no cookies, so that bought nothing in access, but a `cookies()` call
 * opts a route out of every cache Next has: each unfurl re-ran the queries,
 * re-fetched the avatar and re-encoded a PNG from scratch.
 *
 * What actually fixed it was a header. Next answers a dynamic route with
 * `max-age=0, must-revalidate`, which tells every cache in the path to keep
 * nothing, so each paste of a link redrew the card from scratch. Measured:
 * still 1.0s per request after the cookie was gone and the queries were
 * cached, because neither of those is what a link previewer talks to.
 *
 * So three things have to hold. Every card carries a shared-cache header. No
 * card route, and nothing it calls, touches cookies. And the card routes stay
 * reachable without an account, since a previewer arrives with no session.
 */

const ROOT = process.cwd();

async function imageRoutes(): Promise<string[]> {
  const found: string[] = [];
  const stack = [path.join(ROOT, "app")];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/^(opengraph|twitter)-image\.tsx$/.test(entry.name))
        found.push(path.relative(ROOT, full));
    }
  }
  return found.sort();
}

test("every card answers with a shared-cache header", async () => {
  // One place sets it, so the assertion is that nothing builds an
  // `ImageResponse` without going through it.
  const card = await readFile(path.join(ROOT, "lib/og-card.tsx"), "utf8");
  assert.match(
    card,
    /s-maxage=\d+/,
    "the shared card no longer tells the CDN it may keep anything",
  );
  assert.match(
    card,
    /stale-while-revalidate=\d+/,
    "the hour boundary now costs somebody a full render",
  );

  const routes = await imageRoutes();
  const uncached: string[] = [];
  for (const route of routes) {
    const source = await readFile(path.join(ROOT, route), "utf8");
    if (!source.includes("new ImageResponse")) continue;
    if (!source.includes("ogHeaders")) uncached.push(route);
  }
  assert.deepEqual(
    uncached,
    [],
    `these draw their own image and forgot the cache header:\n${uncached.join("\n")}`,
  );
});

test("the card routes are reachable without an account", async () => {
  // A link previewer sends no cookies. The proxy answers anything outside its
  // public list with a redirect to the login page, and a card that redirects
  // is a link that unfurls as nothing.
  const proxy = await readFile(path.join(ROOT, "proxy.ts"), "utf8");
  const publicList = proxy.slice(
    proxy.indexOf("const publicSegments"),
    proxy.indexOf("const knownSegments"),
  );
  for (const segment of ["opengraph-image", "twitter-image"])
    assert.ok(
      publicList.includes(`"${segment}"`),
      `/${segment} is not public, so previewers get the login page`,
    );
});

test("no card route sets a cache option Next will reject", async () => {
  // The first attempt at this added `export const revalidate` to every card
  // and failed the build on all thirteen: metadata image routes do not take
  // route segment config. Caching them is the absence of a cookie, not the
  // presence of a setting.
  const routes = await imageRoutes();
  assert.ok(routes.length >= 20, `only found ${routes.length} card routes`);
  const offenders: string[] = [];
  for (const route of routes) {
    const source = await readFile(path.join(ROOT, route), "utf8");
    if (/export const (revalidate|dynamic|fetchCache)\b/.test(source))
      offenders.push(route);
  }
  assert.deepEqual(
    offenders,
    [],
    `these export a route config the build refuses:\n${offenders.join("\n")}`,
  );
});

test("no card route reads cookies", async () => {
  const routes = await imageRoutes();
  const offenders: string[] = [];
  for (const route of routes) {
    const source = await readFile(path.join(ROOT, route), "utf8");
    // `getSupabase` and `createClient` from the server module both call
    // `cookies()`, and one call is enough to make the route uncacheable.
    if (/getSupabase|supabase\/server|next\/headers/.test(source))
      offenders.push(route);
  }
  assert.deepEqual(
    offenders,
    [],
    `these opt out of caching by reading cookies:\n${offenders.join("\n")}`,
  );
});

test("nothing the cards call reaches for cookies either", async () => {
  // The route can be clean while a helper it calls is not, which is how the
  // year card stayed uncacheable after its own file looked fine.
  for (const helper of [
    "lib/og-card.tsx",
    "lib/og-image-source.ts",
    "lib/og-workspace-card.tsx",
    "lib/year-wrapped.ts",
  ]) {
    const source = await readFile(path.join(ROOT, helper), "utf8");
    assert.ok(
      !/getSupabase|supabase\/server|next\/headers/.test(source),
      `${helper} reads cookies, so every card that calls it is uncacheable`,
    );
  }
});

test("the profile card shows no level and no check mark", async () => {
  // A card is read at a glance in a group chat: the name, the picture and the
  // counts carry it. The level also cost six table reads of its own.
  const source = await readFile(
    path.join(ROOT, "app/[lang]/u/[username]/opengraph-image.tsx"),
    "utf8",
  );
  assert.ok(
    !/getProfileLevel|level:/.test(source),
    "the profile card is drawing a level again, and paying for it",
  );
  assert.ok(
    !/verified/.test(source),
    "the profile card is drawing a check mark again",
  );
});
