import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

test("every XP-earning surface requests confirmed feedback", async () => {
  const surfaces = [
    ["lib/game-actions.ts", 'api.post<{ data: unknown }>("/library"'],
    ["components/social/game-log-actions.tsx", '"/reviews"'],
    ["components/social/game-log-actions.tsx", '"/journal/journeys"'],
    ["components/social/game-log-actions.tsx", '"/journal/entries"'],
    ["components/social/create-list-form.tsx", 'api.post<{ data: { public_id: string } }>("/lists"'],
    ["components/social/screenshot-studio-form.tsx", "/api/screenshots"],
    ["components/social/content-comments.tsx", 'api.post<{ data: unknown }>("/comments"'],
    ["components/social/profile-comments.tsx", 'api.post<{ data: Record<string, unknown> }>("/comments"'],
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
  assert.match(source, /api\.post<\{ data: Grant\[\] \}>\("\/minerals"\)/);
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
  const claim = source.indexOf('api.post<{ data: Grant[] }>("/minerals")');
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
