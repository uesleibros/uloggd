export const INTERFACE_PREFERENCES_KEY = "uloggd:interface-preferences";
export const INTERFACE_PREFERENCES_EVENT =
  "uloggd:interface-preferences-change";

export type InterfaceFont =
  "inter" | "system" | "source-sans" | "readable" | "serif";
export type ReadingSize = "standard" | "large" | "extra-large";

export type InterfacePreferences = {
  font: InterfaceFont;
  readingSize: ReadingSize;
  reduceMotion: boolean;
  /**
   * Whether earning XP raises a card in the corner.
   *
   * On by default: somebody has to see the thing once to know it exists and
   * decide they would rather not. Turning it off silences the card only, not
   * the earning; the level, the ring and the minerals all keep moving.
   */
  xpNotices: boolean;
};

export const DEFAULT_INTERFACE_PREFERENCES: InterfacePreferences = {
  font: "inter",
  readingSize: "standard",
  reduceMotion: false,
  xpNotices: true,
};

export function normalizeInterfacePreferences(
  value: unknown,
): InterfacePreferences {
  const input =
    value && typeof value === "object"
      ? (value as Partial<InterfacePreferences>)
      : {};
  return {
    font:
      input.font === "system" ||
      input.font === "source-sans" ||
      input.font === "readable" ||
      input.font === "serif"
        ? input.font
        : "inter",
    readingSize:
      input.readingSize === "large" || input.readingSize === "extra-large"
        ? input.readingSize
        : "standard",
    reduceMotion: input.reduceMotion === true,
    // Absent means on, unlike the others, so an existing browser that has
    // never seen this setting does not silently lose the card.
    xpNotices: input.xpNotices !== false,
  };
}

export function readInterfacePreferences(): InterfacePreferences {
  if (typeof window === "undefined") return DEFAULT_INTERFACE_PREFERENCES;
  try {
    return normalizeInterfacePreferences(
      JSON.parse(
        window.localStorage.getItem(INTERFACE_PREFERENCES_KEY) ?? "{}",
      ),
    );
  } catch {
    return DEFAULT_INTERFACE_PREFERENCES;
  }
}

export function applyInterfacePreferences(preferences: InterfacePreferences) {
  const root = document.documentElement;
  root.dataset.interfaceFont = preferences.font;
  root.dataset.readingSize = preferences.readingSize;
  root.dataset.reduceMotion = String(preferences.reduceMotion);
}

export function saveInterfacePreferences(preferences: InterfacePreferences) {
  const normalized = normalizeInterfacePreferences(preferences);
  window.localStorage.setItem(
    INTERFACE_PREFERENCES_KEY,
    JSON.stringify(normalized),
  );
  applyInterfacePreferences(normalized);
  window.dispatchEvent(new Event(INTERFACE_PREFERENCES_EVENT));
}

export const interfacePreferencesBootstrapScript = `(()=>{try{const k="${INTERFACE_PREFERENCES_KEY}",d=document.documentElement,p=JSON.parse(localStorage.getItem(k)||"{}"),f=["system","source-sans","readable","serif"].includes(p.font)?p.font:"inter";d.dataset.interfaceFont=f;d.dataset.readingSize=p.readingSize==="large"||p.readingSize==="extra-large"?p.readingSize:"standard";d.dataset.reduceMotion=String(p.reduceMotion===true)}catch{}})()`;
