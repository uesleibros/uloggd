import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"
import { FEATURED_SLUGS } from "#services/igdb/constants.js"

export async function handleUsersChoice(req, res) {
  const cacheKey = "igdb_users_choice"
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const slugList = FEATURED_SLUGS.map(s => `"${s}"`).join(",")
    const data = await query("games", `
      fields name, slug, cover.url, cover.image_id, total_rating;
      where slug = (${slugList});
      limit ${FEATURED_SLUGS.length};
    `)

    const games = data.map(g => ({
      ...g,
      cover: g.cover?.url ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") } : null
    }))

    await setCache(cacheKey, games, 86400)
    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
