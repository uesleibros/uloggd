import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The cross-component protocol that keeps cards agreeing.
 *
 * The same game appears in a shelf, a grid and a search result at once, and
 * they stay in step by broadcasting a browser event rather than refetching.
 * That only works while every participant uses the same event name, and
 * `QuickGameCard` used to declare its own copy of it: a rename in one place
 * would have left the other listening for an event nobody sends, with nothing
 * failing and the cards quietly disagreeing.
 */
const ROOTS = ["components", "app", "lib"];

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(full)));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

test("only one module declares the game-state event", async () => {
  const declarers: string[] = [];
  for (const root of ROOTS)
    for (const file of await sourceFiles(path.join(process.cwd(), root))) {
      const source = await readFile(file, "utf8");
      if (/GAME_STATE_EVENT\s*=/.test(source))
        declarers.push(path.relative(process.cwd(), file));
    }
  assert.deepEqual(
    declarers,
    [path.join("lib", "game-actions.ts")],
    `the event name is declared in more than one place: ${declarers.join(", ")}`,
  );
});

test("only one module broadcasts it", async () => {
  // Same reason: a second implementation can send a differently shaped detail,
  // which listeners would read as a state change to nothing.
  const declarers: string[] = [];
  for (const root of ROOTS)
    for (const file of await sourceFiles(path.join(process.cwd(), root))) {
      const source = await readFile(file, "utf8");
      if (/function broadcastGameState/.test(source))
        declarers.push(path.relative(process.cwd(), file));
    }
  assert.deepEqual(declarers, [path.join("lib", "game-actions.ts")]);
});

test("the shelf can act on what it shows", async () => {
  // The home shelf listed what friends were playing and offered no way to add
  // any of it, which is the one thing somebody seeing it wants to do.
  const home = await readFile(
    path.join(process.cwd(), "app", "[lang]", "page.tsx"),
    "utf8",
  );
  //  is the shared menu plus the state behind it. The
  // menu itself is , which the library card also renders;
  // the shelf must not grow a second one.
  assert.ok(
    home.includes("StandaloneGameActions"),
    "the friends shelf has no quick actions",
  );
  assert.ok(
    /shelfStateById/.test(home),
    "the shelf renders actions without the viewer's own state, so they would open empty",
  );
});

test("one menu serves every surface", async () => {
  // The shelf first shipped with a rebuilt copy of the library card's menu.
  // Two menus for one set of actions drift the moment either is touched, and
  // somebody who learns the menu on a card should find the same one on a
  // shelf.
  const declarers: string[] = [];
  for (const root of ROOTS)
    for (const file of await sourceFiles(path.join(process.cwd(), root))) {
      const source = await readFile(file, "utf8");
      if (/export function GameQuickActions/.test(source))
        declarers.push(path.relative(process.cwd(), file));
    }
  assert.deepEqual(declarers, [
    path.join("components", "library", "game-quick-actions.tsx"),
  ]);

  // And the card renders it rather than its own.
  const card = await readFile(
    path.join(process.cwd(), "components", "library", "quick-game-card.tsx"),
    "utf8",
  );
  assert.ok(
    card.includes("<GameQuickActions"),
    "the library card does not use the shared menu",
  );
  assert.ok(
    !/DropdownMenu\.CheckboxItem/.test(card),
    "the library card still builds menu items of its own",
  );
});
