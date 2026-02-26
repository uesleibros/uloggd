import { handleNotificationCount } from "#services/notifications/handlers/count.js"
import { handleNotificationList } from "#services/notifications/handlers/list.js"
import { handleNotificationRead } from "#services/notifications/handlers/read.js"
import { handleNotificationDelete } from "#services/notifications/handlers/delete.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  count:  { handler: handleNotificationCount,  method: "GET",  scopes: ["@me"], auth: true },
  list:   { handler: handleNotificationList,   method: "GET",  scopes: ["@me"], auth: true },
  read:   { handler: handleNotificationRead,   method: "POST", scopes: ["@me"], auth: true },
  delete: { handler: handleNotificationDelete, method: "POST", scopes: ["@me"], auth: true },
}

export async function notificationsHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })
    req.user = user
  }

  return entry.handler(req, res)
}