import { handleBan } from "#services/moderation/handlers/ban.js"
import { handleUnban } from "#services/moderation/handlers/unban.js"
import { handleList } from "#services/moderation/handlers/list.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  ban:   { handler: handleBan,   method: "POST", auth: true },
  unban: { handler: handleUnban, method: "POST", auth: true },
  list:  { handler: handleList,  method: "GET",  auth: true },
}

export async function moderationHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.auth) {
    const user = await getUser(req)

    if (!user) {
      return res.status(401).json({ error: "unauthorized" })
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "banned" })
    }

    req.user = user
  }

  return entry.handler(req, res)
}