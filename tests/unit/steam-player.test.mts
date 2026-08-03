import assert from "node:assert/strict";
import test from "node:test";
import { toSteamPlayer } from "../../lib/steam-player";

/**
 * What the profile is willing to say about somebody's Steam account.
 *
 * The "playing now" line is the sensitive one: it says a person is at a
 * keyboard right this minute. It has to appear only when Steam actually said
 * so, and never be inferred from a field being present but empty.
 */

test("a real session becomes a playing line", () => {
  const player = toSteamPlayer({
    steamid: "76561197960287930",
    personaname: "Rabscuttle",
    avatarfull: "https://avatars.steamstatic.com/abc_full.jpg",
    gameextrainfo: "Half-Life 2",
    gameid: "220",
  });
  assert.deepEqual(player, {
    steamId: "76561197960287930",
    persona: "Rabscuttle",
    avatarUrl: "https://avatars.steamstatic.com/abc_full.jpg",
    playing: { name: "Half-Life 2", appId: "220" },
  });
});

test("nothing is playing unless Steam named a game", () => {
  // The shape a private profile, a friends-only profile and an idle account
  // all arrive in. None of them may produce a "playing now" line: Steam
  // omitting the field is its owner's setting being honoured.
  for (const summary of [
    { steamid: "1" },
    { steamid: "1", gameextrainfo: "" },
    { steamid: "1", gameextrainfo: "   " },
    { steamid: "1", gameid: "220" },
  ])
    assert.equal(
      toSteamPlayer(summary)?.playing,
      null,
      `${JSON.stringify(summary)} produced a playing line`,
    );
});

test("a non-Steam shortcut links to the person, not to app 0", () => {
  // Steam reports id 0 for games launched through a shortcut. Passing that
  // through would build a store link to /app/0, which is not a page.
  const player = toSteamPlayer({
    steamid: "1",
    gameextrainfo: "Some Emulator",
    gameid: "0",
  });
  assert.deepEqual(player?.playing, { name: "Some Emulator", appId: null });

  // Missing entirely is the same situation, and gets the same answer.
  assert.deepEqual(
    toSteamPlayer({ steamid: "1", gameextrainfo: "Some Emulator" })?.playing,
    { name: "Some Emulator", appId: null },
  );
});

test("a row with no id is dropped", () => {
  // Everything downstream is keyed by the id; a row without one would be
  // fetched, parsed, and then silently never match anybody.
  assert.equal(toSteamPlayer({ personaname: "Ghost" }), null);
});

test("the id stands in when there is no name", () => {
  assert.equal(
    toSteamPlayer({ steamid: "76561197960287930" })?.persona,
    "76561197960287930",
  );
  assert.equal(
    toSteamPlayer({ steamid: "76561197960287930", personaname: "  " })?.persona,
    "76561197960287930",
  );
  assert.equal(
    toSteamPlayer({ steamid: "1", avatarfull: "" })?.avatarUrl,
    null,
  );
});
