"use client";

import { useEffect } from "react";
import {
  applyInterfacePreferences,
  INTERFACE_PREFERENCES_KEY,
  readInterfacePreferences,
} from "@/lib/interface-preferences";

export function InterfacePreferencesManager() {
  useEffect(() => {
    const sync = (event?: StorageEvent) => {
      if (event && event.key !== INTERFACE_PREFERENCES_KEY) return;
      applyInterfacePreferences(readInterfacePreferences());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return null;
}
