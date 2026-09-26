import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A demo is found by either id the two catalogues agree on.
 *
 * spawnd carries a Steam app id for every game it has and an IGDB id for
 * about two thirds, and this site only ever looked for the IGDB one. So a
 * quarter of the playable demos could never reach the page of the game they
 * are a demo of, with the id that would have matched them sitting in both
 * files.
 *
 * IGDB answers the Steam id under `external_game_source = 1`; the older
 * `category` field returns nothing on these rows any more, which is worth
 * writing down because the two look interchangeable in the documentation.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("the catalogue is indexed by both ids", async () => {
  const source = await read("lib/spawnd.ts");
  assert.match(source, /gamesBySteamAppId/);
  assert.match(source, /steamAppId \? \(gamesBySteamAppId\.get\(steamAppId\)/);
});

test("the Steam id is asked for and read the way IGDB answers it", async () => {
  const igdb = await read("lib/igdb.ts");
  assert.match(
    igdb,
    /external_games\.uid,external_games\.external_game_source/,
  );
  assert.match(igdb, /entry\.external_game_source === 1/);
  // Every query that names the credited company names this too, so a card
  // and a page never disagree about whether a demo exists.
  const withCompany = igdb.match(/involved_companies\.company\.slug/g) ?? [];
  const withSteam = igdb.match(/external_games\.external_game_source/g) ?? [];
  assert.ok(
    withSteam.length >= withCompany.length - 1,
    `${withCompany.length} queries ask for the company, ${withSteam.length} for the Steam id`,
  );
});

test("both keys reach every caller that decides availability", async () => {
  // The catalogue search was the one left behind, so a search said "no demo"
  // about the twenty-five games that only have a Steam id. Listed by hand
  // rather than discovered, so adding a fourth caller fails here too.
  for (const file of [
    "app/[lang]/game/[slug]/page.tsx",
    "app/api/v1/games/route.ts",
    "app/api/igdb/search/route.ts",
  ]) {
    const source = await read(file);
    assert.match(
      source,
      /steamAppId: game\.steamAppId/,
      `${file} asks spawnd without the Steam id`,
    );
  }
  // And nowhere else asks, which is what makes the list above complete.
  const { execSync } = await import("node:child_process");
  const callers = execSync(
    'git grep -l "getSpawndGame(" -- app components lib',
    { cwd: ROOT, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter((line) => line && !line.endsWith("lib/spawnd.ts"));
  assert.equal(callers.length, 3, `callers: ${callers.join(", ")}`);
});

test("the shipped catalogue still carries the ids this relies on", async () => {
  const catalogue = JSON.parse(await read("data/spawnd-games.json")) as {
    games: { igdb_id: number | null; steam_app_id: number | null }[];
  };
  assert.ok(catalogue.games.length > 0);
  const withSteam = catalogue.games.filter((game) => game.steam_app_id).length;
  const withIgdb = catalogue.games.filter((game) => game.igdb_id).length;
  // The whole point: Steam covers more of the catalogue than IGDB does.
  assert.ok(
    withSteam > withIgdb,
    `${withSteam} have a Steam id, ${withIgdb} an IGDB one`,
  );
});
