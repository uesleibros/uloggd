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

async function getGameBySlug(slug) {
  try {
    const data = await query("games", `
      fields id, name;
      where slug = "${slug}";
      limit 1;
    `)
    return data[0] || null
  } catch {
    return null
  }
}

async function findSteamAppByName(steamId, gameName) {
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_WEB_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`
  )

  if (!res.ok) return null

  const { response } = await res.json()
  const games = response?.games || []

  if (!games.length) return null

  const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, "")
  const normalizedName = normalize(gameName)

  const exact = games.find(g => normalize(g.name) === normalizedName)
  if (exact) return exact

  const partial = games.find(g => 
    normalize(g.name).includes(normalizedName) || 
    normalizedName.includes(normalize(g.name))
  )
  
  return partial || null
}

function formatPlaytime(minutes) {
  if (!minutes) return { hours: 0, minutes: 0, totalMinutes: 0, formatted: "0h 0m" }
  
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

    const game = await getGameBySlug(slug)

    if (!game) {
      return res.status(404).json({ error: "game not found" })
    }

    let steamAppId = await getSteamAppId(game.id)
    let playtime = null

    if (steamAppId) {
      playtime = await getSteamPlaytime(connection.provider_user_id, steamAppId)
    }

    if (!playtime) {
      const steamGame = await findSteamAppByName(connection.provider_user_id, game.name)
      
      if (steamGame) {
        steamAppId = String(steamGame.appid)
        playtime = {
          total: formatPlaytime(steamGame.playtime_forever),
          recent: formatPlaytime(steamGame.playtime_2weeks),
          lastPlayed: steamGame.rtime_last_played 
            ? new Date(steamGame.rtime_last_played * 1000).toISOString() 
            : null
        }
      }
    }

    if (!playtime) {
      const result = { 
        connected: true, 
        found: !!steamAppId,
        owned: false,
        steamAppId,
        message: steamAppId 
          ? "Game not in user library or profile is private"
          : "Game not found on Steam"
      }
      await setCache(cacheKey, result, 300)
      return res.json(result)
    }

    const result = {
      connected: true,
      found: true,
      owned: true,
      steamAppId,
      playtime
    }

    await setCache(cacheKey, result, 300)
    return res.json(result)

  } catch (e) {
    console.error("Steam playtime error:", e.message)
    return res.status(500).json({ error: "fail" })
  }
}
