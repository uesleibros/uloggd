import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

const STEAM_SOURCE_ID = 1

export async function handlePresence(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "userId required" })

  const cacheKey = `steam_presence_${userId}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: connection } = await supabase
      .from("user_connections")
      .select("provider_user_id")
      .eq("user_id", userId)
      .eq("provider", "steam")
      .maybeSingle()

    if (!connection?.provider_user_id) {
      const result = { playing: false }
      await setCache(cacheKey, result, 60)
      return res.json(result)
    }

    const steamRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_WEB_API_KEY}&steamids=${connection.provider_user_id}`
    )

    if (!steamRes.ok) {
      return res.status(500).json({ error: "Steam API error" })
    }

    const { response } = await steamRes.json()
    const player = response?.players?.[0]

    if (!player) {
      const result = { playing: false }
      await setCache(cacheKey, result, 60)
      return res.json(result)
    }

    const baseProfile = {
      name: player.personaname,
      avatar: player.avatarfull,
      status: player.personastate ?? 0
    }

    if (!player.gameid) {
      const result = { playing: false, profile: baseProfile }
      await setCache(cacheKey, result, 60)
      return res.json(result)
    }

    let igdbGame = null

    const externalResult = await query(
      "external_games",
      `fields game;
      where uid = "${player.gameid}" & external_game_source = ${STEAM_SOURCE_ID};
      limit 1;`
    )

    const gameId = externalResult?.[0]?.game

    if (gameId) {
      const gameResult = await query(
        "games",
        `fields name, slug, cover.url;
        where id = ${gameId};
        limit 1;`
      )
      igdbGame = gameResult?.[0]
    }

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
        cover: igdbGame.cover?.url?.replace("t_thumb", "t_cover_big") || null
      } : null
    }

    await setCache(cacheKey, result, 60)
    return res.json(result)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "Presence check failed" })
  }
}
