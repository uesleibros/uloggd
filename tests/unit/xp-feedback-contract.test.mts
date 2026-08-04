import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

test("every XP-earning surface requests confirmed feedback", async () => {
  const surfaces = [
    ["lib/game-actions.ts", "set_game_card_action"],
    ["components/social/game-log-actions.tsx", "create_review"],
    ["components/social/game-log-actions.tsx", "create_journey"],
    ["components/social/game-log-actions.tsx", "save_diary_entry"],
    ["components/social/create-list-form.tsx", "create_game_list"],
    ["components/social/screenshot-studio-form.tsx", "/api/screenshots"],
    ["components/social/content-comments.tsx", "create_content_comment"],
    ["components/social/profile-comments.tsx", "create_profile_comment"],
    [
      "components/settings/backloggd-import-settings.tsx",
      "/api/imports/backloggd/commit",
    ],
  ] as const;

  for (const [file, mutation] of surfaces) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    assert.ok(source.includes(mutation), `${file} lost ${mutation}`);
    assert.match(
      source,
      /requestXpRefresh\(\)/,
      `${file} changes XP without asking for confirmed feedback`,
    );
  }
});

test("the feedback manager reads standing and claims server rewards", async () => {
  const source = await readFile(
    path.join(ROOT, "components/xp-feedback-provider.tsx"),
    "utf8",
  );
  assert.match(source, /getProfileLevel\(client, viewerId!\)/);
  assert.match(source, /profileXpChange\(previous, next\)/);
  assert.match(source, /client\.rpc\("claim_level_minerals"\)/);
  assert.match(source, /aria-live="polite"/);
});
