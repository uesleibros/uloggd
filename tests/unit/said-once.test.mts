import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  playtime,
  playtimeCell,
  playtimeClock,
  playtimeHours,
} from "../../lib/playtime.ts";
import { formatRating, formatVerdict } from "../../lib/review-rating.ts";
import { calendarDate, localDate } from "../../lib/dates.ts";
import { COMMENT_SCOPES, isCommentScope } from "../../lib/comment-scope.ts";
import {
  VISIBILITIES,
  isVisibility,
  visibilityLabel,
} from "../../lib/visibility.ts";
import { uiText } from "../../lib/ui-text.ts";

/**
 * The four things the whole site says, said in one place each.
 *
 * A length of play, a score, a date and who can see something are facts that
 * every screen shows and none of them owns. Each had drifted into a private
 * copy per file, and the copies disagreed: minutes came out five ways, a
 * score's separator depended on which page you were on, and a stored calendar
 * day rendered one day early wherever a formatter had been written without
 * `timeZone: "UTC"`.
 *
 * These tests pin both halves: the shared answer is right, and nothing has
 * quietly grown its own again.
 */

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", ".git", "test-results", "out"]);

async function sources(dir = ROOT): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir)) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) found.push(...(await sources(full)));
    else if (/\.(ts|tsx|mts)$/.test(entry)) found.push(full);
  }
  return found;
}

const files = await sources();
const read = async (file: string) => ({
  rel: path.relative(ROOT, file).replaceAll(path.sep, "/"),
  source: await readFile(file, "utf8"),
});
const all = await Promise.all(files.map(read));
const app = all.filter(
  ({ rel }) => !rel.startsWith("tests/") && !rel.startsWith("scripts/"),
);

// --- how long somebody played -------------------------------------------

test("a length of play reads the same in every shape", () => {
  assert.equal(playtime(45), "45 min");
  assert.equal(playtime(120), "2h");
  assert.equal(playtime(135), "2h 15min");
  assert.equal(playtimeHours(45, "pt-BR"), "45 min");
  assert.equal(playtimeHours(135, "en"), "2h");
  // A four-digit total is the form this one exists for.
  assert.equal(playtimeHours(60 * 1234, "en"), "1,234h");
  assert.equal(playtimeHours(60 * 1234, "pt-BR"), "1.234h");
  // Fixed width, so a running clock does not jitter as it ticks.
  assert.equal(playtimeClock(5), "5m");
  assert.equal(playtimeClock(65), "1h 05m");
  assert.equal(playtimeCell(65), "1:05");
  assert.equal(playtimeCell(120), "2h");
  assert.equal(playtimeCell(5), "5m");
  // Nothing played is not zero minutes played.
  assert.equal(playtimeCell(0), null);
  assert.equal(playtimeCell(null), null);
});

test("nothing divides minutes into hours on its own", () => {
  const offenders = app.filter(
    ({ rel, source }) =>
      rel !== "lib/playtime.ts" &&
      /Math\.floor\((?:minutes|totalMinutes|total|mins)\s*\/\s*60\)/.test(
        source,
      ),
  );
  assert.deepEqual(
    offenders.map(({ rel }) => rel),
    [],
    "lib/playtime.ts says how long somebody played; these wrote it out again",
  );
});

// --- a score, in the scale its author chose ------------------------------

test("a score is written in its own scale, in the reader's locale", () => {
  assert.equal(formatRating(85, "score_100", "pt-BR"), "85/100");
  assert.equal(formatRating(85, "score_10", "en"), "8.5/10");
  assert.equal(formatRating(85, "score_10", "pt-BR"), "8,5/10");
  assert.equal(formatRating(90, "stars_5", "en"), "4.5/5");
  assert.equal(formatRating(90, "stars_5", "pt-BR"), "4,5/5");
  // A level is a whole thing: 45 is the fourth level, not four and a half.
  assert.equal(formatRating(45, "level_5", "en"), "2/5");
});

test("a verdict without a number says yes or no, or nothing", () => {
  assert.equal(formatVerdict(null, "recommend", true, "en"), "Recommends");
  assert.equal(
    formatVerdict(null, "recommend", false, "pt-BR"),
    "Não recomenda",
  );
  // Still being written: neither yes nor no has been said.
  assert.equal(formatVerdict(null, "recommend", null, "en"), null);
  assert.equal(formatVerdict(null, "stars_5", null, "en"), null);
  assert.equal(formatVerdict(90, "stars_5", null, "en"), "4.5/5");
});

test("nothing divides a rating back down on its own", () => {
  const offenders = app.filter(
    ({ rel, source }) =>
      rel !== "lib/review-rating.ts" && /rating\s*\/\s*20/.test(source),
  );
  assert.deepEqual(
    offenders.map(({ rel }) => rel),
    [],
    "lib/review-rating.ts turns a stored 0-100 score into its scale",
  );
});

