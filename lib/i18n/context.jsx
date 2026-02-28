import { createContext, useState, useEffect, useCallback, useMemo } from "react"
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  STORAGE_KEY,
  LANGUAGE_CONFIG,
} from "./constants"
import {
  getNestedValue,
  interpolate,
  handlePlural,
  detectBrowserLanguage,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getLanguageDirection,
} from "./utils"

import pt from "@/locales/pt"
import en from "@/locales/en"

const translations = { pt, en }

export const LanguageContext = createContext(null)

export function LanguageProvider({ children, defaultLanguage }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === "undefined") return defaultLanguage || DEFAULT_LANGUAGE

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored

    return detectBrowserLanguage(SUPPORTED_LANGUAGES, defaultLanguage || DEFAULT_LANGUAGE)
  })

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = getLanguageDirection(language)
    setIsReady(true)
  }, [language])

  const setLanguage = useCallback((lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      console.warn(`Language "${lang}" is not supported. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`)
      return false
    }

    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
    return true
  }, [])

  const t = useCallback((key, params = {}) => {
    let value = getNestedValue(translations[language], key)

    if (value === undefined) {
      value = getNestedValue(translations[FALLBACK_LANGUAGE], key)
    }

    if (value === undefined) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`Missing translation: "${key}" [${language}]`)
      }
      return key
    }

    if (typeof params.count === "number") {
      value = handlePlural(value, params.count, language)
    }

    return interpolate(value, params)
  }, [language])

  const hasTranslation = useCallback((key) => {
    return getNestedValue(translations[language], key) !== undefined
  }, [language])

  const getLanguageConfig = useCallback((lang = language) => {
    return LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG[FALLBACK_LANGUAGE]
  }, [language])

  const formatters = useMemo(() => ({
    number: (value, options) => formatNumber(value, language, options),
    currency: (value, currency) => formatCurrency(value, language, currency),
    date: (date, options) => formatDate(date, language, options),
    relativeTime: (date) => formatRelativeTime(date, language),
  }), [language])

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    hasTranslation,
    isReady,
    languages: SUPPORTED_LANGUAGES,
    languageConfig: LANGUAGE_CONFIG,
    getLanguageConfig,
    format: formatters,
  }), [language, setLanguage, t, hasTranslation, isReady, getLanguageConfig, formatters])

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}