import { TwitchAuth } from "./twitch.js"

const auth = new TwitchAuth(
  process.env.TWITCH_CLIENT_ID,
  process.env.TWITCH_CLIENT_SECRET
)

export async function query(endpoint, body) {
  const token = await auth.getToken()

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
