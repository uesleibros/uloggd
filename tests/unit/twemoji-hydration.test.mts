import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The emoji rewrite never touches markup React has not hydrated yet.
 *
 * The manager swaps emoji text for <img> across the page. It used to wait for
 * load and an idle moment and trust that hydration was over by then. On a
 * page that arrives whole, the route's boundary hydrates later than that, so
 * the company page (its country flag) threw #418 on every cached load, and
 * React threw its server HTML away and drew it again: the error and a flash.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("only text React has claimed is rewritten", async () => {
  const source = await read("components/twemoji-manager.tsx");
  assert.match(source, /__reactFiber\$/);
  assert.match(source, /if \(hydrated\(node\)\)/);
  // Handing twemoji an element lets it rewrite everything beneath it,
  // hydrated or not; only strings are handed over now.
  assert.doesNotMatch(source, /twemoji\.parse\((element|holder|parent)\b/);
});

test("what was not hydrated yet is looked at again", async () => {
  const source = await read("components/twemoji-manager.tsx");
  assert.match(source, /if \(deferred\) later\(\)/);
  assert.match(source, /RETRY_LIMIT/);
});

test("the company flag is drawn by React, not rewritten", async () => {
  const page = await read("app/[lang]/publisher/[slug]/page.tsx");
  assert.match(page, /withEmoji\(flagEmoji\(/);
});

/**
 * ☝ ⛷ ⛹ ✌ ✍ are missed by @twemoji/api 17.0.3's own pattern: "✌️" came back
 * as a lone variation selector with no image and "✌🏽" as a bare swatch. A
 * bio ending in ✌️✌️ stayed as text on every page that drew it.
 */
test("the emoji twemoji's pattern misses are still drawn whole", async () => {
  const { findEmoji, splitEmoji } = await import("../../lib/emoji-match.ts");
  const peace = findEmoji("paulista \u270C\uFE0F\u270C\uFE0F");
  assert.deepEqual(
    peace.map((match) => [match.raw, match.offset, match.src.split("/").pop()]),
    [
      ["\u270C\uFE0F", 9, "270c.svg"],
      ["\u270C\uFE0F", 11, "270c.svg"],
    ],
  );
  const toned = findEmoji("\u270D\u{1F3FD}");
  assert.equal(toned.length, 1);
  assert.equal(toned[0].src.split("/").pop(), "270d-1f3fd.svg");
  for (const base of ["\u261D", "\u26F7", "\u26F9", "\u270C", "\u270D"])
    assert.equal(findEmoji(`${base}\uFE0F`)[0]?.raw, `${base}\uFE0F`, base);
  // What already worked keeps working, and text around it survives.
  assert.deepEqual(
    splitEmoji("a \u2764\uFE0F b")?.map((part) =>
      typeof part === "string" ? part : part.raw,
    ),
    ["a ", "\u2764\uFE0F", " b"],
  );
  assert.equal(splitEmoji("no emoji here"), null);
  // A plain ✌ with no selector is text by default; twemoji leaves it alone.
  assert.equal(findEmoji("\u270C").length, 0);
});

test("every emoji drawer reads the one matcher", async () => {
  for (const file of [
    "lib/emoji.tsx",
    "lib/rehype-emoji.ts",
    "components/twemoji-manager.tsx",
  ]) {
    const source = await read(file);
    assert.match(source, /emoji-match/, file);
    assert.doesNotMatch(source, /twemoji\.replace\(/, file);
  }
});
