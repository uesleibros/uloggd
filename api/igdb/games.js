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

function buildNameFilter(raw) {
  const q = raw.trim()
  const words = q.split(/\s+/).filter(w => w.length >= 2)

  if (words.length > 1) {
    return words.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & ")
  }

  const escaped = escapeIGDB(q)
  const parts = [`name ~ *"${escaped}"*`]

  if (q.length >= 6) {
    for (let i = 3; i <= q.length - 3; i++) {
      const l = escapeIGDB(q.substring(0, i))
      const r = escapeIGDB(q.substring(i))
      parts.push(`(name ~ *"${l}"* & name ~ *"${r}"*)`)
    }
  }

  return parts.length > 1 ? `(${parts.join(" | ")})` : parts[0]
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query } = req.body
  if (!query?.trim()) return res.status(400).json({ error: "missing query" })

  try {
    const token = await getToken()
    const nameFilter = buildNameFilter(query)

    const body = `
      fields name, slug, first_release_date,
             cover.url, cover.image_id,
             platforms.name, platforms.abbreviation,
             total_rating, total_rating_count,
             game_type;
      where ${nameFilter}
        & game_type = (0,4,8,9,10)
        & version_parent = null
        & parent_game = null
        & cover != null
        & total_rating_count > 0;
      sort total_rating_count desc;
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
