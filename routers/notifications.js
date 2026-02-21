import { handleNotificationCount } from "#services/notifications/handlers/count.js"
import { handleNotificationList } from "#services/notifications/handlers/list.js"
import { handleNotificationRead } from "#services/notifications/handlers/read.js"
import { handleNotificationDelete } from "#services/notifications/handlers/delete.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  count:  { handler: handleNotificationCount,  scopes: ["@me"], auth: true },
  list:   { handler: handleNotificationList,   scopes: ["@me"], auth: true },
  read:   { handler: handleNotificationRead,   scopes: ["@me"], auth: true },
  delete: { handler: handleNotificationDelete, scopes: ["@me"], auth: true },
}

export async function notificationsHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    req.user = user
  }

  return entry.handler(req, res)
}
