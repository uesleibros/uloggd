import assert from "node:assert/strict";
import test from "node:test";
import {
  copyDetail,
  copyLabel,
  matchingCopy,
  type Copy,
} from "../../lib/library-copies";

/**
 * How a copy reads, and when two of them are the same copy.
 *
 * Both are judgements the interface and the API have to agree about: the API
 * decides whether asking for "PS5" means a new row, and the interface decides
 * what that row is called afterwards.
 */

const base: Copy = {
  id: "a",
  igdb_id: 1,
  game_slug: "game",
  platform_id: null,
  platform_name: null,
  storefront: null,
  ownership: null,
  medium: null,
  edition: null,
  region: null,
  note: null,
  acquired_on: null,
};

const ps5: Copy = {
  ...base,
  id: "ps5",
  platform_id: 167,
  platform_name: "PlayStation 5",
  medium: "DIGITAL",
  storefront: "PLAYSTATION",
  ownership: "SUBSCRIPTION",
};

const cube: Copy = {
  ...base,
  id: "cube",
  platform_id: 21,
  platform_name: "GameCube",
  medium: "PHYSICAL",
  ownership: "OWNED",
  region: "NTSC-U",
  acquired_on: "2007-04-02",
};

test("a copy reads as what it is, and nothing it is not", () => {
  assert.equal(
    copyLabel(ps5, "pt-BR"),
    "PlayStation 5 · Digital · PlayStation Store",
  );
  assert.equal(copyDetail(cube, "pt-BR"), "Comprado · NTSC-U · 2007");
  // A platform and nothing else is a platform, not a form with four blanks.
  assert.equal(copyLabel({ ...base, platform_name: "PC" }, "en"), "PC");
  assert.equal(copyDetail({ ...base, platform_name: "PC" }, "en"), "");
  assert.equal(copyLabel(base, "en"), "Copy with no details");
});

test("asking for a platform means the copy already recorded on it", () => {
  // The common case: somebody picks PS5 on a run and already has a PS5 copy
  // with more filled in. That is the copy, not a second one.
  assert.equal(matchingCopy([ps5, cube], { platform_id: 167 })?.id, "ps5");
  assert.equal(matchingCopy([ps5, cube], { platform_id: 21 })?.id, "cube");
  assert.equal(matchingCopy([ps5, cube], { platform_id: 6 }), null);
});

test("a field the draft names and the copy contradicts is a difference", () => {
  // "PS5, physical" is not the digital PS5 copy.
  assert.equal(
    matchingCopy([ps5], { platform_id: 167, medium: "PHYSICAL" }),
    null,
  );
  assert.equal(
    matchingCopy([ps5], { platform_id: 167, medium: "DIGITAL" })?.id,
    "ps5",
  );
  // A field the draft leaves out is not a difference.
  assert.equal(matchingCopy([ps5], { medium: "DIGITAL" })?.id, "ps5");
});

test("a draft that says nothing matches nothing", () => {
  // Otherwise "record a copy" with an empty form would silently hand back
  // whichever copy happened to be first.
  assert.equal(matchingCopy([ps5, cube], {}), null);
  assert.equal(matchingCopy([ps5], { edition: "" }), null);
  assert.equal(matchingCopy([], { platform_id: 167 }), null);
});

test("editions and regions match by what they say, not by case", () => {
  const deluxe: Copy = { ...ps5, id: "deluxe", edition: "Deluxe" };
  assert.equal(
    matchingCopy([deluxe], { platform_id: 167, edition: " deluxe " })?.id,
    "deluxe",
  );
  assert.equal(
    matchingCopy([deluxe], { platform_id: 167, edition: "Collector's" }),
    null,
  );
  // And a copy with nothing in the field does not match a draft that names
  // one: a plain PS5 copy is not the Deluxe edition.
  assert.equal(matchingCopy([ps5], { edition: "Deluxe" }), null);
});
