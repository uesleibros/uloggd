import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_INTERFACE_PREFERENCES,
  normalizeInterfacePreferences,
} from "../../lib/interface-preferences";

test("interface preferences accept only supported local values", () => {
  assert.deepEqual(
    normalizeInterfacePreferences({
      font: "readable",
      readingSize: "extra-large",
      reduceMotion: true,
    }),
    {
      font: "readable",
      readingSize: "extra-large",
      reduceMotion: true,
    },
  );
});

test("interface preferences fall back safely for malformed storage", () => {
  assert.deepEqual(
    normalizeInterfacePreferences({
      font: "comic-sans",
      readingSize: "huge",
      reduceMotion: "yes",
    }),
    DEFAULT_INTERFACE_PREFERENCES,
  );
  assert.deepEqual(
    normalizeInterfacePreferences(null),
    DEFAULT_INTERFACE_PREFERENCES,
  );
});
