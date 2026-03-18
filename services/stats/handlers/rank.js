import { getCache, setCache } from "#lib/cache.js"
import { getGlobalScores } from "../utils/scores.js"

const CACHE_TTL = 300

export async function handleRank(req, res) {
  const { userId } = req.query

  if (!userId) return res.status(400).json({ error: "missing userId" })

  try {
    const cacheKey = `global_rank_${userId}`
    const cached = await getCache(cacheKey)
    if (cached) return res.json(cached)

    const scores = await getGlobalScores()
    const total = scores.length

    const userIndex = scores.findIndex(s => s.user_id === userId)

    if (userIndex === -1) {
      const result = { rank: null, total, score: 0, percentile: 0, breakdown: null }
      await setCache(cacheKey, result, CACHE_TTL)
      return res.json(result)
    }

    const userScore = scores[userIndex]
    const rank = userIndex + 1
    const percentile = total > 0 ? Math.round((1 - (rank - 1) / total) * 100) : 0

    const result = {
      rank,
      total,
      score: userScore.value,
      percentile,
      breakdown: userScore.breakdown,
    }

    await setCache(cacheKey, result, CACHE_TTL)
    return res.json(result)
  } catch (e) {
    console.error("[Rank]", e.message)
    return res.status(500).json({ error: "fail" })
  }
}
