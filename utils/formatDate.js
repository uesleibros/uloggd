export function formatDateShort(unixSeconds) {
  if (!unixSeconds) return null
  const date = new Date(unixSeconds * 1000)
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).replace(/\./g, "").replace(/ de /g, " ")
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