import { getCache, setCache } from "#lib/cache.js"
import { fetchFinderWithRetry } from "#services/howlongtobeat/client.js"
import { buildQueries, scoreGame } from "#services/howlongtobeat/matcher.js"
import { HLTB_BASE, MIN_NAME_SCORE } from "#services/howlongtobeat/constants.js"

const secToHours = (s) => (s > 0 ? +(s / 3600).toFixed(1) : null)

async function findGame(name, altNames, year) {
  const queries = buildQueries(name, altNames)

  const results = await Promise.all(
    queries.map(terms => fetchFinderWithRetry(terms).catch(() => []))
  )

  const seen = new Map()
  for (const batch of results) {
    for (const g of batch) {
      if (!seen.has(g.game_id)) seen.set(g.game_id, g)
    }
  }

  const all = [...seen.values()]
  if (!all.length) return null

  const scored = all
    .map(g => ({ ...g, _score: scoreGame(g, name, altNames, year) }))
    .filter(g => g._score >= MIN_NAME_SCORE)
    .sort((a, b) => b._score - a._score)

  return scored[0] || null
}

export async function handleSearch(req, res) {
  const { name, altNames, year } = req.query
  if (!name?.trim()) return res.status(400).json({ error: "missing name" })

  const cacheKey = `hltb_${name.trim().toLowerCase().replace(/\s+/g, "_")}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const parsedAltNames = Array.isArray(altNames)
      ? altNames
      : altNames
        ? JSON.parse(altNames)
        : []

    const g = await findGame(
      name.trim(),
      parsedAltNames,
      year ? Number(year) : null
    )

    if (!g) {
      await setCache(cacheKey, null, 3600)
      return res.status(404).json({ error: "not found" })
    }

    const result = {
      id: g.game_id,
      name: g.game_name,
      image: g.game_image ? `${HLTB_BASE}/games/${g.game_image}` : null,
      releaseYear: g.release_world,
      reviewScore: g.review_score,
      platforms: g.profile_platform,
      times: {
        main: secToHours(g.comp_main),
        mainExtra: secToHours(g.comp_plus),
        completionist: secToHours(g.comp_100),
        allStyles: secToHours(g.comp_all),
      },
    }

    await setCache(cacheKey, result, 86400)

    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400")
    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
