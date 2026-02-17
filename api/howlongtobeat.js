import { fetchFinderWithRetry } from "../services/howlongtobeat/client.js"
import { buildQueries, scoreGame } from "../services/howlongtobeat/matcher.js"
import { HLTB_BASE, MIN_NAME_SCORE } from "../services/howlongtobeat/constants.js"

const secToHours = (s) => (s > 0 ? +(s / 3600).toFixed(1) : null)

async function findGame(name, altNames, year) {
  const queries = buildQueries(name, altNames)
  const seen = new Map()

  for (const terms of queries) {
    const results = await fetchFinderWithRetry(terms)
    for (const g of results) {
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { name, altNames, year } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "missing name" })

  try {
    const g = await findGame(name.trim(), altNames || [], year || null)
    if (!g) return res.status(404).json({ error: "not found" })

    res.json({
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
    })
  } catch (e) {
    console.error("HLTB error:", e)
    res.status(500).json({ error: "fail" })
  }
}