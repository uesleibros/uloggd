export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { query } = req.body

  try {
    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID,
        "Authorization": `Bearer ${process.env.IGDB_TOKEN}`,
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
