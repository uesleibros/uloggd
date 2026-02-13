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
      body: `search "${safeQuery}"; fields id, name, slug, first_release_date, cover.url, cover.image_id, platforms.name, platforms.abbreviation, platforms.platform_logo.url, total_rating, total_rating_count, rating, rating_count, aggregated_rating, aggregated_rating_count, follows, hypes, category; limit 50;`
    })

    if (!igdbRes.ok) {
      const err = await igdbRes.text()
      return res.status(500).json({ error: err })
    }

    let games = await igdbRes.json()
    const queryLower = trimmed.toLowerCase()

    games = games.map(g => ({
      ...g,
      cover: g.cover?.url
        ? {
            ...g.cover,
            url: g.cover.url
              .replace("t_thumb", "t_cover_big")
              .replace(/^\/\//, "https://")
          }
        : null
    }))

    games.sort((a, b) => {
      const score = g => {
        let s = 0
        const name = (g.name || "").toLowerCase()

        if (name === queryLower) s += 10000
        else if (name.startsWith(queryLower)) s += 5000
        else if (name.includes(queryLower)) s += 2000

        const count = g.total_rating_count || g.rating_count || 0
        const value = g.total_rating || g.rating || 0
        s += Math.log10(count + 1) * value
        s += (g.follows || 0) * 2
        s += (g.hypes || 0) * 0.5

        if (g.category === 0) s += 500

        return s
      }

      return score(b) - score(a)
    })

    res.status(200).json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
