export function formatDateShort(unixSeconds) {
  if (!unixSeconds) return null
  const date = new Date(unixSeconds * 1000)
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).replace(/\./g, "").replace(/ de /g, " ")
}

export function getTimeAgoFromTimestamp(unixSeconds) {
  if (!unixSeconds) return null
  const diff = Math.floor(Date.now() / 1000 - unixSeconds)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d atrás`
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}m atrás`
  return `${Math.floor(diff / 31536000)}a atrás`
}

export function formatDateLong(unixSeconds) {
  if (!unixSeconds) return null
  const date = new Date(unixSeconds * 1000)
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}

export function getTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`
  return `${Math.floor(diff / 2592000)}m`

}
