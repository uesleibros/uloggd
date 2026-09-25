import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Two things on a profile that were built to be dragged and read.
 *
 * The showcase's auto-scrolling grid took pointer capture the moment a finger
 * or a button went down. Capture redirects the click that follows to the
 * element holding it, so the cover underneath never received one: every tile
 * could be dragged and none of them could be opened. Capture belongs to a
 * drag, and a drag is only known once the pointer has moved.
 *
 * The lists were a 300px rail beside the activity, holding cards drawn for a
 * grid, stuck to the page while it scrolled and as tall as however many lists
 * somebody had. They are a row under the activity now.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("the auto-scrolling showcase grid can still be clicked", async () => {
  const source = await read("components/markdown/markdown-content.tsx");
  const down = source.slice(
    source.indexOf("function onPointerDown"),
    source.indexOf("function onPointerMove"),
  );
  assert.ok(down.length > 0, "the carousel lost its pointer handlers");
  assert.doesNotMatch(
    down,
    /setPointerCapture/,
    "capturing on the way down sends the click to the track, not the cover",
  );

  const move = source.slice(
    source.indexOf("function onPointerMove"),
    source.indexOf("function finishDrag"),
  );
  // Taken only once the pointer has travelled far enough to be a drag.
  assert.match(
    move,
    /drag\.current\.moved = true;[\s\S]{0,220}setPointerCapture/,
  );

  // And released whether or not it was ever taken.
  const finish = source.slice(
    source.indexOf("function finishDrag"),
    source.indexOf("function preventDraggedClick"),
  );
  assert.match(finish, /hasPointerCapture\(event\.pointerId\)/);
});

test("a profile's lists are a row under the activity, not a sticky rail", async () => {
  const page = await read("app/[lang]/u/[username]/page.tsx");
  assert.match(page, /<section className="profile-lists-section">/);
  assert.doesNotMatch(page, /className="profile-lists"/);
  // Lists and tierlists together, five of them, and a way to see the rest.
  assert.match(page, /lists\?visibility=PUBLIC&limit=5/);
  assert.match(page, /className="profile-lists-all"/);
  // The placeholder holds the row it becomes rather than a single card.
  assert.match(
    page,
    /className="lists-row profile-lists-row"[\s\S]{0,200}aria-busy/,
  );

  const css = await read("app/globals.css");
  assert.doesNotMatch(css, /\r?\n\.profile-lists \{/);
  assert.match(
    css,
    /\r?\n\.profile-content-grid \{\r?\n {2}display: grid;\r?\n {2}grid-template-columns: minmax\(0, 1fr\);/,
  );
  // The explore page keeps its own rail: the two used to share one rule.
  assert.match(
    css,
    /\r?\n\.explore-layout \{\r?\n {2}display: grid;\r?\n {2}grid-template-columns: minmax\(0, 1fr\) 300px;/,
  );
});
