import { query } from "#lib/igdbWrapper.js"
import { supabase } from "#lib/supabase-ssr.js"

export async function handleGamesBatch(req, res) {
  const rawSlugs = req.query.slugs
  
  const slugs = Array.isArray(rawSlugs) ? rawSlugs : rawSlugs ? [rawSlugs] : []
  
  if (slugs.length === 0) {
    return res.status(400).json({ error: "missing slugs array" })
  }

  const uniqueSlugs = [...new Set(slugs)]
  const games = {}
  const now = new Date().toISOString()

  const { data: cached } = await supabase
    .from("api_cache")
    .select("key, data")
    .in("key", uniqueSlugs.map(s => `igdb_game_${s}`))
    .gt("expires_at", now)

  const cachedSlugs = new Set()
  for (const row of (cached || [])) {
    const slug = row.key.replace("igdb_game_", "")
    games[slug] = row.data
    cachedSlugs.add(slug)
  }

  const uncached = uniqueSlugs.filter(s => !cachedSlugs.has(s))

  if (uncached.length === 0) {
    return res.json(games)
  }

  const CHUNK_SIZE = 50

  try {
    const chunks = []
    for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
      chunks.push(uncached.slice(i, i + CHUNK_SIZE))
    }

    const results = await Promise.all(
      chunks.map(chunk => {
        const slugCondition = chunk.map(s => `"${s}"`).join(",")
        return query("games", `
          fields name, slug, summary, first_release_date,
                 cover.url, cover.image_id,
                 artworks.url, artworks.image_id,
                 platforms.name, platforms.id, genres.name,
                 involved_companies.company.name, involved_companies.developer;
          where slug = (${slugCondition});
          limit ${chunk.length};
        `)
      })
    )

    const toCache = []
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString()

    for (const data of results) {
      for (const g of data) {
        const game = {
          ...g,
          developers: g.involved_companies?.filter(c => c.developer).map(c => c.company.name) || [],
          platforms: g.platforms?.slice().sort((a, b) => a.name.localeCompare(b.name)) || [],
          cover: g.cover?.url ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_1080p") } : null,
          artworks: g.artworks?.map(a => ({ ...a, url: a.url.replace("t_thumb", "t_original") })) || []
        }

        games[g.slug] = game
        toCache.push({
          key: `igdb_game_${g.slug}`,
          data: game,
          created_at: now,
          expires_at: expiresAt
        })
      }
    }

    if (toCache.length > 0) {
      supabase.from("api_cache").upsert(toCache)
    }

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}