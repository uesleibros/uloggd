import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

test("Playing shelves and counters use status as their single source of truth", async () => {
  const files = [
    "app/[lang]/page.tsx",
    "components/library/library-collection.tsx",
    "components/library/library-live-stats.tsx",
    "lib/social.ts",
  ];
  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    assert.doesNotMatch(
      source,
      /playing\.eq\.true,status\.eq\.PLAYING|record\.playing\s*\|\|/,
      `${file} still accepts the stale playing boolean`,
    );
    assert.match(source, /status(?:"|\s*)[,)=.\w\s]*(?:"PLAYING"|\.PLAYING)/);
  }
});

test("status writes update the optimistic playing value too", async () => {
  for (const file of [
    "lib/game-actions.ts",
    "components/library/quick-game-card.tsx",
  ]) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    assert.match(
      source,
      /playing: value === "PLAYING"/,
      `${file} can leave an optimistic stale playing value`,
    );
  }
});

test("the database repairs old rows and keeps status and playing synchronized", async () => {
  const migration = await readFile(
    path.join(
      ROOT,
      "supabase/migrations/20260803000300_sync_playing_status.sql",
    ),
    "utf8",
  );
  assert.match(migration, /set playing = \(status = 'PLAYING'\)/);
  assert.match(
    migration,
    /when action_name = 'status' then game_status = 'PLAYING'/,
  );
  assert.match(
    migration,
    /when action_name = 'playing' and action_value then 'PLAYING'/,
  );
});
