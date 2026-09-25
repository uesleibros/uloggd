import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A name nobody holds is a page that says so, not an error.
 *
 * Every page under a `[username]` route asks two things at once: whether the
 * account exists, and whatever the page is about. The second one is asked by
 * name, so for a handle nobody holds the API answers 404 and `serverApi`
 * raises it. Raised out of a `Promise.all`, that threw before the line below
 * could call `notFound()`, and a mistyped handle got "something went wrong"
 * instead of "this account does not exist".
 *
 * So a read that travels beside the existence check has to be settled. One
 * that runs after it does not, because by then the account is known to exist,
 * and a failure there is a real one.
 */

const ROOT = process.cwd();
const PAGES = path.join(ROOT, "app", "[lang]");

async function usernamePages(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await usernamePages(full)));
    else if (entry.name === "page.tsx" && full.includes("[username]"))
      found.push(full);
  }
  return found;
}

/** The text between the brackets of the `Promise.all([...])` at `from`. */
function bracketed(source: string, from: number) {
  const open = source.indexOf("[", from);
  if (open < 0) return "";
  let depth = 0;
  for (let at = open; at < source.length; at += 1) {
    if (source[at] === "[") depth += 1;
    else if (source[at] === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(open, at);
    }
  }
  return source.slice(open);
}

test("a read beside the existence check cannot throw the page down", async () => {
  const pages = await usernamePages(PAGES);
  // If this ever finds nothing, the guard is passing for the wrong reason.
  assert.ok(pages.length >= 5, `only found ${pages.length} pages to check`);

  for (const page of pages) {
    const source = await readFile(page, "utf8");
    const relative = path.relative(ROOT, page);
    let at = source.indexOf("Promise.all");
    while (at >= 0) {
      const group = bracketed(source, at);
      // Only the group that asks whether the account exists.
      if (group.includes("getPublicProfile(")) {
        for (const call of group.matchAll(/(\w+\()?\s*serverApi\.get/g)) {
          assert.equal(
            call[1],
            "settleServer(",
            `${relative} reads beside getPublicProfile without settling it, ` +
              "so a handle nobody holds throws instead of reaching notFound()",
          );
        }
      }
      at = source.indexOf("Promise.all", at + 1);
    }
  }
});
