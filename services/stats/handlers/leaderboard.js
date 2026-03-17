import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"
import { findManyByIds, resolveStreams, formatUserMap } from "#models/users/index.js"

const MINERAL_WEIGHTS = {
  copper: 1,
  iron: 5,
  gold: 25,
  emerald: 125,
  diamond: 625,
  ruby: 3125,
}

const CACHE_TTL = 300

export async function handleLeaderboard(req, res) {
  const { category = "minerals", limit = 10, page = 1 } = req.query

  const validCategories = ["minerals", "reviews", "followers", "likes"]
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category" })
  }

  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50)
  const pageNum = Math.max(parseInt(page) || 1, 1)
  const offset = (pageNum - 1) * limitNum

  const cacheKey = `leaderboard_${category}_${limitNum}_${pageNum}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    let entries = []
    let total = 0

    switch (category) {
      case "minerals":
        ({ entries, total } = await getMineralsLeaderboard(limitNum, offset))
        break
      case "reviews":
        ({ entries, total } = await getReviewsLeaderboard(limitNum, offset))
        break
      case "followers":
        ({ entries, total } = await getFollowersLeaderboard(limitNum, offset))
        break
      case "likes":
        ({ entries, total } = await getLikesLeaderboard(limitNum, offset))
        break
    }

    const userIds = entries.map(e => e.user_id).filter(Boolean)
    const users = await getFormattedUsers(userIds)

    const data = entries.map(entry => ({
      ...entry,
      user: users[entry.user_id] || null,
    }))

    const result = {
      category,
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
    }

    await setCache(cacheKey, result, CACHE_TTL)
    return res.json(result)
  } catch (e) {
    console.error("[Leaderboard]", e.message)
    return res.status(500).json({ error: "Failed to fetch leaderboard" })
  }
}

async function getFormattedUsers(userIds) {
  if (!userIds.length) return {}

  const profiles = await findManyByIds(userIds)
  const streamsMap = await resolveStreams(profiles)
  return formatUserMap(profiles, streamsMap)
}

async function getMineralsLeaderboard(limit, offset) {
  const { data: minerals, error } = await supabase
    .from("user_minerals")
    .select("user_id, copper, iron, gold, emerald, diamond, ruby")

  if (error) throw error

  const scored = (minerals || []).map(m => ({
    user_id: m.user_id,
    value: (m.copper || 0) * MINERAL_WEIGHTS.copper +
           (m.iron || 0) * MINERAL_WEIGHTS.iron +
           (m.gold || 0) * MINERAL_WEIGHTS.gold +
           (m.emerald || 0) * MINERAL_WEIGHTS.emerald +
           (m.diamond || 0) * MINERAL_WEIGHTS.diamond +
           (m.ruby || 0) * MINERAL_WEIGHTS.ruby,
    breakdown: {
      copper: m.copper || 0,
      iron: m.iron || 0,
      gold: m.gold || 0,
      emerald: m.emerald || 0,
      diamond: m.diamond || 0,
      ruby: m.ruby || 0,
    },
  }))

  scored.sort((a, b) => b.value - a.value)

  const total = scored.length
  const paginated = scored.slice(offset, offset + limit)

  const entries = paginated.map((item, i) => ({
    rank: offset + i + 1,
    user_id: item.user_id,
    value: item.value,
    breakdown: item.breakdown,
  }))

  return { entries, total }
}

async function getReviewsLeaderboard(limit, offset) {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("user_id, rating")

  if (error) throw error

  const statsMap = {}
  for (const r of reviews || []) {
    if (!statsMap[r.user_id]) {
      statsMap[r.user_id] = { count: 0, ratingSum: 0, ratingCount: 0 }
    }
    statsMap[r.user_id].count++
    if (r.rating !== null && r.rating !== "") {
      const parsed = parseFloat(r.rating)
      if (!isNaN(parsed)) {
        statsMap[r.user_id].ratingSum += parsed / 20
        statsMap[r.user_id].ratingCount++
      }
    }
  }

  const sorted = Object.entries(statsMap)
    .map(([user_id, stats]) => ({
      user_id,
      value: stats.count,
      avgRating: stats.ratingCount > 0
        ? parseFloat((stats.ratingSum / stats.ratingCount).toFixed(1))
        : null,
    }))
    .sort((a, b) => b.value - a.value)

  const total = sorted.length
  const paginated = sorted.slice(offset, offset + limit)

  const entries = paginated.map((item, i) => ({
    rank: offset + i + 1,
    user_id: item.user_id,
    value: item.value,
    avgRating: item.avgRating,
  }))

  return { entries, total }
}

async function getFollowersLeaderboard(limit, offset) {
  const { data: follows, error } = await supabase
    .from("follows")
    .select("following_id")

  if (error) throw error

  const countMap = {}
  for (const f of follows || []) {
    countMap[f.following_id] = (countMap[f.following_id] || 0) + 1
  }

  const sorted = Object.entries(countMap)
    .map(([user_id, count]) => ({ user_id, value: count }))
    .sort((a, b) => b.value - a.value)

  const total = sorted.length
  const paginated = sorted.slice(offset, offset + limit)

  const entries = paginated.map((item, i) => ({
    rank: offset + i + 1,
    user_id: item.user_id,
    value: item.value,
  }))

  return { entries, total }
}

async function getLikesLeaderboard(limit, offset) {
  const [reviewLikes, listLikes, tierlistLikes, screenshotLikes] = await Promise.all([
    getReviewLikesPerUser(),
    getListLikesPerUser(),
    getTierlistLikesPerUser(),
    getScreenshotLikesPerUser(),
  ])

  const countMap = {}
  const breakdownMap = {}

  const addLikes = (likes, type) => {
    for (const [userId, count] of Object.entries(likes)) {
      countMap[userId] = (countMap[userId] || 0) + count
      if (!breakdownMap[userId]) {
        breakdownMap[userId] = { reviews: 0, lists: 0, tierlists: 0, screenshots: 0 }
      }
      breakdownMap[userId][type] = count
    }
  }

  addLikes(reviewLikes, "reviews")
  addLikes(listLikes, "lists")
  addLikes(tierlistLikes, "tierlists")
  addLikes(screenshotLikes, "screenshots")

  const sorted = Object.entries(countMap)
    .map(([user_id, count]) => ({ user_id, value: count }))
    .sort((a, b) => b.value - a.value)

  const total = sorted.length
  const paginated = sorted.slice(offset, offset + limit)

  const entries = paginated.map((item, i) => ({
    rank: offset + i + 1,
    user_id: item.user_id,
    value: item.value,
    breakdown: breakdownMap[item.user_id] || { reviews: 0, lists: 0, tierlists: 0, screenshots: 0 },
  }))

  return { entries, total }
}

async function getReviewLikesPerUser() {
  const { data: likes } = await supabase
    .from("review_likes")
    .select("review_id")

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, user_id")

  const reviewOwners = {}
  for (const r of reviews || []) {
    reviewOwners[r.id] = r.user_id
  }

  const countMap = {}
  for (const like of likes || []) {
    const userId = reviewOwners[like.review_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}

async function getListLikesPerUser() {
  const { data: likes } = await supabase
    .from("list_likes")
    .select("list_id")

  const { data: lists } = await supabase
    .from("lists")
    .select("id, user_id")

  const listOwners = {}
  for (const l of lists || []) {
    listOwners[l.id] = l.user_id
  }

  const countMap = {}
  for (const like of likes || []) {
    const userId = listOwners[like.list_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}

async function getTierlistLikesPerUser() {
  const { data: likes } = await supabase
    .from("tierlist_likes")
    .select("tierlist_id")

  const { data: tierlists } = await supabase
    .from("tierlists")
    .select("id, user_id")

  const tierlistOwners = {}
  for (const t of tierlists || []) {
    tierlistOwners[t.id] = t.user_id
  }

  const countMap = {}
  for (const like of likes || []) {
    const userId = tierlistOwners[like.tierlist_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}

async function getScreenshotLikesPerUser() {
  const { data: likes } = await supabase
    .from("screenshot_likes")
    .select("screenshot_id")

  const { data: screenshots } = await supabase
    .from("screenshots")
    .select("id, user_id")

  const screenshotOwners = {}
  for (const s of screenshots || []) {
    screenshotOwners[s.id] = s.user_id
  }

  const countMap = {}
  for (const like of likes || []) {
    const userId = screenshotOwners[like.screenshot_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}
