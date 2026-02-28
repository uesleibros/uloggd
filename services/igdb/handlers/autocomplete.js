import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { escapeIGDB } from "#services/igdb/utils/escapeIGDB.js"

export async function handleAutocomplete(req, res) {
  const { query: q } = req.query
  if (!q?.trim()) return res.status(400).json({ error: "missing query" })

  const input = q.trim()
  if (input.length < 2) return res.json([])

  try {
    const escaped = escapeIGDB(input)

    const data = await query("games", `
      search "${escaped}";
      fields name, slug, first_release_date,
        cover.image_id,
        platforms.id,
        total_rating, total_rating_count, game_type;
      where cover != null & game_type = (0, 2, 4, 8, 9);
      limit 15;
    `)

    const inputLower = input.toLowerCase()

    const games = data.map((g, i) => {
      const name = g.name.toLowerCase()
      let relevance = 1000 - i * 10

      if (name === inputLower) relevance += 500
      else if (name.startsWith(inputLower)) relevance += 300
      else if (name.includes(inputLower)) relevance += 100

      relevance += Math.min((g.total_rating_count || 0) / 50, 30)

      const slugs = new Set()
      g.platforms?.forEach(p => {
        const slug = PLATFORMS_MAP[String(p.id)]
        if (slug) slugs.add(slug)
      })

      return {
        id: g.id,
        name: g.name,
        slug: g.slug,
        year: g.first_release_date
          ? new Date(g.first_release_date * 1000).getFullYear()
          : null,
        relevance,
        cover: g.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg`
          : null,
        platformIcons: [...slugs].sort().map(slug => ({
          name: slug,
          icon: `/platforms/result/${slug}.png`,
        })),
      }
    })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10)

    res.json(games)
  } catch (e) {
    console.error("autocomplete error:", e)
    res.status(500).json({ error: "autocomplete failed" })
  }
}
