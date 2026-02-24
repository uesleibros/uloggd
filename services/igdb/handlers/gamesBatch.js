import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handleGamesBatch(req, res) {
  const { slugs } = req.body
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: "missing slugs array" })
  }

  const uniqueSlugs = [...new Set(slugs)]
  const games = {}
  const uncached = []

  for (const slug of uniqueSlugs) {
    const cached = await getCache(`igdb_game_${slug}`)
    if (cached) {
      games[slug] = cached
    } else {
      uncached.push(slug)
    }
  }

  if (uncached.length === 0) {
    return res.json(games)
  }

  const CHUNK_SIZE = 50

  try {
    for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
      const chunk = uncached.slice(i, i + CHUNK_SIZE)
      const slugCondition = chunk.map(s => `"${s}"`).join(",")

      const data = await query("games", `
        fields name, slug, summary, first_release_date,
               cover.url, cover.image_id,
               artworks.url, artworks.image_id,
               platforms.name, platforms.id, genres.name,
               involved_companies.company.name, involved_companies.developer;
        where slug = (${slugCondition});
        limit ${chunk.length};
      `)

      for (const g of data) {
        const game = {
          ...g,
          developers: g.involved_companies?.filter(c => c.developer).map(c => c.company.name) || [],
          platforms: g.platforms?.slice().sort((a, b) => a.name.localeCompare(b.name)) || [],
          cover: g.cover?.url ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_1080p") } : null,
          artworks: g.artworks?.map(a => ({ ...a, url: a.url.replace("t_thumb", "t_original") })) || []
        }

        games[g.slug] = game
        await setCache(`igdb_game_${g.slug}`, game)
      }
    }

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
