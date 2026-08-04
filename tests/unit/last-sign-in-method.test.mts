import assert from "node:assert/strict";
import test from "node:test";

/**
 * The "last used" badge on the login page.
 *
 * Two things are worth pinning. The stored value ends up choosing which button
 * gets highlighted, so anything that is not one of the known methods has to be
 * ignored rather than trusted; a stale or hand-edited entry must not be able to
 * put a badge on nothing. And every access has to survive localStorage
 * throwing, which it does in private modes: a missing badge is fine, a login
 * page that will not render is not.
 */

/** A localStorage that behaves, and one that refuses to exist. */
function installStorage(
  behaviour: "works" | "throws",
  initial: Record<string, string> = {},
) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem(key: string) {
      if (behaviour === "throws") throw new Error("blocked");
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (behaviour === "throws") throw new Error("blocked");
      data.set(key, value);
    },
  };
  const events: string[] = [];
  (globalThis as { window?: unknown }).window = {
    localStorage: storage,
    dispatchEvent: (event: { type: string }) => {
      events.push(event.type);
      return true;
    },
  };
  return { data, events };
}

// Imported after the first stub exists, since the module reads `window` only
// when its functions run, not at import time.
const { readSignInMethod, rememberSignInMethod } =
  await import("../../lib/last-sign-in-method.ts");

test("only a known method comes back out", () => {
  for (const method of ["google", "discord", "twitch", "email", "passkey"]) {
    installStorage("works", { "uloggd:last-sign-in": method });
    assert.equal(readSignInMethod(), method);
  }

  // A value from a future version, a typo, or somebody editing devtools. Each
  // has to read as "no badge" rather than as a method.
  for (const junk of ["", "apple", "Google", "email ", "__proto__", "null"]) {
    installStorage("works", { "uloggd:last-sign-in": junk });
    assert.equal(
      readSignInMethod(),
      null,
      `"${junk}" was accepted as a sign-in method`,
    );
  }

  installStorage("works");
  assert.equal(readSignInMethod(), null, "an empty store returned something");
});

test("a blocked localStorage costs the badge and nothing else", () => {
  installStorage("throws");
  assert.equal(readSignInMethod(), null);
  // The write has to be just as quiet: this runs on the success path of a
  // sign-in, and throwing here would break the redirect that follows it.
  assert.doesNotThrow(() => rememberSignInMethod("discord"));
});

test("writing tells the current tab, and only when it changed", () => {
  const first = installStorage("works");
  rememberSignInMethod("twitch");
  assert.equal(first.data.get("uloggd:last-sign-in"), "twitch");
  assert.equal(first.events.length, 1, "the current tab was not told");

  // `storage` events only reach other tabs, so the badge in this one depends
  // on that notification; re-recording the same method must not spend one.
  rememberSignInMethod("twitch");
  assert.equal(first.events.length, 1, "an unchanged write still notified");

  rememberSignInMethod("email");
  assert.equal(first.data.get("uloggd:last-sign-in"), "email");
  assert.equal(first.events.length, 2);
});
