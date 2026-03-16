import { supabase } from "#lib/supabase-ssr.js"

const RA_API_BASE = "https://retroachievements.org/API"
const RA_USER = process.env.RA_USERNAME
const RA_KEY = process.env.RA_API_KEY

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function similarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return 1

  if (na.includes(nb) || nb.includes(na)) {
    return Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
  }

  const longer = na.length >= nb.length ? na : nb
  const shorter = na.length >= nb.length ? nb : na
  let matches = 0
  let si = 0

  for (let i = 0; i < longer.length && si < shorter.length; i++) {
    if (longer[i] === shorter[si]) {
      matches++
      si++
    }
  }

  return matches / Math.max(na.length, nb.length)
}

async function raFetch(endpoint, params) {
  const url = `${RA_API_BASE}/${endpoint}?z=${RA_USER}&y=${RA_KEY}&${params}`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

async function raFetchUser(endpoint, username, apiKey, params) {
  const url = `${RA_API_BASE}/${endpoint}?z=${encodeURIComponent(username)}&y=${apiKey}&${params}`
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

async function searchGameInRA(gameName) {
  const consoles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 23, 24, 25, 27, 28, 29, 33, 37, 38, 39, 40, 41, 43, 44, 45, 46, 47, 49, 51, 53, 56, 57]

  const attempts = [
    gameName,
    gameName.replace(/:/g, "").replace(/-/g, " "),
    gameName.split(":")[0].trim(),
  ]

  for (const searchTerm of attempts) {
    const data = await raFetch("API_GetGameList.php", `i=0&h=1&f=${encodeURIComponent(searchTerm)}`)

    if (!data || !Array.isArray(data) || data.length === 0) continue

    let bestMatch = null
    let bestScore = 0

    for (const game of data) {
      const score = similarity(searchTerm, game.Title)
      if (score > bestScore) {
        bestScore = score
        bestMatch = game
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      return {
        id: bestMatch.ID,
        title: bestMatch.Title,
        consoleId: bestMatch.ConsoleID,
        consoleName: bestMatch.ConsoleName,
        score: bestScore,
      }
    }
  }

  return null
}

async function getGameAchievements(gameId) {
  const data = await raFetch("API_GetGameInfoAndUserProgress.php", `g=${gameId}&u=${RA_USER}`)

  if (!data || !data.Title) return null

  const achievements = data.Achievements ? Object.values(data.Achievements) : []

  return {
    game: {
      id: data.ID,
      title: data.Title,
      consoleName: data.ConsoleName,
      imageIcon: data.ImageIcon ? `https://retroachievements.org${data.ImageIcon}` : null,
      numPlayers: Number(data.NumDistinctPlayers) || 0,
    },
    achievements: achievements
      .sort((a, b) => Number(a.DisplayOrder) - Number(b.DisplayOrder))
      .map(a => ({
        id: a.ID,
        title: a.Title,
        description: a.Description,
        points: Number(a.Points),
        type: a.type,
        badgeUrl: a.BadgeName ? `https://media.retroachievements.org/Badge/${a.BadgeName}.png` : null,
        badgeLockedUrl: a.BadgeName ? `https://media.retroachievements.org/Badge/${a.BadgeName}_lock.png` : null,
        earned: false,
        earnedDate: null,
        hardcoreEarned: false,
        numAwarded: Number(a.NumAwarded) || 0,
        numAwardedHardcore: Number(a.NumAwardedHardcore) || 0,
      })),
  }
}

async function getUserGameProgress(username, apiKey, gameId) {
  const data = await raFetchUser("API_GetGameInfoAndUserProgress.php", username, apiKey, `g=${gameId}&u=${encodeURIComponent(username)}`)

  if (!data || !data.Title) return null

  const achievements = data.Achievements ? Object.values(data.Achievements) : []
  const earned = achievements.filter(a => a.DateEarned || a.DateEarnedHardcore)
  const hardcoreEarned = achievements.filter(a => a.DateEarnedHardcore)

  return {
    game: {
      id: data.ID,
      title: data.Title,
      consoleName: data.ConsoleName,
      imageIcon: data.ImageIcon ? `https://retroachievements.org${data.ImageIcon}` : null,
      numPlayers: Number(data.NumDistinctPlayers) || 0,
    },
    progress: {
      totalAchievements: achievements.length,
      earned: earned.length,
      hardcoreEarned: hardcoreEarned.length,
      percentage: achievements.length > 0 ? Math.round((earned.length / achievements.length) * 100) : 0,
      hardcorePercentage: achievements.length > 0 ? Math.round((hardcoreEarned.length / achievements.length) * 100) : 0,
    },
    achievements: achievements
      .sort((a, b) => {
        const aEarned = a.DateEarned || a.DateEarnedHardcore
        const bEarned = b.DateEarned || b.DateEarnedHardcore
        if (aEarned && !bEarned) return -1
        if (!aEarned && bEarned) return 1
        if (aEarned && bEarned) return new Date(bEarned) - new Date(aEarned)
        return Number(a.DisplayOrder) - Number(b.DisplayOrder)
      })
      .map(a => ({
        id: a.ID,
        title: a.Title,
        description: a.Description,
        points: Number(a.Points),
        type: a.type,
        badgeUrl: a.BadgeName ? `https://media.retroachievements.org/Badge/${a.BadgeName}.png` : null,
        badgeLockedUrl: a.BadgeName ? `https://media.retroachievements.org/Badge/${a.BadgeName}_lock.png` : null,
        earned: !!(a.DateEarned || a.DateEarnedHardcore),
        earnedDate: a.DateEarnedHardcore || a.DateEarned || null,
        hardcoreEarned: !!a.DateEarnedHardcore,
        numAwarded: Number(a.NumAwarded) || 0,
        numAwardedHardcore: Number(a.NumAwardedHardcore) || 0,
      })),
  }
}

export async function handleGame(req, res) {
  const { gameName, userId } = req.query

  if (!gameName) {
    return res.status(400).json({ error: "gameName required" })
  }

  try {
    const match = await searchGameInRA(gameName)
    if (!match) {
      return res.json({ found: false })
    }

    let connection = null
    if (userId) {
      const { data } = await supabase
        .from("user_connections")
        .select("provider_username, access_token")
        .eq("user_id", userId)
        .eq("provider", "retroachievements")
        .maybeSingle()
      connection = data
    }

    if (connection) {
      const result = await getUserGameProgress(connection.provider_username, connection.access_token, match.id)
      if (result) {
        return res.json({
          found: true,
          hasProgress: true,
          match,
          ...result,
        })
      }
    }

    const result = await getGameAchievements(match.id)
    if (!result) {
      return res.json({ found: true, hasProgress: false, match })
    }

    res.json({
      found: true,
      hasProgress: false,
      match,
      ...result,
      progress: {
        totalAchievements: result.achievements.length,
        earned: 0,
        hardcoreEarned: 0,
        percentage: 0,
        hardcorePercentage: 0,
      },
    })
  } catch (error) {
    console.error("RA game error:", error.message)
    res.status(500).json({ error: "fail" })
  }
}
