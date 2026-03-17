import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"
import { findManyByIds, resolveStreams, formatUserMap } from "#models/users/index.js"

const CACHE_TTL = 300

export async function handleLeaderboard(req, res) {
  const { category = "minerals", limit = 10, page = 1 } = req.query

  const validCategories = ["global", "minerals", "reviews", "followers", "likes", "playtime"]
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
      case "global":
        ({ entries, total } = await getGlobalLeaderboard(limitNum, offset))
        break
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
      case "playtime":
        ({ entries, total } = await getPlaytimeLeaderboard(limitNum, offset))
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

async function fetchAllRows(table, select) {
  const rows = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)

    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function getGlobalLeaderboard(limit, offset) {
  const [mineralsData, reviewsData, followersData, likesData] = await Promise.all([
    getMineralsRaw(),
    getReviewsRaw(),
    getFollowersRaw(),
    getLikesRaw(),
  ])

  const allUserIds = new Set([
    ...Object.keys(mineralsData),
    ...Object.keys(reviewsData),
    ...Object.keys(followersData),
    ...Object.keys(likesData),
  ])

  const scores = []

  for (const userId of allUserIds) {
    const minerals = mineralsData[userId]?.value || 0
    const reviews = reviewsData[userId]?.value || 0
    const followers = followersData[userId] || 0
    const likes = likesData[userId]?.value || 0

    const totalScore = minerals + reviews + followers + likes

    scores.push({
      user_id: userId,
      value: totalScore,
      breakdown: {
        minerals,
        reviews,
        followers,
        likes,
      },
    })
  }

  scores.sort((a, b) => b.value - a.value)

  const total = scores.length
  const paginated = scores.slice(offset, offset + limit)

  const entries = paginated.map((item, i) => ({
    rank: offset + i + 1,
    user_id: item.user_id,
    value: item.value,
    breakdown: item.breakdown,
  }))

  return { entries, total }
}

async function getReviewsRaw() {
  const reviews = await fetchAllRows("reviews", "user_id")

  const result = {}
  for (const r of reviews) {
    if (!result[r.user_id]) result[r.user_id] = { value: 0 }
    result[r.user_id].value++
  }
  return result
}

async function getMineralsRaw() {
  const minerals = await fetchAllRows("user_minerals", "user_id, copper, iron, gold, emerald, diamond, ruby")

  const result = {}
  for (const m of minerals) {
    const value = (m.copper || 0) + (m.iron || 0) + (m.gold || 0) + (m.emerald || 0) + (m.diamond || 0) + (m.ruby || 0)
    result[m.user_id] = { value }
  }
  return result
}

async function getFollowersRaw() {
  const follows = await fetchAllRows("follows", "following_id")

  const result = {}
  for (const f of follows) {
    result[f.following_id] = (result[f.following_id] || 0) + 1
  }
  return result
}

async function getLikesRaw() {
  const [reviewLikes, listLikes, tierlistLikes, screenshotLikes] = await Promise.all([
    getReviewLikesPerUser(),
    getListLikesPerUser(),
    getTierlistLikesPerUser(),
    getScreenshotLikesPerUser(),
  ])

  const result = {}
  const addLikes = (likes) => {
    for (const [userId, count] of Object.entries(likes)) {
      if (!result[userId]) result[userId] = { value: 0 }
      result[userId].value += count
    }
  }

  addLikes(reviewLikes)
  addLikes(listLikes)
  addLikes(tierlistLikes)
  addLikes(screenshotLikes)

  return result
}

async function getPlaytimeRaw() {
  const journeys = await fetchAllRows("journeys", "id, user_id")

  const journeyOwners = {}
  for (const j of journeys) {
    journeyOwners[j.id] = j.user_id
  }

  const entries = await fetchAllRows("journey_entries", "journey_id, hours, minutes")

  const result = {}
  for (const e of entries) {
    const userId = journeyOwners[e.journey_id]
    if (!userId) continue

    const totalMinutes = (e.hours || 0) * 60 + (e.minutes || 0)
    if (!result[userId]) result[userId] = { value: 0 }
    result[userId].value += totalMinutes
  }
  return result
}

async function getMineralsLeaderboard(limit, offset) {
  const minerals = await fetchAllRows("user_minerals", "user_id, copper, iron, gold, emerald, diamond, ruby")

  const scored = minerals.map(m => {
    const breakdown = {
      copper: m.copper || 0,
      iron: m.iron || 0,
      gold: m.gold || 0,
      emerald: m.emerald || 0,
      diamond: m.diamond || 0,
      ruby: m.ruby || 0,
    }

    return {
      user_id: m.user_id,
      value: breakdown.copper + breakdown.iron + breakdown.gold + breakdown.emerald + breakdown.diamond + breakdown.ruby,
      breakdown,
    }
  })

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
  const reviews = await fetchAllRows("reviews", "user_id, rating, aspect_ratings")

  const statsMap = {}

  for (const r of reviews) {
    if (!statsMap[r.user_id]) {
      statsMap[r.user_id] = { count: 0, ratingSum: 0, ratingCount: 0 }
    }
    statsMap[r.user_id].count++

    if (r.rating !== null && r.rating !== undefined && r.rating !== "") {
      const parsed = parseFloat(r.rating)
      if (!isNaN(parsed)) {
        statsMap[r.user_id].ratingSum += parsed / 20
        statsMap[r.user_id].ratingCount++
      }
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
        statsMap[r.user_id].ratingSum += parsed / 20
        statsMap[r.user_id].ratingCount++
      }
    }
  }

  const sorted = Object.entries(statsMap)
    .filter(([, stats]) => stats.count > 0)
    .map(([user_id, stats]) => ({
      user_id,
      value: stats.count,
      avgRating: stats.ratingCount > 0
        ? parseFloat((stats.ratingSum / stats.ratingCount).toFixed(2))
        : 0,
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      return b.avgRating - a.avgRating
    })

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
  const follows = await fetchAllRows("follows", "following_id")

  const countMap = {}
  for (const f of follows) {
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
    breakdown: breakdownMap[item.user_id],
  }))

  return { entries, total }
}

