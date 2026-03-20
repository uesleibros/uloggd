import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

async function getSteamAppId(gameId) {
  try {
    const data = await query("external_games", `
      fields uid;
      where game = ${gameId} & external_game_source = 1;
      limit 1;
    `)
    return data[0]?.uid || null
  } catch {
    return null
  }
}

async function getGameIdBySlug(slug) {
  try {
    const data = await query("games", `
      fields id;
      where slug = "${slug}";
      limit 1;
    `)
    return data[0]?.id || null
  } catch {
    return null
  }
}

function formatPlaytime(minutes) {
  if (!minutes) return { hours: 0, minutes: 0, formatted: "0h 0m" }
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  return {
    hours,
    minutes: mins,
    totalMinutes: minutes,
    formatted: `${hours}h ${mins}m`
  }
}

async function getSteamPlaytime(steamId, appId) {
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_WEB_API_KEY}&steamid=${steamId}&include_played_free_games=true&appids_filter[0]=${appId}`
  )

  if (!res.ok) return null

  const { response } = await res.json()
  const game = response?.games?.[0]

  if (!game) return null

  return {
    total: formatPlaytime(game.playtime_forever),
    recent: formatPlaytime(game.playtime_2weeks),
    lastPlayed: game.rtime_last_played 
      ? new Date(game.rtime_last_played * 1000).toISOString() 
      : null
  }
}

export async function handlePlaytime(req, res) {
  const { slug, userId } = req.query

  if (!slug || !userId) {
    return res.status(400).json({ error: "slug and userId required" })
  }

  const cacheKey = `steam_playtime_${userId}_${slug}`
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
      return res.json({ connected: false })
    }

    const gameId = await getGameIdBySlug(slug)

    if (!gameId) {
      return res.status(404).json({ error: "game not found" })
    }

    const steamAppId = await getSteamAppId(gameId)

    if (!steamAppId) {
      return res.json({ 
        connected: true, 
        found: false, 
        message: "Game not available on Steam" 
      })
    }

    const playtime = await getSteamPlaytime(connection.provider_user_id, steamAppId)

    if (!playtime) {
      return res.json({ 
        connected: true, 
        found: true,
        owned: false,
        steamAppId,
        message: "Game not in user library or profile is private"
      })
    }

    const result = {
      connected: true,
      found: true,
      owned: true,
      steamAppId,
      playtime
    }

    await setCache(cacheKey, result, 300) // Cache 5 minutos
    return res.json(result)

  } catch (e) {
    console.error("Steam playtime error:", e.message)
    return res.status(500).json({ error: "fail" })
  }
}
