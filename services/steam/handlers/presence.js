import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const cache = new Map()
const CACHE_TTL = 60 * 1000 // 1 minuto

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

export async function handlePresence(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  const cacheKey = `presence:${userId}`
  const cached = getCached(cacheKey)
  if (cached) return res.json(cached)

  const { data: connection } = await supabase
    .from("user_connections")
    .select("provider_user_id")
    .eq("user_id", userId)
    .eq("provider", "steam")
    .maybeSingle()

  if (!connection?.provider_user_id) {
    const result = { playing: false }
    setCache(cacheKey, result)
    return res.json(result)
  }

  const steamId = connection.provider_user_id

  const steamRes = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_WEB_API_KEY}&steamids=${steamId}`
  )

  const steamData = await steamRes.json()
  const player = steamData.response.players?.[0]

  if (!player || !player.gameid) {
    const result = {
      playing: false,
      profile: {
        name: player?.personaname,
        avatar: player?.avatarfull,
        status: player?.personastate ?? 0
      }
    }

    setCache(cacheKey, result)
    return res.json(result)
  }

  const externalResult = await query(
    "external_games",
    `fields game;
     where uid = "${player.gameid}" & external_game_source = 1;
     limit 1;`
  )

  let igdbGame = null

  if (externalResult?.[0]?.game) {
    const gameResult = await query(
      "games",
      `fields name, slug, cover.url;
       where id = ${externalResult[0].game};
       limit 1;`
    )
    igdbGame = gameResult?.[0] || null
  }

  const result = {
    playing: true,
    profile: {
      name: player.personaname,
      avatar: player.avatarfull,
      status: player.personastate
    },
    steam: {
      name: player.gameextrainfo,
      appId: player.gameid,
      header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${player.gameid}/header.jpg`
    },
    game: igdbGame
      ? {
          name: igdbGame.name,
          slug: igdbGame.slug,
          cover: igdbGame.cover
            ? `https:${igdbGame.cover.url.replace("t_thumb", "t_cover_big")}`
            : null
        }
      : null
  }

  setCache(cacheKey, result)

  res.json(result)
}
