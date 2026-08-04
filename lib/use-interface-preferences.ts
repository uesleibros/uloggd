"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_INTERFACE_PREFERENCES,
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_KEY,
  normalizeInterfacePreferences,
  readInterfacePreferences,
  saveInterfacePreferences,
  type InterfacePreferences,
} from "@/lib/interface-preferences";

/**
 * The interface preferences, live.
 *
 * Extracted from the settings panel because a second reader appeared: the XP
 * card now asks whether it is wanted. Two copies of a `useSyncExternalStore`
 * over the same key is how the two would drift.
 *
 * `useSyncExternalStore` rather than state plus an effect: the value lives in
 * localStorage, outside React, and the server has no access to it. Serialized
 * through JSON because the store has to return a stable reference and a fresh
 * object every read would loop.
 */
export function useInterfacePreferences(): InterfacePreferences {
  const serialized = useSyncExternalStore(
    (notify) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === INTERFACE_PREFERENCES_KEY) notify();
      };
      // The custom event is for this tab, `storage` only fires in the others.
      window.addEventListener(INTERFACE_PREFERENCES_EVENT, notify);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(INTERFACE_PREFERENCES_EVENT, notify);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => JSON.stringify(readInterfacePreferences()),
    () => JSON.stringify(DEFAULT_INTERFACE_PREFERENCES),
  );
  return normalizeInterfacePreferences(JSON.parse(serialized));
}

/** Writes a change over whatever is stored, leaving the rest alone. */
export function updateInterfacePreferences(
  current: InterfacePreferences,
  changes: Partial<InterfacePreferences>,
) {
  saveInterfacePreferences({ ...current, ...changes });
}
