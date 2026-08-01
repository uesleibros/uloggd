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
/** The banner. Owns when to appear and when to stay quiet. */
const banner = await readFile(
  path.join(process.cwd(), "components", "install-prompt.tsx"),
  "utf8",
);
/** The shared hook. Owns platform detection and the install call itself, so
 *  the banner and the settings card can never disagree about the state. */
const hook = await readFile(
  path.join(process.cwd(), "lib", "use-install-state.ts"),
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

test("the install event is captured before any component mounts", () => {
  // `beforeinstallprompt` fires once, early, usually before anything below the
  // layout has mounted. A listener registered inside a component therefore
  // misses it for good: that is why the settings card reported that the
  // browser could not install, on a browser that could. Capturing at module
  // scope means whoever asks later still gets the answer.
  assert.match(
    hook,
    /if \(typeof window !== "undefined"\) \{\s*window\.addEventListener\(\s*"beforeinstallprompt"/,
    "the event is no longer captured at module scope, so late mounts miss it",
  );
  assert.ok(
    !/useEffect\([\s\S]*addEventListener\(\s*"beforeinstallprompt"/.test(hook),
    "the capture moved back inside an effect, which runs too late",
  );
});

test("the browser's own banner is suppressed before ours is shown", () => {
  // Without preventDefault the browser shows its mini-infobar as well, and two
  // offers on screen at once read as a bug rather than as an invitation.
  assert.match(
    hook,
    /event\.preventDefault\(\);[\s\S]{0,120}deferred = event/,
    "the captured event is no longer suppressed",
  );
});

test("an installed app is never asked to install again", () => {
  // Both checks are needed: the media query is the standard, and Safari's
  // navigator.standalone predates it and is what an installed iPhone reports.
  assert.match(hook, /display-mode: standalone/);
  assert.match(hook, /standalone\b[\s\S]{0,40}=== true/);
  assert.match(
    banner,
    /state === "installed" \|\| state === "unavailable"/,
    "the banner no longer checks the state before showing",
  );
  assert.match(banner, /if \(snoozed\(\)\) return;/);
});

test("the banner and the settings card read one source of truth", async () => {
  // Two copies of this logic would eventually disagree about whether the app is
  // installed, and a site that contradicts itself about what it is reads as
  // broken. Both import the same hook.
  assert.match(banner, /useInstallState/, "the banner forked its own logic");

  const card = await readFile(
    path.join(process.cwd(), "components", "settings", "install-settings.tsx"),
    "utf8",
  );
  assert.match(
    card,
    /useInstallState/,
    "the settings card forked its own logic",
  );
  // The card must cover the state the banner cannot: already installed. A
  // dismissible banner is also the wrong only way in, since someone who
  // declined once should be able to change their mind without clearing storage.
  assert.match(
    card,
    /state === "installed"/,
    "the settings card no longer reports an installed app",
  );
});

test("a blocked storage does not turn the prompt into a nag", () => {
  // localStorage throws in some private modes. Failing open would show this on
  // every single page load, which is worse than never showing it. The settings
  // card stays reachable regardless, so nothing is lost by staying quiet.
  assert.match(
    banner,
    /catch \{[\s\S]{0,220}return true;\s*\}/,
    "a storage failure no longer suppresses the prompt",
  );
});
