import { supabase } from "#lib/supabase-ssr.js"

const cache = new Map()
const CACHE_TTL = 10 * 60 * 1000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() })
}

export async function handleAchievements(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  const cacheKey = `achievements:${userId}`
  const cached = getCached(cacheKey)
  if (cached) return res.json(cached)

  const { data: connection } = await supabase
    .from("user_connections")
    .select("provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "steam")
    .maybeSingle()

  if (!connection?.provider_user_id) {
    return res.json({ achievements: [] })
  }

  const steamId = connection.provider_user_id

  const ownedRes = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_WEB_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
  )

  const ownedData = await ownedRes.json()
  const games = ownedData.response?.games || []

  const recentGames = games
    .filter((g) => g.playtime_forever > 0)
    .sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0))
    .slice(0, 10)

  const allAchievements = []

  await Promise.all(
    recentGames.map(async (game) => {
      try {
        const [achievementsRes, schemaRes] = await Promise.all([
          fetch(
            `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${game.appid}&key=${process.env.STEAM_WEB_API_KEY}&steamid=${steamId}`
          ),
          fetch(
            `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${game.appid}&key=${process.env.STEAM_WEB_API_KEY}`
          ),
        ])

        const achievements = await achievementsRes.json()
        const schema = await schemaRes.json()

        if (!achievements.playerstats?.achievements) return

        const schemaMap = {}
        schema.game?.availableGameStats?.achievements?.forEach((a) => {
          schemaMap[a.name] = {
            displayName: a.displayName,
            description: a.description || "",
            icon: a.icon,
            iconGray: a.icongray,
            hidden: a.hidden === 1,
          }
        })

        achievements.playerstats.achievements
          .filter((a) => a.achieved === 1 && a.unlocktime > 0)
          .forEach((a) => {
            const info = schemaMap[a.apiname]
            if (!info?.icon) return

            allAchievements.push({
              game: game.name,
              appId: game.appid,
              name: info.displayName,
              description: info.description,
              icon: info.icon,
              hidden: info.hidden,
              unlockedAt: a.unlocktime,
            })
          })
      } catch {}
    })
  )

  allAchievements.sort((a, b) => b.unlockedAt - a.unlockedAt)

  const result = { achievements: allAchievements.slice(0, 50) }

  setCache(cacheKey, result)

  res.json(result)
}
