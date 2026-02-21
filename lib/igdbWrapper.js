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

export async function query(endpoint, body) {
  const token = await getToken()

  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain"
    },
    body
  })

  if (!res.ok) throw new Error(await res.text())

  return res.json()
}
