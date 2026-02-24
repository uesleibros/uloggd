import { supabase } from "#lib/supabase-ssr.js"

const CACHE_TTL = 10 * 60

export async function handleAchievements(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "Missing userId" })

  const { data: connection } = await supabase
    .from("user_connections")
    .select("provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "steam")
    .maybeSingle()

  if (!connection?.provider_user_id) return res.json({ achievements: [] })

  const steamId = connection.provider_user_id
  const apiKey = process.env.STEAM_WEB_API_KEY

  try {
    const recentGamesRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=10`
    )
    const recentGamesData = await recentGamesRes.json()
    const games = recentGamesData.response?.games || []

    if (games.length === 0) return res.json({ achievements: [] })

    const achievementsData = await Promise.all(
      games.map(async (game) => {
        try {
          const [statsRes, schemaRes] = await Promise.all([
            fetch(
              `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${game.appid}&key=${apiKey}&steamid=${steamId}`
            ),
            fetch(
              `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${game.appid}&key=${apiKey}`
            )
          ])

          const stats = await statsRes.json()
          const schema = await schemaRes.json()

          if (!stats.playerstats?.achievements) return []

          const schemaMap = new Map(
            (schema.game?.availableGameStats?.achievements || []).map(a => [a.name, a])
          )

          const banner = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`

          return stats.playerstats.achievements
            .filter(a => a.achieved === 1)
            .map(a => {
              const info = schemaMap.get(a.apiname)
              return {
                game: stats.playerstats.gameName || game.name || `App ${game.appid}`,
                appid: game.appid,
                banner,
                name: info?.displayName || a.apiname,
                description: info?.description || "",
                icon: info?.icon || "",
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

    return res.json({ achievements })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to fetch achievements" })
  }
}
