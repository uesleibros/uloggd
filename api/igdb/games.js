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
  if (!query?.trim()) return res.status(400).json({ error: "missing query" })

  try {
    const token = await getToken()
    const q = escapeIGDB(query.trim())

    const body = `
      fields name, slug, first_release_date,
             cover.url, cover.image_id,
             platforms.name, platforms.abbreviation,
             total_rating, total_rating_count,
             category, version_parent, parent_game;

      where (name ~ *"${q}"* | slug ~ *"${q}"*)
        & game_type = 0
        & version_parent = null
        & parent_game = null
        & cover != null;

      sort total_rating desc;
      limit 20;
    `

    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain"
      },
      body
    })

    if (!igdbRes.ok) {
      return res.status(500).json({ error: await igdbRes.text() })
    }

    const data = await igdbRes.json()

    const games = data.map(g => ({
      ...g,
      cover: g.cover?.url
        ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_720p") }
        : null
    }))

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
