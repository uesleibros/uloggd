import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { colorName, markName, MARK_COLORS } from "../../lib/list-marks";

const ROOT = process.cwd();

/**
 * The marks say how an item looks and never what it means.
 *
 * That is the whole feature, and it is the kind of rule that erodes one
 * helpful label at a time: somebody writes "completed" in a tooltip, somebody
 * else maps green to a library state, and a year later the site is telling
 * people what their own lists mean again. These hold the line.
 */

test("a colour is named, never interpreted", () => {
  assert.equal(colorName("RED", "pt-BR"), "Vermelho");
  assert.equal(colorName("NEUTRAL", "en"), "Neutral");
  for (const color of MARK_COLORS) {
    for (const lang of ["pt-BR", "en", "es"] as const) {
      const name = colorName(color, lang);
      assert.ok(name.length > 0, `${color} has no name in ${lang}`);
      assert.doesNotMatch(
        name,
        /conclu|complet|done|bad|good|ruim|bom|played|jogad/i,
        `${color} in ${lang} reads as a meaning rather than a colour`,
      );
    }
  }
});

test("what was done to an item is said plainly", () => {
  assert.equal(
    markName({ mark_mode: "COLOR", mark_color: "GREEN" }, "en"),
    "Highlighted in green",
  );
  assert.equal(
    markName({ mark_mode: "DIM", mark_color: null }, "en"),
    "Dimmed",
  );
  assert.equal(
    markName({ mark_mode: null, mark_color: null }, "en"),
    "No highlight",
  );
  // A dimming is not a completion, whatever it replaced.
  assert.doesNotMatch(
    markName({ mark_mode: "DIM", mark_color: null }, "pt-BR"),
    /conclu|complet/i,
  );
});

test("no colour is wired to a state anywhere", async () => {
  const files = [
    "lib/list-marks.ts",
    "components/social/list-item-mark.tsx",
    "components/social/list-items-grid.tsx",
  ];
  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    // The failure this guards is a helpful-looking constant like
    // `RED: "dropped"`, which would hand the meaning back to the site.
    assert.doesNotMatch(
      source,
      /(RED|GREEN|YELLOW|BLUE)['"]?\s*[:=]\s*['"](?!#)(?:[A-Za-z]+)['"]/,
      `${file} maps a colour to a word`,
    );
    assert.doesNotMatch(
      source,
      /completed|concluído|concluidos|concluídos/i,
      `${file} still speaks of completion`,
    );
  }
});

test("the migration carries the old ticks rather than dropping them", async () => {
  const migration = await readFile(
    path.join(ROOT, "supabase/migrations/20260927000100_list_item_marks.sql"),
    "utf8",
  );
  assert.match(
    migration,
    /set mark_mode = 'DIM'\s*\n?\s*where marked/,
    "ticked items must become dimmed ones",
  );
  // And the order matters: backfill, then drop.
  assert.ok(
    migration.indexOf("set mark_mode = 'DIM'") <
      migration.indexOf("drop column if exists marked"),
    "the column is read before it is dropped",
  );
  assert.match(
    migration,
    /check \(\s*\n?\s*mark_color is null or mark_mode = 'COLOR'/,
  );
});
