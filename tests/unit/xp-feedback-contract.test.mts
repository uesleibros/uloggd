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

test("the XP card can be silenced without silencing the earning", async () => {
  // The preference is about being told, not about earning. Somebody who turns
  // the card off must still get the level, the ring and the minerals their
  // activity bought them, so the claim has to sit above the gate.
  const source = await readFile(
    path.join(ROOT, "components/xp-feedback-provider.tsx"),
    "utf8",
  );
  const claim = source.indexOf('client.rpc("claim_level_minerals")');
  // The guard, not the ref's declaration, which sits above everything.
  const gate = source.indexOf("!noticesWantedRef.current");
  const raise = source.indexOf("setNotice({");
  assert.ok(claim > 0 && gate > 0 && raise > 0, "the XP card lost a piece");
  assert.ok(
    claim < gate && gate < raise,
    "the preference now gates claiming minerals, not just showing the card",
  );
  // The standing itself is never gated: the level badge and the ring have to
  // keep moving whether or not the card is wanted.
  const setStandingCount = (source.match(/setStanding\(/g) ?? []).length;
  assert.ok(setStandingCount >= 2, "the standing stopped refreshing");
});

test("the preference defaults to on and survives an old browser", async () => {
  const { normalizeInterfacePreferences, DEFAULT_INTERFACE_PREFERENCES } =
    await import("../../lib/interface-preferences");
  assert.equal(DEFAULT_INTERFACE_PREFERENCES.xpNotices, true);
  // A browser that stored preferences before this setting existed has no key
  // for it, and must not silently lose the card.
  assert.equal(
    normalizeInterfacePreferences({ font: "serif" }).xpNotices,
    true,
  );
  assert.equal(normalizeInterfacePreferences({}).xpNotices, true);
  assert.equal(normalizeInterfacePreferences(null).xpNotices, true);
  // Only an explicit false turns it off.
  assert.equal(
    normalizeInterfacePreferences({ xpNotices: false }).xpNotices,
    false,
  );
});
