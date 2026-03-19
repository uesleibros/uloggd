import { query } from "#lib/igdbWrapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"
import { transformGameResult, sortByRelevance } from "#services/igdb/utils/transformGame.js"
import { getCache, setCache } from "#lib/cache.js"

const SEARCH_FIELDS = `
  fields name, slug, first_release_date,
    cover.url,
    platforms.id,
    alternative_names.name,
    total_rating, total_rating_count,
    game_type,
    version_title,
    parent_game.name,
    summary;
`

const SORT_OPTIONS = {
  relevance: "total_rating_count desc",
  name: "name asc",
  newest: "first_release_date desc",
  rating: "total_rating desc",
}

export async function handleSearch(req, res) {
  const { query: q, limit = 50, offset = 0, sort = "relevance" } = req.query
  if (!q?.trim()) return res.status(400).json({ results: [], total: 0 })

  const trimmed = q.trim()
  const limitNum = Math.min(Number(limit), 50)
  const offsetNum = Number(offset)

  const cacheKey = `search_${trimmed.toLowerCase().replace(/\s+/g, "_")}_${sort}_${offsetNum}_${limitNum}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const nameFilter = buildNameFilter(trimmed)
    const altNameFilter = nameFilter.replace(/\bname\b/g, "alternative_names.name")
    const whereClause = `(${nameFilter} | ${altNameFilter})`
    const orderBy = SORT_OPTIONS[sort] || SORT_OPTIONS.relevance

    const [data, countData] = await Promise.all([
      query("games", `
        ${SEARCH_FIELDS}
        where ${whereClause};
        sort ${orderBy};
        limit ${limitNum};
        offset ${offsetNum};
      `),
      query("games/count", `where ${whereClause};`),
    ])

    let results = data.map(g => transformGameResult(g, {
      coverSize: "t_cover_big",
      includeRelevance: true,
      searchInput: trimmed,
    }))

    if (sort === "relevance") {
      results = sortByRelevance(results)
    }

    const result = { results, total: countData?.count ?? results.length }

    await setCache(cacheKey, result, 300)

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300")
    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
