import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"
import { getCache, setCache } from "#lib/cache.js"

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

    let orderBy = "total_rating_count desc"
    if (sort === "name") orderBy = "name asc"
    else if (sort === "newest") orderBy = "first_release_date desc"
    else if (sort === "rating") orderBy = "total_rating desc"

    const [data, countData] = await Promise.all([
      query("games", `
        fields name, slug, first_release_date,
          cover.url,
          platforms.id,
          total_rating, total_rating_count, game_type,
          summary;
        where ${whereClause};
        sort ${orderBy};
        limit ${limitNum};
        offset ${offsetNum};
      `),
      query("games/count", `where ${whereClause};`),
    ])

    const input = trimmed.toLowerCase()
    const inputWords = input.split(/\s+/)

    const results = data.map(g => {
      const name = g.name.toLowerCase()

      let relevance = 0

      if (name === input) {
        relevance = 100
      } else if (name.startsWith(input)) {
        relevance = 80
      } else if (name.includes(input)) {
        relevance = 60
      } else {
        const matched = inputWords.filter(w => name.includes(w)).length
        relevance = (matched / inputWords.length) * 40
      }

      relevance -= name.length * 0.1
      relevance += Math.min((g.total_rating_count || 0) / 100, 20)

      const slugs = new Set()
      g.platforms?.forEach(p => {
        const slug = PLATFORMS_MAP[String(p.id)]
        if (slug) slugs.add(slug)
      })

      return {
        id: g.id,
        name: g.name,
        slug: g.slug,
        first_release_date: g.first_release_date,
        total_rating: g.total_rating,
        total_rating_count: g.total_rating_count,
        game_type: g.game_type,
        summary: g.summary,
        relevance,
        platformIcons: [...slugs].sort().map(slug => ({
          name: slug,
          icon: `/platforms/result/${slug}.png`,
        })),
        cover: g.cover?.url
          ? { url: g.cover.url.replace("t_thumb", "t_cover_big") }
          : null,
      }
    })
      .sort((a, b) => {
        if (sort === "relevance") return b.relevance - a.relevance
        return 0
      })

    const result = { results, total: countData?.count ?? results.length }

    await setCache(cacheKey, result, 300)

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300")
    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
