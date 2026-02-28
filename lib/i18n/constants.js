export const SUPPORTED_LANGUAGES = ["pt", "en"]
export const DEFAULT_LANGUAGE = "en"
export const FALLBACK_LANGUAGE = "en"
export const STORAGE_KEY = "uloggd-language"

export const LANGUAGE_CONFIG = {
  pt: {
    code: "pt",
    name: "Português",
    nativeName: "Português",
    flag: "🇧🇷",
    dir: "ltr",
    dateLocale: "pt-BR",
    numberLocale: "pt-BR",
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    dir: "ltr",
    dateLocale: "en-US",
    numberLocale: "en-US",
  },
}

export const PLURAL_RULES = {
  pt: (n) => (n === 1 ? "one" : "other"),
  en: (n) => (n === 1 ? "one" : "other"),

}
