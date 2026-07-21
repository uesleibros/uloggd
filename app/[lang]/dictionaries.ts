import "server-only";

const dictionaries = {
  "pt-BR": () =>
    import("./dictionaries/pt-BR.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  es: () => import("./dictionaries/es.json").then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locale[];
export const defaultLocale: Locale = "pt-BR";

export function hasLocale(locale: string): locale is Locale {
  return locale in dictionaries;
}

/**
 * For generateMetadata, which runs before a page can call notFound(): the
 * route segment is only a string there, so an unknown value falls back
 * instead of widening every caller's type back to string.
 */
export function resolveLocale(locale: string): Locale {
  return hasLocale(locale) ? locale : defaultLocale;
}

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
