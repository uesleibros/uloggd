import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

const STEAM_API = "https://api.steampowered.com"

async function getGameSchema(appId, apiKey) {
  const cacheKey = `steam_schema_${appId}`
  const cached = await getCache(cacheKey)
  if (cached) return cached

  const res = await fetch(
    `${STEAM_API}/ISteamUserStats/GetSchemaForGame/v2/?appid=${appId}&key=${apiKey}`
  )

  if (!res.ok) return null

  const data = await res.json()
  const schema = data.game?.availableGameStats?.achievements || []

  if (schema.length > 0) {
    await setCache(cacheKey, schema, 86400)
  }

  return schema
}

async function getGlobalPercentages(appId) {
  const cacheKey = `steam_global_${appId}`
  const cached = await getCache(cacheKey)
  if (cached) return new Map(cached)

  const res = await fetch(
    `${STEAM_API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`
  )

  if (!res.ok) return new Map()

  const data = await res.json()
  const entries = (data.achievementpercentages?.achievements || []).map(a => [a.name, a.percent])

  await setCache(cacheKey, entries, 3600)

  return new Map(entries)
}

async function getSteamConnection(userId) {
  if (!userId) return null

  const { data } = await supabase
    .from("user_connections")
    .select("provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "steam")
    .maybeSingle()

  console.log("Steam connection para", userId, ":", data)

  return data?.provider_user_id || null
}

export async function handleGameAchievements(req, res) {
  const { userId, appId } = req.query

  if (!appId) {
    return res.status(400).json({ error: "Missing appId" })
  }

  const cacheKey = userId
    ? `steam_game_achievements_${userId}_${appId}`
    : `steam_game_achievements_public_${appId}`

  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const apiKey = process.env.STEAM_WEB_API_KEY
    const steamId = await getSteamConnection(userId)

    const [schema, globalPercentages] = await Promise.all([
      getGameSchema(appId, apiKey),
      getGlobalPercentages(appId)
    ])

    if (!schema || schema.length === 0) {
      const empty = { achievements: [], unlocked: 0, total: 0, percentage: 0 }
      await setCache(cacheKey, empty, 300)
      return res.json(empty)
    }

    let playerMap = new Map()
    let gameName = `App ${appId}`

    if (steamId) {
      const statsRes = await fetch(
        `${STEAM_API}/ISteamUserStats/GetPlayerAchievements/v1/?appid=${appId}&key=${apiKey}&steamid=${steamId}`
      )

      if (statsRes.ok) {
        const stats = await statsRes.json()
        playerMap = new Map(
          (stats.playerstats?.achievements || []).map(a => [a.apiname, a])
        )
        gameName = stats.playerstats?.gameName || gameName
      }
    }

    let unlocked = 0

    const achievements = schema.map(a => {
      const player = playerMap.get(a.name)
      const achieved = player?.achieved === 1

      if (achieved) unlocked++

      return {
        name: a.displayName,
        description: a.description || "",
        iconUnlocked: a.icon,
        iconLocked: a.icongray,
        hidden: a.hidden === 1,
        achieved,
        unlockedAt: player?.unlocktime || null,
        globalPercent: globalPercentages.get(a.name) || 0
      }
    })

    achievements.sort((a, b) => {
      if (a.achieved !== b.achieved) return a.achieved ? -1 : 1
      if (a.achieved) return b.unlockedAt - a.unlockedAt
      return b.globalPercent - a.globalPercent
    })

    const total = achievements.length
    const result = {
      gameName,
      achievements,
      unlocked,
      total,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      notConnected: !steamId
    }

    await setCache(cacheKey, result, steamId ? 300 : 3600)
    return res.json(result)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Failed to fetch achievements" })
  }
}
