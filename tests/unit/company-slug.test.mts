import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A company is not an account, and its slug is not a handle.
 *
 * The company page reads the official account for the company it is drawing,
 * and that route checked the slug against HANDLE: an account's shape, forty
 * characters at most. IGDB's own go well past it
 * ("nintendo-ead-tokyo-software-development-group-no-dot-2" is fifty-four), so
 * those pages died with "That is not a company slug", over and over in the
 * production log, and the visitor got "something went wrong".
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("the company route checks a slug, not a handle", async () => {
  const route = await read("app/api/v1/companies/[slug]/account/route.ts");
  assert.match(route, /"company slug", SLUG/);
  assert.doesNotMatch(route, /HANDLE/);
});

test("the slug pattern takes the long ones IGDB hands out", async () => {
  const source = await read("lib/api/path.ts");
  const line = /export const SLUG = (\/.+\/);/.exec(source);
  assert.ok(line, "lib/api/path.ts exports SLUG");
  const pattern = new RegExp(line[1].slice(1, -1));
  for (const slug of [
    "nintendo",
    "nintendo-ead-tokyo-software-development-group-no-dot-2",
    "a".repeat(255),
  ])
    assert.ok(pattern.test(slug), slug);
  for (const refused of ["", "-leading-dash", "Upper", "with space", "a/b"])
    assert.ok(!pattern.test(refused), refused || "(empty)");
});

test("the official account is a badge, not the page", async () => {
  const page = await read("app/[lang]/publisher/[slug]/page.tsx");
  // Wrapped, so a failure there leaves the company drawn rather than
  // taking the whole page down with it.
  assert.match(page, /settleServer\(\s*serverApi\.get<CompanyAccount>/);
});
