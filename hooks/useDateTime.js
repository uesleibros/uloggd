import { useTranslation } from "#hooks/useTranslation"
import {
  formatDateShort,
  formatDateLong,
  getTimeAgo,
  getTimeAgoFromTimestamp,
  getTimeAgoShort
} from "#utils/formatDate"

export function useDateTime() {
  const { t, language } = useTranslation()

  return {
    formatDateShort: (date) => formatDateShort(date, language),
    formatDateLong: (date) => formatDateLong(date, language),
    getTimeAgo: (date) => getTimeAgo(date, language),
    getTimeAgoFromTimestamp: (date) => getTimeAgoFromTimestamp(date, language),
    getTimeAgoShort: (date) => getTimeAgoShort(date, language, t),
  }
}