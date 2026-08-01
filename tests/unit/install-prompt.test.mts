import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Who gets told they can install, and how.
 *
 * The platform split is the whole reason this component exists. Chromium fires
 * `beforeinstallprompt` and can be told to install; iOS Safari fires nothing
 * and cannot, so it gets two lines of instructions instead. Getting the
 * detection wrong shows one platform the other's answer: an install button
 * that does nothing, or a set of taps that do not exist in that menu.
 *
 * Every browser on iOS reports Safari in its user agent, which is what makes
 * this easy to get wrong and worth pinning.
 */
const source = await readFile(
  path.join(process.cwd(), "components", "install-prompt.tsx"),
  "utf8",
);

/** Mirrors `isIosSafari`, which cannot be imported without a DOM. */
function isIosSafari(agent: string) {
  const ios = /iPad|iPhone|iPod/.test(agent);
  const safari =
    /Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
  return ios && safari;
}

const AGENTS = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/123.0 Mobile/15E148 Safari/605.1.15",
  ipadSafari:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
};

test("only iOS Safari gets the manual instructions", () => {
  assert.equal(isIosSafari(AGENTS.iphoneSafari), true);
  assert.equal(isIosSafari(AGENTS.ipadSafari), true);
});

test("other browsers on iOS do not, since they cannot install at all", () => {
  // These report Safari and would pass a naive check, then show someone a menu
  // path their browser does not have.
  assert.equal(isIosSafari(AGENTS.iphoneChrome), false);
  assert.equal(isIosSafari(AGENTS.iphoneFirefox), false);
});

test("Android and desktop are left to the native prompt", () => {
  // Android Chrome reports "Safari" too, so this is the same trap in reverse:
  // the platform that can install properly must not get iPhone instructions.
  assert.equal(isIosSafari(AGENTS.androidChrome), false);
  assert.equal(isIosSafari(AGENTS.desktopChrome), false);
  assert.equal(isIosSafari(AGENTS.macSafari), false);
});

test("the browser's own banner is suppressed before ours is shown", () => {
  // Without preventDefault the browser shows its mini-infobar as well, and two
  // offers on screen at once read as a bug rather than as an invitation.
  assert.match(
    source,
    /event\.preventDefault\(\);[\s\S]{0,200}setMode\("native"\)/,
    "the captured event is no longer suppressed",
  );
});

test("an installed app is never asked to install again", () => {
  // Both checks are needed: the media query is the standard, and Safari's
  // navigator.standalone predates it and is what an installed iPhone reports.
  assert.match(source, /display-mode: standalone/);
  assert.match(source, /standalone\b[\s\S]{0,40}=== true/);
  assert.match(
    source,
    /if \(alreadyInstalled\(\) \|\| snoozed\(\)\) return;/,
    "the prompt no longer checks before showing",
  );
});

test("a blocked storage does not turn the prompt into a nag", () => {
  // localStorage throws in some private modes. Failing open would show this on
  // every single page load, which is worse than never showing it.
  assert.match(
    source,
    /catch \{[\s\S]{0,220}return true;\s*\}/,
    "a storage failure no longer suppresses the prompt",
  );
});
