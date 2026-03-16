import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"
import { getCache, setCache } from "#lib/cache.js"

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
      fields name, slug, first_release_date,
        cover.url,
        platforms.id,
        alternative_names.name,
        total_rating_count;
      where (${nameFilter} | ${altNameFilter}) & cover != null;
      sort total_rating_count desc;
      limit 20;
    `)

    const input = trimmed.toLowerCase()
    const inputWords = input.split(/\s+/)

    const games = data.map(g => {
      const name = g.name.toLowerCase()
      const altNames = g.alternative_names?.map(a => a.name.toLowerCase()) || []
      const allNames = [name, ...altNames]

      let relevance = 0

      for (const n of allNames) {
        let score = 0

        if (n === input) score = 100
        else if (n.startsWith(input)) score = 80
        else if (n.includes(input)) score = 60
        else {
          const matched = inputWords.filter(w => n.includes(w)).length
          score = (matched / inputWords.length) * 40
        }

        score -= n.length * 0.1

        if (score > relevance) relevance = score
      }

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
        total_rating_count: g.total_rating_count,
        relevance,
        platformIcons: [...slugs].sort().map(slug => ({
          name: slug,
          icon: `/platforms/result/${slug}.png`,
        })),
        cover: g.cover?.url
          ? { url: g.cover.url.replace("t_thumb", "t_cover_small") }
          : null,
      }
    })
      .sort((a, b) => b.relevance - a.relevance)

    await setCache(cacheKey, games, 300)

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300")
    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
