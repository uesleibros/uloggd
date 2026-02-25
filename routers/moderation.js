import { handleBan } from "#services/moderation/handlers/ban.js"
import { handleUnban } from "#services/moderation/handlers/unban.js"
import { handleList } from "#services/moderation/handlers/list.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  ban: { handler: handleBan, auth: true },
  unban: { handler: handleUnban, auth: true },
  list: { handler: handleList, auth: true },
}

export async function moderationHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    req.user = user
  }

  return entry.handler(req, res)
}