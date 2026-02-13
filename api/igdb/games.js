import { query } from "../../lib/igdb-wrapper.js"
import { PLATFORMS_MAP, PLATFORM_PRIORITY } from "../../data/platformsMapper.js"

function escapeIGDB(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function buildNameFilter(raw) {
  const q = raw.trim()
  const words = q.split(/\s+/).filter(w => w.length >= 2)

  if (words.length > 1) {
    return words.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & ")
  }

  const escaped = escapeIGDB(q)
  const parts = [`name ~ *"${escaped}"*`]

  if (q.length >= 6) {
    for (let i = 3; i <= q.length - 3; i++) {
      const l = escapeIGDB(q.substring(0, i))
      const r = escapeIGDB(q.substring(i))
      parts.push(`(name ~ *"${l}"* & name ~ *"${r}"*)`)
    }
  }

  return parts.length > 1 ? `(${parts.join(" | ")})` : parts[0]
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

    const games = data.map(g => {
      const slugs = new Set()

      g.platforms?.forEach(p => {
        const slug = PLATFORMS_MAP[String(p.id)]
        if (slug) slugs.add(slug)
      })

      const platformIcons = [...slugs]
        .sort((a, b) => (PLATFORM_PRIORITY[a] ?? 99) - (PLATFORM_PRIORITY[b] ?? 99))
        .map(slug => ({
          name: slug,
          icon: `/platforms/${slug}.png`
        }))

      return {
        ...g,
        platformIcons,
        cover: g.cover?.url
          ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_logo_med") }
          : null
      }
    })

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}