import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handleAchievements(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "Missing userId" })

  const cacheKey = `steam_achievements_${userId}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json({ achievements: cached })

  try {
    const { data: connection } = await supabase
      .from("user_connections")
      .select("provider_user_id")
      .eq("user_id", userId)
      .eq("provider", "steam")
      .maybeSingle()

    if (!connection?.provider_user_id) {
      await setCache(cacheKey, [], 300)
      return res.json({ achievements: [] })
    }

    const steamId = connection.provider_user_id
    const apiKey = process.env.STEAM_WEB_API_KEY

    const recentGamesRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10`
    )

    if (!recentGamesRes.ok) {
      return res.status(500).json({ error: "Steam API error" })
    }

    const recentGamesData = await recentGamesRes.json()
    const games = recentGamesData.response?.games || []

    if (games.length === 0) {
      await setCache(cacheKey, [], 300)
      return res.json({ achievements: [] })
    }

    const achievementsData = await Promise.all(
      games.map(async (game) => {
        try {
          const [statsRes, schemaRes, storeRes] = await Promise.all([
            fetch(
              `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${game.appid}&key=${apiKey}&steamid=${steamId}`
            ),
            fetch(
              `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${game.appid}&key=${apiKey}`
            ),
            fetch(
              `https://store.steampowered.com/api/appdetails?appids=${game.appid}`
            )
          ])

          if (!statsRes.ok || !schemaRes.ok) return []

          const stats = await statsRes.json()
          const schema = await schemaRes.json()
          const store = storeRes.ok ? await storeRes.json() : {}

          if (!stats.playerstats?.achievements) return []

          const schemaMap = new Map(
            (schema.game?.availableGameStats?.achievements || []).map(a => [a.name, a])
          )

          const banner = store[game.appid]?.data?.header_image ||
            `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`

          return stats.playerstats.achievements
            .filter(a => a.achieved === 1)
            .map(a => {
              const info = schemaMap.get(a.apiname)
              return {
                game: stats.playerstats.gameName || game.name || `App ${game.appid}`,
                appId: game.appid,
                banner,
                name: info?.displayName || a.apiname,
                description: info?.description || "",
                icon: info?.icon || "",
                hidden: info?.hidden === 1,
                unlockedAt: a.unlocktime
              }
            })
        } catch {
          return []
        }
      })
    )

    const achievements = achievementsData
      .flat()
      .sort((a, b) => b.unlockedAt - a.unlockedAt)
      .slice(0, 50)

    await setCache(cacheKey, achievements, 300)
    return res.json({ achievements })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Failed to fetch achievements" })
  }
}