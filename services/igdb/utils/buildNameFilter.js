import { escapeIGDB } from "./escapeIGDB.js"
import { generateVariations } from "./generateVariations.js"

export function buildNameFilter(raw) {
  const q = raw.trim()
  const words = q.split(/\s+/).filter(w => w.length >= 2)
  const variations = generateVariations(q)
  const parts = []

  if (words.length > 1) {
    parts.push(words.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & "))
  }

  variations.forEach(v => {
    const vWords = v.split(/\s+/).filter(w => w.length >= 2)
    if (vWords.length > 1) {
      parts.push(vWords.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & "))
    } else {
      parts.push(`name ~ *"${escapeIGDB(v)}"*`)
    }
  })

  const unique = [...new Set(parts)]
  return unique.length > 1 ? `(${unique.join(" | ")})` : unique[0]
}