// --- dates ---------------------------------------------------------------

test("a stored calendar day is the same day in every time zone", () => {
  // The case that made this a shared module: a formatter without UTC renders
  // this as the fourth for every reader west of Greenwich.
  assert.equal(calendarDate("2026-02-05", "en", "short"), "Feb 5, 2026");
  assert.equal(calendarDate("2026-02-05", "en", "shortPadded"), "Feb 05, 2026");
  assert.equal(calendarDate("2026-02-05", "en", "long"), "February 5, 2026");
  assert.equal(calendarDate("2026-02-05", "en", "dayMonth"), "Feb 5");
  assert.equal(calendarDate("2026-02-05", "en", "monthYear"), "February 2026");
  assert.match(calendarDate("2026-02-05", "pt-BR", "long"), /5 de fevereiro/);
});

test("a moment that happened is told in the reader's own zone", () => {
  const noon = new Date("2026-02-05T12:00:00Z");
  assert.equal(typeof localDate(noon, "en"), "string");
});

test("no screen builds a date formatter of its own", () => {
  const offenders = app.filter(
    ({ rel, source }) =>
      rel !== "lib/dates.ts" &&
      // The age gate keys on a fixed zone rather than displaying anything.
      rel !== "lib/age-access.ts" &&
      /new Intl\.DateTimeFormat/.test(source),
  );
  assert.deepEqual(
    offenders.map(({ rel }) => rel),
    [],
    "lib/dates.ts decides UTC-or-local once, by what the value is",
  );
});

// --- who can see it ------------------------------------------------------

test("the three visibilities are named one way", () => {
  assert.deepEqual([...VISIBILITIES], ["PUBLIC", "FOLLOWERS", "PRIVATE"]);
  assert.ok(isVisibility("PUBLIC"));
  assert.ok(!isVisibility("ALL"));
  assert.equal(visibilityLabel("PUBLIC", "pt-BR"), "Público");
  assert.equal(visibilityLabel("PRIVATE", "pt-BR"), "Privado");
  assert.equal(
    visibilityLabel("FOLLOWERS", "pt-BR"),
    uiText("pt-BR").followers,
  );
  for (const lang of ["pt-BR", "en", "es"] as const)
    for (const value of VISIBILITIES)
      assert.ok(visibilityLabel(value, lang).length > 0);
});

test("nothing writes the visibility union out again", () => {
  const offenders = app.filter(
    ({ rel, source }) =>
      rel !== "lib/visibility.ts" &&
      /"PUBLIC"\s*\|\s*"FOLLOWERS"\s*\|\s*"PRIVATE"/.test(source),
  );
  assert.deepEqual(
    offenders.map(({ rel }) => rel),
    [],
    "lib/visibility.ts holds the union; these declared their own copy",
  );
});

test("there is one control for who can see a thing", () => {
  const offenders = app.filter(
    ({ rel, source }) =>
      rel !== "lib/visibility.ts" &&
      /\["PUBLIC", "FOLLOWERS", "PRIVATE"\]/.test(source),
  );
  assert.deepEqual(
    offenders.map(({ rel }) => rel),
    [],
    "lib/visibility.ts lists the three; these wrote the list out again",
  );
});

// --- who may reply -------------------------------------------------------

test("who may reply is one union under one name", () => {
  assert.deepEqual([...COMMENT_SCOPES], ["EVERYONE", "FOLLOWERS", "NOBODY"]);
  assert.ok(isCommentScope("NOBODY"));
  assert.ok(!isCommentScope("PRIVATE"));
  const offenders = app.filter(
    ({ rel, source }) =>
      rel !== "lib/comment-scope.ts" &&
      /"EVERYONE"\s*[|,]\s*"FOLLOWERS"\s*[|,]\s*"NOBODY"/.test(source),
  );
  assert.deepEqual(
    offenders.map(({ rel }) => rel),
    [],
    "lib/comment-scope.ts holds it; these wrote the three values out again",
  );
});

// --- the shared vocabulary ----------------------------------------------

test("no screen re-spells a word the shared dictionary already has", async () => {
  const dictionary = await readFile(path.join(ROOT, "lib/ui-text.ts"), "utf8");
  const known = new Map<string, string>();
  const table = dictionary
    .split("const strings = {")[1]
    .split("} as const satisfies")[0];
  for (const entry of table.matchAll(
    /(\w+):\s*\[\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,?\s*\]/g,
  ))
    known.set(entry.slice(2, 5).join(","), entry[1]);

  const offenders: string[] = [];
  for (const { rel, source } of app) {
    if (rel === "lib/ui-text.ts") continue;
    for (const call of source.matchAll(
      /tri\(\s*lang,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,?\s*\)/g,
    )) {
      const key = known.get(call.slice(1, 4).join(","));
      if (key) offenders.push(`${rel}: tri(…) is uiText's ${key}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "these spelled out a word uiText already holds, which is how translations drift",
  );
});
