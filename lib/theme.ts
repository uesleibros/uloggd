export const THEME_STORAGE_KEY = "uloggd:theme";

/**
 * The custom theme, already worked out.
 *
 * The picked colour is kept so the settings screen can show it again, and the
 * derived tokens are kept beside it so the boot script does not have to do the
 * arithmetic. That script runs before the first paint to stop the page
 * flashing the wrong palette, and it is inlined into every document — it can
 * afford to read a string and set it, and cannot afford a contrast solver.
 */
export const CUSTOM_THEME_STORAGE_KEY = "uloggd:theme-custom";

export type StoredCustomTheme = {
  /** What the reader chose, as `#rrggbb`. */
  colour: string;
  /** Which palette it rides on. */
  base: "light" | "dark";
  /** Ready-made declarations for the root element. */
  style: string;
};

export const themePreferences = [
  "auto",
  "light",
  "gray",
  "dark",
  "onyx",
  "custom",
] as const;

export type ThemePreference = (typeof themePreferences)[number];
/** What `data-theme` may actually be. Custom resolves to one of these. */
export type ResolvedTheme = Exclude<ThemePreference, "auto" | "custom">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

/**
 * The palette a preference lands on.
 *
 * `custom` is not one of them, and that is the point: it resolves to light or
 * dark according to the colour picked, so `data-theme` never carries a value
 * the stylesheet has not heard of and every existing rule keeps working. The
 * caller passes the stored base, because working it out means parsing a colour
 * and this function is also inlined into the boot script.
 */
export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
  customBase: "light" | "dark" = "dark",
): ResolvedTheme {
  if (preference === "auto") return prefersDark ? "dark" : "light";
  if (preference === "custom") return customBase;
  return preference;
}

export const themeBootstrapScript = `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const customKey = ${JSON.stringify(CUSTOM_THEME_STORAGE_KEY)};
  const valid = ${JSON.stringify(themePreferences)};
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try {
      const value = localStorage.getItem(key);
      return valid.includes(value) ? value : 'auto';
    } catch { return 'auto'; }
  };
  const readCustom = () => {
    try {
      const raw = localStorage.getItem(customKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed.style === 'string' &&
        (parsed.base === 'light' || parsed.base === 'dark') ? parsed : null;
    } catch { return null; }
  };
  const apply = (preference) => {
    // A custom preference with nothing stored behind it falls back rather than
    // leaving the page on whatever the last theme was.
    const custom = preference === 'custom' ? readCustom() : null;
    if (preference === 'custom' && !custom) preference = 'auto';
    const resolved = preference === 'auto'
      ? (media.matches ? 'dark' : 'light')
      : preference === 'custom' ? custom.base : preference;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    // One assignment, and colour-scheme rides inside it. Setting the property
    // and then replacing the attribute wipes the property, which is a flash of
    // the wrong scrollbars and form controls on every load.
    root.setAttribute('style', (custom ? custom.style + ';' : '') +
      'color-scheme:' + (resolved === 'light' ? 'light' : 'dark'));
  };
  apply(read());
})();`;
