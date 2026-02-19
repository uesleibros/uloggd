import { escapeIGDB } from "./escapeIGDB.js"
import { generateVariations } from "./generateVariations.js"

export function buildNameFilter(raw) {
  const q = raw.trim()
  if (!q) return ""

  const queries = [q, ...generateVariations(q)]

  const parts = queries.map(term => {
    const words = term.split(/\s+/).filter(w => w.length >= 2)
    return words.length > 1
      ? words.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & ")
      : `name ~ *"${escapeIGDB(term)}"*`
  })

  const unique = [...new Set(parts)]
  return unique.length > 1 ? `(${unique.join(" | ")})` : unique[0]
}