async function getPlaytimeLeaderboard(limit, offset) {
  const journeys = await fetchAllRows("journeys", "id, user_id")

  const journeyOwners = {}
  for (const j of journeys) {
    journeyOwners[j.id] = j.user_id
  }

  const journeyEntries = await fetchAllRows("journey_entries", "journey_id, hours, minutes")

  const statsMap = {}

  for (const e of journeyEntries) {
    const userId = journeyOwners[e.journey_id]
    if (!userId) continue

    const totalMinutes = (e.hours || 0) * 60 + (e.minutes || 0)

    if (!statsMap[userId]) {
      statsMap[userId] = { totalMinutes: 0, entries: 0 }
    }
    statsMap[userId].totalMinutes += totalMinutes
    statsMap[userId].entries++
  }

  const sorted = Object.entries(statsMap)
    .filter(([, stats]) => stats.totalMinutes > 0)
    .map(([user_id, stats]) => ({
      user_id,
      value: stats.totalMinutes,
      hours: Math.floor(stats.totalMinutes / 60),
      minutes: stats.totalMinutes % 60,
      entries: stats.entries,
    }))
    .sort((a, b) => b.value - a.value)

  const total = sorted.length
  const paginated = sorted.slice(offset, offset + limit)

  const entries = paginated.map((item, i) => ({
    rank: offset + i + 1,
    user_id: item.user_id,
    value: item.value,
    hours: item.hours,
    minutes: item.minutes,
    entries: item.entries,
  }))

  return { entries, total }
}

async function getReviewLikesPerUser() {
  const [likes, reviews] = await Promise.all([
    fetchAllRows("review_likes", "review_id"),
    fetchAllRows("reviews", "id, user_id"),
  ])

  const reviewOwners = {}
  for (const r of reviews) {
    reviewOwners[r.id] = r.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const userId = reviewOwners[like.review_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}

async function getListLikesPerUser() {
  const [likes, lists] = await Promise.all([
    fetchAllRows("list_likes", "list_id"),
    fetchAllRows("lists", "id, user_id"),
  ])

  const listOwners = {}
  for (const l of lists) {
    listOwners[l.id] = l.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const userId = listOwners[like.list_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}

async function getTierlistLikesPerUser() {
  const [likes, tierlists] = await Promise.all([
    fetchAllRows("tierlist_likes", "tierlist_id"),
    fetchAllRows("tierlists", "id, user_id"),
  ])

  const tierlistOwners = {}
  for (const t of tierlists) {
    tierlistOwners[t.id] = t.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const userId = tierlistOwners[like.tierlist_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}

async function getScreenshotLikesPerUser() {
  const [likes, screenshots] = await Promise.all([
    fetchAllRows("screenshot_likes", "screenshot_id"),
    fetchAllRows("screenshots", "id, user_id"),
  ])

  const screenshotOwners = {}
  for (const s of screenshots) {
    screenshotOwners[s.id] = s.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const userId = screenshotOwners[like.screenshot_id]
    if (userId) {
      countMap[userId] = (countMap[userId] || 0) + 1
    }
  }

  return countMap
}
