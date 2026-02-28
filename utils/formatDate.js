import { LANGUAGE_CONFIG } from "#lib/i18n/constants"
import { formatRelativeTime } from "#lib/i18n/utils"

function toUnix(date) {
  if (!date) return null
  if (typeof date === "number") return date
  if (date instanceof Date) {
    const ts = date.getTime()
    return isNaN(ts) ? null : Math.floor(ts / 1000)
  }
  if (typeof date === "string") {
    const ts = new Date(date).getTime()
    return isNaN(ts) ? null : Math.floor(ts / 1000)
  }
  return null
}

function toDate(date) {
  if (!date) return null
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date
  if (typeof date === "number") return new Date(date * 1000)
  if (typeof date === "string") {
    const d = new Date(date)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatDateShort(date, language = "pt") {
  const d = toDate(date)
  if (!d) return null
  const locale = LANGUAGE_CONFIG[language]?.dateLocale || "pt-BR"
  
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).replace(/\./g, "").replace(/ de /g, " ")
}

export function formatDateLong(date, language = "pt") {
  const d = toDate(date)
  if (!d) return null
  const locale = LANGUAGE_CONFIG[language]?.dateLocale || "pt-BR"
  
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}

export function getTimeAgo(date, language = "pt") {
  const d = toDate(date)
  if (!d) return null
  return formatRelativeTime(d, language)
}

export function getTimeAgoFromTimestamp(date, language = "pt") {
  return getTimeAgo(date, language)
}

export function getTimeAgoShort(date, language = "pt", t) {
  const unixSeconds = toUnix(date)
  if (!unixSeconds) return null
  
  const diff = Math.floor(Date.now() / 1000 - unixSeconds)
  
  if (diff < 60) return t("time.now")
  if (diff < 3600) return t("time.minutes", { count: Math.floor(diff / 60) })
  if (diff < 86400) return t("time.hours", { count: Math.floor(diff / 3600) })
  if (diff < 2592000) return t("time.days", { count: Math.floor(diff / 86400) })
  if (diff < 31536000) return t("time.months", { count: Math.floor(diff / 2592000) })
  return t("time.years", { count: Math.floor(diff / 31536000) })
}