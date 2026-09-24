import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A company is not an account, and its slug is not a handle.
 *
 * A route that read a company checked the slug against HANDLE: an account's
 * shape, forty characters at most. IGDB's own go well past it
 * ("nintendo-ead-tokyo-software-development-group-no-dot-2" is fifty-four), so
 * those pages died with "That is not a company slug", over and over in the
 * production log, and the visitor got "something went wrong".
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

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
