export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query } = req.body

  try {
    const authRes = await fetch(`https://id.twitch.tv{process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, {
      method: "POST"
    })
    const { access_token } = await authRes.json()

    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "text/plain"
      },
      body: `search "${query}"; fields id,name,slug,first_release_date,cover.url; limit 20;`
    })

    const data = await igdbRes.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: "fail" })
  }
}
