import { handlePopularAmongFriends } from "#services/home/handlers/popularAmongFriends.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  popularAmongFriends: { handler: handlePopularAmongFriends, method: "GET", auth: true },
}

export async function homeHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })
    req.user = user
  }

  return entry.handler(req, res)
}
