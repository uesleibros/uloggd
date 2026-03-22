import { getCache, setCache } from "#lib/cache.js"
import { supabase } from "#lib/supabase-ssr.js"
import { findManyByIds, resolveStreams, formatUserMap } from "#models/users/index.js"
import {
  fetchAllRows,
  getMineralsRaw,
  getGlobalScores,
  getReviewLikesPerUser,
  getListLikesPerUser,
  getTierlistLikesPerUser,
  getScreenshotLikesPerUser,
} from "../utils/scores.js"

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

async function getGlobalLeaderboard(limit, offset) {
  const scores = await getGlobalScores()

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

async function getMineralsLeaderboard(limit, offset) {
  const mineralsData = await getMineralsRaw()

  const scored = Object.entries(mineralsData).map(([user_id, data]) => ({
    user_id,
    value: data.value,
    breakdown: data.breakdown,
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

  const likesGiven = await fetchAllRows("review_likes", "user_id")
    .then(async reviewLikesGiven => {
      const [listLikesGiven, tierlistLikesGiven, screenshotLikesGiven, profileLikesGiven] = await Promise.all([
        fetchAllRows("list_likes", "user_id"),
        fetchAllRows("tierlist_likes", "user_id"),
        fetchAllRows("screenshot_likes", "user_id"),
        fetchAllRows("profile_likes", "user_id"),
      ])

      const result = {}
      const addLikes = (likes) => {
        for (const like of likes) {
          result[like.user_id] = (result[like.user_id] || 0) + 1
        }
      }

      addLikes(reviewLikesGiven)
      addLikes(listLikesGiven)
      addLikes(tierlistLikesGiven)
      addLikes(screenshotLikesGiven)
      addLikes(profileLikesGiven)

      return result
    })

  const countMap = {}
  const breakdownMap = {}

  const addLikesReceived = (likes, type) => {
    for (const [userId, count] of Object.entries(likes)) {
      if (!countMap[userId]) countMap[userId] = 0
      if (!breakdownMap[userId]) {
        breakdownMap[userId] = { received: 0, given: 0, reviews: 0, lists: 0, tierlists: 0, screenshots: 0 }
      }
      countMap[userId] += count
      breakdownMap[userId].received += count
      breakdownMap[userId][type] = count
    }
  }

  addLikesReceived(reviewLikes, "reviews")
  addLikesReceived(listLikes, "lists")
  addLikesReceived(tierlistLikes, "tierlists")
  addLikesReceived(screenshotLikes, "screenshots")

  for (const [userId, count] of Object.entries(likesGiven)) {
    if (!countMap[userId]) countMap[userId] = 0
    if (!breakdownMap[userId]) {
      breakdownMap[userId] = { received: 0, given: 0, reviews: 0, lists: 0, tierlists: 0, screenshots: 0 }
    }
    countMap[userId] += count * 0.25
    breakdownMap[userId].given = count
  }

  const sorted = Object.entries(countMap)
    .map(([user_id, count]) => ({ user_id, value: Math.round(count * 100) / 100 }))
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

async function getSteamPlaytimeForUsers(userIds) {
  if (!userIds.length) return {}

  const { data: connections } = await supabase
    .from("user_connections")
    .select("user_id, provider_user_id")
    .eq("provider", "steam")
    .in("user_id", userIds)

  if (!connections?.length) return {}

  const playtimeMap = {}

  await Promise.all(
    connections.map(async (conn) => {
      try {
        const res = await fetch(
          `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_WEB_API_KEY}&steamid=${conn.provider_user_id}&include_played_free_games=true`
        )

        if (!res.ok) return

        const { response } = await res.json()
        const games = response?.games || []

        let totalMinutes = 0
        for (const game of games) {
          totalMinutes += game.playtime_forever || 0
        }

        playtimeMap[conn.user_id] = totalMinutes
      } catch {}
    })
  )

  return playtimeMap
}

async function getPlaytimeLeaderboard(limit, offset) {
  const journeys = await fetchAllRows("journeys", "id, user_id")

  const journeyOwners = {}
  const allUserIds = new Set()

  for (const j of journeys) {
    journeyOwners[j.id] = j.user_id
    allUserIds.add(j.user_id)
  }

  const journeyEntries = await fetchAllRows("journey_entries", "journey_id, hours, minutes")

  const statsMap = {}

  for (const e of journeyEntries) {
    const userId = journeyOwners[e.journey_id]
    if (!userId) continue

    const totalMinutes = (e.hours || 0) * 60 + (e.minutes || 0)

    if (!statsMap[userId]) {
      statsMap[userId] = { journalMinutes: 0, steamMinutes: 0, entries: 0 }
    }
    statsMap[userId].journalMinutes += totalMinutes
    statsMap[userId].entries++
  }

  const { data: steamConnections } = await supabase
    .from("user_connections")
    .select("user_id")
    .eq("provider", "steam")

  const steamUserIds = steamConnections?.map(c => c.user_id) || []
  const steamPlaytime = await getSteamPlaytimeForUsers(steamUserIds)

  for (const [userId, minutes] of Object.entries(steamPlaytime)) {
    if (!statsMap[userId]) {
      statsMap[userId] = { journalMinutes: 0, steamMinutes: 0, entries: 0 }
    }
    statsMap[userId].steamMinutes = minutes
  }

  const sorted = Object.entries(statsMap)
    .filter(([, stats]) => stats.journalMinutes > 0 || stats.steamMinutes > 0)
    .map(([user_id, stats]) => {
      const totalMinutes = stats.journalMinutes + stats.steamMinutes
      return {
        user_id,
        value: totalMinutes,
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        entries: stats.entries,
        breakdown: {
          journal: {
            totalMinutes: stats.journalMinutes,
            hours: Math.floor(stats.journalMinutes / 60),
            minutes: stats.journalMinutes % 60,
          },
          steam: {
            totalMinutes: stats.steamMinutes,
            hours: Math.floor(stats.steamMinutes / 60),
            minutes: stats.steamMinutes % 60,
          },
        },
      }
    })
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
    breakdown: item.breakdown,
  }))

  return { entries, total }
}