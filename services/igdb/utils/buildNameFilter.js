import { escapeIGDB } from "#services/igdb/utils/escapeIGDB.js"
import { generateVariations } from "#services/igdb/utils/generateVariations.js"

const MIN_WORD = 2

export function buildNameFilter(raw) {
  const q = (raw || "").trim().replace(/\s+/g, " ")
  if (!q) return ""

  const terms = [...new Set(
    [q, ...generateVariations(q)]
      .map(t => t.trim())
      .filter(Boolean)
  )]

  const filters = new Set()

  for (const term of terms) {
    const words = term
      .split(/\s+/)
      .filter(w => escapeIGDB(w).length >= MIN_WORD)

    if (!words.length) continue

    const filter = words.length > 1
      ? words.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & ")
      : `name ~ *"${escapeIGDB(words[0])}"*`

    filters.add(filter)
  }

  if (!filters.size) {
    const escaped = escapeIGDB(q)
    if (escaped.length < MIN_WORD) return ""
    return `name ~ *"${escaped}"*`
  }

  const parts = [...filters]
  return parts.length > 1 ? `(${parts.join(" | ")})` : parts[0]
}
