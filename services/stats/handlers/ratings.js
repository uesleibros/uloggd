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
      .select("rating, status, created_at, liked, review")
      .eq("user_id", userId)
      .not("rating", "is", null)

    if (error) throw error

    if (!reviews || reviews.length === 0) {
      const empty = { total: 0 }
      await setCache(cacheKey, empty, 300)
      return res.json(empty)
    }

    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const byStatusAcc = {}
    const monthAcc = {}
    let sum = 0
    let liked = 0
    let reviewed = 0

    for (const r of reviews) {
      const rounded = Math.max(0, Math.min(5, Math.round(r.rating)))
      distribution[rounded]++
      sum += r.rating

      if (r.liked) liked++
      if (r.review && r.review.trim()) reviewed++

      const status = r.status || "played"
      if (!byStatusAcc[status]) byStatusAcc[status] = { count: 0, sum: 0 }
      byStatusAcc[status].count++
      byStatusAcc[status].sum += r.rating

      const d = new Date(r.created_at)
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!monthAcc[mk]) monthAcc[mk] = { count: 0, sum: 0 }
      monthAcc[mk].count++
      monthAcc[mk].sum += r.rating
    }

    const average = sum / reviews.length

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
    for (const [rating, count] of Object.entries(distribution)) {
      if (count > modeCount) {
        modeCount = count
        mode = parseInt(rating)
      }
    }

    const result = {
      total: reviews.length,
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
