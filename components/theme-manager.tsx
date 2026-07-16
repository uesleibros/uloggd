"use client";

import { useEffect } from "react";
import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

export const THEME_CHANGE_EVENT = "uloggd:theme-change";
let transitionTimer: number | null = null;

export function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolveTheme(
    preference,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved === "light" ? "light" : "dark";
}

export function saveThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  if (transitionTimer !== null) window.clearTimeout(transitionTimer);
  root.dataset.themeChanging = "true";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The theme still applies for this session when storage is unavailable.
  }
  applyThemePreference(preference);
  window.dispatchEvent(
    new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, {
      detail: preference,
    }),
  );
  transitionTimer = window.setTimeout(() => {
    delete root.dataset.themeChanging;
    transitionTimer = null;
  }, 240);
}

export function ThemeManager() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const readPreference = (): ThemePreference => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isThemePreference(stored) ? stored : "auto";
      } catch {
        return "auto";
      }
    };
    const applyStored = () => applyThemePreference(readPreference());
    const onMediaChange = () => {
      if (readPreference() === "auto") applyStored();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const preference = readPreference();
      applyThemePreference(preference);
      window.dispatchEvent(
        new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, {
          detail: preference,
        }),
      );
    };

    applyStored();
    media.addEventListener("change", onMediaChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
