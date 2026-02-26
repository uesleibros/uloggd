import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

const STEAM_API = "https://api.steampowered.com"
const CACHE_TTL = {
  SCHEMA: 86400,
  GLOBAL: 3600,
  CONNECTION: 600,
  RESULT: 300,
  PUBLIC: 3600
}

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
    await setCache(cacheKey, schema, CACHE_TTL.SCHEMA)
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
  const entries = (data.achievementpercentages?.achievements || []).map(a => [
    a.name,
    Number(a.percent) || 0
  ])

  await setCache(cacheKey, entries, CACHE_TTL.GLOBAL)

  return new Map(entries)
}

async function getSteamConnection(userId) {
  if (!userId) return null

  const cacheKey = `steam_connection_${userId}`
  const cached = await getCache(cacheKey)
  if (cached !== undefined) return cached

  const { data } = await supabase
    .from("user_connections")
    .select("provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "steam")
    .maybeSingle()

  const steamId = data?.provider_user_id || null
  await setCache(cacheKey, steamId, CACHE_TTL.CONNECTION)

  return steamId
}

async function getPlayerAchievements(appId, steamId, apiKey) {
  const res = await fetch(
    `${STEAM_API}/ISteamUserStats/GetPlayerAchievements/v1/?appid=${appId}&key=${apiKey}&steamid=${steamId}`
  )

  if (!res.ok) return { playerMap: new Map(), gameName: null }

  const data = await res.json()
  const playerMap = new Map(
    (data.playerstats?.achievements || []).map(a => [a.apiname, a])
  )

  return {
    playerMap,
    gameName: data.playerstats?.gameName || null
  }
}

function buildAchievements(schema, playerMap, globalPercentages) {
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
      globalPercent: Number(globalPercentages.get(a.name)) || 0
    }
  })

  achievements.sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? -1 : 1
    if (a.achieved) return b.unlockedAt - a.unlockedAt
    return b.globalPercent - a.globalPercent
  })

  return { achievements, unlocked }
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

    if (!schema?.length) {
      const empty = { achievements: [], unlocked: 0, total: 0, percentage: 0 }
      await setCache(cacheKey, empty, CACHE_TTL.RESULT)
      return res.json(empty)
    }

    let playerMap = new Map()
    let gameName = `App ${appId}`

    if (steamId) {
      const playerData = await getPlayerAchievements(appId, steamId, apiKey)
      playerMap = playerData.playerMap
      gameName = playerData.gameName || gameName
    }

    const { achievements, unlocked } = buildAchievements(schema, playerMap, globalPercentages)
    const total = achievements.length

    const result = {
      gameName,
      achievements,
      unlocked,
      total,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      notConnected: !steamId
    }

    await setCache(cacheKey, result, steamId ? CACHE_TTL.RESULT : CACHE_TTL.PUBLIC)
    return res.json(result)
  } catch (e) {
    console.error("handleGameAchievements error:", e.message)
    return res.status(500).json({ error: "Failed to fetch achievements" })
  }
}
