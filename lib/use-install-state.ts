"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether uloggd can be installed here, and the means to do it.
 *
 * Shared by the banner and the settings card so the two can never disagree
 * about whether the app is already installed, which is the sort of thing that
 * reads as the site not knowing what it is doing.
 *
 * Four states, because the platforms genuinely differ:
 *
 * - `installed`: running from the home screen already, or the browser told us.
 * - `ready`: `beforeinstallprompt` fired, so `install()` opens the real dialog.
 * - `manual`: iOS Safari, which never fires it and offers no programmatic
 *   install, so all that is left is saying which taps do it.
 * - `unavailable`: everything else, including browsers that cannot install and
 *   a page that has not met the criteria yet.
 */
export type InstallState = "installed" | "ready" | "manual" | "unavailable";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * The event is captured at module scope, not inside the hook.
 *
 * `beforeinstallprompt` fires once, early, usually before anything below the
 * layout has mounted. A listener registered by a component therefore misses it
 * for good: the banner in the layout caught it and the settings card, mounted
 * on navigation long afterwards, always reported that this browser could not
 * install. Holding it here means whoever asks later still gets the answer.
 */
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Suppresses the browser's own mini-infobar, so there are never two offers
    // on screen at once.
    event.preventDefault();
    deferred = event as InstallEvent;
    announce();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    announce();
  });
}

export function alreadyInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, which predates the standard media query and is what an
    // installed iPhone actually reports.
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(agent = navigator.userAgent) {
  const ios = /iPad|iPhone|iPod/.test(agent);
  // Chrome, Firefox, Edge and Opera on iOS are Safari underneath but cannot add
  // to the home screen at all, so those instructions would be wrong for them.
  const safari = /Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
  return ios && safari;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    query.removeEventListener("change", onChange);
  };
}

/**
 * Read as an external store rather than resolved in an effect: it is browser
 * state, the server has no answer for it, and an effect would render "cannot
 * install" first and correct itself a frame later.
 */
function snapshot(): InstallState {
  if (alreadyInstalled()) return "installed";
  if (deferred) return "ready";
  if (isIosSafari()) return "manual";
  return "unavailable";
}

export function useInstallState() {
  const state = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "unavailable" as const,
  );

  /** Opens the browser's own install dialog. Resolves once the choice is made. */
  const install = useCallback(async () => {
    const event = deferred;
    if (!event) return "unavailable" as const;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // The event is single-use. The browser fires a fresh one if the person
    // becomes eligible again, so holding a spent one would give a dead button.
    // Accepting is not marked installed here: `appinstalled` reports that, and
    // on some platforms it arrives well after the dialog closes.
    deferred = null;
    announce();
    return outcome;
  }, []);

  return { state, install };
}
