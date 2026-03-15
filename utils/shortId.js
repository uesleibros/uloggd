const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const BASE = BigInt(CHARS.length)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function encode(id) {
  if (typeof id !== "string") return String(id)
  if (!UUID_REGEX.test(id)) return id

  const hex = id.replace(/-/g, "")
  let num = BigInt("0x" + hex)
  if (num === 0n) return CHARS[0]

  let result = ""
  while (num > 0n) {
    result = CHARS[Number(num % BASE)] + result
    num /= BASE
  }
  return result
}

export function decode(shortId) {
  if (UUID_REGEX.test(shortId)) return shortId

  let num = 0n
  for (const char of shortId) {
    const idx = CHARS.indexOf(char)
    if (idx === -1) return shortId
    num = num * BASE + BigInt(idx)
  }

  const hex = num.toString(16).padStart(32, "0")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-")
}