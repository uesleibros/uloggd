import { query } from "../../lib/igdb-wrapper.js"
import { PLATFORMS_MAP } from "../../data/platformsMapper.js"

function escapeIGDB(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function generateVariations(q) {
  const variations = new Set()
  const lower = q.toLowerCase().trim()

  variations.add(lower)

  variations.add(lower.replace(/\s+/g, ""))

  variations.add(lower.replace(/([a-z])([A-Z])/g, "$1 $2"))

  if (!lower.includes(" ")) {
    const splits = []
    for (let i = 2; i <= lower.length - 2; i++) {
      splits.push(lower.slice(0, i) + " " + lower.slice(i))
    }
    splits.forEach(s => variations.add(s))
  }

  if (lower.includes(" ")) {
    variations.add(lower.replace(/\s+/g, "-"))
    variations.add(lower.replace(/\s+/g, ""))
  }
  if (lower.includes("-")) {
    variations.add(lower.replace(/-/g, " "))
    variations.add(lower.replace(/-/g, ""))
  }

  const numberMap = {
    "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v",
    "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
  }
  const romanMap = Object.fromEntries(Object.entries(numberMap).map(([k, v]) => [v, k]))

  variations.forEach(v => {
    const withRoman = v.replace(/\b(\d+)\b/g, (_, n) => numberMap[n] || n)
    if (withRoman !== v) variations.add(withRoman)

    const withArabic = v.replace(/\b(i{1,3}|iv|vi{0,3}|ix|x)\b/gi, (m) => romanMap[m.toLowerCase()] || m)
    if (withArabic !== v) variations.add(withArabic)
  })

  const prefixMap = {
    "re": ["re-", "re "],
    "pre": ["pre-", "pre "],
    "un": ["un-", "un "],
    "non": ["non-", "non "],
    "mega": ["mega "],
    "super": ["super "],
    "ultra": ["ultra "],
    "mini": ["mini "],
    "micro": ["micro "],
    "neo": ["neo "],
    "bio": ["bio "],
    "cyber": ["cyber "],
  }

  variations.forEach(v => {
    for (const [prefix, replacements] of Object.entries(prefixMap)) {
      if (v.startsWith(prefix) && v.length > prefix.length && v[prefix.length] !== " " && v[prefix.length] !== "-") {
        replacements.forEach(r => variations.add(r + v.slice(prefix.length)))
      }
      replacements.forEach(r => {
        if (v.startsWith(r)) {
          variations.add(prefix + v.slice(r.length))
        }
      })
    }
  })

  const suffixMap = {
    "man": [" man"],
    "boy": [" boy"],
    "craft": [" craft"],
    "vania": [" vania"],
    "world": [" world"],
    "land": [" land"],
    "star": [" star"],
    "fire": [" fire"],
    "ball": [" ball"],
    "blade": [" blade"],
    "soul": [" soul"],
    "born": [" born"],
    "bound": [" bound"],
  }

  variations.forEach(v => {
    for (const [suffix, replacements] of Object.entries(suffixMap)) {
      if (v.endsWith(suffix) && v.length > suffix.length) {
        const before = v.slice(0, -suffix.length)
        if (before[before.length - 1] !== " " && before[before.length - 1] !== "-") {
          replacements.forEach(r => variations.add(before + r))
        }
      }
      replacements.forEach(r => {
        if (v.endsWith(r)) {
          variations.add(v.slice(0, -r.length) + suffix)
        }
      })
    }
  })

  return [...variations].filter(v => v.length >= 2)
}

function buildNameFilter(raw) {
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query: q } = req.body
  if (!q?.trim()) return res.status(400).json({ error: "missing query" })

  try {
    const nameFilter = buildNameFilter(q)

    const data = await query("games", `
      fields name, slug, first_release_date,
             cover.url, cover.image_id,
             platforms.id, platforms.name, platforms.abbreviation,
             total_rating, total_rating_count,
             game_type;
      where ${nameFilter}
        & game_type = (0,2,4,8,9,10)
        & cover != null;
      sort total_rating_count desc;
      limit 30;
    `)

    const input = q.toLowerCase().trim()

    const games = data
      .map(g => {
        const name = g.name.toLowerCase()
        let relevance = 0

        if (name === input) relevance = 100
        else if (name.startsWith(input)) relevance = 80
        else if (name.includes(input)) relevance = 60
        else {
          const inputWords = input.split(/\s+/)
          const matched = inputWords.filter(w => name.includes(w)).length
          relevance = (matched / inputWords.length) * 40
        }

        relevance += Math.min((g.total_rating_count || 0) / 100, 20)

        const slugs = new Set()
        g.platforms?.forEach(p => {
          const slug = PLATFORMS_MAP[String(p.id)]
          if (slug) slugs.add(slug)
        })

        const platformIcons = [...slugs]
          .sort((a, b) => a.localeCompare(b))
          .map(slug => ({
            name: slug,
            icon: `/platforms/out/${slug}.png`
          }))

        return {
          ...g,
          relevance,
          platformIcons,
          cover: g.cover?.url
            ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_logo_med") }
            : null
        }
      })
      .sort((a, b) => b.relevance - a.relevance)

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}