import { useContext, useCallback } from "react"
import { LanguageContext } from "#lib/i18n"

export function useTranslation(namespace) {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }

  const { t: translate, ...rest } = context

  const t = useCallback((key, params = {}) => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    return translate(fullKey, params)
  }, [translate, namespace])

  return { t, ...rest }
}