import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  parseAward,
  awardPreset,
  awardGameIds,
  type AwardDocument,
} from "../../lib/awards.ts";
function edition(): AwardDocument {
  return {
    name: "My Awards",
    year: 2026,
    mode: "PERSONAL",
    rules: "",
    source: "CATALOG",
    source_list_id: null,
    visibility: "PUBLIC",
    status: "DRAFT",
    categories: awardPreset("blank", "en", randomUUID),
  };
}
test("award presets are editable and have distinct category identities", () => {
  for (const lang of ["pt-BR", "en", "es"] as const)
    for (const preset of ["personal", "tga", "blank"] as const) {
      const categories = awardPreset(preset, lang, randomUUID);
      assert.equal(
        new Set(categories.map((c) => c.id)).size,
        categories.length,
      );
      assert.ok(
        categories.every(
          (c) => c.name && c.max_nominees >= 1 && c.max_nominees <= 20,
        ),
      );
      assert.deepEqual(
        parseAward({ ...edition(), categories }).categories,
        categories,
      );
    }
});
test("publishing allows predictions without a winner but never empty categories", () => {
  const value = edition();
  value.status = "PUBLISHED";
  assert.throws(() => parseAward(value));
  value.categories[0].nominees = [1, 2];
  assert.equal(parseAward(value).categories[0].winner, null);
  value.categories[0].winner = 3;
  assert.throws(() => parseAward(value));
  value.categories[0].winner = 2;
  assert.equal(parseAward(value).categories[0].winner, 2);
});
test("award input rejects malformed types, duplicates and over-limit nomination documents", () => {
  const value = edition();
  for (const override of [
    { year: 2026.1 },
    { year: 1969 },
    { source: "LIST", source_list_id: null },
    { categories: [] },
    { categories: Array(31).fill(value.categories[0]) },
    { visibility: "UNKNOWN" },
    { rules: "x".repeat(5001) },
  ])
    assert.throws(() => parseAward({ ...value, ...override }));
  for (const change of [
    { max_nominees: 0 },
    { max_nominees: 21 },
    { max_nominees: "5" },
    { nominees: [1, 1] },
    { nominees: [-1] },
    { nominees: [2147483648] },
    { nominees: [1.5] },
    { nominees: ["1"] },
    { nominees: [1, 2], max_nominees: 1 },
    { winner: 1 },
    { description: null },
    { id: "bad" },
  ])
    assert.throws(() =>
      parseAward({
        ...value,
        categories: [{ ...value.categories[0], ...change }],
      }),
    );
  assert.throws(() =>
    parseAward({
      ...value,
      categories: [
        value.categories[0],
        { ...value.categories[0], id: value.categories[0].id.toUpperCase() },
      ],
    }),
  );
});
test("game IDs are batched once even when nominated in different categories", () => {
  const categories = awardPreset("personal", "en", randomUUID);
  categories[0].nominees = [1, 2];
  categories[1].nominees = [2, 3];
  assert.deepEqual(awardGameIds(categories), [1, 2, 3]);
});
