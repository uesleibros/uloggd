import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The public API's three lists have to say the same thing.
 *
 * The scopes a key may hold are a check constraint in the database, the scopes
 * a route asks for are strings in that route, and the scopes a person reads
 * about are entries in the documentation. Nothing makes them agree on its own,
 * and each way of disagreeing is its own kind of wrong: a route asking for a
 * scope no key can hold is unreachable, a documented endpoint that does not
 * exist is a lie, and an endpoint nobody documented is one nobody can find.
 */

const ROOT = process.cwd();
const ROUTES = path.join(ROOT, "app/api/v1");
const MIGRATION = "supabase/migrations/20260905000100_api_keys.sql";
const REFERENCE = "lib/docs/api-reference.ts";

const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

async function routeFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await routeFiles(full)));
    else if (entry.name === "route.ts") found.push(full);
  }
  return found;
}

/** `app/api/v1/games/[slug]/route.ts` is `/api/v1/games/{slug}`. */
function pathOf(file: string) {
  return (
    "/api/v1" +
    path
      .relative(ROUTES, path.dirname(file))
      .split(path.sep)
      .filter(Boolean)
      .map((part) =>
        part.startsWith("[") ? `{${part.slice(1, -1)}}` : part,
      )
      .reduce((joined, part) => `${joined}/${part}`, "")
  );
}

async function endpointsInCode() {
  const files = await routeFiles(ROUTES);
  const found: { method: string; path: string; scopes: string[] }[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const methods = [
      ...source.matchAll(/export const (GET|POST|PATCH|PUT|DELETE)\b/g),
    ].map((match) => match[1]);
    const scopes = [...source.matchAll(/scope: "([a-z]+\.[a-z]+)"/g)].map(
      (match) => match[1],
    );
    for (const method of methods)
      found.push({ method, path: pathOf(file), scopes });
  }
  return found;
}

async function documented() {
  const source = await read(REFERENCE);
  const blocks = [
    ...source.matchAll(
      /method: "(GET|POST|PATCH|PUT|DELETE)",\s*\n\s*path: "([^"]+)"/g,
    ),
  ];
  return blocks.map((match) => ({ method: match[1], path: match[2] }));
}

async function allowedScopes() {
  const source = await read(MIGRATION);
  const block = /scopes <@ array\[([\s\S]*?)\]::text\[\]/.exec(source);
  assert.ok(block, "the migration still states the scopes it allows");
  return new Set(
    [...block[1].matchAll(/'([a-z]+\.[a-z]+)'/g)].map((match) => match[1]),
  );
}

test("every scope a route asks for is one a key may hold", async () => {
  const allowed = await allowedScopes();
  for (const endpoint of await endpointsInCode())
    for (const scope of endpoint.scopes)
      assert.ok(
        allowed.has(scope),
        `${endpoint.method} ${endpoint.path} asks for ${scope}, which the api_keys constraint refuses`,
      );
});

test("every scope the documentation names is one a key may hold", async () => {
  const allowed = await allowedScopes();
  const source = await read(REFERENCE);
  for (const [, scope] of source.matchAll(/scope: "([a-z]+\.[a-z]+)"/g))
    assert.ok(
      allowed.has(scope),
      `the documentation offers ${scope}, which the api_keys constraint refuses`,
    );
});

test("every route is documented, and every documented route exists", async () => {
  const inCode = new Set(
    (await endpointsInCode()).map((one) => `${one.method} ${one.path}`),
  );
  const inDocs = new Set(
    (await documented()).map((one) => `${one.method} ${one.path}`),
  );

  for (const endpoint of inCode)
    assert.ok(inDocs.has(endpoint), `${endpoint} exists but is not documented`);
  for (const endpoint of inDocs)
    assert.ok(inCode.has(endpoint), `${endpoint} is documented but has no route`);
});

test("the documentation's own section list covers every resource", async () => {
  const source = await read(REFERENCE);
  const slugs = [...source.matchAll(/slug: "([a-z-]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(slugs.length > 0, "there are resources to document");
  assert.equal(
    new Set(slugs).size,
    slugs.length,
    "two resources share a slug, so one of them is unreachable",
  );
  assert.match(
    source,
    /DOCS_SECTIONS = new Set\(\[\s*\.\.\.DOCS_GUIDES,\s*\.\.\.RESOURCES\.map/,
    "the section list is derived from the resources rather than repeated",
  );
});

test("the key lookup stays out of reach of anyone but the service role", async () => {
  const source = await read(MIGRATION);
  assert.match(
    source,
    /revoke all on function public\.resolve_api_key\(text\)\s*\n\s*from public, anon, authenticated;/,
    "resolve_api_key is revoked from every caller that is not the service role",
  );
  assert.match(
    source,
    /grant execute on function public\.resolve_api_key\(text\) to service_role;/,
  );
  assert.ok(
    !/grant select \([^)]*token_hash/.test(source),
    "token_hash is never granted, so a select that reaches it is refused",
  );
});
