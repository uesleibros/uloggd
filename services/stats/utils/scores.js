import { supabase } from "#lib/supabase-ssr.js"

export async function fetchAllRows(table, select) {
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

export async function getMineralsRaw() {
  const minerals = await fetchAllRows("user_minerals", "user_id, copper, iron, gold, emerald, diamond, ruby")

  const result = {}
  for (const m of minerals) {
    const value = (m.copper || 0) + (m.iron || 0) + (m.gold || 0) + (m.emerald || 0) + (m.diamond || 0) + (m.ruby || 0)
    result[m.user_id] = { value }
  }
  return result
}

export async function getReviewsRaw() {
  const reviews = await fetchAllRows("reviews", "user_id")

  const result = {}
  for (const r of reviews) {
    if (!result[r.user_id]) result[r.user_id] = { value: 0 }
    result[r.user_id].value++
  }
  return result
}

export async function getFollowersRaw() {
  const follows = await fetchAllRows("follows", "following_id")

  const result = {}
  for (const f of follows) {
    result[f.following_id] = (result[f.following_id] || 0) + 1
  }
  return result
}

export async function getReviewLikesPerUser() {
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

export async function getListLikesPerUser() {
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

export async function getTierlistLikesPerUser() {
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

export async function getScreenshotLikesPerUser() {
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

export async function getLikesRaw() {
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

export async function getGlobalScores() {
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

    if (totalScore > 0) {
      scores.push({
        user_id: userId,
        value: totalScore,
        breakdown: { minerals, reviews, followers, likes },
      })
    }
  }

  scores.sort((a, b) => b.value - a.value)

  return scores
}
