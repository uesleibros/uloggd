"use client";

import { useEffect } from "react";
import {
  CUSTOM_THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type StoredCustomTheme,
  type ThemePreference,
} from "@/lib/theme";

export const THEME_CHANGE_EVENT = "uloggd:theme-change";
let transitionTimer: number | null = null;

/** The stored custom theme, or null when there is none worth trusting. */
export function readCustomTheme(): StoredCustomTheme | null {
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredCustomTheme) : null;
    return parsed &&
      typeof parsed.style === "string" &&
      (parsed.base === "light" || parsed.base === "dark")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  // A custom preference with nothing behind it falls back, rather than leaving
  // the page on whatever was last applied.
  const custom = preference === "custom" ? readCustomTheme() : null;
  const effective = preference === "custom" && !custom ? "auto" : preference;
  const resolved = resolveTheme(
    effective,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
    custom?.base,
  );
  root.dataset.themePreference = effective;
  root.dataset.theme = resolved;
  // Written as one attribute, matching the boot script exactly. Setting
  // `colorScheme` separately and then replacing the attribute wipes it.
  root.setAttribute(
    "style",
    `${custom ? `${custom.style};` : ""}color-scheme:${resolved === "light" ? "light" : "dark"}`,
  );
}

/** Stores a custom theme and switches to it. */
export function saveCustomTheme(theme: StoredCustomTheme) {
  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // It still applies for this session when storage is unavailable.
  }
  saveThemePreference("custom");
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
