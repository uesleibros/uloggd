export const THEME_STORAGE_KEY = "uloggd:theme";

export const themePreferences = [
  "auto",
  "light",
  "gray",
  "dark",
  "onyx",
] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = Exclude<ThemePreference, "auto">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  return preference === "auto" ? (prefersDark ? "dark" : "light") : preference;
}

export const themeBootstrapScript = `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const valid = ${JSON.stringify(themePreferences)};
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return valid.includes(value) ? value : 'auto';
    } catch { return 'auto'; }
  };
  const apply = (preference) => {
    const resolved = preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved === 'light' ? 'light' : 'dark';
  };
  apply(read());
})();`;
