import { supabase } from "#lib/supabase-ssr.js"

const RA_API_BASE = "https://retroachievements.org/API"

async function searchGame(username, apiKey, gameName) {
  const res = await fetch(
    `${RA_API_BASE}/API_GetUserCompletedGames.php?z=${encodeURIComponent(username)}&y=${apiKey}&u=${encodeURIComponent(username)}`
  )

  if (!res.ok) return null

  const games = await res.json()
  if (!games || !Array.isArray(games)) return null

  const normalizedSearch = gameName.toLowerCase().replace(/[^a-z0-9]/g, "")

  let bestMatch = null
  let bestScore = 0

  for (const game of games) {
    const normalizedTitle = game.Title.toLowerCase().replace(/[^a-z0-9]/g, "")

    if (normalizedTitle === normalizedSearch) {
      return {
        id: game.GameID,
        title: game.Title,
        consoleId: game.ConsoleID,
        consoleName: game.ConsoleName,
        hardcoreMode: game.HardcoreMode === 1,
        numAwarded: game.NumAwarded,
        maxPossible: game.MaxPossible,
        pctWon: game.MaxPossible > 0 ? Math.round((game.NumAwarded / game.MaxPossible) * 100) : 0,
      }
    }

    let score = 0
    if (normalizedTitle.includes(normalizedSearch) || normalizedSearch.includes(normalizedTitle)) {
      score = Math.min(normalizedTitle.length, normalizedSearch.length) / Math.max(normalizedTitle.length, normalizedSearch.length)
    }

    const searchWords = normalizedSearch.split("")
    let matchingChars = 0
    let searchIdx = 0
    for (const char of normalizedTitle) {
      if (searchIdx < searchWords.length && char === searchWords[searchIdx]) {
        matchingChars++
        searchIdx++
      }
    }
    const seqScore = matchingChars / Math.max(normalizedTitle.length, normalizedSearch.length)
    score = Math.max(score, seqScore)

    if (score > bestScore && score > 0.6) {
      bestScore = score
      bestMatch = {
        id: game.GameID,
        title: game.Title,
        consoleId: game.ConsoleID,
        consoleName: game.ConsoleName,
        hardcoreMode: game.HardcoreMode === 1,
        numAwarded: game.NumAwarded,
        maxPossible: game.MaxPossible,
        pctWon: game.MaxPossible > 0 ? Math.round((game.NumAwarded / game.MaxPossible) * 100) : 0,
        score: bestScore,
      }
    }
  }

  return bestMatch
}

async function getGameProgress(username, apiKey, gameId) {
  const res = await fetch(
    `${RA_API_BASE}/API_GetGameInfoAndUserProgress.php?z=${encodeURIComponent(username)}&y=${apiKey}&u=${encodeURIComponent(username)}&g=${gameId}`
  )

  if (!res.ok) return null

  const data = await res.json()
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
      imageBoxArt: data.ImageBoxArt ? `https://retroachievements.org${data.ImageBoxArt}` : null,
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
        numAwarded: Number(a.NumAwarded),
        numAwardedHardcore: Number(a.NumAwardedHardcore),
      })),
  }
}

export async function handleGame(req, res) {
  const { gameName, userId } = req.query

  if (!gameName || !userId) {
    return res.status(400).json({ error: "gameName and userId required" })
  }

  try {
    const { data: connection } = await supabase
      .from("user_connections")
      .select("provider_username, access_token")
      .eq("user_id", userId)
      .eq("provider", "retroachievements")
      .maybeSingle()

    if (!connection) {
      return res.json({ connected: false })
    }

    const match = await searchGame(connection.provider_username, connection.access_token, gameName)

    if (!match) {
      return res.json({ connected: true, found: false })
    }

    const progress = await getGameProgress(connection.provider_username, connection.access_token, match.id)

    if (!progress) {
      return res.json({ connected: true, found: true, match, progress: null })
    }

    res.json({
      connected: true,
      found: true,
      match: {
        id: match.id,
        title: match.title,
        consoleName: match.consoleName,
        score: match.score,
      },
      ...progress,
    })
  } catch (error) {
    console.error("RA game error:", error.message)
    res.status(500).json({ error: "fail" })
  }
}
