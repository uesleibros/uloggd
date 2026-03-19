import { query } from "#lib/igdbWrapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"
import { transformGameResult, sortByRelevance } from "#services/igdb/utils/transformGame.js"
import { getCache, setCache } from "#lib/cache.js"

const AUTOCOMPLETE_FIELDS = `
  fields name, slug, first_release_date,
    cover.url,
    platforms.id,
    alternative_names.name,
    total_rating_count,
    game_type,
    version_title,
    parent_game.name;
`

export async function handleAutocomplete(req, res) {
  const { query: q } = req.query
  if (!q?.trim()) return res.status(400).json({ error: "missing query" })

  const trimmed = q.trim()
  const cacheKey = `autocomplete_${trimmed.toLowerCase().replace(/\s+/g, "_")}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const nameFilter = buildNameFilter(trimmed)
    const altNameFilter = nameFilter.replace(/\bname\b/g, "alternative_names.name")

    const data = await query("games", `
      ${AUTOCOMPLETE_FIELDS}
      where (${nameFilter} | ${altNameFilter}) & cover != null;
      sort total_rating_count desc;
      limit 20;
    `)

    const games = sortByRelevance(
      data.map(g => transformGameResult(g, {
        coverSize: "t_cover_small",
        includeRelevance: true,
        searchInput: trimmed,
      }))
    )

    await setCache(cacheKey, games, 300)

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300")
    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
