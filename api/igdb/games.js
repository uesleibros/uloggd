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
  tokenExpires = Date.now() + data.expires_in * 1000
  return cachedToken
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query } = req.body
  if (!query) return res.status(400).json({ error: "missing query" })

  try {
    const access_token = await getToken()

    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "text/plain"
      },
      body: `
      search "${query}";
      where 
        category = 0 
        & version_parent = null 
        & first_release_date != null;
      fields 
        id,
        name,
        slug,
        first_release_date,
        cover,
        platforms,
        rating,
        rating_count;
      sort popularity desc;
      limit 50;
      `
    })

    const data = await igdbRes.json()
    res.status(200).json(data)
  } catch {
    res.status(500).json({ error: "fail" })
  }
}
