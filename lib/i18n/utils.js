import { PLURAL_RULES, FALLBACK_LANGUAGE, LANGUAGE_CONFIG } from "./constants"

export function getNestedValue(obj, path) {
  const keys = path.split(".")
  let value = obj

  for (const key of keys) {
    if (value === null || value === undefined) return undefined
    value = value[key]
  }

  return value
}

export function interpolate(str, params = {}) {
  if (typeof str !== "string") return str

  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in params) {
      return String(params[key])
    }
    return match
  })
}

export function handlePlural(value, count, language) {
  if (typeof value !== "object" || value === null) return value

  const pluralFn = PLURAL_RULES[language] || PLURAL_RULES[FALLBACK_LANGUAGE]
  const pluralForm = pluralFn(count)

  if (value[pluralForm] !== undefined) return value[pluralForm]
  if (value.other !== undefined) return value.other
  if (value.one !== undefined) return value.one

  return Object.values(value)[0]
}

export function detectBrowserLanguage(supportedLanguages, fallback) {
  if (typeof navigator === "undefined") return fallback

  const browserLangs = navigator.languages || [navigator.language]

  for (const lang of browserLangs) {
    const code = lang.split("-")[0].toLowerCase()
    if (supportedLanguages.includes(code)) return code
  }

  return fallback
}

export function formatNumber(value, language, options = {}) {
  const config = LANGUAGE_CONFIG[language]
  if (!config) return String(value)

  try {
    return new Intl.NumberFormat(config.numberLocale, options).format(value)
  } catch {
    return String(value)
  }
}

export function formatCurrency(value, language, currency = "BRL") {
  return formatNumber(value, language, {
    style: "currency",
    currency: language === "en" ? "USD" : currency,
  })
}

export function formatDate(date, language, options = {}) {
  const config = LANGUAGE_CONFIG[language]
  if (!config) return String(date)

  const dateObj = date instanceof Date ? date : new Date(date)

  if (isNaN(dateObj.getTime())) return String(date)

  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }

  try {
    return new Intl.DateTimeFormat(config.dateLocale, defaultOptions).format(dateObj)
  } catch {
    return String(date)
  }
}

export function formatRelativeTime(date, language) {
  const config = LANGUAGE_CONFIG[language]
  if (!config) return String(date)

  const dateObj = date instanceof Date ? date : new Date(date)
  if (isNaN(dateObj.getTime())) return String(date)

  const diffSec = Math.floor((dateObj.getTime() - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)

  try {
    const rtf = new Intl.RelativeTimeFormat(config.dateLocale, { numeric: "auto" })

    if (absSec < 60) {
      return rtf.format(diffSec, "second")
    }

    if (absSec < 3600) {
      const minutes = Math.floor(diffSec / 60)
      return rtf.format(minutes, "minute")
    }

    if (absSec < 86400) {
      const hours = Math.floor(diffSec / 3600)
      return rtf.format(hours, "hour")
    }

    if (absSec < 604800) {
      const days = Math.floor(diffSec / 86400)
      return rtf.format(days, "day")
    }

    if (absSec < 2592000) {
      const weeks = Math.floor(diffSec / 604800)
      return rtf.format(weeks, "week")
    }

    if (absSec < 31536000) {
      const months = Math.floor(diffSec / 2592000)
      return rtf.format(months, "month")
    }

    const years = Math.floor(diffSec / 31536000)
    return rtf.format(years, "year")
  } catch {
    return formatDate(date, language)
  }
}


export function getLanguageDirection(language) {
  return LANGUAGE_CONFIG[language]?.dir || "ltr"
}