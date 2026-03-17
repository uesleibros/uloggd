import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handleRatingStats(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "Missing userId" })

  const cacheKey = `rating_stats_${userId}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("rating, status, created_at, liked, review, aspect_ratings")
      .eq("user_id", userId)

    if (error) throw error

    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const byStatusAcc = {}
    const monthAcc = {}
    let sum = 0
    let count = 0
    let liked = 0
    let reviewed = 0

    for (const r of reviews || []) {
      if (r.liked) liked++
      if (r.review && r.review.trim()) reviewed++

      const ratings = []

      if (r.rating !== null && r.rating !== undefined && r.rating !== "") {
        const parsed = parseFloat(r.rating)
        if (!isNaN(parsed)) ratings.push(parsed / 20)
      }

      let aspects = r.aspect_ratings
      if (typeof aspects === "string") {
        try { aspects = JSON.parse(aspects) } catch { aspects = null }
      }

      if (Array.isArray(aspects)) {
        for (const aspect of aspects) {
          if (aspect.rating === null || aspect.rating === undefined) continue
          const parsed = parseFloat(aspect.rating)
          if (isNaN(parsed)) continue

          const mode = aspect.ratingMode || "stars_5h"
          let normalized
          switch (mode) {
            case "stars_5":
              normalized = parsed / 20
              break
            case "stars_5h":
              normalized = parsed / 20
              break
            case "points_10":
              normalized = parsed / 20
              break
            case "points_10d":
              normalized = parsed / 20
              break
            case "points_100":
              normalized = parsed / 20
              break
            default:
              normalized = parsed / 20
          }

          ratings.push(normalized)
        }
      }

      if (ratings.length === 0) continue

      for (const normalized of ratings) {
        const rounded = Math.max(0, Math.min(5, Math.round(normalized)))
        distribution[rounded]++
        sum += normalized
        count++
      }

      const status = r.status || "played"
      if (!byStatusAcc[status]) byStatusAcc[status] = { count: 0, sum: 0 }
      byStatusAcc[status].count += ratings.length
      byStatusAcc[status].sum += ratings.reduce((a, b) => a + b, 0)

      const d = new Date(r.created_at)
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!monthAcc[mk]) monthAcc[mk] = { count: 0, sum: 0 }
      monthAcc[mk].count += ratings.length
      monthAcc[mk].sum += ratings.reduce((a, b) => a + b, 0)
    }

    const average = count > 0 ? sum / count : 0

    const byStatus = {}
    for (const [s, d] of Object.entries(byStatusAcc)) {
      byStatus[s] = {
        count: d.count,
        average: d.count > 0 ? d.sum / d.count : 0,
      }
    }

    const now = new Date()
    const byMonth = []
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
      const md = monthAcc[key] || { count: 0, sum: 0 }
      byMonth.push({
        month: key,
        count: md.count,
        average: md.count > 0 ? md.sum / md.count : 0,
      })
    }

    let mode = 0
    let modeCount = 0
    for (const [rating, c] of Object.entries(distribution)) {
      if (c > modeCount) {
        modeCount = c
        mode = parseInt(rating)
      }
    }

    const result = {
      total: count,
      average,
      distribution,
      byMonth,
      byStatus,
      liked,
      reviewed,
      mode,
    }

    await setCache(cacheKey, result, 300)
    return res.json(result)
  } catch (e) {
    console.error("[Rating Stats]", e.message)
    return res.status(500).json({ error: "Failed" })
  }
}
