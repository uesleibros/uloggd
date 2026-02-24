import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handlePresence(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  const cacheKey = `steam_presence_${userId}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  const { data: connection } = await supabase
    .from("user_connections")
    .select("provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "steam")
    .maybeSingle()

  if (!connection?.provider_user_id) return res.json({ playing: false })

  try {
    const steamRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_WEB_API_KEY}&steamids=${connection.provider_user_id}`
    )
    const { response } = await steamRes.json()
    const player = response.players?.[0]

    const baseProfile = {
      name: player?.personaname,
      avatar: player?.avatarfull,
      status: player?.personastate ?? 0
    }

    if (!player?.gameid) {
      const result = { playing: false, profile: baseProfile }
      await setCache(cacheKey, result, 60)
      return res.json(result)
    }

    const igdbResult = await query(
      "games",
      `fields name, slug, cover.url;
       where external_games.uid = "${player.gameid}" & external_games.category = 1;
       limit 1;`
    )

    const igdbGame = igdbResult?.[0]

    const result = {
      playing: true,
      profile: baseProfile,
      steam: {
        name: player.gameextrainfo,
        appId: player.gameid,
        header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${player.gameid}/header.jpg`
      },
      game: igdbGame ? {
        name: igdbGame.name,
        slug: igdbGame.slug,
        cover: igdbGame.cover?.url?.replace("t_thumb", "t_cover_big_2x") || null
      } : null
    }

    await setCache(cacheKey, result, 60)
    return res.json(result)
  } catch {
    return res.status(500).json({ error: "Presence check failed" })
  }
}
