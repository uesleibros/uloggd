let cachedToken = null
let tokenExpires = 0

async function getToken() {
  if (cachedToken && Date.now() < tokenExpires) return cachedToken

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  )

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpires = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

function escapeIGDB(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query } = req.body
  if (!query || !query.trim()) return res.status(400).json({ error: "missing query" })

  try {
    const access_token = await getToken()
    const trimmed = query.trim()
    const safeQuery = escapeIGDB(trimmed)

    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "text/plain"
      },
      body: `search "${safeQuery}"; fields id, name, slug, first_release_date, cover.url, cover.image_id, platforms.name, platforms.abbreviation, total_rating, total_rating_count, rating, rating_count, aggregated_rating, aggregated_rating_count, follows, hypes, category, version_parent, parent_game; limit 50;`
    })

    if (!igdbRes.ok) {
      const err = await igdbRes.text()
      console.error("IGDB Error:", err)
      return res.status(500).json({ error: err })
    }

    let games = await igdbRes.json()
    console.log("Total games from IGDB:", games.length)
    
    const queryLower = trimmed.toLowerCase()

    const beforeFilter = games.length
    games = games.filter(g => {
      const validCategory = !g.category || [0, 3, 4, 8, 9, 10].includes(g.category)
      const notVersion = !g.version_parent
      const hasCover = g.cover?.url
      return validCategory && notVersion && hasCover
    })
    console.log(`Filtered: ${beforeFilter} -> ${games.length}`)

    games = games.map(g => ({
      ...g,
      cover: {
        ...g.cover,
        url: g.cover.url.replace("t_thumb", "t_logo_med")
      }
    }))

    games.sort((a, b) => {
      const score = g => {
        let s = 0
        const name = (g.name || "").toLowerCase()
        
        if (name === queryLower) {
          s += 100000
        } else if (name.startsWith(queryLower)) {
          s += 50000
        } else if (name.includes(queryLower)) {
          s += 10000
        }
        
        const ratingCount = g.total_rating_count || g.rating_count || 0
        if (ratingCount < 10) {
          s -= 5000
        }
        
        const rating = g.total_rating || g.rating || 0
        s += ratingCount * (rating / 10)
        
        s += (g.follows || 0) * 10
        s += (g.hypes || 0) * 5
        
        if (!g.category || g.category === 0) {
          s += 10000
        } else if (g.category === 3 || g.category === 4) {
          s += 5000
        }
        
        if (g.first_release_date) {
          const releaseYear = new Date(g.first_release_date * 1000).getFullYear()
          const currentYear = new Date().getFullYear()
          
          if (currentYear - releaseYear <= 5) {
            s += 2000
          } else if (releaseYear < 2000 && rating > 70) {
            s += 1000
          }
        }
        
        return s
      }

      return score(b) - score(a)
    })

    games = games.slice(0, 20)

    res.status(200).json(games)
  } catch (e) {
    console.error("Handler error:", e)
    res.status(500).json({ error: "fail" })
  }
}
