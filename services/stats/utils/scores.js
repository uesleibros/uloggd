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
  const transactions = await fetchAllRows(
    "mineral_transactions",
    "user_id, transaction_type, minerals_changed"
  )

  const result = {}

  for (const t of transactions) {
    if (t.transaction_type === "shop_purchase" || t.transaction_type === "shop_gift") {
      continue
    }

    if (!result[t.user_id]) {
      result[t.user_id] = {
        value: 0,
        breakdown: { copper: 0, iron: 0, gold: 0, emerald: 0, diamond: 0, ruby: 0 },
      }
    }

    const changes = t.minerals_changed
    if (changes && typeof changes === "object") {
      for (const [mineral, amount] of Object.entries(changes)) {
        const val = parseInt(amount) || 0
        if (val > 0) {
          result[t.user_id].breakdown[mineral] = (result[t.user_id].breakdown[mineral] || 0) + val
          result[t.user_id].value += val
        }
      }
    }
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
    fetchAllRows("review_likes", "user_id, review_id"),
    fetchAllRows("reviews", "id, user_id"),
  ])

  const reviewOwners = {}
  for (const r of reviews) {
    reviewOwners[r.id] = r.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const ownerId = reviewOwners[like.review_id]
    if (ownerId && like.user_id !== ownerId) {
      countMap[ownerId] = (countMap[ownerId] || 0) + 1
    }
  }

  return countMap
}

export async function getListLikesPerUser() {
  const [likes, lists] = await Promise.all([
    fetchAllRows("list_likes", "user_id, list_id"),
    fetchAllRows("lists", "id, user_id"),
  ])

  const listOwners = {}
  for (const l of lists) {
    listOwners[l.id] = l.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const ownerId = listOwners[like.list_id]
    if (ownerId && like.user_id !== ownerId) {
      countMap[ownerId] = (countMap[ownerId] || 0) + 1
    }
  }

  return countMap
}

export async function getTierlistLikesPerUser() {
  const [likes, tierlists] = await Promise.all([
    fetchAllRows("tierlist_likes", "user_id, tierlist_id"),
    fetchAllRows("tierlists", "id, user_id"),
  ])

  const tierlistOwners = {}
  for (const t of tierlists) {
    tierlistOwners[t.id] = t.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const ownerId = tierlistOwners[like.tierlist_id]
    if (ownerId && like.user_id !== ownerId) {
      countMap[ownerId] = (countMap[ownerId] || 0) + 1
    }
  }

  return countMap
}

export async function getScreenshotLikesPerUser() {
  const [likes, screenshots] = await Promise.all([
    fetchAllRows("screenshot_likes", "user_id, screenshot_id"),
    fetchAllRows("screenshots", "id, user_id"),
  ])

  const screenshotOwners = {}
  for (const s of screenshots) {
    screenshotOwners[s.id] = s.user_id
  }

  const countMap = {}
  for (const like of likes) {
    const ownerId = screenshotOwners[like.screenshot_id]
    if (ownerId && like.user_id !== ownerId) {
      countMap[ownerId] = (countMap[ownerId] || 0) + 1
    }
  }

  return countMap
}

export async function getProfileLikesPerUser() {
  const likes = await fetchAllRows("profile_likes", "user_id, profile_id")

  const countMap = {}
  for (const like of likes) {
    if (like.user_id !== like.profile_id) {
      countMap[like.profile_id] = (countMap[like.profile_id] || 0) + 1
    }
  }

  return countMap
}

export async function getLikesRaw() {
  const [reviewLikes, listLikes, tierlistLikes, screenshotLikes, profileLikes] = await Promise.all([
    getReviewLikesPerUser(),
    getListLikesPerUser(),
    getTierlistLikesPerUser(),
    getScreenshotLikesPerUser(),
    getProfileLikesPerUser(),
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
  addLikes(profileLikes)

  return result
}

export async function getLikesGivenRaw() {
  const [reviewLikes, listLikes, tierlistLikes, screenshotLikes, profileLikes] = await Promise.all([
    fetchAllRows("review_likes", "user_id"),
    fetchAllRows("list_likes", "user_id"),
    fetchAllRows("tierlist_likes", "user_id"),
    fetchAllRows("screenshot_likes", "user_id"),
    fetchAllRows("profile_likes", "user_id"),
  ])

  const result = {}

  const addLikes = (likes) => {
    for (const like of likes) {
      if (!result[like.user_id]) result[like.user_id] = { value: 0 }
      result[like.user_id].value++
    }
  }

  addLikes(reviewLikes)
  addLikes(listLikes)
  addLikes(tierlistLikes)
  addLikes(screenshotLikes)
  addLikes(profileLikes)

  return result
}

const WEIGHTS = {
  reviews: 2,
  likesReceived: 1,
  likesGiven: 0.25,
  minerals: 0.25,
}

export async function getGlobalScores() {
  const [mineralsData, reviewsData, likesReceivedData, likesGivenData] = await Promise.all([
    getMineralsRaw(),
    getReviewsRaw(),
    getLikesRaw(),
    getLikesGivenRaw(),
  ])

  const allUserIds = new Set([
    ...Object.keys(mineralsData),
    ...Object.keys(reviewsData),
    ...Object.keys(likesReceivedData),
    ...Object.keys(likesGivenData),
  ])

  const scores = []

  for (const userId of allUserIds) {
    const minerals = mineralsData[userId]?.value || 0
    const reviews = reviewsData[userId]?.value || 0
    const likesReceived = likesReceivedData[userId]?.value || 0
    const likesGiven = likesGivenData[userId]?.value || 0

    const weightedMinerals = minerals * WEIGHTS.minerals
    const weightedReviews = reviews * WEIGHTS.reviews
    const weightedLikesReceived = likesReceived * WEIGHTS.likesReceived
    const weightedLikesGiven = likesGiven * WEIGHTS.likesGiven

    const totalScore = weightedMinerals + weightedReviews + weightedLikesReceived + weightedLikesGiven

    if (totalScore > 0) {
      scores.push({
        user_id: userId,
        value: Math.round(totalScore * 100) / 100,
        breakdown: {
          minerals: { raw: minerals, weighted: weightedMinerals },
          reviews: { raw: reviews, weighted: weightedReviews },
          likesReceived: { raw: likesReceived, weighted: weightedLikesReceived },
          likesGiven: { raw: likesGiven, weighted: weightedLikesGiven },
        },
      })
    }
  }

  scores.sort((a, b) => b.value - a.value)

  return scores
}