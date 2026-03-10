export function sanitize(str, maxLength) {
  if (typeof str !== "string") return null
  const trimmed = str.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export function safePlatform(id) {
  if (id == null) return null
  const num = Number(id)
  return Number.isInteger(num) && num > 0 ? num : null
}
