import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LIST_PREVIEW_SLOTS,
  ListPreviewCard,
  listPreviewSlots,
} from "../../components/social/list-preview-card";

/**
 * The fanned stack on a collection card.
 *
 * Its whole appearance is written for five children: the widths, the negative
 * overlap, the stacking order and the hover offsets are all per-position
 * rules. Render fewer and the card does not shrink gracefully, it draws a stub
 * against empty space, which is what an empty collection looked like: one
 * narrow card with seven-tenths of the row beside it holding nothing.
 *
 * The empty case goes through a real render, since that is the bug. The
 * padding and the cap are checked on the function that decides them, because
 * `next/image` refuses every remote host outside a running Next build and a
 * cover cannot be rendered here at all.
 */

test("an empty collection still draws the full stack", () => {
  const html = renderToStaticMarkup(
    createElement(ListPreviewCard, {
      list: {
        id: "list-1",
        name: "Coleção",
        description: null,
        visibility: "PUBLIC" as const,
        kind: "COLLECTION" as const,
        count: 0,
      },
      covers: [],
      lang: "pt-BR" as const,
    }),
  );
  assert.equal(
    (html.match(/list-preview-blank/g) ?? []).length,
    LIST_PREVIEW_SLOTS,
    "an empty collection did not draw a full stack of slots",
  );
  // The stack is always five; the number underneath is the list's own, and
  // conflating them would tell somebody with no games that they have five.
  assert.match(html, /0 jogos/);
});

test("a short list is padded rather than shrunk", () => {
  const covers = [{ url: "a.jpg" }, { url: "b.jpg" }];
  const slots = listPreviewSlots(covers);
  assert.equal(slots.length, LIST_PREVIEW_SLOTS);
  assert.deepEqual(slots.slice(0, 2), covers, "the covers moved or changed");
  assert.deepEqual(
    slots.slice(2),
    [null, null, null],
    "the remaining slots were dropped instead of left empty",
  );
});

test("covers fill from the left, in order", () => {
  // Position is meaning here: the first slot is the one drawn on top.
  const covers = ["a", "b", "c"].map((name) => ({ url: `${name}.jpg` }));
  assert.deepEqual(listPreviewSlots(covers).slice(0, 3), covers);
});

test("a long list is capped at the five the layout has rules for", () => {
  const covers = ["a", "b", "c", "d", "e", "f", "g"].map((name) => ({
    url: `${name}.jpg`,
  }));
  const slots = listPreviewSlots(covers);
  assert.equal(slots.length, LIST_PREVIEW_SLOTS, "the fan grew past its rules");
  assert.ok(
    slots.every((slot) => slot !== null),
    "a full list left an empty slot",
  );
});

test("an empty list produces slots, not nothing", () => {
  const slots = listPreviewSlots([]);
  assert.equal(slots.length, LIST_PREVIEW_SLOTS);
  assert.ok(
    slots.every((slot) => slot === null),
    "an empty list invented a cover",
  );
});
