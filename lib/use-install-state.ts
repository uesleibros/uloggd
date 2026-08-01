"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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
  const safari =
    /Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
  return ios && safari;
}

/**
 * Installed-ness is browser state, not React state, so it is read as an
 * external store: resolving it in an effect would mean rendering "not
 * installed" first and correcting a frame later, and the server has no answer
 * at all. The snapshot follows both the display-mode change and the install
 * event, so opening the app from the home screen updates it without a reload.
 */
function subscribeInstalled(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

const noSubscribe = () => () => {};

export function useInstallState() {
  const installed = useSyncExternalStore(
    subscribeInstalled,
    alreadyInstalled,
    () => false,
  );
  const manual = useSyncExternalStore(
    noSubscribe,
    () => isIosSafari(),
    () => false,
  );
  const [ready, setReady] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      // Suppresses the browser's own mini-infobar, so there are never two
      // offers on screen at once.
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setReady(true);
    };
    const installed = () => {
      deferred.current = null;
      setReady(false);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const state: InstallState = installed
    ? "installed"
    : ready
      ? "ready"
      : manual
        ? "manual"
        : "unavailable";

  /** Opens the browser's own install dialog. Resolves once the choice is made. */
  const install = useCallback(async () => {
    const event = deferred.current;
    if (!event) return "unavailable" as const;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // The event is single-use. The browser fires a fresh one if the person
    // becomes eligible again, so holding a spent one would give a dead button.
    // Accepting is not marked as installed here: `appinstalled` reports that,
    // and on some platforms it arrives well after the dialog closes.
    deferred.current = null;
    setReady(false);
    return outcome;
  }, []);

  return { state, install };
}
