"use client";

import { useSyncExternalStore } from "react";

/**
 * Which way this browser got in last time.
 *
 * Worth remembering because the login page cannot ask: nobody is signed in
 * yet, so the server has nothing to look up. Someone who signed up through
 * Discord a year ago comes back to four identical buttons with no way to tell
 * which one is theirs, tries the wrong one, and ends up with a second account
 * holding none of their entries. A badge on the right button prevents that.
 *
 * Kept in localStorage, per browser, and never sent anywhere. It says nothing
 * about who the person is, only which button they pressed, which is why it can
 * sit on a device without an account attached to it.
 */

export type SignInMethod =
  "google" | "discord" | "twitch" | "email" | "passkey";

const KEY = "uloggd:last-sign-in";
const CHANGED = "uloggd:last-sign-in-changed";

const METHODS: readonly string[] = [
  "google",
  "discord",
  "twitch",
  "email",
  "passkey",
];

export function readSignInMethod(): SignInMethod | null {
  // localStorage throws outright in some privacy modes rather than returning
  // null, so every access is guarded. A missing badge is not worth a crashed
  // login page.
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored && METHODS.includes(stored) ? (stored as SignInMethod) : null;
  } catch {
    return null;
  }
}

export function rememberSignInMethod(method: SignInMethod): void {
  try {
    if (window.localStorage.getItem(KEY) === method) return;
    window.localStorage.setItem(KEY, method);
    // `storage` only fires in other tabs. This is what tells the current one,
    // so a badge appears without a reload.
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Nothing to do and nothing to say: the badge is a convenience.
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * The remembered method, read the way React wants an external store read.
 *
 * Not `useState` plus an effect: the value lives outside React, the server has
 * no access to it, and this is the hook built for exactly that shape. The
 * server snapshot is null, so the first paint matches the markup and the badge
 * appears on hydration.
 */
export function useLastSignInMethod(): SignInMethod | null {
  return useSyncExternalStore(subscribe, readSignInMethod, () => null);
}
